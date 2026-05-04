// ─────────────────────────────────────────────────────────────────────────────
// dwApi.ts  –  Client para a API de dados financeiros + frota + manutenção
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
const TUNNEL_URL = "https://honest-pam-break-asked.trycloudflare.com";

const LOCAL_API_URL =
  ((
    import.meta as {
      env?: {
        VITE_DW_API_URL?: string;
      };
    }
  ).env?.VITE_DW_API_URL ?? undefined) ||
  TUNNEL_URL;

// Endpoints
const ENDPOINT_FINANCEIRO = LOCAL_API_URL
  ? `${LOCAL_API_URL}/dw-financeiro`
  : `${SUPABASE_URL}/functions/v1/dw-financeiro`;

const ENDPOINT_FROTA = LOCAL_API_URL
  ? `${LOCAL_API_URL}/dw-frota`
  : `${SUPABASE_URL}/functions/v1/dw-frota`;

const ENDPOINT_MANUTENCAO = LOCAL_API_URL
  ? `${LOCAL_API_URL}/dw-manutencao`
  : `${SUPABASE_URL}/functions/v1/dw-manutencao`;

const ENDPOINT_COMPRAS = LOCAL_API_URL
  ? `${LOCAL_API_URL}/dw-compras`
  : `${SUPABASE_URL}/functions/v1/dw-compras`;

const ENDPOINT_ABASTECIMENTO = LOCAL_API_URL
  ? `${LOCAL_API_URL}/dw-abastecimento`
  : `${SUPABASE_URL}/functions/v1/dw-abastecimento`;

const ENDPOINT_RH = LOCAL_API_URL
  ? `${LOCAL_API_URL}/dw-rh`
  : `${SUPABASE_URL}/functions/v1/dw-rh`;

const ENDPOINT_OPERACIONAL = LOCAL_API_URL
  ? `${LOCAL_API_URL}/dw-operacional`
  : `${SUPABASE_URL}/functions/v1/dw-operacional`;

const IS_LOCAL = !!LOCAL_API_URL;

// ─── Tipos: Financeiro (mantido) ──────────────────────────────────────────────

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
  VLRJUR: number | null;
  VLRDES: number | null;
  DESADT: number | null;
  VLR_PAGO: number | null;
  VLR_PARCELA: number | null;
  VLR_PAR_RAW: number | null;
  VLR_REC_RAW: number | null;
  FILIAL: string | null;
  EMPRESA: string | null;
  CODCGA: string | null;
  CENTRO_GASTO: string | null;
  CODCUS: string | null;
  CENTRO_CUSTO: string | null;
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

// ─── Tipos: FROTA ─────────────────────────────────────────────────────────────

export interface FrotaRow {
  codvei: string | number;
  chassi: string | null;
  tipvei: string | null;
  codfro: string | number | null;
  frota: string | null;
  codmcv: string | number | null;
  marca: string | null;
  codmdv: string | number | null;
  modelo: string | null;
  codmun: string | number | null;
  municipio: string | null;
  situacao: "ATIVO" | "BAIXADO" | "INATIVO";
  codcmo: string | number | null;
  classificacao: string | null;
  anofab: number | null;
  anomod: number | null;
  tipcar: string | null;
  numeix: number | null;
  altura: number | null;
  largur: number | null;
  compri: number | null;
  qtdlit: number | null;
  tarakg: number | null;
  lotaca: number | null;
  pesbru: number | null;
  qtdpne: number | null;
  propri: string | null;
  datinc: string | null;
}

export interface FrotaResponse {
  data: FrotaRow[];
}

// ─── Tipos: MANUTENCAO ────────────────────────────────────────────────────────

export interface ManutencaoRow {
  filial: string | null;
  ordem: string | number | null;
  tiposervico: "SERVICOEXTERNO" | "SERVICOINTERNO" | null;
  situacao: "INCONSISTENTE" | "ANDAMENTO" | "CANCELADO" | "CONCLUIDO" | null;
  motorista: string | null;
  conjunto: string | null;
  funcionario: string | null;
  setor: string | null;
  classificacao: string | null;
  codigoprod: string | null;
  tipoprod: "SERVICO" | "PRODUTO" | "PRODUTOGARANTIA" | "PLANOMANUTENCAO" | null;
  produto: string | null;
  subgrupo: string | null;
  qtd: number | null;
  custo: number | null;
  baixa: string | null;
  fornecedor: string | null;
  solicitacao: string | null;
  observacao: string | null;
  veiculo: string | number | null; // CODVEI = chave de cruzamento com frota
  dataordem: string | null;
  valormo: number | null;
  valormo2: number | null;
  valorpc: number | null;
  valorpc2: number | null;
}

