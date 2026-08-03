require('dotenv').config();
const { execFile } = require('child_process');
const path = require('path');

const log       = require('./modules/logger');
const imap      = require('./modules/imap-watcher');
const parser    = require('./modules/email-parser');
const rfMB      = require('./modules/receitaflow');
const rfPlatlog = require('./modules/platlog-processor');
const notifier  = require('./modules/notifier');
const clients   = require('./clients');

const POLL_MS     = 2 * 60 * 1000;
const BOT_SCRIPT  = path.join(__dirname, 'scripts', 'rodopar_bot.py');

const ASSUNTOS = Object.values(clients).map((c) => c.assuntoEmail);

let processando = false;

function identificarCliente(assuntoEmail) {
  const upper = (assuntoEmail || '').toUpperCase();
  for (const [id, cfg] of Object.entries(clients)) {
    if (upper.includes(cfg.assuntoEmail)) return { id, ...cfg };
  }
  return null;
}

function processarPlanilha(cliente, dados) {
  if (cliente.processador === 'mb') {
    return rfMB.processarMB(dados);
  }
  if (cliente.processador === 'platlog') {
    return rfPlatlog.processarPlatlog(dados);
  }
  return { ok: false, divergencia: false, detalhe: `Processador desconhecido: ${cliente.processador}` };
}

async function processarEmail(email) {
  const { uid } = email;
  const cliente = identificarCliente(email.assunto);
  if (!cliente) {
    log.warn(`Assunto "${email.assunto}" não corresponde a nenhum cliente configurado — ignorando`);
    await imap.marcarLido(uid);
    return;
  }

  const notifExtra = { cliente: cliente.sigla, nomeCliente: cliente.nome };
  log.info(`[${cliente.sigla}] Processando e-mail uid=${uid} — "${email.assunto}"`);

  // ── 1. Parse do e-mail ────────────────────────────────────
  const dados = parser.parse(email);
  if (!dados.ok) {
    log.warn(`[${cliente.sigla}] Parse falhou: ${dados.erro}`);
    await notifier.emailInvalido(dados.erro, notifExtra);
    await imap.marcarLido(uid);
    return;
  }

  await imap.marcarLido(uid);
  const { dataRecebimento, dataVencimento, valorBanco, caminhoAnexo } = dados;

  // ── 2. Processamento da planilha ──────────────────────────
  log.info(`[${cliente.sigla}] Etapa: Processamento da planilha`);
  const rfResult = processarPlanilha(cliente, { caminhoAnexo, dataRecebimento, dataVencimento, valorBanco });

  if (!rfResult.ok) {
    if (rfResult.divergencia) {
      log.warn(`[${cliente.sigla}] Divergência: ${rfResult.detalhe}`);
      await notifier.divergencia(rfResult.detalhe, notifExtra);
    } else {
      log.error(`[${cliente.sigla}] Erro no processamento: ${rfResult.detalhe}`);
      await notifier.erro('Processamento', rfResult.detalhe, notifExtra);
    }
    return;
  }

  const { caminhoSaida } = rfResult;
  const nomeAba = rfResult.nomeAba || cliente.nomePlanilha;
  log.info(`[${cliente.sigla}] Processamento OK — planilha: ${caminhoSaida} (aba "${nomeAba}")`);

  // ── 3. Rodopar (PyAutoGUI) ────────────────────────────────
  log.info(`[${cliente.sigla}] Etapa: Rodopar bot PyAutoGUI`);
  try {
    await new Promise((resolve, reject) => {
      const args = [
        BOT_SCRIPT,
        '--data-aviso',    dataRecebimento,
        '--valor',         valorBanco,
        '--planilha',      caminhoSaida,
        '--nome-planilha', nomeAba,
        '--complemento',   cliente.complemento,
        '--conta',         cliente.rodopar.conta,
        '--filial',        cliente.rodopar.filial,
        '--tipo-doc',      cliente.rodopar.tipoDoc,
        '--hist-bancario', cliente.rodopar.histBancario,
      ];

      const proc = execFile('python', args, { env: process.env, timeout: 8 * 60 * 1000 }, (err, stdout, stderr) => {
        if (stdout) log.info(`[${cliente.sigla}] Bot stdout: ${stdout.trim()}`);
        if (stderr) log.warn(`[${cliente.sigla}] Bot stderr: ${stderr.trim()}`);
        if (err) {
          err.exitCode = proc.exitCode;
          err.stderr = stderr;
          reject(err);
        } else {
          resolve();
        }
      });
    });

    log.info(`[${cliente.sigla}] Rodopar bot concluído com sucesso`);
    await notifier.sucesso(valorBanco, dataRecebimento, { documentos: rfResult.totalDocumentos, ...notifExtra });

  } catch (err) {
    if (err.exitCode === 2 || (err.stderr && err.stderr.includes('TROCA_SENHA'))) {
      const tela = err.stderr && err.stderr.includes('(app)') ? 'app' : 'web';
      log.warn(`[${cliente.sigla}] Rodopar: troca de senha obrigatória detectada (${tela})`);
      await notifier.trocaSenha(tela, notifExtra);
    } else if (err.exitCode === 3 || (err.stderr && err.stderr.includes('INCONSISTENTE'))) {
      log.warn(`[${cliente.sigla}] Rodopar: importação resultou em Situação Inconsistente`);
      await notifier.inconsistencia(notifExtra);
    } else {
      log.error(`[${cliente.sigla}] Rodopar bot falhou: ${err.message}`);
      await notifier.erro('Rodopar Bot', err.stderr || err.message, notifExtra);
    }
  }
}

async function poll() {
  if (processando) return;

  try {
    const emails = await imap.buscarEmails(ASSUNTOS);
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
  const clientesAtivos = Object.values(clients).map((c) => c.sigla).join(', ');
  log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log.info(`  Automação de Baixa — clientes: ${clientesAtivos}`);
  log.info(`  Gmail: ${process.env.IMAP_USER}`);
  log.info(`  Polling a cada ${POLL_MS / 1000}s`);
  log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await poll();
  setInterval(poll, POLL_MS);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
