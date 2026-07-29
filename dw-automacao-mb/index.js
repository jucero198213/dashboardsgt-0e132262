require('dotenv').config();
const { execFile } = require('child_process');
const path = require('path');

const log       = require('./modules/logger');
const imap      = require('./modules/imap-watcher');
const parser    = require('./modules/email-parser');
const rf        = require('./modules/receitaflow');
const notifier  = require('./modules/notifier');

const POLL_MS     = 2 * 60 * 1000;   // 2 minutos
const BOT_SCRIPT  = path.join(__dirname, 'scripts', 'rodopar_bot.py');
const NOME_PLANILHA = process.env.NOME_PLANILHA_MB || 'DOCUMENTO';  // aba gerada pelo processador MB

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
  const nomeAba = rfResult.nomeAba || NOME_PLANILHA;
  log.info(`ReceitaFlow OK — planilha: ${caminhoSaida} (aba "${nomeAba}")`);

  // ── 3. Rodopar (PyAutoGUI faz o fluxo inteiro no Chrome) ───
  // O bot Python abre o Chrome, faz login web, entra no Citrix e importa.
  log.info('Etapa: Rodopar bot PyAutoGUI (fluxo completo)');
  try {
    await new Promise((resolve, reject) => {
      const args = [
        BOT_SCRIPT,
        '--data-aviso',    dataRecebimento,
        '--valor',         valorBanco,
        '--planilha',      caminhoSaida,
        '--nome-planilha', nomeAba,
      ];

      const proc = execFile('python', args, { env: process.env, timeout: 8 * 60 * 1000 }, (err, stdout, stderr) => {
        if (stdout) log.info(`Bot stdout: ${stdout.trim()}`);
        if (stderr) log.warn(`Bot stderr: ${stderr.trim()}`);
        if (err) {
          err.exitCode = proc.exitCode;
          err.stderr = stderr;
          reject(err);
        } else {
          resolve();
        }
      });
    });

    log.info('Rodopar bot concluído com sucesso');
    await notifier.sucesso(valorBanco, dataRecebimento, { documentos: rfResult.totalDocumentos });

  } catch (err) {
    if (err.exitCode === 2 || (err.stderr && err.stderr.includes('TROCA_SENHA'))) {
      const tela = err.stderr && err.stderr.includes('(app)') ? 'app' : 'web';
      log.warn(`Rodopar: troca de senha obrigatória detectada (${tela})`);
      await notifier.trocaSenha(tela);
    } else if (err.exitCode === 3 || (err.stderr && err.stderr.includes('INCONSISTENTE'))) {
      log.warn('Rodopar: importação resultou em Situação Inconsistente');
      await notifier.inconsistencia();
    } else {
      log.error(`Rodopar bot falhou: ${err.message}`);
      await notifier.erro('Rodopar Bot', err.stderr || err.message);
    }
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
