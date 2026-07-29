// Notificações da automação MB.
//
// FASE 1 (ativa): e-mail via SMTP do próprio Gmail da automação.
// FASE 2 (futura): WhatsApp via Sofia — depende do billing da Meta ser
//   aprovado. O gancho está marcado abaixo (enviarWhatsApp).

const nodemailer = require('nodemailer');
const log = require('./logger');

const EMAIL_FROM = process.env.IMAP_USER;
const EMAIL_PASS = process.env.IMAP_PASS;
const DESTINATARIOS = (process.env.EMAIL_NOTIF || '')
  .split(',').map((e) => e.trim()).filter(Boolean);

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: EMAIL_FROM, pass: EMAIL_PASS },
  });
  return transporter;
}

async function enviarEmail(assunto, corpo) {
  if (!DESTINATARIOS.length) {
    log.warn('Notifier: EMAIL_NOTIF vazio — nenhum destinatário de e-mail configurado');
    return;
  }
  try {
    await getTransporter().sendMail({
      from: `"Automação MB" <${EMAIL_FROM}>`,
      to: DESTINATARIOS.join(', '),
      subject: assunto,
      text: corpo,
    });
    log.info(`Notifier: e-mail enviado para ${DESTINATARIOS.length} destinatário(s) — "${assunto}"`);
  } catch (err) {
    log.error(`Notifier: falha ao enviar e-mail — ${err.message}`);
  }
}

// ── FASE 2: WhatsApp via Sofia (edge function automacao-notificar) ─────
// Envia o texto como {{1}} do template automacao_baixa_mb. Falha aqui NÃO
// derruba o e-mail — os dois são independentes.
const SOFIA_NOTIFY_URL = process.env.SOFIA_NOTIFY_URL || '';
const AUTOMACAO_NOTIFY_KEY = process.env.AUTOMACAO_NOTIFY_KEY || '';

async function enviarWhatsApp(mensagem) {
  if (!SOFIA_NOTIFY_URL) return; // Fase 2 desligada enquanto a URL não estiver no .env
  if (typeof fetch === 'undefined') {
    log.warn('Notifier(WhatsApp): fetch indisponível (requer Node 18+)');
    return;
  }
  try {
    const res = await fetch(SOFIA_NOTIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-automacao-key': AUTOMACAO_NOTIFY_KEY,
      },
      body: JSON.stringify({ mensagem }),
    });
    if (!res.ok) {
      log.warn(`Notifier(WhatsApp): HTTP ${res.status} — ${await res.text()}`);
    } else {
      log.info('Notifier(WhatsApp): aviso enviado pela Sofia');
    }
  } catch (err) {
    log.error(`Notifier(WhatsApp): falha — ${err.message}`);
  }
}

// ── Notificações de alto nível (interface usada pelo index.js) ─────────

async function sucesso(valor, dataRecebimento, extra = {}) {
  const { documentos } = extra;
  const assunto = `✅ Baixa MB concluída — R$ ${valor} (${dataRecebimento})`;
  const corpo = [
    'A baixa do cliente Martin Brower foi processada e importada no Rodopar com sucesso.',
    '',
    `• Data de recebimento: ${dataRecebimento}`,
    `• Valor: R$ ${valor}`,
    documentos != null ? `• Documentos importados: ${documentos}` : null,
    '',
    'Nenhuma ação necessária — processo 100% automático.',
    '',
    '— Automação MB',
  ].filter((l) => l !== null).join('\n');
  await Promise.all([enviarEmail(assunto, corpo), enviarWhatsApp(assunto)]);
}

async function divergencia(detalhe) {
  const assunto = '⚠️ Baixa MB — Divergência (fazer manual)';
  const corpo = [
    'A baixa do Martin Brower foi PARADA por divergência. O processo NÃO foi importado no Rodopar.',
    '',
    'Detalhe da divergência:',
    detalhe,
    '',
    '👉 A baixa precisa ser feita MANUALMENTE pela equipe responsável.',
    '',
    '— Automação MB',
  ].join('\n');
  await Promise.all([enviarEmail(assunto, corpo), enviarWhatsApp(assunto)]);
}

async function erro(etapa, detalhe) {
  const assunto = `❌ Baixa MB — Erro na etapa: ${etapa}`;
  const corpo = [
    `A automação encontrou um erro na etapa "${etapa}" e não concluiu a baixa.`,
    '',
    'Detalhe do erro:',
    detalhe,
    '',
    '👉 Verifique a máquina do DW / os logs, e faça a baixa manualmente se necessário.',
    '',
    '— Automação MB',
  ].join('\n');
  await Promise.all([enviarEmail(assunto, corpo), enviarWhatsApp(assunto)]);
}

async function emailInvalido(motivo) {
  const assunto = '📧 Baixa MB — E-mail inválido';
  const corpo = [
    'Chegou um e-mail "BAIXA MB", mas ele está incompleto e não pôde ser processado.',
    '',
    `Motivo: ${motivo}`,
    '',
    'Reenvie o e-mail com o formato correto (anexo + DATA_RECEBIMENTO, DATA_VENCIMENTO e VALOR_BANCO no corpo).',
    '',
    '— Automação MB',
  ].join('\n');
  await Promise.all([enviarEmail(assunto, corpo), enviarWhatsApp(assunto)]);
}

async function trocaSenha(tela) {
  const assunto = '🔐 Baixa MB — Troca de senha obrigatória';
  const corpo = [
    `O Rodopar exigiu troca de senha na tela de login (${tela}).`,
    'A automação foi PARADA. A baixa de hoje precisa ser feita MANUALMENTE.',
    '',
    'Para restaurar a automação:',
    `  1. Acesse o Rodopar e troque a senha (tela: ${tela})`,
    `  2. Atualize o .env na máquina DW (variável: ${tela === 'web' ? 'RDP_WEB_PASS' : 'RDP_APP_PASS'})`,
    '  3. A automação vai funcionar normalmente no próximo e-mail',
    '',
    '— Automação MB',
  ].join('\n');
  await Promise.all([enviarEmail(assunto, corpo), enviarWhatsApp(assunto)]);
}

module.exports = { sucesso, divergencia, erro, emailInvalido, trocaSenha, enviarEmail, enviarWhatsApp };
