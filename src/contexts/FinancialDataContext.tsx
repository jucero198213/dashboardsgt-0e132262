import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type {
  ContaPagar,
  ContaReceber,
  ResumoFinanceiro,
} from "@/data/mockData";
import {
  loadDwFilters,
  fetchDwData,
  fetchFaturamento,
  type FilterOption,
  type DwRow,
  type FaturamentoRow,
} from "@/lib/dwApi";

export interface IndicadorComparativo {
  id: string;
  nome: string;
  percentualReal: number;
  percentualEsperado: number;
  valorAbsoluto: number;   // valor bruto do indicador (VLR_PARCELA) — usado para % vs faturamento
}

// ─── DW Filter state ──────────────────────────────────────────────────────────
export interface DwFilter {
  dataInicio: string;
  dataFim:    string;
  filial:     string | null;
  empresa:    string | null;
}

const hoje = new Date();
const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
const toIsoDate = (d: Date) => d.toISOString().split("T")[0];

const defaultDwFilter: DwFilter = {
  dataInicio: toIsoDate(primeiroDiaMes),
  dataFim:    toIsoDate(hoje),
  filial:     null,
  empresa:    null,
};

type FinanceStatus = "Em Aberto" | "Vencido" | "Parcial";

const EXPECTED_INDICATORS: Record<string, number> = {
  "Compra de Ativo":  33,
  "Óleo Diesel":      26,
  "Folha":            21,
  "Imposto":           5,
  "Pedágio":           5,
  "Administrativo":    5,
  "Manutenção":       15,
  "Pneu":              5,
};

const defaultKpiExtra: KpiExtra = {
  saldoLiquido:      0,
  inadimplencia:     0,
  inadimplenciaDocs: 0,
  inadimplenciaPerc: 0,
  realizacaoCP:      0,
  realizacaoCR:      0,
};


const defaultResumo: ResumoFinanceiro = {
  contasReceber: { valorAReceber: 0, valorRecebido: 0, saldoAReceber: 0 },
  contasPagar: { valorAPagar: 0, valorPago: 0, saldoAPagar: 0 },
};

const defaultIndicadores: IndicadorComparativo[] = Object.entries(
  EXPECTED_INDICATORS
).map(([nome, percentualEsperado], index) => ({
  id: String(index + 1),
  nome,
  percentualReal: 0,
    valorAbsoluto: 0,
  percentualEsperado,
}));

// ─── Monthly chart data ──────────────────────────────────────────────────────
export interface DadosMensais {
  /** Valor previsto (VLR_PARCELA de registros pendentes) por mês index 0-11 */
  previsto: number[];
  /** Valor realizado (VLR_PAGO de registros liquidados) por mês index 0-11 */
  realizado: number[];
  /** Ano de referência do gráfico */
  ano: string;
}

// ─── KPIs extras ─────────────────────────────────────────────────────────────
export interface KpiExtra {
  saldoLiquido:      number;
  inadimplencia:     number;
  inadimplenciaDocs: number;
  inadimplenciaPerc: number;  // % inadimplência / A RECEBER
  realizacaoCP:      number;
  realizacaoCR:      number;
}

// ─── State & Context types ───────────────────────────────────────────────────

interface FinancialDataState {
  isProcessed: boolean;
  resumo: ResumoFinanceiro;
  contasReceber: ContaReceber[];
  contasPagar: ContaPagar[];
  indicadores: IndicadorComparativo[];
  chartPagar:        DadosMensais;
  chartReceber:      DadosMensais;
  kpiExtra:          KpiExtra;
  dwFilter:          DwFilter;
  filiais:           FilterOption[];
  empresas:          FilterOption[];
  isFetchingDw:      boolean;
  dwError:           string | null;
  dwRawData:         DwRow[];   // ← dados brutos para drill-down por indicador
  dwChartData:       DwRow[];   // ← dados anuais para gráficos de evolução
  faturamento:       FaturamentoRow[]; // ← faturamento por grupo de cliente
}

interface FinancialDataContextType extends FinancialDataState {
  setDwFilter:   (key: keyof DwFilter, value: string | null) => void;
  fetchFromDW:   () => Promise<void>;
}

