const fs = require('fs');
const path = require('path');
const log = require('./logger');

const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || path.join(__dirname, '..', 'downloads');

// Campos comuns a todos os clientes
const CAMPOS_BASE = ['DATA_RECEBIMENTO', 'VALOR_BANCO'];

// Campos extras por processador
const CAMPOS_EXTRAS = {
  mb: ['DATA_VENCIMENTO'],
  platlog: ['DESCONTO'],
};

function extrairCampo(corpo, nome) {
  const escaped = nome.replace(/[_\s]/g, '[_\\s]+');
  const m = corpo.match(new RegExp(`${escaped}\\s*:?\\s*([^\\r\\n]+)`, 'i'));
  return m ? m[1].replace(/^:\s*/, '').trim() : null;
}

function parseCorpo(corpo, processador) {
  log.info(`Email-parser corpo (debug):\n---\n${corpo}\n---`);

  const campos = [...CAMPOS_BASE, ...(CAMPOS_EXTRAS[processador] || [])];
  const resultado = {};
  const faltando = [];

  for (const campo of campos) {
    const alternativa = campo.replace(/_/g, ' ');
    const valor = extrairCampo(corpo, campo) || extrairCampo(corpo, alternativa);
    const chave = campo.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    resultado[chave] = valor || null;
    if (!valor) faltando.push(campo);
  }

  if (faltando.length) {
    return { ok: false, erro: `Campo(s) faltando no corpo do e-mail: ${faltando.join(', ')}` };
  }

  return { ok: true, ...resultado };
}

function salvarAnexo(buffer, nomeAnexo) {
  if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  const ts = Date.now();
  const nome = `entrada_${ts}_${nomeAnexo}`;
  const destino = path.join(DOWNLOADS_DIR, nome);
  fs.writeFileSync(destino, buffer);
  log.info(`Email-parser: anexo salvo em ${destino}`);
  return destino;
}

function parse(email, processador) {
  if (!email.anexoBuffer) {
    return { ok: false, erro: 'E-mail sem anexo de planilha (.xlsx/.xls/.csv)' };
  }

  const params = parseCorpo(email.corpo, processador);
  if (!params.ok) return params;

  const caminhoAnexo = salvarAnexo(email.anexoBuffer, email.nomeAnexo || 'planilha.xlsx');

  log.info(`Email-parser [${processador}]: ${JSON.stringify(params)}`);

  return {
    ok: true,
    ...params,
    caminhoAnexo,
  };
}

module.exports = { parse };
