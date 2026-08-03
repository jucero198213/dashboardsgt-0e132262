const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const log = require('./logger');

const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || path.join(__dirname, '..', 'downloads');
const NOME_ABA_SAIDA = 'DOCUMENTO';

function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .trim()
    .toLowerCase();
}

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.').trim();
    if (!cleaned) return null;
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function toDocumentString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Math.trunc(value).toString();
  return String(value).trim();
}

function getRuleFromDocument(numeroDocumento) {
  if (!numeroDocumento) return null;
  if (numeroDocumento.startsWith('9') || numeroDocumento.startsWith('1')) {
    return { serie: '4', tipoDocumento: 'CTRC' };
  }
  if (numeroDocumento.startsWith('2') || numeroDocumento.startsWith('3')) {
    return { serie: 'NFD', tipoDocumento: 'NF' };
  }
  return null;
}

function findHeaderRow(rows) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] || [];
    const headerMap = {};
    row.forEach((cell, colIndex) => {
      const normalized = normalizeHeader(cell);
      if (normalized) headerMap[normalized] = colIndex;
    });
    const hasDoc = headerMap['nfiscal'] !== undefined || headerMap['numero'] !== undefined;
    const hasValor = headerMap['vltotal'] !== undefined || headerMap['valordopagamento'] !== undefined;
    if (hasDoc && hasValor) return { headerRowIndex: rowIndex, headerMap };
  }
  throw new Error('Não foi possível localizar as colunas N.Fiscal/Número e Vl.Total/Valor do pagamento na planilha.');
}

function processarPlanilha(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  if (!workbook.SheetNames.length) throw new Error('A planilha enviada está vazia.');

  const sheetName = workbook.SheetNames.find((n) => n.trim().toUpperCase() === 'SGT') || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
  if (!rows.length) throw new Error('Não foi possível ler os dados da planilha.');

  const { headerRowIndex, headerMap } = findHeaderRow(rows);
  const documents = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const nfiscal = toDocumentString(row[headerMap['nfiscal']]);
    const numero = toDocumentString(row[headerMap['numero']]);
    const numeroDocumento = nfiscal || numero;
    const vlTotal = toNumber(row[headerMap['vltotal']]);
    const valorPagamento = toNumber(row[headerMap['valordopagamento']]);
    const valor = vlTotal !== null ? vlTotal : valorPagamento;

    if (!numeroDocumento || valor === null) continue;
    const rule = getRuleFromDocument(numeroDocumento);
    if (!rule) continue;

    documents.push({
      filial: '1',
      serie: rule.serie,
      numeroDocumento,
      tipoDocumento: rule.tipoDocumento,
      valorPago: Math.round(valor * 100) / 100,
    });
  }

  const totalValorBruto = documents.reduce((sum, d) => sum + d.valorPago, 0);
  return {
    documents,
    totalValorBruto: Math.round(totalValorBruto * 100) / 100,
    totalDocumentos: documents.length,
  };
}

function gerarPlanilhaFinal(documents) {
  const data = documents.map((doc) => ({
    FILIAL: doc.filial,
    SERIE: doc.serie,
    'Nº DOCUMENTO': doc.numeroDocumento,
    'TIPO DOCUMENTO': doc.tipoDocumento,
    'VALOR PAGO': doc.valorPago,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 15 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, NOME_ABA_SAIDA);
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}

function parseValor(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let str = String(raw).replace(/\s/g, '').replace(/R\$/gi, '').trim();
  if (!str) return null;
  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    str = lastComma > lastDot ? str.replace(/\./g, '').replace(',', '.') : str.replace(/,/g, '');
  } else if (lastComma !== -1) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    str = str.replace(/,/g, '');
  }
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

function processarPlatlog({ caminhoAnexo, valorBanco }) {
  log.info('Processador Platlog: processando planilha...');

  const valorBancoNum = parseValor(valorBanco);
  if (valorBancoNum === null || valorBancoNum <= 0) {
    return { ok: false, divergencia: false, detalhe: `Valor do banco inválido: "${valorBanco}"` };
  }

  let result;
  try {
    const buffer = fs.readFileSync(caminhoAnexo);
    result = processarPlanilha(buffer);
  } catch (err) {
    log.error(`Processador Platlog: erro ao processar — ${err.message}`);
    return { ok: false, divergencia: false, detalhe: err.message };
  }

  log.info(`Processador Platlog: ${result.totalDocumentos} documento(s), total R$ ${result.totalValorBruto.toFixed(2)}`);

  const diff = Math.abs(result.totalValorBruto - valorBancoNum);
  if (diff >= 0.01) {
    const detalhe = `Valor da planilha (R$ ${result.totalValorBruto.toFixed(2)}) diverge do valor do banco (R$ ${valorBancoNum.toFixed(2)}) — diferença de R$ ${diff.toFixed(2)}.`;
    log.warn(`Processador Platlog: DIVERGÊNCIA — ${detalhe}`);
    return { ok: false, divergencia: true, detalhe };
  }

  if (result.totalDocumentos === 0) {
    return { ok: false, divergencia: true, detalhe: 'Nenhum documento válido encontrado na planilha.' };
  }

  if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  const ts = Date.now();
  const caminhoSaida = path.join(DOWNLOADS_DIR, `platlog_baixa_${ts}.xlsx`);
  const outBuffer = gerarPlanilhaFinal(result.documents);
  fs.writeFileSync(caminhoSaida, outBuffer);

  log.info(`Processador Platlog: planilha de baixa gerada em ${caminhoSaida} (aba "${NOME_ABA_SAIDA}")`);
  return {
    ok: true,
    caminhoSaida,
    nomeAba: NOME_ABA_SAIDA,
    totalDocumentos: result.totalDocumentos,
    totalValorBruto: result.totalValorBruto,
  };
}

module.exports = { processarPlatlog, NOME_ABA_SAIDA };