const FinancialDataContext = createContext<FinancialDataContextType | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const toDate = (value: unknown): Date | null => {
  if (value == null) return null;

  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === "null") return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateStatus = (
  vencimentoValue: unknown,
  valorLiquido: number,
  valorPago: number,
  situacaoRaw?: string
): FinanceStatus => {
  const saldo = Math.max(valorLiquido - valorPago, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (saldo <= 0) return "Parcial";
  if (valorPago > 0) return "Parcial";

  const situacao = normalizeText(situacaoRaw);
  if (situacao.includes("venc")) return "Vencido";

  const vencimento = toDate(vencimentoValue);
  if (vencimento && vencimento < today) return "Vencido";

  return "Em Aberto";
};

// ─── Cache sessionStorage ─────────────────────────────────────────────────────
const CACHE_KEY = "dw_financial_cache_v8";

interface CachedState {
  resumo: ResumoFinanceiro;
  contasReceber: ContaReceber[];
  contasPagar: ContaPagar[];
  indicadores: IndicadorComparativo[];
  chartPagar: DadosMensais;
  chartReceber: DadosMensais;
  kpiExtra?: KpiExtra;
  faturamento: FaturamentoRow[];
  dwFilter: DwFilter;
  timestamp: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

function saveCache(data: CachedState) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignora */ }
}

