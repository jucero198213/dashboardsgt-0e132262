const fs = require('fs');
const path = require('path');
const log = require('./logger');

const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || path.join(__dirname, '..', 'downloads');

// Extrai DATA_RECEBIMENTO, DATA_VENCIMENTO e VALOR_BANCO do corpo do e-mail
// Formato esperado:
//   DATA_RECEBIMENTO: 22/07/2026
//   DATA_VENCIMENTO: 22/07/2026
//   VALOR_BANCO: 125.432,50
function parseCorpo(corpo) {
  log.info(`Email-parser corpo (debug):\n---\n${corpo}\n---`);

  const campo = (nome) => {
    const escaped = nome.replace(/[_\s]/g, '[_\\s]+');
    const m = corpo.match(new RegExp(`${escaped}\\s*:?\\s*([^\\r\\n]+)`, 'i'));
    return m ? m[1].replace(/^:\s*/, '').trim() : null;
  };

  const dataRecebimento = campo('DATA_RECEBIMENTO') || campo('DATA RECEBIMENTO');
  const dataVencimento  = campo('DATA_VENCIMENTO')  || campo('DATA VENCIMENTO');
  const valorBanco      = campo('VALOR_BANCO')       || campo('VALOR BANCO');

  const faltando = [];
  if (!dataRecebimento) faltando.push('DATA_RECEBIMENTO');
  if (!dataVencimento)  faltando.push('DATA_VENCIMENTO');
  if (!valorBanco)      faltando.push('VALOR_BANCO');

  if (faltando.length) {
    return { ok: false, erro: `Campo(s) faltando no corpo do e-mail: ${faltando.join(', ')}` };
  }

  return { ok: true, dataRecebimento, dataVencimento, valorBanco };
}

// Salva o buffer do anexo em disco e retorna o caminho
function salvarAnexo(buffer, nomeAnexo) {
  if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  const ts = Date.now();
  const nome = `mb_entrada_${ts}_${nomeAnexo}`;
  const destino = path.join(DOWNLOADS_DIR, nome);
  fs.writeFileSync(destino, buffer);
  log.info(`Email-parser: anexo salvo em ${destino}`);
  return destino;
}

function parse(email) {
  if (!email.anexoBuffer) {
    return { ok: false, erro: 'E-mail sem anexo de planilha (.xlsx/.xls/.csv)' };
  }

  const params = parseCorpo(email.corpo);
  if (!params.ok) return params;

  const caminhoAnexo = salvarAnexo(email.anexoBuffer, email.nomeAnexo || 'planilha.xlsx');

  log.info(`Email-parser: DATA_RECEBIMENTO=${params.dataRecebimento} DATA_VENCIMENTO=${params.dataVencimento} VALOR_BANCO=${params.valorBanco}`);

  return {
    ok: true,
    dataRecebimento: params.dataRecebimento,
    dataVencimento:  params.dataVencimento,
    valorBanco:      params.valorBanco,
    caminhoAnexo,
  };
}

module.exports = { parse };
