const imapSimple = require('imap-simple');
const { simpleParser } = require('mailparser');
const log = require('./logger');

// Converte HTML em texto simples (quando o e-mail vem só em HTML).
function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

// Prefere texto puro; se vazio, cai pro HTML convertido.
function extrairCorpo(parsed) {
  if (parsed.text && parsed.text.trim()) return parsed.text;
  if (parsed.html) return stripHtml(parsed.html);
  if (parsed.textAsHtml) return stripHtml(parsed.textAsHtml);
  return '';
}

const IMAP_CONFIG = {
  imap: {
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASS,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 10000,
  },
};

// Busca e-mails não lidos para uma lista de assuntos.
// Retorna array de { uid, assunto, corpo, anexoBuffer, nomeAnexo } — no máximo 1 por assunto (o mais recente).
async function buscarEmails(assuntos) {
  let connection;
  try {
    connection = await imapSimple.connect(IMAP_CONFIG);
    await connection.openBox('INBOX');

    const todos = [];
    for (const assunto of assuntos) {
      const results = await connection.search(
        ['UNSEEN', ['SUBJECT', assunto]],
        { bodies: [''], markSeen: false }
      );
      if (!results.length) continue;

      log.info(`IMAP: ${results.length} e-mail(s) "${assunto}" encontrado(s)`);

      results.sort((a, b) => b.attributes.uid - a.attributes.uid);
      const maisRecente = results[0];

      if (results.length > 1) {
        log.info(`IMAP: descartando ${results.length - 1} e-mail(s) antigo(s) de "${assunto}", processando apenas uid=${maisRecente.attributes.uid}`);
        for (const old of results.slice(1)) {
          await connection.addFlags(old.attributes.uid, ['\\Seen']);
        }
      }

      const rawAll = maisRecente.parts.find(p => p.which === '');
      if (!rawAll) continue;

      const parsed = await simpleParser(rawAll.body);
      const anexo = (parsed.attachments || []).find(a =>
        /\.(xlsx|xls|csv)$/i.test(a.filename)
      );

      todos.push({
        uid: maisRecente.attributes.uid,
        assunto: parsed.subject || '',
        corpo: extrairCorpo(parsed),
        anexoBuffer: anexo ? anexo.content : null,
        nomeAnexo: anexo ? anexo.filename : null,
      });
    }

    return todos;
  } catch (err) {
    log.error(`IMAP: erro ao buscar e-mails — ${err.message}`);
    return [];
  } finally {
    if (connection) {
      try { connection.end(); } catch (_) {}
    }
  }
}

async function marcarLido(uid) {
  let connection;
  try {
    connection = await imapSimple.connect(IMAP_CONFIG);
    await connection.openBox('INBOX');
    await connection.addFlags(uid, ['\\Seen']);
    log.info(`IMAP: e-mail uid=${uid} marcado como lido`);
  } catch (err) {
    log.error(`IMAP: erro ao marcar lido uid=${uid} — ${err.message}`);
  } finally {
    if (connection) {
      try { connection.end(); } catch (_) {}
    }
  }
}

module.exports = { buscarEmails, marcarLido };
