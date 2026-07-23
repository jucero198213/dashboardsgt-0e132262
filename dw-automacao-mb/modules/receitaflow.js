// ═══════════════════════════════════════════════════════════════════════
//  Processador Martin Brower — porta fiel da lógica do ReceitaFlow.
//
//  ⚠️  ESTE ARQUIVO É UM ESPELHO de:
//      ReceitaFlow → src/lib/processors/martin-brower.ts
//  Se as regras do MB mudarem lá, ATUALIZE aqui também. Mantidos em sincronia
//  manualmente porque a automação roda em Node (sem navegador) e o ReceitaFlow
//  processa no browser. A lógica é 100% client-side e determinística, então o
//  resultado é idêntico ao do site.
// ═══════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const log = require('./logger');

const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || path.join(__dirname, '..', 'downloads');
const NOME_ABA_SAIDA = 'DOCUMENTO'; // book_append_sheet(wb, ws, "DOCUMENTO")

// ── Helpers (porta de martin-brower.ts) ────────────────────────────────

function parseValor(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  let str = String(raw).replace(/\s/g, '').replace(/R\$/gi, '').trim();
  if (!str) return null;

  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    str = lastComma > lastDot
      ? str.replace(/\./g, '').replace(',', '.')
      : str.replace(/,/g, '');
  } else if (lastComma !== -1) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    str = str.replace(/,/g, '');
  }

  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

function normalizeColumnName(name) {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[º°]/g, 'o')
    .replace(/[ª]/g, 'a')
    .replace(/[_\-.:/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findColumnIndex(headers, possibleNames) {
  const normalizedHeaders = headers.map((h) => normalizeColumnName(h));
  const normalizedNames = possibleNames.map((n) => normalizeColumnName(n));

  for (const name of normalizedNames) {
    const exact = normalizedHeaders.indexOf(name);
    if (exact !== -1) return exact;
  }
  for (const name of normalizedNames) {
    const sw = normalizedHeaders.findIndex((h) => h.startsWith(name));
    if (sw !== -1) return sw;
  }
  for (const name of normalizedNames) {
    const ct = normalizedHeaders.findIndex((h) => h.includes(name));
    if (ct !== -1) return ct;
  }
  return -1;
}

function isEmptyCell(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return Number.isNaN(value);
  return false;
}

const SKIP_KEYWORDS = [
  'total', 'subtotal', 'sub total', 'sub-total', 'soma', 'resumo',
  'grand total', 'total geral', 'qtd', 'quantidade',
];

function isSummaryRow(faturaRaw) {
  const lower = normalizeColumnName(faturaRaw);
  return SKIP_KEYWORDS.some((k) => lower.includes(k));
}

function isValidFatura(str) {
  const cleaned = str.replace(/[\s.\-\/]/g, '');
  if (!/^\d+$/.test(cleaned)) return false;
  return cleaned.startsWith('36') || cleaned.startsWith('1');
}

function parseFatura(cleaned) {
  const str = cleaned.replace(/[\s.\-\/]/g, '');
  if (str.startsWith('36') && str.length > 2) {
    return { serie: '36', documento: str.slice(2) };
  }
  return { serie: '1', documento: str.slice(1) };
}

function parseExcelDate(raw) {
  if (raw == null) return null;

  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return null;
    const yyyy = String(d.y).padStart(4, '0');
    const mm = String(d.m).padStart(2, '0');
    const dd = String(d.d).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const str = String(raw).trim();
  if (!str) return null;

  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
  }
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  return null;
}

function formatDateForCompare(date) {
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ── Processamento principal (porta de processarMartinBrower) ───────────

function processarMartinBrower(fileBuffer, dataVencimento) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1, raw: true, defval: null, blankrows: false,
  });

  let headerRowIndex = -1;
  let colDataVcto = -1, colDataPagamento = -1, colFatura = -1, colValorBruto = -1;

  for (let i = 0; i < matrix.length; i++) {
    const headerCells = (matrix[i] ?? []).map((c) => String(c ?? ''));
    const dataVctoIndex = findColumnIndex(headerCells, ['Data Vcto.', 'Data Vcto', 'Data de Vencimento']);
    const dataPagamentoIndex = findColumnIndex(headerCells, ['Data de Pagamento', 'Data Pagamento', 'Dt Pagamento']);
    const faturaIndex = findColumnIndex(headerCells, ['Nº da Fatura', 'No da Fatura', 'Numero da Fatura', 'N da Fatura']);
    const valorBrutoIndex = findColumnIndex(headerCells, ['Valor Bruto', 'Valor']);

    if (dataVctoIndex !== -1 && dataPagamentoIndex !== -1 && faturaIndex !== -1 && valorBrutoIndex !== -1) {
      headerRowIndex = i;
      colDataVcto = dataVctoIndex;
      colDataPagamento = dataPagamentoIndex;
      colFatura = faturaIndex;
      colValorBruto = valorBrutoIndex;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Não foi possível localizar as colunas obrigatórias da planilha Martin Brower.');
  }

  const rows = matrix.slice(headerRowIndex + 1);
  const totalLinhasLidas = rows.length;
  const dataVctoAlvo = formatDateForCompare(dataVencimento);

  const documents = [];
  const errors = [];
  let totalValorBruto = 0;
  let totalLinhasFiltradasData = 0;
  let totalLinhasIgnoradas = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const rowNum = headerRowIndex + i + 2;

    const dataVctoStr = parseExcelDate(row[colDataVcto]);
    if (dataVctoStr !== dataVctoAlvo) continue;
    totalLinhasFiltradasData++;

    const rawDataPagamento = row[colDataPagamento];
    const rawFaturaVal = row[colFatura];
    const rawValorVal = row[colValorBruto];

    const faturaStr = isEmptyCell(rawFaturaVal) ? '' : String(rawFaturaVal).trim();
    const valorStr = isEmptyCell(rawValorVal) ? '' : String(rawValorVal).trim();
    const valorConvertido = parseValor(rawValorVal);

    // Linha com data de pagamento preenchida → removida (já foi paga)
    if (!isEmptyCell(rawDataPagamento)) continue;

    if (!faturaStr) {
      errors.push({ row: rowNum, fatura: '', motivo: 'Nº da Fatura vazio' });
      continue;
    }
    if (isSummaryRow(faturaStr) || !isValidFatura(faturaStr)) {
      if (isSummaryRow(faturaStr)) totalLinhasIgnoradas++;
      errors.push({ row: rowNum, fatura: faturaStr, motivo: `Nº da Fatura inválido: "${faturaStr}"` });
      continue;
    }
    if (valorConvertido === null) {
      errors.push({ row: rowNum, fatura: faturaStr, motivo: `Valor Bruto vazio ou inválido: "${valorStr}"` });
      continue;
    }

    const faturaData = parseFatura(faturaStr);
    totalValorBruto += valorConvertido;
    documents.push({
      filial: '1',
      serie: faturaData.serie,
      numeroDocumento: faturaData.documento,
      tipoDocumento: 'CTRC',
      valorPago: Math.round(valorConvertido * 100) / 100,
    });
  }

  return {
    documents,
    errors,
    totalValorBruto: Math.round(totalValorBruto * 100) / 100,
    totalDocumentos: documents.length,
    totalLinhasLidas,
    totalLinhasFiltradasData,
    totalLinhasIgnoradas,
    totalLinhasComErro: errors.length,
  };
}

