// ─────────────────────────────────────────────────────────────────────────────
// dwApi.ts  –  Client para a Edge Function dw-financeiro
// Usa fetch nativo — sem necessidade de @supabase/supabase-js
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL     = "https://wtjaajhrjsakmmzvbdim.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0amFhamhyanNha21tenZiZGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTA4NzQsImV4cCI6MjA5MTA2Njg3NH0." +
  "el-d0njKvDfoJHM6c6fFcs9TqcNtIpD5BY4-rtTAvnQ";

const EDGE_URL = `${SUPABASE_URL}/functions/v1/dw-financeiro`;

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
  DATA_EMISSAO:    string | null;
  DATA_VENCIMENTO: string | null;
  DATA_PAGAMENTO:  string | null;
  COD_PARCEIRO:    string | null;
  NOME_PARCEIRO:   string | null;
  DOCUMENTO:       string | null;
  PARCELA:         string | null;
  TIPO_DOCUMENTO:  string | null;
  ORIGEM:          "CP" | "CR" | "LB_D" | "LB_C";
  SITUACAO:        string | null;
  VLRDOC:          number | null;
  VLR_LIQUIDO:     number | null;
  VLR_PAGO:        number | null;
  VLR_PARCELA:     number | null;
  FILIAL:          string | null;
  EMPRESA:         string | null;
  CENTRO_GASTO:    string | null;
  CENTRO_CUSTO:    string | null;
  SINTETICA:       string | null;
  ANALITICA:       string | null;
}

export interface DwFetchResponse {
  data: DwRow[];
}

// ─── Helper interno ───────────────────────────────────────────────────────────

async function callEdge<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey":        SUPABASE_ANON_KEY,
    },
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
  dataFim:    string;
  filial?:    string | null;
  empresa?:   string | null;
}): Promise<DwFetchResponse> {
  return callEdge<DwFetchResponse>({ action: "fetch", ...params });
}
