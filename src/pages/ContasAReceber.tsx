import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Sparkles, DollarSign, TrendingUp, CheckCircle, Clock, LogOut } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { formatCurrency, formatDate } from "@/data/mockData";
import { KpiCard } from "@/components/indicators/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useMemo, useState } from "react";

const ContasAReceber = () => {
  const navigate = useNavigate();
  const { contasReceber, resumo, isProcessed } = useFinancialData();
  const { contasReceber: resumoReceber } = resumo;

  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  const contasFiltradas = useMemo(() => {
    if (filtroStatus === "todos") return contasReceber;
    return contasReceber.filter((c) => c.status === filtroStatus);
  }, [contasReceber, filtroStatus]);

  const totalEmAberto = contasReceber.filter((c) => c.status === "Em Aberto" || c.status === "Parcial").reduce((s, c) => s + c.valor, 0);
  const totalVencido = contasReceber.filter((c) => c.status === "Vencido").reduce((s, c) => s + c.valor, 0);
  const pctRecebido = resumoReceber.valorAReceber > 0 ? (resumoReceber.valorRecebido / resumoReceber.valorAReceber) * 100 : 0;

  const statusFilters = [
    { value: "todos", label: "Todos" },
    { value: "Em Aberto", label: "Em Aberto" },
    { value: "Vencido", label: "Vencido" },
    { value: "Parcial", label: "Parcial" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white px-4 py-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:88px_88px]" />

      <div className="relative mx-auto max-w-[1400px] space-y-6 animate-[fadeSlideIn_0.5s_ease-out]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <button onClick={() => navigate("/")} className="transition-colors hover:text-white">Dashboard</button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-white">Contas a Receber</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate("/")}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                <Sparkles className="h-3 w-3" />
                Contas a Receber
              </div>
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium text-slate-400">
                Fevereiro
              </div>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Detalhamento — Recebíveis</h1>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">Visão detalhada de todos os documentos a receber do período</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Valor Previsto" value={formatCurrency(resumoReceber.valorAReceber)} subtitle="Total previsto no período" icon={DollarSign} tone="cyan" />
          <KpiCard label="Valor Recebido" value={formatCurrency(resumoReceber.valorRecebido)} subtitle={`${pctRecebido.toFixed(1)}% do previsto`} icon={CheckCircle} tone="emerald" />
          <KpiCard label="Saldo em Aberto" value={formatCurrency(totalEmAberto)} subtitle="Pendente de recebimento" icon={Clock} tone="amber" />
          <KpiCard label="Vencidos" value={formatCurrency(totalVencido)} subtitle={`${contasReceber.filter((c) => c.status === "Vencido").length} documento(s)`} icon={TrendingUp} tone="rose" />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroStatus(f.value)}
              className={`rounded-xl px-4 py-1.5 text-xs font-medium transition-all ${
                filtroStatus === f.value
                  ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)]">
          <div className="p-6 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Documentos — Contas a Receber</p>
          </div>

          {!isProcessed || contasFiltradas.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              {isProcessed ? "Nenhum documento encontrado com o filtro selecionado" : "Importe e processe os dados no dashboard"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Data</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Documento</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Cliente</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Valor</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contasFiltradas.map((c) => (
                    <TableRow key={c.id} className="border-white/5 transition-colors hover:bg-white/[0.03]">
                      <TableCell className="text-sm text-slate-300">{formatDate(c.vencimento)}</TableCell>
                      <TableCell className="text-sm font-medium text-white">{c.documento}</TableCell>
                      <TableCell className="text-sm text-slate-300">{c.cliente}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-white">{formatCurrency(c.valor)}</TableCell>
                      <TableCell className="text-center"><StatusBadge status={c.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="border-t border-white/5 px-6 py-3">
            <p className="text-xs text-slate-500">{contasFiltradas.length} documento(s) encontrado(s)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContasAReceber;
