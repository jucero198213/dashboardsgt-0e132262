import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type {
  ContaPagar,
  ContaReceber,
  ResumoFinanceiro,
} from "@/data/mockData";
import {
  loadDwFilters,
  fetchDwData,
  type FilterOption,
  type DwRow,
} from "@/lib/dwApi";

export interface IndicadorComparativo {
  id: string;
  nome: string;
  percentualReal: number;
  percentualEsperado: number;
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

// ─── State & Context types ───────────────────────────────────────────────────

interface FinancialDataState {
  isProcessed: boolean;
  resumo: ResumoFinanceiro;
  contasReceber: ContaReceber[];
  contasPagar: ContaPagar[];
  indicadores: IndicadorComparativo[];
  chartPagar:        DadosMensais;
  chartReceber:      DadosMensais;
  dwFilter:          DwFilter;
  filiais:           FilterOption[];
  empresas:          FilterOption[];
  isFetchingDw:      boolean;
  dwError:           string | null;
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

// ─── Provider ────────────────────────────────────────────────────────────────

export function FinancialDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<FinancialDataState>({
    isProcessed: false,
    resumo: defaultResumo,
    contasReceber: [],
    contasPagar: [],
    indicadores: defaultIndicadores,
    chartPagar:   { previsto: new Array(12).fill(0), realizado: new Array(12).fill(0), ano: "" },
    chartReceber: { previsto: new Array(12).fill(0), realizado: new Array(12).fill(0), ano: "" },
    dwFilter:     defaultDwFilter,
    filiais:      [],
    empresas:     [],
    isFetchingDw: false,
    dwError:      null,
  });

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
    setState((prev) => ({ ...prev, isFetchingDw: true, dwError: null }));
    try {
      const { data } = await fetchDwData({
        dataInicio: state.dwFilter.dataInicio,
        dataFim:    state.dwFilter.dataFim,
        filial:     state.dwFilter.filial,
        empresa:    state.dwFilter.empresa,
      });

      const n = (v: number | null | undefined) => v ?? 0;
      const isoDate = (v: string | null) => (v ? v.split("T")[0] : toIsoDate(hoje));
      const round2 = (v: number) => Math.round(v * 100) / 100;

      // ── Helpers de filtro ───────────────────────────────────────────────────
      const sit   = (r: DwRow) => (r.SITUACAO ?? "").trim().toUpperCase();
      const hasPag = (r: DwRow) => r.DATA_PAGAMENTO !== null && r.DATA_PAGAMENTO !== undefined && r.DATA_PAGAMENTO !== "";
      const noPag  = (r: DwRow) => !hasPag(r);

      // ── Todos os registros por origem ───────────────────────────────────────
      const allCP   = data.filter((r) => r.ORIGEM === "CP");
      const allCR   = data.filter((r) => r.ORIGEM === "CR");

      // ─────────────────────────────────────────────────────────────────────────
      // 1. A PAGAR PREVISTO  → CP | SITUACAO D ou P | DATA_PAGAMENTO NULL | VLR_PARCELA
      // ─────────────────────────────────────────────────────────────────────────
      const cpPrevisto = allCP.filter((r) => (sit(r) === "D" || sit(r) === "P") && noPag(r));

      // ─────────────────────────────────────────────────────────────────────────
      // 2. A RECEBER PREVISTO → CR | SITUACAO D ou P | DATA_PAGAMENTO NULL | VLR_PARCELA
      // ─────────────────────────────────────────────────────────────────────────
      const crPrevisto = allCR.filter((r) => (sit(r) === "D" || sit(r) === "P") && noPag(r));

      // ─────────────────────────────────────────────────────────────────────────
      // 3. PAGO → CP | SITUACAO L | DATA_PAGAMENTO NOT NULL | VLR_PAGO
      // ─────────────────────────────────────────────────────────────────────────
      const cpPago = allCP.filter((r) => sit(r) === "L" && hasPag(r));

      // ─────────────────────────────────────────────────────────────────────────
      // 4. RECEBIDO → CR | SITUACAO L | DATA_PAGAMENTO NOT NULL | VLR_PAGO
      // ─────────────────────────────────────────────────────────────────────────
      const crRecebido = allCR.filter((r) => sit(r) === "L" && hasPag(r));

      // ── Somas ───────────────────────────────────────────────────────────────
      const sumCol = (rows: DwRow[], f: "VLR_PARCELA" | "VLR_PAGO") =>
        round2(rows.reduce((s, r) => s + n(r[f]), 0));

      const totalPagar    = sumCol(cpPrevisto, "VLR_PARCELA");
      const valorPago     = sumCol(cpPago,     "VLR_PAGO");
      const totalReceber  = sumCol(crPrevisto, "VLR_PARCELA");
      const valorRecebido = sumCol(crRecebido, "VLR_PAGO");

      const resumo: ResumoFinanceiro = {
        contasPagar: {
          valorAPagar:  totalPagar,
          valorPago,
          // saldo pendente = o próprio previsto (conjuntos independentes)
          saldoAPagar:  totalPagar,
        },
        contasReceber: {
          valorAReceber:  totalReceber,
          valorRecebido,
          // saldo pendente = o próprio previsto (conjuntos independentes)
          saldoAReceber:  totalReceber,
        },
      };

      // ── Tabelas de detalhe (usam todos os CP/CR sem filtro de situação) ──────
      const contasPagar: ContaPagar[] = allCP.map((r, i) => {
        const valor        = n(r.VLR_PARCELA ?? r.VLR_LIQUIDO ?? r.VLRDOC);
        const valorPagoRow = n(r.VLR_PAGO);
        return {
          id: String(i + 1), documento: r.DOCUMENTO ?? `CP-${i + 1}`,
          fornecedor: r.NOME_PARCEIRO ?? "N/A",
          vencimento: isoDate(r.DATA_VENCIMENTO), valor,
          status: calculateStatus(r.DATA_VENCIMENTO, valor, valorPagoRow, r.SITUACAO ?? ""),
        };
      });

      const contasReceber: ContaReceber[] = allCR.map((r, i) => {
        const valor            = n(r.VLR_PARCELA ?? r.VLR_LIQUIDO ?? r.VLRDOC);
        const valorRecebidoRow = n(r.VLR_PAGO);
        return {
          id: String(i + 1), documento: r.DOCUMENTO ?? `CR-${i + 1}`,
          cliente: r.NOME_PARCEIRO ?? "N/A",
          vencimento: isoDate(r.DATA_VENCIMENTO), valor,
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
        "Folha":           ["3"],
      };

      const baseIndicadores = allCP;
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
            percentualReal:  Math.round(percentualReal * 10) / 10,
            percentualEsperado,
          };
        }
      );

