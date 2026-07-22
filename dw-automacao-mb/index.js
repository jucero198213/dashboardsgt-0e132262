require('dotenv').config();
const { execFile } = require('child_process');
const path = require('path');

const log       = require('./modules/logger');
const imap      = require('./modules/imap-watcher');
const parser    = require('./modules/email-parser');
const rf        = require('./modules/receitaflow');
const rdpWeb    = require('./modules/rodopar-web');
const notifier  = require('./modules/notifier');

const POLL_MS     = 2 * 60 * 1000;   // 2 minutos
const BOT_SCRIPT  = path.join(__dirname, 'scripts', 'rodopar_bot.py');
const NOME_PLANILHA = process.env.NOME_PLANILHA_MB || 'Sheet1';  // ← confirmar após primeiro teste

let processando = false;

async function processarEmail(email) {
  const { uid } = email;
  log.info(`Processando e-mail uid=${uid} — "${email.assunto}"`);

  // ── 1. Parse do e-mail ────────────────────────────────────
  const dados = parser.parse(email);
  if (!dados.ok) {
    log.warn(`Parse falhou: ${dados.erro}`);
    await notifier.emailInvalido(dados.erro);
    await imap.marcarLido(uid);
    return;
  }

  await imap.marcarLido(uid);
  const { dataRecebimento, dataVencimento, valorBanco, caminhoAnexo } = dados;

  // ── 2. ReceitaFlow ────────────────────────────────────────
  log.info('Etapa: ReceitaFlow');
  const rfResult = await rf.processarMB({ caminhoAnexo, dataRecebimento, dataVencimento, valorBanco });

  if (!rfResult.ok) {
    if (rfResult.divergencia) {
      log.warn(`ReceitaFlow divergência: ${rfResult.detalhe}`);
      await notifier.divergencia(rfResult.detalhe);
    } else {
      log.error(`ReceitaFlow erro: ${rfResult.detalhe}`);
      await notifier.erro('ReceitaFlow', rfResult.detalhe);
    }
    return;
  }

  const { caminhoSaida } = rfResult;
  log.info(`ReceitaFlow OK — planilha: ${caminhoSaida}`);

  // ── 3. Rodopar web login ──────────────────────────────────
  log.info('Etapa: Rodopar login web');
  let rdp;
  try {
    rdp = await rdpWeb.loginWeb();
  } catch (err) {
    log.error(`Rodopar login falhou: ${err.message}`);
    await notifier.erro('Rodopar Login', err.message);
    return;
  }

  // ── 4. Rodopar bot (PyAutoGUI) ────────────────────────────
  log.info('Etapa: Rodopar bot PyAutoGUI');
  try {
    await new Promise((resolve, reject) => {
      const args = [
        BOT_SCRIPT,
        '--data-aviso',    dataRecebimento,
        '--valor',         valorBanco,
        '--planilha',      caminhoSaida,
        '--nome-planilha', NOME_PLANILHA,
      ];

      const env = {
        ...process.env,
        RDP_APP_USER: process.env.RDP_APP_USER,
        RDP_APP_PASS: process.env.RDP_APP_PASS,
      };

      const proc = execFile('python', args, { env, timeout: 5 * 60 * 1000 }, (err, stdout, stderr) => {
        if (stdout) log.info(`Bot stdout: ${stdout.trim()}`);
        if (stderr) log.warn(`Bot stderr: ${stderr.trim()}`);
        if (err) {
          reject(new Error(stderr || err.message));
        } else {
          resolve();
        }
      });
    });

    log.info('Rodopar bot concluído com sucesso');
    await notifier.sucesso(valorBanco, dataRecebimento);

  } catch (err) {
    log.error(`Rodopar bot falhou: ${err.message}`);
    await notifier.erro('Rodopar Bot', err.message);
  } finally {
    await rdp.fechar();
  }
}

async function poll() {
  if (processando) return;

  try {
    const emails = await imap.buscarEmailsMB();
    if (!emails.length) return;

    processando = true;
    for (const email of emails) {
      try {
        await processarEmail(email);
      } catch (err) {
        log.error(`Erro inesperado ao processar e-mail: ${err.message}`);
        await notifier.erro('Orquestrador', err.message).catch(() => {});
      }
    }
  } catch (err) {
    log.error(`Erro no poll: ${err.message}`);
  } finally {
    processando = false;
  }
}

async function main() {
  log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log.info('  Automação MB — iniciando');
  log.info(`  Gmail: ${process.env.IMAP_USER}`);
  log.info(`  ReceitaFlow: ${process.env.RF_URL}`);
  log.info(`  Polling a cada ${POLL_MS / 1000}s`);
  log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Primeiro poll imediato, depois intervalo
  await poll();
  setInterval(poll, POLL_MS);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
