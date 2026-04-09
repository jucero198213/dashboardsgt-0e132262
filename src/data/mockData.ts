// ─── Tipos de domínio financeiro ─────────────────────────────────────────────

export interface ContaReceber {
  id: string;
  documento: string;
  parcela: string | null;
  cliente: string;
  dataEmissao: string;
  vencimento: string;
  dataPagamento: string | null;
  valor: number;
  valorRecebido: number;
  juros: number;
  descontos: number;
  adiantamento: number;
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
  valorPago: number;
  juros: number;
  descontos: number;
  adiantamento: number;
  status: "Em Aberto" | "Vencido" | "Parcial";
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

// ─── Utilitários de formatação ────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
