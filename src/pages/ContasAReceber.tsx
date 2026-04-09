import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, ChevronLeft, Sparkles, DollarSign, TrendingUp, CheckCircle, Clock, LogOut } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { formatCurrency, formatDate } from "@/data/mockData";
import { KpiCard } from "@/components/indicators/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useMemo, useState } from "react";
import { UserMenu } from "@/components/auth/UserMenu";

const PAGE_SIZE = 50;

const ContasAReceber = () => {
  const navigate = useNavigate();
  const { contasReceber, resumo, isProcessed } = useFinancialData();
  const { contasReceber: resumoReceber } = resumo;

  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [pagina, setPagina] = useState(1);

  const contasFiltradas = useMemo(() => {
    setPagina(1);
    if (filtroStatus === "todos") return contasReceber;
    return contasReceber.filter((c) => c.status === filtroStatus);
  }, [contasReceber, filtroStatus]);

  const totalPaginas = Math.max(1, Math.ceil(contasFiltradas.length / PAGE_SIZE));
  const paginaAtual  = Math.min(pagina, totalPaginas);
  const inicio       = (paginaAtual - 1) * PAGE_SIZE;
  const paginados    = contasFiltradas.slice(inicio, inicio + PAGE_SIZE);

  const fmt = (d: string | null | undefined) => (d ? formatDate(d) : "—");

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
    <div className="min-h-screen bg-[#020617] text-white px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:88px_88px]" />

      <div className="relative mx-auto max-w-[1400px] space-y-6 animate-[fadeSlideIn_0.5s_ease-out]">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <button onClick={() => navigate("/")} className="transition-colors hover:text-white">Dashboard</button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white">Contas a Receber</span>
          </div>
          <UserMenu />
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

            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">Detalhamento — Recebíveis</h1>
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
          <div className="flex items-center justify-between p-6 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Documentos — Contas a Receber</p>
            {isProcessed && contasFiltradas.length > 0 && (
              <p className="text-xs text-slate-500">{inicio + 1}–{Math.min(inicio + PAGE_SIZE, contasFiltradas.length)} de {contasFiltradas.length}</p>
            )}
          </div>

          {!isProcessed || contasFiltradas.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              {isProcessed ? "Nenhum documento encontrado com o filtro selecionado" : "Importe e processe os dados no dashboard"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">Dt. Emissão</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">Dt. Vencimento</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">Dt. Pagamento</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Documento</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-center">Parcela</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Cliente</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Valor</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Vl. Recebido</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Juros</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Descontos</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Adiantamento</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginados.map((c) => (
                    <TableRow key={c.id} className="border-white/5 transition-colors hover:bg-white/[0.03]">
                      <TableCell className="text-sm text-slate-300 whitespace-nowrap">{fmt(c.dataEmissao)}</TableCell>
                      <TableCell className="text-sm text-slate-300 whitespace-nowrap">{fmt(c.vencimento)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{c.dataPagamento ? <span className="text-emerald-400">{fmt(c.dataPagamento)}</span> : <span className="text-slate-600">—</span>}</TableCell>
                      <TableCell className="text-sm font-medium text-white">{c.documento}</TableCell>
                      <TableCell className="text-sm text-slate-300 text-center">{c.parcela ?? "—"}</TableCell>
                      <TableCell className="text-sm text-slate-300 max-w-[180px] truncate">{c.cliente}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-white whitespace-nowrap">{formatCurrency(c.valor)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-emerald-300 whitespace-nowrap">{c.valorRecebido > 0 ? formatCurrency(c.valorRecebido) : <span className="text-slate-600">—</span>}</TableCell>
                      <TableCell className="text-right text-sm text-slate-300 whitespace-nowrap">{c.juros > 0 ? formatCurrency(c.juros) : <span className="text-slate-600">—</span>}</TableCell>
                      <TableCell className="text-right text-sm text-slate-300 whitespace-nowrap">{c.descontos > 0 ? formatCurrency(c.descontos) : <span className="text-slate-600">—</span>}</TableCell>
                      <TableCell className="text-right text-sm text-slate-300 whitespace-nowrap">{c.adiantamento > 0 ? formatCurrency(c.adiantamento) : <span className="text-slate-600">—</span>}</TableCell>
                      <TableCell className="text-center"><StatusBadge status={c.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-white/5 px-6 py-3">
              <p className="text-xs text-slate-500">{contasFiltradas.length} documento(s)</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaAtual === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - paginaAtual) <= 2)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(p); return acc;
                  }, [])
                  .map((p, i) => p === "…"
                    ? <span key={`e${i}`} className="px-1 text-xs text-slate-600">…</span>
                    : <button key={p} onClick={() => setPagina(p as number)}
                        className={`flex h-7 min-w-[28px] items-center justify-center rounded-lg border px-2 text-xs font-medium transition-all ${paginaAtual === p ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"}`}>
                        {p}
                      </button>
                  )}
                <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          {totalPaginas <= 1 && (
            <div className="border-t border-white/5 px-6 py-3">
              <p className="text-xs text-slate-500">{contasFiltradas.length} documento(s) encontrado(s)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContasAReceber;
