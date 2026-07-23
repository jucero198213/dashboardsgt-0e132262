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

// ── FASE 2 (futura): WhatsApp via Sofia ────────────────────────────────
// Quando o billing da Meta estiver aprovado, implementar aqui o envio via
// a infraestrutura da Sofia (edge function / Cloud API) e chamar junto com
// o e-mail em cada notificação abaixo.
async function enviarWhatsApp(_mensagem) {
  // TODO Fase 2: enviar pela Sofia quando billing liberado.
  return;
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

module.exports = { sucesso, divergencia, erro, emailInvalido, enviarEmail };