export interface ManutencaoResponse {
  data: ManutencaoRow[];
}

// ─── Tipos: COMPRAS ───────────────────────────────────────────────────────────

export interface ComprasRow {
  sub_grupo:     string | null;
  codsgp:        string | number | null;
  tiponf:        string | null;
  serie:         string | null;
  data_compra:   string | null;
  pedido:        string | number | null;
  nota_fiscal:   string | number | null;
  situac:        string | null;
  codcus:        string | number | null;
  centro_custo:  string | null;
  codgpp:        string | number | null;
  grupo:         string | null;
  codprod:       string | number | null;
  produto:       string | null;
  quantidade:    number | null;
  valor_un:      number | null;
  codclifor:     string | number | null;
  fornecedor:    string | null;
}

export interface ComprasResponse {
  data: ComprasRow[];
}

// ─── Tipos: ABASTECIMENTO ─────────────────────────────────────────────────────

export interface AbastecimentoRow {
  codaba:             string | number | null;
  motorista:          string | null;
  posto:              string | null;
  estado:             string | null;
  vlrtot:             number | null;
  quanti:             number | null;
  datref:             string | null;
  numdoc:             string | number | null;
  veiculo:            string | null;
  marca:              string | null;
  modelo:             string | null;
  linha:              string | number | null;
  media:              number | null;
  ultkmt:             number | null;
  atukmt:             number | null;
  medfab:             number | null;
  odohor:             string | null;
  frota:              string | null;
  codigo_combustivel: string | number | null;
  tipo_combustivel:   string | null;
  nota_fiscal:        string | number | null;
}

export interface AbastecimentoResponse {
  data: AbastecimentoRow[];
}

// ─── Helper interno ───────────────────────────────────────────────────────────

