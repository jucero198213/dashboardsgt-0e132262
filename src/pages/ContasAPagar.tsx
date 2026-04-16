import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, ChevronLeft, FileText, DollarSign, TrendingDown, CheckCircle, Clock } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { formatCurrency, formatDate } from "@/data/mockData";
import { KpiCard } from "@/components/indicators/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { KpiCardSkeleton } from "@/components/shared/CardSkeleton";
import { useMemo, useState } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import { HomeButton } from "@/components/shared/HomeButton";

const PAGE_SIZE = 50;

function CompactPagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;

  const pages: (number | "…")[] = [];
  const add = (p: number) => { if (!pages.includes(p)) pages.push(p); };
  add(1);
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) add(i);
  if (current < total - 2) pages.push("…");
  if (total > 1) add(total);

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--sgt-border-subtle)] [background:var(--sgt-input-bg)] text-slate-400 transition-all hover:border-[var(--sgt-border-medium)] hover:[background:var(--sgt-input-hover)] hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {pages.map((p, i) => p === "…"
        ? <span key={`e${i}`} className="px-1 text-xs text-slate-600">…</span>
        : <button key={p} onClick={() => onChange(p as number)}
            className={`flex h-7 min-w-[28px] items-center justify-center rounded-lg border px-2 text-xs font-medium transition-all ${current === p ? "border-amber-400/30 bg-amber-400/10 text-amber-300" : "border-[var(--sgt-border-subtle)] [background:var(--sgt-input-bg)] text-slate-400 hover:border-[var(--sgt-border-medium)] hover:text-white"}`}>
            {p}
          </button>
      )}
      <button onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--sgt-border-subtle)] [background:var(--sgt-input-bg)] text-slate-400 transition-all hover:border-[var(--sgt-border-medium)] hover:[background:var(--sgt-input-hover)] hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const ContasAPagar = () => {
  const navigate = useNavigate();
  const { contasPagar, resumo, isProcessed, isFetchingDw } = useFinancialData();
  const { contasPagar: resumoPagar } = resumo;

  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [pagina, setPagina] = useState(1);

  const contasFiltradas = useMemo(() => {
    setPagina(1);
    if (filtroStatus === "todos") return contasPagar;
    return contasPagar.filter((c) => c.status === filtroStatus);
  }, [contasPagar, filtroStatus]);

  const totalPaginas = Math.max(1, Math.ceil(contasFiltradas.length / PAGE_SIZE));
  const paginaAtual  = Math.min(pagina, totalPaginas);
  const inicio       = (paginaAtual - 1) * PAGE_SIZE;
  const paginados    = contasFiltradas.slice(inicio, inicio + PAGE_SIZE);

  const fmt = (d: string | null | undefined) => (d ? formatDate(d) : "—");

  const pctPago = resumoPagar.valorAPagar > 0 ? (resumoPagar.valorPago / resumoPagar.valorAPagar) * 100 : 0;
  const totalVencido = contasPagar.filter((c) => c.status === "Vencido").reduce((s, c) => s + c.valor, 0);

  const statusFilters = [
    { value: "todos", label: "Todos" },
    { value: "Em Aberto", label: "Em Aberto" },
    { value: "Vencido", label: "Vencido" },
    { value: "Parcial", label: "Parcial" },
  ];

  const showLoading = isFetchingDw && !isProcessed;

  return (
    <div className="min-h-screen px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8" style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}>
      <BackgroundEffects />

      <div className="relative w-full space-y-6 animate-[fadeSlideIn_0.5s_ease-out]">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <button onClick={() => navigate("/dashboard")} className="transition-colors hover:[color:var(--sgt-text-primary)]">Dashboard</button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white">Contas a Pagar</span>
          </div>
          <div className="flex items-center gap-2">
            <HomeButton />
            <UserMenu />
          </div>
        </div>

        {/* Header contextual — Contas a Pagar */}
        <div className="relative overflow-hidden rounded-[16px] sm:rounded-[20px] border border-amber-400/[0.12] bg-[linear-gradient(150deg,rgba(10,16,36,0.98)_0%,rgba(5,9,20,1)_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_60px_rgba(0,0,0,0.5)]">

          {/* Stripe de identidade amber */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/60 to-amber-700/20" />

          {/* Véu amber à direita */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[65%] bg-gradient-to-l from-[rgba(245,158,11,0.13)] via-[rgba(245,158,11,0.03)] to-transparent" />

          {/* Info bar contextual */}
          <div className="relative z-10 flex flex-wrap items-center gap-2 sm:gap-4 border-b border-[var(--sgt-border-subtle)] [background:var(--sgt-input-bg)] px-3 sm:px-6 py-2">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Contas a Pagar</span>
              <span className="ml-1 text-[12px] font-semibold text-amber-300">Obrigações do Período</span>
            </div>
            <span className="hidden sm:flex items-center gap-3">
              <span className="h-3 w-px bg-white/10" />
              <span className="text-[11px] text-slate-400">Fornecedores e prestadores</span>
            </span>
            <span className="hidden md:flex items-center gap-3">
              <span className="h-3 w-px bg-white/10" />
              <span className="text-[11px] text-slate-500">Emissão no período selecionado</span>
            </span>
            <span className="ml-auto text-[9px] text-slate-600">Origem: CP</span>
          </div>

          {/* Conteúdo */}
          <div className="relative z-10 px-3 py-3 sm:px-6 sm:py-5">
            <div className="flex items-start gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[var(--sgt-border-subtle)] [background:var(--sgt-input-bg)] text-slate-400 transition-all hover:border-[var(--sgt-border-medium)] hover:[background:var(--sgt-input-hover)] hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                    <FileText className="h-2.5 w-2.5" />
                    Contas a Pagar
                  </div>
                </div>
                <h1 className="bg-gradient-to-r from-white from-50% via-slate-200 to-slate-400 bg-clip-text text-[clamp(1.25rem,4vw,3rem)] font-extrabold tracking-[-0.04em] text-transparent">
                  Detalhamento — Pagamentos
                </h1>
                <p className="mt-2.5 text-sm text-slate-500">Visão detalhada de todos os documentos a pagar do período</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {showLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-stretch">
            {[0,1,2,3].map(i => <KpiCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-stretch">
            <AnimatedCard delay={0}>
              <KpiCard label="Valor Previsto" value={formatCurrency(resumoPagar.valorAPagar)} rawValue={resumoPagar.valorAPagar} subtitle="Total previsto no período" icon={DollarSign} tone="cyan" />
            </AnimatedCard>
            <AnimatedCard delay={80}>
              <KpiCard label="Valor Pago" value={formatCurrency(resumoPagar.valorPago)} rawValue={resumoPagar.valorPago} subtitle={`${pctPago.toFixed(1)}% do previsto`} icon={CheckCircle} tone="emerald" />
            </AnimatedCard>
            <AnimatedCard delay={160}>
              <KpiCard label="Saldo em Aberto" value={formatCurrency(resumoPagar.saldoAPagar)} rawValue={resumoPagar.saldoAPagar} subtitle="Pendente de pagamento" icon={Clock} tone="amber" />
            </AnimatedCard>
            <AnimatedCard delay={240}>
              <KpiCard label="Vencidos" value={formatCurrency(totalVencido)} rawValue={totalVencido} subtitle={`${contasPagar.filter((c) => c.status === "Vencido").length} documento(s)`} icon={TrendingDown} tone="rose" />
            </AnimatedCard>
          </div>
        )}

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroStatus(f.value)}
              className={`rounded-xl px-4 py-1.5 text-xs font-medium transition-all ${
                filtroStatus === f.value
                  ? "border border-amber-400/30 bg-amber-400/10 text-amber-300"
                  : "border border-[var(--sgt-border-subtle)] [background:var(--sgt-input-bg)] text-slate-400 hover:border-[var(--sgt-border-medium)] hover:text-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <AnimatedCard delay={320}>
          <div className="overflow-hidden rounded-[16px] sm:rounded-[20px] border border-[var(--sgt-border-subtle)] [background:var(--sgt-bg-card)] shadow-[0_2px_24px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between p-3 pb-2 sm:p-6 sm:pb-4">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-400">Documentos — Contas a Pagar</p>
              {isProcessed && contasFiltradas.length > 0 && (
                <p className="text-xs text-slate-500">{inicio + 1}–{Math.min(inicio + PAGE_SIZE, contasFiltradas.length)} de {contasFiltradas.length}</p>
              )}
            </div>

            {!isProcessed ? (
              <EmptyState title="Dados não carregados" description="Importe e processe os dados no dashboard para visualizar os documentos." />
            ) : contasFiltradas.length === 0 ? (
              <EmptyState title="Nenhum documento encontrado" description="Não há documentos com o filtro selecionado neste período." />
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="border-[var(--sgt-border-subtle)] hover:bg-transparent">
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">Dt. Emissão</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">Dt. Vencimento</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">Dt. Pagamento</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Documento</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-center">Parcela</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Fornecedor</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Valor</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Vl. Pago</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Juros</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Descontos</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Adiantamento</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginados.map((c, idx) => (
                      <TableRow key={c.id} className={`border-[var(--sgt-border-subtle)] transition-colors hover:[background:var(--sgt-row-hover)] ${idx % 2 === 0 ? "" : "[background:var(--sgt-row-alt)]"}`}>
                        <TableCell className="text-sm text-slate-300 whitespace-nowrap">{fmt(c.dataEmissao)}</TableCell>
                        <TableCell className="text-sm text-slate-300 whitespace-nowrap">{fmt(c.vencimento)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{c.dataPagamento ? <span className="text-amber-400">{fmt(c.dataPagamento)}</span> : <span className="text-slate-600">—</span>}</TableCell>
                        <TableCell className="text-sm font-medium text-white">{c.documento}</TableCell>
                        <TableCell className="text-sm text-slate-300 text-center">{c.parcela ?? "—"}</TableCell>
                        <TableCell className="text-sm text-slate-300 max-w-[180px] truncate">{c.fornecedor}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-white whitespace-nowrap">{formatCurrency(c.valor)}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-amber-300 whitespace-nowrap">{c.valorPago > 0 ? formatCurrency(c.valorPago) : <span className="text-slate-600">—</span>}</TableCell>
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

            <div className="flex items-center justify-between border-t border-[var(--sgt-border-subtle)] px-3 sm:px-6 py-3">
              <p className="text-xs text-slate-500">{contasFiltradas.length} documento(s)</p>
              <CompactPagination current={paginaAtual} total={totalPaginas} onChange={setPagina} />
            </div>
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
};

export default ContasAPagar;
