// ─────────────────────────────────────────────────────────────────────────────
// dwApi.ts  –  Client para a API de dados financeiros
//
// Prioridade de URL:
//   1. VITE_DW_API_URL  (variável de ambiente definida no .env do Lovable)
//   2. Supabase Edge Function (fallback)
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = "https://wtjaajhrjsakmmzvbdim.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0amFhamhyanNha21tenZiZGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTA4NzQsImV4cCI6MjA5MTA2Njg3NH0." +
  "el-d0njKvDfoJHM6c6fFcs9TqcNtIpD5BY4-rtTAvnQ";

// ─── URL da API ───────────────────────────────────────────────────────────────
// Prioridade:
//   1. VITE_DW_API_URL  (variável de ambiente Lovable — Project Settings → Env Vars)
//   2. TUNNEL_URL       (Cloudflare Tunnel ativo — atualizar aqui quando reiniciar)
//   3. Supabase Edge    (fallback — apenas se LOCAL_API_URL for null)
//
// Para configurar permanentemente no Lovable (sem editar código):
//   Project → Settings → Environment Variables → VITE_DW_API_URL = <tunnel url>

const TUNNEL_URL = "https://phenomenon-predict-latin-editorials.trycloudflare.com";

const LOCAL_API_URL =
  ((
    import.meta as {
      env?: {
        VITE_DW_API_URL?: string;
      };
    }
  ).env?.VITE_DW_API_URL ?? undefined) ||
  TUNNEL_URL;

const ENDPOINT = LOCAL_API_URL
  ? `${LOCAL_API_URL}/dw-financeiro`
  : `${SUPABASE_URL}/functions/v1/dw-financeiro`;

const IS_LOCAL = !!LOCAL_API_URL;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface FilterOption {
  id: string;
  nome: string;
  empresa?: string;
}

export interface DwFiltersResponse {
  empresas: FilterOption[];
  filiais: FilterOption[];
}

export interface DwRow {
  DATA_EMISSAO: string | null;
  DATA_VENCIMENTO: string | null;
  DATA_PAGAMENTO: string | null;
  COD_PARCEIRO: string | null;
  NOME_PARCEIRO: string | null;
  SERIE: string | null;
  DOCUMENTO: string | null;
  PARCELA: string | null;
  TIPO_DOCUMENTO: string | null;
  ORIGEM: "CP" | "CR" | "LB_D" | "LB_C";
  SITUACAO: string | null;
  VLRDOC: number | null;
  VLR_LIQUIDO: number | null;
  VLRJUR: number | null;    // juros
  VLRDES: number | null;    // descontos
  DESADT: number | null;    // adiantamento (DESADT — só em CR)
  VLR_PAGO: number | null;
  VLR_PARCELA: number | null;
  VLR_PAR_RAW: number | null;   // I.VLRPAR sem multiplicação de rateio (dedupe safe)
  VLR_REC_RAW: number | null;   // I.VLRREC+I.DESADT sem rateio (CR) / I.VLRPAG (CP)
  FILIAL: string | null;
  EMPRESA: string | null;
  CODCGA: string | null;
  CENTRO_GASTO: string | null;
  CODCUS: string | null;     // código numérico do centro de custo (ex: "21", "3")
  CENTRO_CUSTO: string | null; // descrição textual do centro de custo
  SINTETICA: string | null;
  ANALITICA: string | null;
}

export interface DwFetchResponse {
  data: DwRow[];
}

export interface FaturamentoRow {
  FRETE_TOTAL: number;
  DESCRI: string | null;
  PERCENTUAL: number;
}

export interface FaturamentoResponse {
  data: FaturamentoRow[];
}

// ─── Helper interno ───────────────────────────────────────────────────────────

async function callEdge<T>(body: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Só envia auth header quando for Supabase (não necessário na API local)
  if (!IS_LOCAL) {
    headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
    headers["apikey"] = SUPABASE_ANON_KEY;
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

  if (!res.ok || json?.error) {
    throw new Error(json?.error ?? `Erro HTTP ${res.status}`);
  }

  return json as T;
}

// ─── Exports públicos ─────────────────────────────────────────────────────────

/** Retorna as listas de empresas e filiais disponíveis no DW */
export async function loadDwFilters(): Promise<DwFiltersResponse> {
  return callEdge<DwFiltersResponse>({ action: "filters" });
}

/** Executa a query principal dos 4 UNIONs com filtros */
export async function fetchDwData(params: {
  dataInicio: string;
  dataFim: string;
  filial?: string | null;
  empresa?: string | null;
}): Promise<DwFetchResponse> {
  return callEdge<DwFetchResponse>({ action: "fetch", ...params });
}

/** Busca faturamento por grupo de cliente (VW_FAT_ICMS) */
export async function fetchFaturamento(params: {
  dataInicio: string;
  dataFim: string;
  filial?: string | null;
  empresa?: string | null;
}): Promise<FaturamentoResponse> {
  return callEdge<FaturamentoResponse>({ action: "faturamento", ...params });
}
