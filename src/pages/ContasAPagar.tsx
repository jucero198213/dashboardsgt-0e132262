import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, TrendingDown, Clock, CheckCircle, AlertTriangle,
  Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { UpdateButton } from "@/components/shared/UpdateButton";
import sgtLogo from "@/assets/sgt-logo.png";

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtK = (v: number) => v >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v/1e3).toFixed(0)}k` : fmtBRL(v);
const fmtData = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const PAGE_SIZE = 50;

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function ContasAPagar() {
  const navigate = useNavigate();
  const { contasPagar, resumo, isFetchingDw } = useFinancialData();
  const { contasPagar: resumoPagar } = resumo;

  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // ── Filtros e ordenação ────────────────────────────────────────────────────
  const contasFiltradas = useMemo(() => {
    let list = contasPagar;
    
    if (filtroStatus !== "todos") {
      list = list.filter(c => c.status === filtroStatus);
    }
    
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.documento.toLowerCase().includes(q) ||
        c.fornecedor.toLowerCase().includes(q)
      );
    }
    
    if (sortCol) {
      list = [...list].sort((a, b) => {
        const va = (a as any)[sortCol] ?? "";
        const vb = (b as any)[sortCol] ?? "";
        const cmp = typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "pt-BR");
        return sortAsc ? cmp : -cmp;
      });
    }
    
    return list;
  }, [contasPagar, filtroStatus, search, sortCol, sortAsc]);

  const totalPaginas = Math.max(1, Math.ceil(contasFiltradas.length / PAGE_SIZE));
  const inicio = (page - 1) * PAGE_SIZE;
  const paginados = contasFiltradas.slice(inicio, inicio + PAGE_SIZE);

  function toggleSort(col: string) {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  }

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalVencido = useMemo(() =>
    contasPagar.filter(c => c.status === "Vencido").reduce((s, c) => s + c.valor, 0),
    [contasPagar]
  );

  const kpis = [
    {
      label: "Valor Previsto", value: fmtK(resumoPagar.valorAPagar),
      subtitle: "Total a pagar", icon: DollarSign, color: "cyan", rgb: "6,182,212",
    },
    {
      label: "Valor Pago", value: fmtK(resumoPagar.valorPago),
      subtitle: `${resumoPagar.valorAPagar > 0 ? ((resumoPagar.valorPago / resumoPagar.valorAPagar) * 100).toFixed(1) : 0}% pago`,
      icon: CheckCircle, color: "emerald", rgb: "16,185,129",
    },
    {
      label: "Saldo em Aberto", value: fmtK(resumoPagar.saldoAPagar),
      subtitle: "Pendente", icon: Clock, color: "amber", rgb: "251,191,36",
    },
    {
      label: "Vencidos", value: fmtK(totalVencido),
      subtitle: `${contasPagar.filter(c => c.status === "Vencido").length} documentos`,
      icon: AlertTriangle, color: "rose", rgb: "244,63,94",
    },
  ];

  return (
    <div className="min-h-screen px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8 [background:var(--sgt-bg-base)]">
      <BackgroundEffects />

      <div className="relative mx-auto max-w-[1920px] space-y-4 sm:space-y-6 animate-[fadeSlideIn_0.5s_ease-out]">
        
        {/* ════════ HEADER ════════ */}
        <div className="hidden sm:flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-3">
            <img src={sgtLogo} alt="SGT" className="h-8 w-auto" />
            <div className="h-6 w-px bg-[var(--sgt-border-medium)]" />
            <div className="flex flex-col leading-none">
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
              <span className="text-[17px] font-black tracking-[-0.03em] text-white">Contas a Pagar</span>
            </div>
          </div>

          <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Tempo real</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <UpdateButton onClick={() => {}} isFetching={isFetchingDw} progress={0} />
            <HomeButton />
          </div>
        </div>

        {/* Mobile header */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={sgtLogo} alt="SGT" className="h-7 w-auto" />
            <div className="h-5 w-px bg-[var(--sgt-border-medium)]" />
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">Workspace</span>
              <span className="text-[15px] font-black tracking-[-0.03em] text-white truncate">Contas a Pagar</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <UpdateButton onClick={() => {}} isFetching={isFetchingDw} progress={0} compact />
            <HomeButton />
            <MobileNav />
          </div>
        </div>

        {/* ════════ KPIs ════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi, i) => (
            <div key={i} className="group relative overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4 transition-all hover:border-[var(--sgt-border-medium)]">
              <div className="absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.06]"
                style={{ background: `radial-gradient(circle at 70% 30%, rgb(${kpi.rgb}), transparent 70%)` }} />
              
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${kpi.color}-500/10 border border-${kpi.color}-400/20`}>
                      <kpi.icon className={`h-4 w-4 text-${kpi.color}-400`} />
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-[28px] font-black leading-none tracking-tight text-white">
                    {kpi.value}
                  </p>
                  <p className="mt-1.5 text-[11px] text-slate-400">{kpi.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ════════ FILTROS ════════ */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por documento ou fornecedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] pl-10 pr-4 text-[13px] text-white placeholder-slate-500 transition-all focus:border-[var(--sgt-border-medium)] focus:bg-[var(--sgt-input-hover)] focus:outline-none"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {["todos", "Em Aberto", "Vencido", "Parcial", "Pago"].map((status) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className={`h-9 rounded-lg border px-4 text-[11px] font-semibold uppercase tracking-[0.08em] transition-all whitespace-nowrap ${
                  filtroStatus === status
                    ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                    : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400 hover:border-[var(--sgt-border-medium)] hover:text-white"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* ════════ TABELA ════════ */}
        <div className="overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--sgt-border-subtle)]">
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort("documento")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                      Documento
                      {sortCol === "documento" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort("fornecedor")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                      Fornecedor
                      {sortCol === "fornecedor" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort("vencimento")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                      Vencimento
                      {sortCol === "vencimento" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button onClick={() => toggleSort("valor")} className="flex items-center gap-1 ml-auto text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                      Valor
                      {sortCol === "valor" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Status</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginados.map((conta, i) => (
                  <tr key={i} className="border-b border-[var(--sgt-border-subtle)] transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-[13px] font-medium text-white">{conta.documento}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-300">{conta.fornecedor}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-400">{fmtData(conta.vencimento)}</td>
                    <td className="px-4 py-3 text-right text-[13px] font-semibold text-white">{fmtBRL(conta.valor)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        conta.status === "Pago" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-400/20" :
                        conta.status === "Vencido" ? "bg-rose-500/10 text-rose-300 border border-rose-400/20" :
                        conta.status === "Parcial" ? "bg-amber-500/10 text-amber-300 border border-amber-400/20" :
                        "bg-cyan-500/10 text-cyan-300 border border-cyan-400/20"
                      }`}>
                        {conta.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--sgt-border-subtle)] px-4 py-3">
              <div className="text-[11px] text-slate-500">
                Mostrando {inicio + 1} a {Math.min(inicio + PAGE_SIZE, contasFiltradas.length)} de {contasFiltradas.length}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400 transition-all hover:border-[var(--sgt-border-medium)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                
                <div className="flex items-center gap-1 px-3 text-[12px] text-slate-300">
                  <span className="font-semibold text-white">{page}</span>
                  <span className="text-slate-500">/</span>
                  <span>{totalPaginas}</span>
                </div>

                <button
                  onClick={() => setPage(Math.min(totalPaginas, page + 1))}
                  disabled={page === totalPaginas}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400 transition-all hover:border-[var(--sgt-border-medium)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
