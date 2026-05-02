import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, ChevronLeft, FileText, DollarSign,
  TrendingDown, CheckCircle, Clock, Search, Download,
  ArrowUpDown, ArrowUp, ArrowDown, Users, AlertTriangle,
} from "lucide-react";
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
import { MobileNav } from "@/components/shared/MobileNav";
import { MobileDocumentCard } from "@/components/shared/MobileDocumentCard";

const PAGE_SIZE = 50;

type SortDir = "asc" | "desc";
type SortCol = "dataEmissao" | "vencimento" | "dataPagamento" | "documento" | "fornecedor" | "valor" | "valorPago" | "status" | null;

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

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (sortCol !== col) return <ArrowUpDown className="inline-block h-3 w-3 ml-1 opacity-25" />;
  return sortDir === "asc"
    ? <ArrowUp className="inline-block h-3 w-3 ml-1 text-amber-300" />
    : <ArrowDown className="inline-block h-3 w-3 ml-1 text-amber-300" />;
}

const ContasAPagar = () => {
  const navigate = useNavigate();
  const { contasPagar, resumo, isProcessed, isFetchingDw } = useFinancialData();
  const { contasPagar: resumoPagar } = resumo;

  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const fmt = (d: string | null | undefined) => (d ? formatDate(d) : "—");

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const contasFiltradas = useMemo(() => {
    setPagina(1);
    let list = contasPagar;
    if (filtroStatus !== "todos") list = list.filter(c => c.status === filtroStatus);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter(c =>
        c.documento.toLowerCase().includes(q) ||
        c.fornecedor.toLowerCase().includes(q)
      );
    }
    if (sortCol) {
      list = [...list].sort((a, b) => {
        const va = a[sortCol as keyof typeof a] ?? "";
        const vb = b[sortCol as keyof typeof b] ?? "";
        const cmp = typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "pt-BR");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [contasPagar, filtroStatus, busca, sortCol, sortDir]);

  const totalPaginas = Math.max(1, Math.ceil(contasFiltradas.length / PAGE_SIZE));
  const paginaAtual  = Math.min(pagina, totalPaginas);
  const inicio       = (paginaAtual - 1) * PAGE_SIZE;
  const paginados    = contasFiltradas.slice(inicio, inicio + PAGE_SIZE);

  const pctPago = resumoPagar.valorAPagar > 0
    ? (resumoPagar.valorPago / resumoPagar.valorAPagar) * 100
    : 0;

  const totalVencido = useMemo(() =>
    contasPagar.filter(c => c.status === "Vencido").reduce((s, c) => s + c.valor, 0),
    [contasPagar]
  );

  const aging = useMemo(() => {
    const today = new Date();
    const buckets = [
      { label: "1–30 dias",  value: 0, count: 0 },
      { label: "31–60 dias", value: 0, count: 0 },
      { label: "61–90 dias", value: 0, count: 0 },
      { label: "+90 dias",   value: 0, count: 0 },
    ];
    contasPagar.filter(c => c.status === "Vencido").forEach(c => {
      const days = Math.floor((today.getTime() - new Date(c.vencimento).getTime()) / 86_400_000);
      const idx = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3;
      buckets[idx].value += c.valor;
      buckets[idx].count += 1;
    });
    return buckets;
  }, [contasPagar]);

  const maxAging = Math.max(...aging.map(b => b.value), 1);

  const topFornecedores = useMemo(() => {
    const map = new Map<string, number>();
    contasPagar.forEach(c => map.set(c.fornecedor, (map.get(c.fornecedor) ?? 0) + c.valor));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [contasPagar]);

  function exportCsv() {
    const header = ["Documento","Parcela","Fornecedor","Dt.Emissão","Dt.Vencimento","Dt.Pagamento","Valor","Vl.Pago","Juros","Descontos","Adiantamento","Status"];
    const rows = contasFiltradas.map(c => [
      c.documento, c.parcela ?? "", c.fornecedor,
      fmt(c.dataEmissao), fmt(c.vencimento), c.dataPagamento ? fmt(c.dataPagamento) : "",
      c.valor.toFixed(2), c.valorPago.toFixed(2), c.juros.toFixed(2),
      c.descontos.toFixed(2), c.adiantamento.toFixed(2), c.status,
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contas-a-pagar.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const statusFilters = [
    { value: "todos",      label: "Todos" },
    { value: "Em Aberto",  label: "Em Aberto" },
    { value: "Vencido",    label: "Vencido" },
    { value: "Parcial",    label: "Parcial" },
  ];

  const showLoading = isFetchingDw && !isProcessed;
  const thBtn = "flex cursor-pointer select-none items-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap hover:text-slate-300 transition-colors";

  return (
    <div className="min-h-screen px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8" style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}>
      <BackgroundEffects />

      <div className="relative w-full space-y-4 sm:space-y-6 animate-[fadeSlideIn_0.5s_ease-out]">

        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-sm text-slate-400">
            <button onClick={() => navigate("/dashboard")} className="shrink-0 transition-colors hover:[color:var(--sgt-text-primary)]">Dashboard</button>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-white">Contas a Pagar</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <HomeButton />
            <UserMenu />
          </div>
          <MobileNav />
        </div>

        {/* Header contextual */}
        <div className="relative overflow-hidden rounded-[16px] sm:rounded-[20px] border border-amber-400/[0.12] bg-[linear-gradient(150deg,rgba(10,16,36,0.98)_0%,rgba(5,9,20,1)_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/60 to-amber-700/20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[65%] bg-gradient-to-l from-[rgba(245,158,11,0.13)] via-[rgba(245,158,11,0.03)] to-transparent" />

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
            <span className="ml-auto text-[9px] text-slate-600">Origem: CP</span>
          </div>

          <div className="relative z-10 px-3 py-3 sm:px-6 sm:py-5">
            <div className="flex items-start gap-4">
              <button onClick={() => navigate("/dashboard")}
                className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[var(--sgt-border-subtle)] [background:var(--sgt-input-bg)] text-slate-400 transition-all hover:border-[var(--sgt-border-medium)] hover:[background:var(--sgt-input-hover)] hover:text-white">
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
              <KpiCard label="Vencidos" value={formatCurrency(totalVencido)} rawValue={totalVencido} subtitle={`${contasPagar.filter(c => c.status === "Vencido").length} documento(s)`} icon={TrendingDown} tone="rose" />
            </AnimatedCard>
          </div>
        )}

        {/* Barra de progresso de realização */}
        {isProcessed && resumoPagar.valorAPagar > 0 && (
          <AnimatedCard delay={280}>
            <div className="overflow-hidden rounded-[14px] sm:rounded-[16px] border border-[var(--sgt-border-subtle)] [background:var(--sgt-bg-card)] px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Realização do período</p>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500">Pago: <span className="font-bold text-emerald-300">{pctPago.toFixed(1)}%</span></span>
                  <span className="text-[10px] text-slate-500">Em aberto: <span className="font-bold text-amber-300">{(100 - Math.min(pctPago, 100)).toFixed(1)}%</span></span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${Math.min(pctPago, 100)}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[9px] text-slate-600">
                <span>R$ 0</span>
                <span>{formatCurrency(resumoPagar.valorAPagar)}</span>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* Aging + Top Fornecedores */}
        {isProcessed && (totalVencido > 0 || topFornecedores.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Aging */}
            {totalVencido > 0 && (
              <AnimatedCard delay={290}>
                <div className="h-full overflow-hidden rounded-[14px] sm:rounded-[16px] border border-rose-400/[0.14] [background:var(--sgt-bg-card)] p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-400/[0.08] border border-rose-400/[0.15]">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-300" />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Aging — Títulos Vencidos</p>
                  </div>
                  <div className="space-y-3.5">
                    {aging.map(b => (
                      <div key={b.label}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-400">{b.label}</span>
                          <div className="flex items-center gap-2">
                            {b.count > 0 && <span className="text-[9px] text-slate-600">{b.count} doc</span>}
                            <span className="text-[11px] font-bold text-rose-300">
                              {b.value > 0 ? formatCurrency(b.value) : <span className="text-slate-600 font-normal">—</span>}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-700"
                            style={{ width: `${(b.value / maxAging) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedCard>
            )}

            {/* Top Fornecedores */}
            {topFornecedores.length > 0 && (
              <AnimatedCard delay={300}>
                <div className="h-full overflow-hidden rounded-[14px] sm:rounded-[16px] border border-amber-400/[0.12] [background:var(--sgt-bg-card)] p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/[0.08] border border-amber-400/[0.15]">
                      <Users className="h-3.5 w-3.5 text-amber-300" />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Top Fornecedores — por Valor</p>
                  </div>
                  <div className="space-y-3">
                    {topFornecedores.map(([nome, valor], i) => (
                      <div key={nome} className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-slate-600 w-4 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-slate-300 truncate mb-1">{nome}</p>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
                            <div
                              className="h-full rounded-full bg-amber-500/50 transition-all duration-700"
                              style={{ width: `${(valor / (topFornecedores[0][1] || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-amber-300 whitespace-nowrap shrink-0">
                          {formatCurrency(valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedCard>
            )}
          </div>
        )}

        {/* Controls: busca + filtros + export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Busca */}
          <div className="relative min-w-[180px] flex-1 max-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Documento ou fornecedor…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="h-8 w-full rounded-xl border border-[var(--sgt-border-subtle)] [background:var(--sgt-input-bg)] pl-8 pr-3 text-xs text-slate-300 placeholder:text-slate-600 transition-all focus:border-amber-500/30 focus:outline-none"
            />
          </div>

          {/* Status filters */}
          {statusFilters.map(f => (
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

          {/* Export CSV */}
          {isProcessed && contasFiltradas.length > 0 && (
            <button
              onClick={exportCsv}
              className="ml-auto flex h-8 items-center gap-1.5 rounded-xl border border-[var(--sgt-border-subtle)] [background:var(--sgt-input-bg)] px-3 text-xs font-medium text-slate-400 transition-all hover:border-amber-400/30 hover:text-amber-300"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
          )}
        </div>

        {/* Tabela */}
        <AnimatedCard delay={320}>
          <div className="overflow-hidden rounded-[16px] sm:rounded-[20px] border border-[var(--sgt-border-subtle)] [background:var(--sgt-bg-card)] shadow-[0_2px_24px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between p-3 pb-2 sm:p-6 sm:pb-4">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-400">
                Documentos — Contas a Pagar
              </p>
              {isProcessed && contasFiltradas.length > 0 && (
                <p className="text-xs text-slate-500">
                  {inicio + 1}–{Math.min(inicio + PAGE_SIZE, contasFiltradas.length)} de {contasFiltradas.length}
                </p>
              )}
            </div>

            {!isProcessed ? (
              <EmptyState title="Dados não carregados" description="Importe e processe os dados no dashboard para visualizar os documentos." />
            ) : contasFiltradas.length === 0 ? (
              <EmptyState title="Nenhum documento encontrado" description="Não há documentos com o filtro selecionado neste período." />
            ) : (
              <>
                {/* Mobile */}
                <div className="flex flex-col gap-2 px-3 pb-3 md:hidden">
                  {paginados.map(c => (
                    <MobileDocumentCard
                      key={c.id}
                      tone="amber"
                      documento={c.documento}
                      parceiro={c.fornecedor}
                      valor={c.valor}
                      vencimento={c.vencimento}
                      status={c.status}
                      details={[
                        { label: "Dt. Emissão",    value: fmt(c.dataEmissao) },
                        { label: "Dt. Pagamento",  value: c.dataPagamento ? fmt(c.dataPagamento) : "—" },
                        { label: "Parcela",         value: c.parcela ?? "—" },
                        { label: "Vl. Pago",       value: c.valorPago > 0 ? formatCurrency(c.valorPago) : "—" },
                        { label: "Juros",           value: c.juros > 0 ? formatCurrency(c.juros) : "—" },
                        { label: "Descontos",       value: c.descontos > 0 ? formatCurrency(c.descontos) : "—" },
                        { label: "Adiantamento",    value: c.adiantamento > 0 ? formatCurrency(c.adiantamento) : "—" },
                      ]}
                    />
                  ))}
                </div>

                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow className="border-[var(--sgt-border-subtle)] hover:bg-transparent">
                        <TableHead className="whitespace-nowrap">
                          <button className={thBtn} onClick={() => toggleSort("dataEmissao")}>
                            Dt. Emissão <SortIcon col="dataEmissao" sortCol={sortCol} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead className="whitespace-nowrap">
                          <button className={thBtn} onClick={() => toggleSort("vencimento")}>
                            Dt. Vencimento <SortIcon col="vencimento" sortCol={sortCol} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead className="whitespace-nowrap">
                          <button className={thBtn} onClick={() => toggleSort("dataPagamento")}>
                            Dt. Pagamento <SortIcon col="dataPagamento" sortCol={sortCol} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead>
                          <button className={thBtn} onClick={() => toggleSort("documento")}>
                            Documento <SortIcon col="documento" sortCol={sortCol} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-center">Parcela</TableHead>
                        <TableHead>
                          <button className={thBtn} onClick={() => toggleSort("fornecedor")}>
                            Fornecedor <SortIcon col="fornecedor" sortCol={sortCol} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead className="text-right">
                          <button className={`${thBtn} justify-end w-full`} onClick={() => toggleSort("valor")}>
                            Valor <SortIcon col="valor" sortCol={sortCol} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead className="text-right">
                          <button className={`${thBtn} justify-end w-full`} onClick={() => toggleSort("valorPago")}>
                            Vl. Pago <SortIcon col="valorPago" sortCol={sortCol} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Juros</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Descontos</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Adiantamento</TableHead>
                        <TableHead className="text-center">
                          <button className={`${thBtn} justify-center w-full`} onClick={() => toggleSort("status")}>
                            Status <SortIcon col="status" sortCol={sortCol} sortDir={sortDir} />
                          </button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginados.map((c, idx) => (
                        <TableRow key={c.id} className={`border-[var(--sgt-border-subtle)] transition-colors hover:[background:var(--sgt-row-hover)] ${idx % 2 === 0 ? "" : "[background:var(--sgt-row-alt)]"}`}>
                          <TableCell className="text-sm text-slate-300 whitespace-nowrap">{fmt(c.dataEmissao)}</TableCell>
                          <TableCell className="text-sm text-slate-300 whitespace-nowrap">{fmt(c.vencimento)}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {c.dataPagamento
                              ? <span className="text-amber-400">{fmt(c.dataPagamento)}</span>
                              : <span className="text-slate-600">—</span>}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-white">{c.documento}</TableCell>
                          <TableCell className="text-sm text-slate-300 text-center">{c.parcela ?? "—"}</TableCell>
                          <TableCell className="text-sm text-slate-300 max-w-[180px] truncate">{c.fornecedor}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-white whitespace-nowrap">{formatCurrency(c.valor)}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-amber-300 whitespace-nowrap">
                            {c.valorPago > 0 ? formatCurrency(c.valorPago) : <span className="text-slate-600">—</span>}
                          </TableCell>
                          <TableCell className="text-right text-sm text-slate-300 whitespace-nowrap">
                            {c.juros > 0 ? formatCurrency(c.juros) : <span className="text-slate-600">—</span>}
                          </TableCell>
                          <TableCell className="text-right text-sm text-slate-300 whitespace-nowrap">
                            {c.descontos > 0 ? formatCurrency(c.descontos) : <span className="text-slate-600">—</span>}
                          </TableCell>
                          <TableCell className="text-right text-sm text-slate-300 whitespace-nowrap">
                            {c.adiantamento > 0 ? formatCurrency(c.adiantamento) : <span className="text-slate-600">—</span>}
                          </TableCell>
                          <TableCell className="text-center"><StatusBadge status={c.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
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