// ── Geração da planilha final (porta de gerarPlanilhaFinal) ────────────

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

// ── Wrapper usado pela orquestração ────────────────────────────────────

// Converte "dd/mm/yyyy" → Date local
function parseDataBR(str) {
  const m = String(str).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function processarMB({ caminhoAnexo, dataVencimento, valorBanco }) {
  log.info('ReceitaFlow(local): processando planilha MB...');

  const dataVenc = parseDataBR(dataVencimento);
  if (!dataVenc) {
    return { ok: false, divergencia: false, detalhe: `Data de vencimento inválida: "${dataVencimento}" (esperado dd/mm/aaaa)` };
  }

  const valorBancoNum = parseValor(valorBanco);
  if (valorBancoNum === null || valorBancoNum <= 0) {
    return { ok: false, divergencia: false, detalhe: `Valor do banco inválido: "${valorBanco}"` };
  }

  let result;
  try {
    const buffer = fs.readFileSync(caminhoAnexo);
    result = processarMartinBrower(buffer, dataVenc);
  } catch (err) {
    log.error(`ReceitaFlow(local): erro ao processar — ${err.message}`);
    return { ok: false, divergencia: false, detalhe: err.message };
  }

  log.info(`ReceitaFlow(local): ${result.totalDocumentos} documento(s), total R$ ${result.totalValorBruto.toFixed(2)}, ${result.totalLinhasComErro} erro(s)`);

  // ── Verificação de divergência ──────────────────────────────────────
  const diff = Math.abs(result.totalValorBruto - valorBancoNum);
  const divergeValor = diff >= 0.01;
  const temErros = result.totalLinhasComErro > 0;

  if (divergeValor || temErros) {
    const partes = [];
    if (divergeValor) {
      partes.push(
        `Valor da planilha (R$ ${result.totalValorBruto.toFixed(2)}) diverge do valor do banco ` +
        `(R$ ${valorBancoNum.toFixed(2)}) — diferença de R$ ${diff.toFixed(2)}.`
      );
    }
    if (temErros) {
      const amostra = result.errors.slice(0, 5)
        .map((e) => `linha ${e.row}: ${e.motivo}`).join('; ');
      partes.push(`${result.totalLinhasComErro} linha(s) com erro. Ex.: ${amostra}`);
    }
    const detalhe = partes.join('\n');
    log.warn(`ReceitaFlow(local): DIVERGÊNCIA — ${detalhe}`);
    return { ok: false, divergencia: true, detalhe };
  }

  if (result.totalDocumentos === 0) {
    return { ok: false, divergencia: true, detalhe: 'Nenhum documento válido encontrado para a data de vencimento informada.' };
  }

  // ── Gera a planilha de baixa ────────────────────────────────────────
  if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  const ts = Date.now();
  const caminhoSaida = path.join(DOWNLOADS_DIR, `mb_baixa_${ts}.xlsx`);
  const outBuffer = gerarPlanilhaFinal(result.documents);
  fs.writeFileSync(caminhoSaida, outBuffer);

  log.info(`ReceitaFlow(local): planilha de baixa gerada em ${caminhoSaida} (aba "${NOME_ABA_SAIDA}")`);
  return {
    ok: true,
    caminhoSaida,
    nomeAba: NOME_ABA_SAIDA,
    totalDocumentos: result.totalDocumentos,
    totalValorBruto: result.totalValorBruto,
  };
}

module.exports = { processarMB, NOME_ABA_SAIDA };