async function callEdge<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!IS_LOCAL) {
    headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
    headers["apikey"] = SUPABASE_ANON_KEY;
  }

  const res = await fetch(endpoint, {
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

// ─── Exports públicos: FINANCEIRO ─────────────────────────────────────────────

export async function loadDwFilters(): Promise<DwFiltersResponse> {
  return callEdge<DwFiltersResponse>(ENDPOINT_FINANCEIRO, { action: "filters" });
}

export async function fetchDwData(params: {
  dataInicio: string;
  dataFim: string;
  filial?: string | null;
  empresa?: string | null;
}): Promise<DwFetchResponse> {
  return callEdge<DwFetchResponse>(ENDPOINT_FINANCEIRO, {
    action: "fetch",
    ...params,
  });
}

export async function fetchFaturamento(params: {
  dataInicio: string;
  dataFim: string;
  filial?: string | null;
  empresa?: string | null;
}): Promise<FaturamentoResponse> {
  return callEdge<FaturamentoResponse>(ENDPOINT_FINANCEIRO, {
    action: "faturamento",
    ...params,
  });
}

// ─── Exports públicos: FROTA ──────────────────────────────────────────────────

/**
 * Busca o cadastro completo de veículos da frota.
 * Por padrão retorna todos. Use `situacao` para filtrar no servidor.
 */
export async function fetchFrota(params?: {
  situacao?: "ATIVO" | "BAIXADO" | "INATIVO";
}): Promise<FrotaResponse> {
  return callEdge<FrotaResponse>(ENDPOINT_FROTA, params ?? {});
}

// ─── Exports públicos: MANUTENCAO ─────────────────────────────────────────────

/**
 * Busca as ordens de manutenção do período.
 * Defaults no servidor: dataInicio = 2024-01-01, dataFim = hoje.
 */
export async function fetchManutencao(params?: {
  dataInicio?: string;
  dataFim?: string;
  filial?: string | null;
}): Promise<ManutencaoResponse> {
  return callEdge<ManutencaoResponse>(ENDPOINT_MANUTENCAO, params ?? {});
}

// ─── Exports públicos: COMPRAS ────────────────────────────────────────────────

export async function fetchCompras(params?: {
  dataInicio?: string;
  dataFim?: string;
}): Promise<ComprasResponse> {
  return callEdge<ComprasResponse>(ENDPOINT_COMPRAS, params ?? {});
}

// ─── Exports públicos: ABASTECIMENTO ─────────────────────────────────────────

/**
 * Busca os registros de abastecimento do período.
 * Filtra por DATA_REF >= dataInicio e DATA_REF <= dataFim.
 */
export async function fetchAbastecimento(params?: {
  dataInicio?: string;
  dataFim?: string;
}): Promise<AbastecimentoResponse> {
  return callEdge<AbastecimentoResponse>(ENDPOINT_ABASTECIMENTO, params ?? {});
}
// ─── Tipos: RH ────────────────────────────────────────────────────────────────

export interface RhRow {
  codmot:                string | number | null;
  motorista:             string | null;
  data_nascimento:       string | null;
  nacionalidade:         string | null;
  estado:                string | null;
  endereco:              string | null;
  bairro:                string | null;
  habilitacao:           string | null;
  uf_habilitacao:        string | null;
  categoria_habilitacao: string | null;
  validade_habilitacao:  string | null;
  numero_rg:             string | null;
  data_emissao_rg:       string | null;
  numero_cpf:            string | null;
  empregado:             string | null;
  codigo_folha:          string | number | null;
  codigo_filial:         string | number | null;
  data_admissao:         string | null;
  data_demissao:         string | null;
  motivo_demissao:       string | null;
  situacao:              string | null;
  funcao:                string | null;
  tipo_funcionario:      string | null;
  sexo:                  string | null;
}

export interface RhResponse {
  data: RhRow[];
}

// ─── Exports públicos: RH ─────────────────────────────────────────────────────

/**
 * Busca todos os colaboradores da RODMOT.
 * Passe situacao: null para retornar ATIVO e INATIVO (necessário para turnover).
 */
export async function fetchRh(params?: {
  situacao?: string | null;
}): Promise<RhResponse> {
  return callEdge<RhResponse>(ENDPOINT_RH, params ?? {});
}

// ─── Tipos: OPERACIONAL ───────────────────────────────────────────────────────

export interface OperacionalRow {
  id:                       string | number | null;
  codcli:                   string | number | null;
  cli_nomeab:               string | null;
  codmot:                   string | number | null;
  motorista:                string | null;
  veiculo:                  string | null;
  latitude:                 number | string | null;
  longitude:                number | string | null;
  referencia:               string | null;
  veiculo2:                 string | null;
  veiculo3:                 string | null;
  tipo_documento:           string | null;
  codigo_documento:         string | number | null;
  serie_documento:          string | null;
  filial_documento:         string | null;
  cod_remetente:            string | number | null;
  remetente:                string | null;
  cod_destinatario:         string | number | null;
  destinatario:             string | null;
  data_saida_original:      string | null;
  data_saida_real:          string | null;
  percentual_completo:      number | null;
  previsao_chegada:         string | null;
  situacao_viagem:          string | null;
  descricao_documento:      string | null;
  descricao_situacao:       string | null;
  descricao_origem:         string | null;
  descricao_destino:        string | null;
  latitude_remetente:       number | string | null;
  longitude_remetente:      number | string | null;
  latitude_destinatario:    number | string | null;
  longitude_destinatario:   number | string | null;
  total_itens:              number | null;
  itens_real:               number | null;
  classificacao_veiculo:    string | null;
  situacao_veiculo:         string | null;
  em_manutencao:            string | boolean | null;
}

export interface OperacionalResponse {
  data: OperacionalRow[];
}

// ─── Exports públicos: OPERACIONAL ────────────────────────────────────────────

/**
 * Busca o estado atual de todos os veículos monitorados (VRMON_VEICULO).
 * Sem filtro de período — retorna o snapshot em tempo real.
 */
export async function fetchOperacional(): Promise<OperacionalResponse> {
  return callEdge<OperacionalResponse>(ENDPOINT_OPERACIONAL, {});
}
