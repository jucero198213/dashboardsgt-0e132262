import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, FileText, Users, Package,
  Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchCompras, type ComprasRow } from "@/lib/dwApi";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import sgtLogo from "@/assets/sgt-logo.png";

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtK = (v: number) => v >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v/1e3).toFixed(0)}k` : fmtBRL(v);
const fmtNum = (v: number) => v.toLocaleString("pt-BR");
const fmtData = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const PAGE_SIZE = 50;

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function Compras() {
  const navigate = useNavigate();
  
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [search, setSearch] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("todos");
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // ── Fetch dados ─────────────────────────────────────────────────────────────
  const { data: comprasResp, isLoading } = useQuery({
    queryKey: ["compras", dataInicio, dataFim],
    queryFn: () => fetchCompras({ dataInicio, dataFim }),
  });
  const compras: ComprasRow[] = Array.isArray(comprasResp)
    ? comprasResp
    : Array.isArray(comprasResp?.data) ? comprasResp.data : [];

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = compras.reduce((s, c) => s + ((c.quantidade ?? 0) * (c.valor_un ?? 0)), 0);
    const notas = new Set(compras.map((c: any) => c.nf)).size;
    const fornecedores = new Set(compras.map(c => c.fornecedor)).size;
    const produtos = new Set(compras.map(c => c.produto)).size;

    return [
      {
        label: "Total Comprado", value: fmtK(total),
        sub: "No período", icon: ShoppingCart, color: "cyan", rgb: "6,182,212",
        stripe: "from-cyan-400/60 to-cyan-700/20",
        border: "border-cyan-400/[0.12]",
        glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]",
        iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]",
        iconTxt: "text-cyan-300",
        sub2: "text-cyan-500/80",
      },
      {
        label: "Notas Fiscais", value: fmtNum(notas),
        sub: "NFs distintas", icon: FileText, color: "emerald", rgb: "16,185,129",
        stripe: "from-emerald-400/60 to-emerald-700/20",
        border: "border-emerald-400/[0.12]",
        glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]",
        iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]",
        iconTxt: "text-emerald-300",
        sub2: "text-emerald-500/80",
      },
      {
        label: "Fornecedores", value: fmtNum(fornecedores),
        sub: "Fornecedores ativos", icon: Users, color: "amber", rgb: "251,191,36",
        stripe: "from-amber-400/60 to-amber-700/20",
        border: "border-amber-400/[0.12]",
        glow: "hover:shadow-[0_4px_40px_rgba(251,191,36,0.18)]",
        iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]",
        iconTxt: "text-amber-300",
        sub2: "text-amber-500/80",
      },
      {
        label: "Produtos", value: fmtNum(produtos),
        sub: "SKUs distintos", icon: Package, color: "violet", rgb: "139,92,246",
        stripe: "from-violet-400/60 to-violet-700/20",
        border: "border-violet-400/[0.12]",
        glow: "hover:shadow-[0_4px_40px_rgba(139,92,246,0.18)]",
        iconBg: "bg-violet-400/[0.08] border border-violet-400/[0.15]",
        iconTxt: "text-violet-300",
        sub2: "text-violet-500/80",
      },
    ];
  }, [compras]);

  // ── Filtros e ordenação ─────────────────────────────────────────────────────
  const grupos = useMemo(() => {
    const set = new Set(compras.map(c => c.grupo).filter(Boolean));
    return Array.from(set).sort();
  }, [compras]);

  const comprasFiltradas = useMemo(() => {
    let list = compras;
    
    if (filtroGrupo !== "todos") {
      list = list.filter(c => c.grupo === filtroGrupo);
    }
    
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c: any) =>
        c.produto?.toLowerCase().includes(q) ||
        c.fornecedor?.toLowerCase().includes(q) ||
        c.nf?.toLowerCase().includes(q)
      );
    }
    
    if (sortCol) {
      list = [...list].sort((a, b) => {
        let va: any = (a as any)[sortCol];
        let vb: any = (b as any)[sortCol];
        
        if (sortCol === "total") {
          va = (a.quantidade ?? 0) * (a.valor_un ?? 0);
          vb = (b.quantidade ?? 0) * (b.valor_un ?? 0);
        }
        
        const cmp = typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va ?? "").localeCompare(String(vb ?? ""), "pt-BR");
        return sortAsc ? cmp : -cmp;
      });
    }
    
    return list;
  }, [compras, filtroGrupo, search, sortCol, sortAsc]);

  const totalPaginas = Math.max(1, Math.ceil(comprasFiltradas.length / PAGE_SIZE));
  const inicio = (page - 1) * PAGE_SIZE;
  const paginados = comprasFiltradas.slice(inicio, inicio + PAGE_SIZE);

  function toggleSort(col: string) {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  }

  return (
    <div className="min-h-screen px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8 [background:var(--sgt-bg-base)]">
      <BackgroundEffects />

      <section
        className="relative mx-auto max-w-[1920px] min-h-[calc(100vh-4rem)] flex flex-col rounded-[16px] sm:rounded-[20px] md:rounded-[24px] border overflow-auto"
        style={{
          background: "var(--sgt-bg-section)",
          borderColor: "var(--sgt-border-subtle)",
          boxShadow: "var(--sgt-section-shadow)",
        }}
      >
        <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 animate-[fadeSlideIn_0.5s_ease-out]">
        
          {/* ════════ HEADER ════════ */}
          <div className="hidden sm:flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-3">
              <img src={sgtLogo} alt="SGT" className="h-8 w-auto" />
              <div className="h-6 w-px bg-[var(--sgt-border-medium)]" />
              <div className="flex flex-col leading-none">
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
                <span className="text-[17px] font-black tracking-[-0.03em] text-white">Compras</span>
              </div>
            </div>

            <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/[0.08] px-3">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Tempo real</span>
            </div>

            <div className="h-6 w-px shrink-0 bg-[var(--sgt-divider)]" />

            {/* Filtros */}
            <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
              <DatePickerInput value={dataInicio} onChange={setDataInicio} placeholder="Data início" />
              <DatePickerInput value={dataFim} onChange={setDataFim} placeholder="Data fim" />
            </div>

            <HomeButton />
          </div>

          {/* Mobile header */}
          <div className="flex sm:hidden items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={sgtLogo} alt="SGT" className="h-7 w-auto" />
              <div className="h-5 w-px bg-[var(--sgt-border-medium)]" />
              <div className="flex flex-col leading-none min-w-0">
                <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">Workspace</span>
                <span className="text-[15px] font-black tracking-[-0.03em] text-white truncate">Compras</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <HomeButton />
              <MobileNav />
            </div>
          </div>

          {/* ════════ KPIs ════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((k, i) => (
              <AnimatedCard key={k.label} delay={i * 60}>
                <div className={`group relative flex min-h-[120px] flex-col overflow-hidden rounded-[14px] sm:rounded-[16px] border ${k.border} bg-[var(--sgt-bg-card)] transition-all duration-300 hover:-translate-y-[3px] ${k.glow} shadow-[0_2px_20px_rgba(0,0,0,0.4)] p-4 xl:p-5`}>
                  <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${k.stripe}`} />
                  <div className="pointer-events-none absolute bottom-0 right-0 h-28 w-28"
                    style={{ background: `radial-gradient(circle at 100% 100%, rgba(${k.rgb},0.10), transparent 65%)` }} />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-600 leading-tight">{k.label}</p>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${k.iconBg} ${k.iconTxt} transition-transform duration-300 group-hover:scale-110`}>
                        <k.icon className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <p className="mt-auto pt-2.5 font-black leading-none tracking-[-0.05em] text-white text-[clamp(1.4rem,2.5vw,1.85rem)] overflow-hidden text-ellipsis whitespace-nowrap">{k.value}</p>
                    <p className={`mt-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${k.sub2}`}>{k.sub}</p>
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>

          {/* ════════ FILTROS ════════ */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por produto, fornecedor ou NF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] pl-10 pr-4 text-[13px] text-white placeholder-slate-500 transition-all focus:border-[var(--sgt-border-medium)] focus:bg-[var(--sgt-input-hover)] focus:outline-none"
              />
            </div>

            <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
              <SelectTrigger className="h-9 w-full sm:w-[200px] rounded-lg text-[12px]">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os grupos</SelectItem>
                {grupos.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ════════ TABELA ════════ */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-400">Carregando...</div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--sgt-border-subtle)]">
                      <th className="px-4 py-3 text-left">
                        <button onClick={() => toggleSort("data_compra")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                          Data
                          {sortCol === "data_compra" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button onClick={() => toggleSort("nf")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                          NF
                          {sortCol === "nf" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button onClick={() => toggleSort("fornecedor")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                          Fornecedor
                          {sortCol === "fornecedor" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button onClick={() => toggleSort("produto")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                          Produto
                          {sortCol === "produto" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Grupo</span>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button onClick={() => toggleSort("quantidade")} className="flex items-center gap-1 ml-auto text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                          Qtd
                          {sortCol === "quantidade" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button onClick={() => toggleSort("valor_un")} className="flex items-center gap-1 ml-auto text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                          Vlr Unit
                          {sortCol === "valor_un" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button onClick={() => toggleSort("total")} className="flex items-center gap-1 ml-auto text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                          Total
                          {sortCol === "total" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginados.map((compra, i) => {
                      const total = (compra.quantidade ?? 0) * (compra.valor_un ?? 0);
                      return (
                        <tr key={i} className="border-b border-[var(--sgt-border-subtle)] transition-colors hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-[13px] text-slate-400">{fmtData(compra.data_compra)}</td>
                          <td className="px-4 py-3 text-[13px] font-medium text-white">{compra.nf}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-300">{compra.fornecedor}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-300">{compra.produto}</td>
                          <td className="px-4 py-3 text-[11px] text-slate-500">{compra.grupo}</td>
                          <td className="px-4 py-3 text-right text-[13px] text-slate-400">{fmtNum(compra.quantidade ?? 0)}</td>
                          <td className="px-4 py-3 text-right text-[13px] text-slate-400">{fmtBRL(compra.valor_un ?? 0)}</td>
                          <td className="px-4 py-3 text-right text-[13px] font-semibold text-white">{fmtBRL(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between border-t border-[var(--sgt-border-subtle)] px-4 py-3">
                  <div className="text-[11px] text-slate-500">
                    Mostrando {inicio + 1} a {Math.min(inicio + PAGE_SIZE, comprasFiltradas.length)} de {comprasFiltradas.length}
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
          )}
        </div>
      </section>
    </div>
  );
}
