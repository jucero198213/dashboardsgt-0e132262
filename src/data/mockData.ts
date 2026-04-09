// Types - prepared for future spreadsheet integration
export interface ContaReceber {
  id: string;
  documento: string;
  parcela: string | null;
  cliente: string;
  dataEmissao: string;
  vencimento: string;
  dataPagamento: string | null;
  valor: number;
  status: "Em Aberto" | "Vencido" | "Parcial";
}

export interface ContaPagar {
  id: string;
  documento: string;
  parcela: string | null;
  fornecedor: string;
  dataEmissao: string;
  vencimento: string;
  dataPagamento: string | null;
  valor: number;
  status: "Em Aberto" | "Vencido" | "Parcial";
}

export interface Indicador {
  id: string;
  nome: string;
  percentual: number;
  cor: "primary" | "accent" | "warning" | "destructive";
}

export interface ResumoFinanceiro {
  contasReceber: {
    valorAReceber: number;
    valorRecebido: number;
    saldoAReceber: number;
  };
  contasPagar: {
    valorAPagar: number;
    valorPago: number;
    saldoAPagar: number;
  };
}

// Mock data
export const resumoFinanceiro: ResumoFinanceiro = {
  contasReceber: {
    valorAReceber: 2_847_530.42,
    valorRecebido: 1_923_180.67,
    saldoAReceber: 924_349.75,
  },
  contasPagar: {
    valorAPagar: 1_956_720.18,
    valorPago: 1_412_385.90,
    saldoAPagar: 544_334.28,
  },
};

export const indicadores: Indicador[] = [
  { id: "1", nome: "Folha de Pagamento", percentual: 34.2, cor: "primary" },
  { id: "2", nome: "Impostos e Tributos", percentual: 18.7, cor: "warning" },
  { id: "3", nome: "Fornecedores", percentual: 15.3, cor: "accent" },
  { id: "4", nome: "Logística", percentual: 11.8, cor: "primary" },
  { id: "5", nome: "Marketing", percentual: 8.4, cor: "accent" },
  { id: "6", nome: "Infraestrutura", percentual: 7.1, cor: "warning" },
  { id: "7", nome: "Outros", percentual: 4.5, cor: "primary" },
];

export const contasAReceber: ContaReceber[] = [
  { id: "1", documento: "NF-2024-001", cliente: "Tech Solutions Ltda", vencimento: "2024-02-05", valor: 185_420.00, status: "Em Aberto" },
  { id: "2", documento: "NF-2024-002", cliente: "Grupo Alpha S.A.", vencimento: "2024-02-08", valor: 92_750.30, status: "Vencido" },
  { id: "3", documento: "NF-2024-003", cliente: "Indústria Beta Corp", vencimento: "2024-02-12", valor: 234_100.00, status: "Em Aberto" },
  { id: "4", documento: "NF-2024-004", cliente: "Logística Express", vencimento: "2024-02-15", valor: 47_890.45, status: "Parcial" },
  { id: "5", documento: "NF-2024-005", cliente: "Construtora Delta", vencimento: "2024-02-18", valor: 128_500.00, status: "Em Aberto" },
  { id: "6", documento: "NF-2024-006", cliente: "Varejo Premium S.A.", vencimento: "2024-02-20", valor: 63_200.00, status: "Em Aberto" },
  { id: "7", documento: "NF-2024-007", cliente: "Distribuidora Omega", vencimento: "2024-02-22", valor: 89_340.00, status: "Vencido" },
  { id: "8", documento: "NF-2024-008", cliente: "Agro Business Corp", vencimento: "2024-02-25", valor: 42_149.00, status: "Em Aberto" },
  { id: "9", documento: "NF-2024-009", cliente: "Energia Solar Ltda", vencimento: "2024-02-27", valor: 31_000.00, status: "Em Aberto" },
  { id: "10", documento: "NF-2024-010", cliente: "Mineração Norte S.A.", vencimento: "2024-02-28", valor: 10_000.00, status: "Parcial" },
];

export const contasAPagar: ContaPagar[] = [
  { id: "1", documento: "DP-2024-001", fornecedor: "Fornecedor ABC Ltda", vencimento: "2024-02-03", valor: 67_320.00, status: "Em Aberto" },
  { id: "2", documento: "DP-2024-002", fornecedor: "Materiais Pro S.A.", vencimento: "2024-02-07", valor: 124_580.50, status: "Vencido" },
  { id: "3", documento: "DP-2024-003", fornecedor: "Telecom Brasil", vencimento: "2024-02-10", valor: 18_900.00, status: "Em Aberto" },
  { id: "4", documento: "DP-2024-004", fornecedor: "Energia Elétrica S.A.", vencimento: "2024-02-12", valor: 43_210.75, status: "Em Aberto" },
  { id: "5", documento: "DP-2024-005", fornecedor: "Transportadora Rápida", vencimento: "2024-02-15", valor: 89_450.00, status: "Parcial" },
  { id: "6", documento: "DP-2024-006", fornecedor: "Consultoria Gamma", vencimento: "2024-02-18", valor: 55_000.00, status: "Em Aberto" },
  { id: "7", documento: "DP-2024-007", fornecedor: "Seguros Capital", vencimento: "2024-02-20", valor: 32_780.00, status: "Em Aberto" },
  { id: "8", documento: "DP-2024-008", fornecedor: "Serviços Gerais Corp", vencimento: "2024-02-24", valor: 71_093.03, status: "Vencido" },
  { id: "9", documento: "DP-2024-009", fornecedor: "Aluguel Sede Central", vencimento: "2024-02-28", valor: 22_000.00, status: "Em Aberto" },
  { id: "10", documento: "DP-2024-010", fornecedor: "Software & Licenças", vencimento: "2024-02-28", valor: 20_000.00, status: "Em Aberto" },
];

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