      // ── Dados mensais para gráficos — busca o ANO INTEIRO ─────────────────
      // Extrai o ano do filtro e faz uma segunda query cobrindo jan-dez
      const anoFiltro = state.dwFilter.dataInicio.substring(0, 4);
      const { data: chartData } = await fetchDwData({
        dataInicio: `${anoFiltro}-01-01`,
        dataFim:    `${anoFiltro}-12-31`,
        filial:     state.dwFilter.filial,
        empresa:    state.dwFilter.empresa,
      });

      const chartAllCP = chartData.filter((r) => r.ORIGEM === "CP");
      const chartAllCR = chartData.filter((r) => r.ORIGEM === "CR");

      const chartCpPrevisto  = chartAllCP.filter((r) => (sit(r) === "D" || sit(r) === "P") && noPag(r));
      const chartCpPago      = chartAllCP.filter((r) => sit(r) === "L" && hasPag(r));
      const chartCrPrevisto  = chartAllCR.filter((r) => (sit(r) === "D" || sit(r) === "P") && noPag(r));
      const chartCrRecebido  = chartAllCR.filter((r) => sit(r) === "L" && hasPag(r));

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

      const chartPagar: DadosMensais = {
        previsto:  groupByMonth(chartCpPrevisto, "VLR_PARCELA", "DATA_VENCIMENTO"),
        realizado: groupByMonth(chartCpPago,     "VLR_PAGO",    "DATA_PAGAMENTO"),
        ano: anoFiltro,
      };

      const chartReceber: DadosMensais = {
        previsto:  groupByMonth(chartCrPrevisto, "VLR_PARCELA", "DATA_VENCIMENTO"),
        realizado: groupByMonth(chartCrRecebido, "VLR_PAGO",    "DATA_PAGAMENTO"),
        ano: anoFiltro,
      };

      setState((prev) => ({ ...prev, isFetchingDw: false, isProcessed: true, resumo, contasReceber, contasPagar, indicadores, chartPagar, chartReceber }));
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
