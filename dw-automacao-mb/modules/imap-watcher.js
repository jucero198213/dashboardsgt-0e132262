const imapSimple = require('imap-simple');
const { simpleParser } = require('mailparser');
const log = require('./logger');

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

// Retorna array de { uid, assunto, corpo, anexoBuffer, nomeAnexo } para emails BAIXA MB não lidos
async function buscarEmailsMB() {
  let connection;
  try {
    connection = await imapSimple.connect(IMAP_CONFIG);
    await connection.openBox('INBOX');

    const results = await connection.search(
      ['UNSEEN', ['SUBJECT', 'BAIXA MB']],
      { bodies: [''], markSeen: false }
    );

    if (!results.length) return [];

    log.info(`IMAP: ${results.length} e-mail(s) BAIXA MB encontrado(s)`);

    const emails = [];
    for (const item of results) {
      const rawAll = item.parts.find(p => p.which === '');
      if (!rawAll) continue;

      const parsed = await simpleParser(rawAll.body);
      const anexo = (parsed.attachments || []).find(a =>
        /\.(xlsx|xls|csv)$/i.test(a.filename)
      );

      emails.push({
        uid: item.attributes.uid,
        assunto: parsed.subject || '',
        corpo: parsed.text || '',
        anexoBuffer: anexo ? anexo.content : null,
        nomeAnexo: anexo ? anexo.filename : null,
      });
    }
    return emails;
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

module.exports = { buscarEmailsMB, marcarLido };
