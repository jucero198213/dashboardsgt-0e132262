import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, FileText, Users, Package,
  Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  ReceiptText, AlertCircle, TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchCompras, type ComprasRow } from "@/lib/dwApi";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { UpdateButton } from "@/components/shared/UpdateButton";
import { useFinancialData } from "@/contexts/FinancialDataContext";
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
  
  // Context com filtros, empresa/filial, progress
  const {
    dwFilter,
    setDwFilter,
    empresas,
    filiais,
    isFetchingDw,
    fetchFromDW,
    loadingPhase,
    progress,
  } = useFinancialData();
  
  const [search, setSearch] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("todos");
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // ── Fetch dados usando filtros do contexto ─────────────────────────────────
  const { data: comprasResp, isLoading } = useQuery({
    queryKey: ["compras", dwFilter.dataInicio, dwFilter.dataFim],
    queryFn: () => fetchCompras({ 
      dataInicio: dwFilter.dataInicio, 
      dataFim: dwFilter.dataFim 
    }),
  });
  const compras: ComprasRow[] = useMemo(() => {
    const r: any = comprasResp;
    if (Array.isArray(r)) return r;
    if (r && Array.isArray(r.data)) return r.data;
    if (r && Array.isArray(r.rows)) return r.rows;
    return [];
  }, [comprasResp]);

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

  // ── Mini-cards (insights) ───────────────────────────────────────────────────
  const miniCards = useMemo(() => {
    const pedidosUnicos = new Set(compras.filter(c => c.pedido).map(c => String(c.pedido))).size;
    const pedidosSemLancamento = compras.filter(c => !c.pedido || c.pedido === null).length;
    
    const valorTotal = compras.reduce((s, c) => s + ((c.quantidade ?? 0) * (c.valor_un ?? 0)), 0);
    const valorMedioPedido = pedidosUnicos > 0 ? valorTotal / pedidosUnicos : 0;

    return [
      { label: "Total Pedidos", value: fmtNum(pedidosUnicos), icon: ReceiptText, color: "sky" },
      { label: "Sem Lançamento", value: fmtNum(pedidosSemLancamento), icon: AlertCircle, color: "orange" },
      { label: "Valor Médio/Pedido", value: fmtK(valorMedioPedido), icon: TrendingUp, color: "teal" },
    ];
  }, [compras]);

  // ── Dados para gráficos ─────────────────────────────────────────────────────
  const dadosGraficos = useMemo(() => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const anoAnterior = anoAtual - 1;
    
    // Criar 12 meses para ANO ATUAL e ANO ANTERIOR
    const comparativoAnual = [];
    for (let mes = 0; mes < 12; mes++) {
      const mesAtual = `${anoAtual}-${String(mes + 1).padStart(2, '0')}`;
      const mesAnterior = `${anoAnterior}-${String(mes + 1).padStart(2, '0')}`;
      const mesLabel = new Date(anoAtual, mes, 1).toLocaleDateString("pt-BR", { month: "short" });
      
      comparativoAnual.push({
        mes: mesLabel,
        anoAtual: 0,
        anoAnterior: 0,
        mesKeyAtual: mesAtual,
        mesKeyAnterior: mesAnterior,
      });
    }
    
    // Agrupar compras por mês/ano
    const porMes: Record<string, number> = {};
    compras.forEach(c => {
      if (!c.data_compra) return;
      const mes = c.data_compra.substring(0, 7); // YYYY-MM
      const valor = (c.quantidade ?? 0) * (c.valor_un ?? 0);
      porMes[mes] = (porMes[mes] || 0) + valor;
    });
    
    // Preencher valores no comparativo
    comparativoAnual.forEach(m => {
      if (porMes[m.mesKeyAtual]) m.anoAtual = porMes[m.mesKeyAtual];
      if (porMes[m.mesKeyAnterior]) m.anoAnterior = porMes[m.mesKeyAnterior];
    });

    // Top 5 fornecedores
    const porFornecedor: Record<string, number> = {};
    compras.forEach(c => {
      if (!c.fornecedor) return;
      const valor = (c.quantidade ?? 0) * (c.valor_un ?? 0);
      porFornecedor[c.fornecedor] = (porFornecedor[c.fornecedor] || 0) + valor;
    });
    const top5Fornecedores = Object.entries(porFornecedor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, valor]) => ({ nome, valor }));

    // Criar dadosMensais para compatibilidade (apenas ano atual)
    const dadosMensais = comparativoAnual.map(m => ({
      mes: m.mesKeyAtual,
      mesLabel: m.mes,
      valor: m.anoAtual,
    }));

    return { comparativoAnual, dadosMensais, top5Fornecedores };
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
    <div 
      className="flex flex-col min-h-[100dvh] xl:h-[100dvh] overflow-auto xl:overflow-hidden px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      <BackgroundEffects />

      {/* ════════ BARRA DE PROGRESSO TOPO ════════ */}
      {isFetchingDw && (
        <div className="fixed inset-x-0 top-0 z-50">
          <div className="h-[3px] w-full overflow-hidden bg-transparent">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-violet-400 shadow-[0_0_12px_rgba(99,102,241,0.6)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto xl:overflow-hidden"
          style={{
            background: "var(--sgt-bg-section)",
            border: "1px solid rgba(148, 163, 184, 0.08)",
            boxShadow: "var(--sgt-section-shadow)",
          }}
        >
          <div className="relative flex flex-col flex-1 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 w-full">
            
            {/* Container com scroll */}
            <div className="flex flex-col flex-1 min-h-0 gap-4 sm:gap-6 overflow-y-auto overflow-x-hidden">
        
          {/* ════════ HEADER DESKTOP ════════ */}
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
              <DatePickerInput 
                value={dwFilter.dataInicio} 
                onChange={(v) => setDwFilter("dataInicio", v)} 
                placeholder="Data início" 
              />
              <DatePickerInput 
                value={dwFilter.dataFim} 
                onChange={(v) => setDwFilter("dataFim", v)} 
                placeholder="Data fim" 
              />
              
              <Select 
                value={dwFilter.empresa ?? "__all__"} 
                onValueChange={(v) => setDwFilter("empresa", v === "__all__" ? null : v)}
              >
                <SelectTrigger className="h-8 w-full min-w-[100px] max-w-[140px] rounded-lg text-[12px]">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={dwFilter.filial ?? "__all__"} 
                onValueChange={(v) => setDwFilter("filial", v === "__all__" ? null : v)}
              >
                <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[140px] rounded-lg text-[12px]">
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {filiais.filter(f => !dwFilter.empresa || f.empresaId === dwFilter.empresa).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <UpdateButton 
                onClick={fetchFromDW} 
                isFetching={isFetchingDw} 
                loadingPhase={loadingPhase} 
                progress={progress} 
              />
            </div>

            <HomeButton />
          </div>

          {/* ════════ HEADER MOBILE ════════ */}
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
              <UpdateButton 
                onClick={fetchFromDW} 
                isFetching={isFetchingDw} 
                loadingPhase={loadingPhase} 
                progress={progress}
                compact
              />
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

          {/* ════════ MINI-CARDS (Insights) ════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {miniCards.map((mc, i) => (
              <AnimatedCard key={mc.label} delay={300 + i * 50}>
                <div className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-slate-700/30 bg-[var(--sgt-bg-card)] p-3 transition-all duration-200 hover:border-slate-600/40">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-${mc.color}-400/10 border border-${mc.color}-400/20`}>
                    <mc.icon className={`h-5 w-5 text-${mc.color}-400`} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-500">{mc.label}</p>
                    <p className="text-[18px] font-black leading-none text-white">{mc.value}</p>
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

          {/* ════════ GRÁFICOS ════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Gráfico 1: Compras Mensais (Barras) */}
            <AnimatedCard delay={500}>
              <div className="flex h-[340px] flex-col overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Compras Mensais</h3>
                {dadosGraficos.dadosMensais.length > 0 ? (
                  <svg viewBox="0 0 520 260" className="w-full flex-1" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{stopColor: 'rgb(99,102,241)', stopOpacity: 1}} />
                        <stop offset="100%" style={{stopColor: 'rgb(79,70,229)', stopOpacity: 1}} />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const maxVal = Math.max(...dadosGraficos.dadosMensais.map(d => d.valor), 1);
                      const barWidth = 35;
                      const gap = 8;
                      const padL = 10;
                      const padR = 10;
                      const padT = 10;
                      const padB = 30;
                      const chartH = 260 - padT - padB;
                      const totalWidth = dadosGraficos.dadosMensais.length * (barWidth + gap) - gap;
                      const startX = padL + (520 - padL - padR - totalWidth) / 2;
                      
                      return dadosGraficos.dadosMensais.map((d, i) => {
                        const x = startX + i * (barWidth + gap);
                        const h = (d.valor / maxVal) * chartH;
                        const y = padT + chartH - h;
                        return (
                          <g key={d.mes}>
                            <rect x={x} y={y} width={barWidth} height={h} fill="url(#barGrad)" rx="3" />
                            <text x={x + barWidth/2} y={padT + chartH + 15} fill="#94a3b8" fontSize="9" textAnchor="middle">{d.mesLabel}</text>
                            <text x={x + barWidth/2} y={y - 5} fill="#cbd5e1" fontSize="8" fontWeight="600" textAnchor="middle">{fmtK(d.valor)}</text>
                          </g>
                        );
                      });
                    })()}
                  </svg>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-slate-600 text-sm">Sem dados</div>
                )}
              </div>
            </AnimatedCard>

            {/* Gráfico 2: Top 5 Fornecedores */}
            <AnimatedCard delay={550}>
              <div className="flex h-[340px] flex-col overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Top 5 Fornecedores</h3>
                {dadosGraficos.top5Fornecedores.length > 0 ? (
                  <svg viewBox="0 0 520 260" className="w-full flex-1" xmlns="http://www.w3.org/2000/svg">
                    {(() => {
                      const maxVal = Math.max(...dadosGraficos.top5Fornecedores.map(d => d.valor), 1);
                      const barH = 35;
                      const gap = 12;
                      const padL = 160;
                      const padR = 80;
                      const padT = 10;
                      const chartW = 520 - padL - padR;
                      
                      return dadosGraficos.top5Fornecedores.map((d, i) => {
                        const y = padT + i * (barH + gap);
                        const w = (d.valor / maxVal) * chartW;
                        return (
                          <g key={d.nome}>
                            <rect x={padL} y={y} width={w} height={barH} fill="rgb(99,102,241)" opacity="0.9" rx="4" />
                            <text x={padL - 6} y={y + barH/2 + 3} fill="#cbd5e1" fontSize="9" fontWeight="500" textAnchor="end">{d.nome}</text>
                            <text x={padL + w + 6} y={y + barH/2 + 3} fill="#cbd5e1" fontSize="9" fontWeight="600">{fmtK(d.valor)}</text>
                          </g>
                        );
                      });
                    })()}
                  </svg>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-slate-600 text-sm">Sem dados</div>
                )}
              </div>
            </AnimatedCard>

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
                          <td className="px-4 py-3 text-[13px] font-medium text-white">{(compra as any).nf}</td>
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
          
          </div> {/* Fecha container com scroll */}
          </div> {/* Fecha div principal */}
        </section>
      </div>
    </div>
  );
}