function loadCache(): CachedState | null {
  try {
    // Limpa versão antiga se existir
    sessionStorage.removeItem("dw_financial_cache_v1");
    sessionStorage.removeItem("dw_financial_cache_v2");
    sessionStorage.removeItem("dw_financial_cache_v3");
    sessionStorage.removeItem("dw_financial_cache_v4");
    sessionStorage.removeItem("dw_financial_cache_v5");
    sessionStorage.removeItem("dw_financial_cache_v6");
    sessionStorage.removeItem("dw_financial_cache_v7");

    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedState = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    // Garante que todos os campos de kpiExtra existem
    if (parsed.kpiExtra && typeof parsed.kpiExtra.realizacaoCR === "undefined") {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function FinancialDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Recupera cache ao montar (persiste dados entre navegações) ────────────
  const cached = loadCache();

  const [state, setState] = useState<FinancialDataState>({
    isProcessed:  cached ? true : false,
    resumo:       cached?.resumo       ?? defaultResumo,
    contasReceber:cached?.contasReceber ?? [],
    contasPagar:  cached?.contasPagar   ?? [],
    indicadores:  cached?.indicadores   ?? defaultIndicadores,
    chartPagar:   cached?.chartPagar    ?? { previsto: new Array(12).fill(0), realizado: new Array(12).fill(0), ano: "" },
    chartReceber: cached?.chartReceber  ?? { previsto: new Array(12).fill(0), realizado: new Array(12).fill(0), ano: "" },
    kpiExtra:     cached?.kpiExtra ?? defaultKpiExtra,
    dwFilter:     cached?.dwFilter      ?? defaultDwFilter,
    filiais:      [],
    empresas:     [],
    isFetchingDw: false,
    dwError:      null,
    dwRawData:    [],
    dwChartData:  [],
    faturamento:  cached?.faturamento ?? [],
  });

  // ── Ref para cancelar fetch anterior quando filtros mudam rapidamente ─────
  const abortRef = useRef<AbortController | null>(null);

  // ─── DW: atualiza um campo do filtro ───────────────────────────────────────
  const setDwFilter = useCallback(
    (key: keyof DwFilter, value: string | null) => {
      setState((prev) => ({
        ...prev,
        dwFilter: { ...prev.dwFilter, [key]: value },
      }));
    },
    []
  );

  // ─── DW: helper para correspondência de indicadores ────────────────────────
  const matchesIndicadorDw = (indicatorName: string, row: DwRow): boolean => {
    const text = [
      row.NOME_PARCEIRO, row.CENTRO_GASTO, row.CENTRO_CUSTO,
      row.SINTETICA, row.ANALITICA, row.TIPO_DOCUMENTO,
    ]
      .map((v) => (v ?? "").toLowerCase())
      .join(" ");

    const rules: Record<string, string[]> = {
      "Compra de Ativo": ["ativo", "invest", "imobil"],
      "Óleo Diesel":     ["diesel", "oleo diesel", "combustivel"],
      Folha:             ["folha", "pagto", "salarial", "rh"],
      Imposto:           ["imposto", "tribut", "fiscal", "taxa"],
      Pedágio:           ["pedagio", "pedágio"],
      Administrativo:    ["administrativo", "adm"],
      Manutenção:        ["manut", "oficina", "peca", "peça", "reparo"],

    };
    const keywords = rules[indicatorName] ?? [indicatorName.toLowerCase()];
    return keywords.some((k) => text.includes(k));
  };

  // ─── DW: executa a query principal e atualiza o estado ─────────────────────
  const fetchFromDW = useCallback(async () => {
    // Cancela requisição anterior se ainda estiver em andamento
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    // INCREMENTAL: apenas marca isFetchingDw=true, MANTÉM dados anteriores visíveis
    setState((prev) => ({ ...prev, isFetchingDw: true, dwError: null }));

    try {
      // ── 1. Fetch principal — KPI cards (prioridade máxima) ─────────────────
      const { data } = await fetchDwData({
        dataInicio: state.dwFilter.dataInicio,
        dataFim:    state.dwFilter.dataFim,
        filial:     state.dwFilter.filial,
        empresa:    state.dwFilter.empresa,
      });
      const faturamento: import("@/lib/dwApi").FaturamentoRow[] = [];  // será preenchido após o fetch principal

      const n = (v: number | null | undefined) => v ?? 0;
      const isoDate = (v: string | null) => (v ? v.split("T")[0] : toIsoDate(hoje));
      const round2 = (v: number) => Math.round(v * 100) / 100;

      // ── Helpers de filtro ───────────────────────────────────────────────────
      const sit    = (r: DwRow) => (r.SITUACAO ?? "").trim().toUpperCase();
      const hasPag = (r: DwRow) => r.DATA_PAGAMENTO !== null && r.DATA_PAGAMENTO !== undefined && r.DATA_PAGAMENTO !== "";
      const noPag  = (r: DwRow) => !hasPag(r);

      // helper: data no intervalo do filtro externo
      const di = state.dwFilter.dataInicio; // "YYYY-MM-DD"
      const df = state.dwFilter.dataFim;    // "YYYY-MM-DD"
      const inRange = (d: string | null, start: string, end: string) => {
        if (!d) return false;
        const dd = d.split("T")[0];
        return dd >= start && dd <= end;
      };

      // ── Todos os registros por origem ───────────────────────────────────────
      const allCP = data.filter((r) => r.ORIGEM === "CP");
      const allCR = data.filter((r) => r.ORIGEM === "CR");

      // ─────────────────────────────────────────────────────────────────────────
      // 1. A PAGAR (card topo)
      //    → CP | SITUACAO L/P/D | DATA_VENCIMENTO no período | VLR_PARCELA
      //    Tudo programado para pagar no período (independente de estar pago)
      // ─────────────────────────────────────────────────────────────────────────
      const cpAPagar = allCP.filter((r) =>
        (sit(r) === "L" || sit(r) === "P" || sit(r) === "D") &&
        inRange(r.DATA_VENCIMENTO, di, df)
      );

      // ─────────────────────────────────────────────────────────────────────────
      // 1b. PAGO (card topo)
      //    → CP | SITUACAO L/P | DATA_PAGAMENTO no período | VLR_PAGO
      //    Opção A — Fluxo de caixa real: tudo que saiu do caixa no período,
      //    independente de quando vencia (inclui pagamentos de outros meses)
      // ─────────────────────────────────────────────────────────────────────────
      const cpPago = allCP.filter((r) =>
        (sit(r) === "L" || sit(r) === "P") &&
        hasPag(r) &&
        inRange(r.DATA_PAGAMENTO, di, df)
      );

      // ─────────────────────────────────────────────────────────────────────────
      // 1c. SUB-CARD CONTAS A PAGAR — saldo pendente (split D/P)
      //    D → totalmente em aberto: saldo = VLR_PARCELA integral
      //    P → parcialmente pago:    saldo = VLR_PARCELA − VLR_PAGO
      //    (noPag() excluía os P com DATPAG preenchida, perdendo saldo residual)
      // ─────────────────────────────────────────────────────────────────────────
      const cpEmAberto = allCP.filter((r) =>
        sit(r) === "D" &&
        inRange(r.DATA_VENCIMENTO, di, df)
      );
      const cpParcialAberto = allCP.filter((r) =>
        sit(r) === "P" &&
        inRange(r.DATA_VENCIMENTO, di, df)
      );

      // ─────────────────────────────────────────────────────────────────────────
      // 2. A RECEBER (card topo)
      //    → CR | SITUACAO L/P/D | DATA_VENCIMENTO no período | VLR_PARCELA
      //    Tudo programado para vencer no período (independente de estar pago)
      // ─────────────────────────────────────────────────────────────────────────
      const crAReceber = allCR.filter((r) =>
        (sit(r) === "L" || sit(r) === "P" || sit(r) === "D") &&
        inRange(r.DATA_VENCIMENTO, di, df)
      );

      // ─────────────────────────────────────────────────────────────────────────
      // 3. PAGO → CP já definido acima como cpPago
      // ─────────────────────────────────────────────────────────────────────────

      // ─────────────────────────────────────────────────────────────────────────
      // 4. RECEBIDO (card topo)
      //    → CR | SITUACAO L/P | DATA_VENCIMENTO no período | VLR_PAGO
      //    Tudo recebido cujo vencimento estava no período (independente de
      //    quando o pagamento foi registrado — corrige parciais com DATREC fora
      //    do período que antes ficavam de fora).
      // ─────────────────────────────────────────────────────────────────────────
      const crRecebido = allCR.filter((r) =>
        (sit(r) === "L" || sit(r) === "P") &&
        hasPag(r) &&
        inRange(r.DATA_VENCIMENTO, di, df)   // ← era DATA_PAGAMENTO
      );

      // ─────────────────────────────────────────────────────────────────────────
      // 5. SUB-CARD CONTAS A RECEBER (saldo pendente)
      //    D → totalmente em aberto: saldo = VLR_PARCELA
      //    P → parcialmente pago:    saldo = VLR_PARCELA - VLR_PAGO
      //    (o filtro noPag() excluía os P que já tinham DATA_PAGAMENTO, fazendo
      //    o saldo parcial sumir do card — corrigido abaixo)
      // ─────────────────────────────────────────────────────────────────────────
      const crEmAberto = allCR.filter((r) =>
        sit(r) === "D" &&
        inRange(r.DATA_VENCIMENTO, di, df)
      );
      const crParcialAberto = allCR.filter((r) =>
        sit(r) === "P" &&
        inRange(r.DATA_VENCIMENTO, di, df)
      );

      // ── Helpers de deduplicação ──────────────────────────────────────────────
      // O LEFT JOIN RECRAT multiplica cada parcela em N linhas (1 por centro de
      // custo). Para KPIs financeiros deduplicamos por (DOCUMENTO, PARCELA) e
      // usamos VLR_PAR_RAW / VLR_REC_RAW (campos diretos sem multiplicação de
      // rateio) com fallback para VLR_PARCELA / VLR_PAGO quando forem null
      // (registros sem entrada em RECRAT — sem rateio de centro de custo).
      const dedup = (rows: DwRow[]) => {
        const seen = new Set<string>();
        return rows.filter((r) => {
          // Inclui COD_PARCEIRO para evitar colisão entre fornecedores diferentes
          // com o mesmo número de documento (ex: NUMDOC=1 para N fornecedores)
          // SERIE garante unicidade no CP: mesmo fornecedor pode ter NUMDOC=1 em séries diferentes
          const k = `${r.COD_PARCEIRO ?? ""}|${r.SERIE ?? ""}|${r.DOCUMENTO ?? ""}|${r.PARCELA ?? ""}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      };

      // Valor seguro: prefere campo raw (sem rateio), cai em campo proporcional
      const safeParVal = (r: DwRow) =>
        n(r.VLR_PAR_RAW) > 0 ? n(r.VLR_PAR_RAW) : n(r.VLR_PARCELA ?? r.VLRDOC);
      const safeRecVal = (r: DwRow) =>
        n(r.VLR_REC_RAW) > 0 ? n(r.VLR_REC_RAW) : n(r.VLR_PAGO);

      // ── Somas ───────────────────────────────────────────────────────────────
      const sumCol = (rows: DwRow[], f: "VLR_PARCELA" | "VLR_PAGO") =>
        round2(rows.reduce((s, r) => s + n(r[f]), 0));

      // A PAGAR: deduplicado — usa VLR_PAR_RAW, fallback VLR_PARCELA (evita dupla contagem do PAGRAT)
      const totalPagar  = round2(
        dedup(cpAPagar).reduce((s, r) => s + safeParVal(r), 0)
      );
      // PAGO: deduplicado — usa VLR_REC_RAW (VLRPAG direto do PAGDOCI), fallback VLR_PAGO
      const valorPago   = round2(
        dedup(cpPago).reduce((s, r) => s + safeRecVal(r), 0)
      );
      // SALDO = D (em aberto total) + P (restante = parcela − adiantamento − pago), deduplicado
      // CP: VLR_REC_RAW = I.VLRPAG (sem DESADT) → precisamos subtrair DESADT separadamente
      // CR: VLR_REC_RAW = I.VLRREC + DESADT     → já embutido, não subtrair de novo
      const saldoAPagar = round2(
        dedup(cpEmAberto).reduce((s, r) => s + safeParVal(r), 0) +
        dedup(cpParcialAberto).reduce((s, r) => s + Math.max(0, safeParVal(r) - safeRecVal(r) - n(r.DESADT)), 0)
      );

      // A RECEBER: deduplicado — usa VLR_PAR_RAW, fallback VLR_PARCELA
      const totalAReceber = round2(
        dedup(crAReceber).reduce((s, r) => s + safeParVal(r), 0)
      );
      // RECEBIDO: deduplicado — usa VLR_REC_RAW (VLRREC+DESADT), fallback VLR_PAGO
      const valorRecebido = round2(
        dedup(crRecebido).reduce((s, r) => s + safeRecVal(r), 0)
      );
      // SALDO = D (em aberto total) + P (restante = parcela - recebido)
      const totalReceber  = round2(
        dedup(crEmAberto).reduce((s, r) => s + safeParVal(r), 0) +
        dedup(crParcialAberto).reduce((s, r) => s + Math.max(0, safeParVal(r) - safeRecVal(r)), 0)
      );

      // ── Debug (visível no console do browser) ────────────────────────────────
      console.log("[DW] Rows totais:", data.length,
        "| allCP:", allCP.length, "| allCR:", allCR.length
      );
      console.log("[DW] CP → A PAGAR:", totalPagar,
        "| PAGO:", valorPago,
        "| SALDO:", saldoAPagar
      );
      console.log("[DW] CR → A RECEBER:", totalAReceber,
        "| RECEBIDO:", valorRecebido,
        "| SALDO:", totalReceber
      );

      const resumo: ResumoFinanceiro = {
        contasPagar: {
          valorAPagar: totalPagar,   // card A PAGAR = programado para pagar no período
          valorPago,                  // card PAGO    = pago com datapag no período
          saldoAPagar,                // sub-card CONTAS A PAGAR = saldo pendente (D/P + noPag)
        },
        contasReceber: {
          valorAReceber: totalAReceber,  // card A RECEBER = programado para vencer no período
          valorRecebido,                  // card RECEBIDO  = recebido com datapag no período
          saldoAReceber: totalReceber,    // sub-card CONTAS A RECEBER = saldo pendente
        },
      };

      // ── Tabelas de detalhe (usam todos os CP/CR sem filtro de situação) ──────
      const contasPagar: ContaPagar[] = allCP.map((r, i) => {
        const valor        = n(r.VLR_PARCELA ?? r.VLR_LIQUIDO ?? r.VLRDOC);
        const valorPagoRow = n(r.VLR_PAGO);
        return {
          id:            String(i + 1),
          documento:     r.DOCUMENTO ?? `CP-${i + 1}`,
          parcela:       r.PARCELA ?? null,
          fornecedor:    r.NOME_PARCEIRO ?? "N/A",
          dataEmissao:   isoDate(r.DATA_EMISSAO),
          vencimento:    isoDate(r.DATA_VENCIMENTO),
          dataPagamento: r.DATA_PAGAMENTO ? isoDate(r.DATA_PAGAMENTO) : null,
          valor,
          valorPago:     valorPagoRow,
          juros:         n(r.VLRJUR),
          descontos:     n(r.VLRDES),
          adiantamento:  n(r.DESADT),
          status: calculateStatus(r.DATA_VENCIMENTO, valor, valorPagoRow, r.SITUACAO ?? ""),
        };
      });

      const contasReceber: ContaReceber[] = allCR.map((r, i) => {
        const valor            = n(r.VLR_PARCELA ?? r.VLR_LIQUIDO ?? r.VLRDOC);
        const valorRecebidoRow = n(r.VLR_PAGO);
        return {
          id:            String(i + 1),
          documento:     r.DOCUMENTO ?? `CR-${i + 1}`,
          parcela:       r.PARCELA ?? null,
          cliente:       r.NOME_PARCEIRO ?? "N/A",
          dataEmissao:   isoDate(r.DATA_EMISSAO),
          vencimento:    isoDate(r.DATA_VENCIMENTO),
          dataPagamento: r.DATA_PAGAMENTO ? isoDate(r.DATA_PAGAMENTO) : null,
          valor,
          valorRecebido: valorRecebidoRow,
          juros:         n(r.VLRJUR),
          descontos:     n(r.VLRDES),
          adiantamento:  n(r.DESADT),
          status: calculateStatus(r.DATA_VENCIMENTO, valor, valorRecebidoRow, r.SITUACAO ?? ""),
        };
      });

      // ─────────────────────────────────────────────────────────────────────────
      // INDICADORES — VLR_PARCELA agrupado por CODCUS (código centro de custo)
      // Base: todos os CP (sem filtro de situação)
      // ─────────────────────────────────────────────────────────────────────────
      const indicadorRules: Record<string, string[]> = {
        "Óleo Diesel":     ["21"],
        "Imposto":         ["23"],
        "Administrativo":  ["3"],
        "Pedágio":         ["24"],
        "Manutenção":      ["4", "5", "6", "7", "25"],
        "Compra de Ativo": ["26"],
        "Folha":           ["9"],
        "Pneu":            ["28"],
      };

      // Base indicadores: CP filtrado por DATA_EMISSAO no período selecionado
      // (indicadores medem despesas EMITIDAS no período, não vencidas/pagas)
      const baseIndicadores = allCP.filter((r) => {
        const em = r.DATA_EMISSAO ? String(r.DATA_EMISSAO).split("T")[0] : null;
        return em ? em >= di && em <= df : false;
      });
      const totalBaseInd = sumCol(baseIndicadores, "VLR_PARCELA");

      const indicadores: IndicadorComparativo[] = Object.entries(EXPECTED_INDICATORS).map(
        ([nome, percentualEsperado], index) => {
          const codcusList = indicadorRules[nome] ?? [];
          const matched = codcusList.length > 0
            ? baseIndicadores.filter((r) => {
                // compara CODCUS (código) — pode vir como string ou número
                const cod = String(r.CODCUS ?? "").trim();
                return codcusList.includes(cod);
              })
            : [];
          const matchedTotal = sumCol(matched, "VLR_PARCELA");
          const percentualReal = totalBaseInd > 0 ? (matchedTotal / totalBaseInd) * 100 : 0;
          return {
            id: String(index + 1),
            nome,
            percentualReal:   Math.round(percentualReal * 10) / 10,
            percentualEsperado,
            valorAbsoluto:    Math.round(matchedTotal * 100) / 100,
          };
        }
      );

      // ── Dados mensais para gráficos — array vazio inicial, preenchido em background
      const anoFiltro = state.dwFilter.dataInicio.substring(0, 4);

      const extractMonth = (dateVal: unknown): number => {
        if (dateVal == null) return -1;
        if (dateVal instanceof Date) return dateVal.getMonth();
        const s = String(dateVal).trim();
        if (!s || s.toLowerCase() === "null") return -1;
        const isoMatch = s.match(/^(\d{4})-(\d{2})/);
        if (isoMatch) return parseInt(isoMatch[2], 10) - 1;
        const brMatch = s.match(/^\d{2}\/(\d{2})\/\d{4}/);
        if (brMatch) return parseInt(brMatch[1], 10) - 1;
        return -1;
      };

      const groupByMonth = (rows: DwRow[], field: "VLR_PARCELA" | "VLR_PAGO", dateField: "DATA_VENCIMENTO" | "DATA_PAGAMENTO" = "DATA_VENCIMENTO"): number[] => {
        const result = new Array(12).fill(0);
        for (const r of rows) {
          const monthIdx = extractMonth(r[dateField]);
          if (monthIdx >= 0 && monthIdx < 12) {
            result[monthIdx] += n(r[field]);
          }
        }
        return result.map(round2);
      };

      // Gráficos inicializam zerados — serão preenchidos após o background fetch
      const chartPagar: DadosMensais = {
        previsto:  new Array(12).fill(0),
        realizado: new Array(12).fill(0),
        ano: anoFiltro,
      };

      const chartReceber: DadosMensais = {
        previsto:  new Array(12).fill(0),
        realizado: new Array(12).fill(0),
        ano: anoFiltro,
      };

      // ─────────────────────────────────────────────────────────────────────────
      // KPIs EXTRAS
      // ─────────────────────────────────────────────────────────────────────────
      const hoje2 = new Date();
      hoje2.setHours(0, 0, 0, 0);

      // 1. Saldo Líquido = RECEBIDO - PAGO
      const saldoLiquido = round2(valorRecebido - valorPago);

      // 2. Inadimplência = CR vencido (DATA_VENCIMENTO < hoje, DATA_PAGAMENTO NULL)
      const inadimDocs = allCR.filter((r) => {
        if (hasPag(r)) return false;
        const dtVenc = r.DATA_VENCIMENTO ? new Date(r.DATA_VENCIMENTO) : null;
        return dtVenc !== null && dtVenc < hoje2;
      });
      const inadimplencia     = sumCol(inadimDocs, "VLR_PARCELA");
      const inadimplenciaDocs = inadimDocs.length;
      // % Inadimplência = inadimplência / A RECEBER total
      const inadimplenciaPerc = totalAReceber > 0
        ? Math.round((inadimplencia / totalAReceber) * 1000) / 10
        : 0;

      // 3. % Realização CP = PAGO / A PAGAR * 100
      const realizacaoCP = totalPagar > 0
        ? Math.round((valorPago / totalPagar) * 1000) / 10
        : 0;

      // 4. % Realização CR = docs com DATVEN no período que foram recebidos / A RECEBER
      //    Mede: do que vencia no período, quanto % foi efetivamente cobrado
      const crRecebidoPeriodo = crAReceber.filter((r) => (sit(r) === "L" || sit(r) === "P") && hasPag(r));
      const realizacaoCR = totalAReceber > 0
        ? Math.round((sumCol(crRecebidoPeriodo, "VLR_PARCELA") / totalAReceber) * 1000) / 10
        : 0;

      const kpiExtra: KpiExtra = { saldoLiquido, inadimplencia, inadimplenciaDocs, inadimplenciaPerc, realizacaoCP, realizacaoCR };
      // Faturamento: preserva o que o background fetch já preencheu (ou o cache anterior)
      setState((prev) => {
        const fatAtual = prev.faturamento;
        saveCache({
          resumo, contasReceber, contasPagar, indicadores,
          chartPagar, chartReceber,
          kpiExtra,
          faturamento: fatAtual,
          dwFilter: state.dwFilter,
          timestamp: Date.now(),
        });
        return {
          ...prev,
          isFetchingDw: false,
          isProcessed:  true,
          resumo, contasReceber, contasPagar, indicadores,
          chartPagar, chartReceber, kpiExtra,
          dwRawData: data,
          dwChartData: prev.dwChartData,  // preserva dados anteriores — preenchido pelo background fetch
        };
      });

      // ── 2. Queries secundárias em cadeia (sequencial, não bloqueiam a UI) ──
      //    Ordem: faturamento → gráfico anual
      //    Cada uma dispara só quando a anterior terminar, evitando concorrência no pool.
      const fatSnap    = { dataInicio: state.dwFilter.dataInicio, dataFim: state.dwFilter.dataFim };
      const chartSnap  = { dataInicio: `${anoFiltro}-01-01`, dataFim: `${anoFiltro}-12-31`, filial: state.dwFilter.filial, empresa: state.dwFilter.empresa };

      fetchFaturamento(fatSnap)
        .then(({ data: fatData }) => {
          setState((prev) => ({ ...prev, faturamento: fatData }));
        })
        .catch((err) => {
          console.warn("[DW] Faturamento erro (não crítico):", err?.message ?? err);
        })
        .finally(() => {
          // Gráfico anual: só dispara depois que faturamento terminar (ok ou erro)
          fetchDwData(chartSnap)
            .then(({ data: chartData }) => {
              const chartAllCP = chartData.filter((r) => r.ORIGEM === "CP");
              const chartAllCR = chartData.filter((r) => r.ORIGEM === "CR");
              const chartCrPrevisto = chartAllCR.filter((r) => { const s = (r.SITUACAO ?? "").trim().toUpperCase(); return s === "L" || s === "P" || s === "D"; });
              const chartCrRecebido = chartAllCR.filter((r) => { const s = (r.SITUACAO ?? "").trim().toUpperCase(); return (s === "L" || s === "P") && r.DATA_PAGAMENTO != null && r.DATA_PAGAMENTO !== ""; });
              const chartCpPrevisto = chartAllCP.filter((r) => { const s = (r.SITUACAO ?? "").trim().toUpperCase(); return s === "L" || s === "P" || s === "D"; });
              const chartCpPago     = chartAllCP.filter((r) => { const s = (r.SITUACAO ?? "").trim().toUpperCase(); return (s === "L" || s === "P") && r.DATA_PAGAMENTO != null && r.DATA_PAGAMENTO !== ""; });
              const em = (dateVal: unknown): number => {
                if (dateVal == null) return -1;
                const s = String(dateVal).trim();
                const m = s.match(/^\d{4}-(\d{2})/) ?? s.match(/^\d{2}\/(\d{2})\//);
                return m ? parseInt(m[1], 10) - 1 : -1;
              };
              const gbm = (rows: DwRow[], field: "VLR_PARCELA" | "VLR_PAGO", df: "DATA_VENCIMENTO" | "DATA_PAGAMENTO" = "DATA_VENCIMENTO") => {
                const res = new Array(12).fill(0);
                for (const r of rows) { const mi = em(r[df]); if (mi >= 0) res[mi] += (r[field] ?? 0); }
                return res.map((v) => Math.round(v * 100) / 100);
              };
              setState((prev) => ({
                ...prev,
                chartPagar:   { previsto: gbm(chartCpPrevisto, "VLR_PARCELA", "DATA_VENCIMENTO"), realizado: gbm(chartCpPago, "VLR_PAGO", "DATA_PAGAMENTO"), ano: anoFiltro },
                chartReceber: { previsto: gbm(chartCrPrevisto, "VLR_PARCELA", "DATA_VENCIMENTO"), realizado: gbm(chartCrRecebido, "VLR_PAGO", "DATA_PAGAMENTO"), ano: anoFiltro },
                dwChartData: chartData,
              }));
            })
            .catch((err) => console.warn("[DW] Gráfico anual erro (não crítico):", err?.message ?? err));
        });

    } catch (err) {
      setState((prev) => ({
        ...prev, isFetchingDw: false,
        dwError: err instanceof Error ? err.message : "Erro ao buscar dados do DW",
      }));
    }
  }, [state.dwFilter]);

  // ─── DW: carrega filtros ao montar o provider ───────────────────────────────
  useEffect(() => {
    loadDwFilters()
      .then(({ empresas, filiais }) =>
        setState((prev) => ({ ...prev, empresas, filiais }))
      )
      .catch((err) => console.warn("[DW] Falha ao carregar filtros:", err));
  }, []);

  return (
    <FinancialDataContext.Provider
      value={{
        ...state,
        setDwFilter,
        fetchFromDW,
      }}
    >
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData() {
  const context = useContext(FinancialDataContext);

  if (!context) {
    throw new Error(
      "useFinancialData must be used within FinancialDataProvider"
    );
  }

  return context;
}
