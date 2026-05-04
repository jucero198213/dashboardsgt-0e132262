import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, FileText, Users, Package,
  Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  ReceiptText, AlertCircle, TrendingUp, AlertTriangle,
  Clock, CheckCircle, DollarSign, TrendingDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchCompras, type ComprasRow } from "@/lib/dwApi";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { InsightsSection } from "@/components/shared/InsightsSection";
import { SectionDivider } from "@/components/shared/SectionDivider";
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

  // ── INSIGHTS (cálculos reais) ──────────────────────────────────────────────
  const insightsCompras = useMemo(() => {
    // 1. Concentração em fornecedor único (produtos com apenas 1 fornecedor)
    const porProduto: Record<string, Set<string>> = {};
    compras.forEach(c => {
      if (!porProduto[c.produto]) porProduto[c.produto] = new Set();
      porProduto[c.produto].add(c.fornecedor);
    });
    const produtosUnicoFornecedor = Object.values(porProduto).filter(f => f.size === 1).length;
    const totalProdutos = Object.keys(porProduto).length;
    const percRiscoUnico = totalProdutos > 0 ? (produtosUnicoFornecedor / totalProdutos) * 100 : 0;

    // 2. Lead time médio (diferença entre data pedido e data entrada)
    const comprasComDatas = compras.filter(c => c.data_pedido && c.data_entrada);
    let leadTimeTotal = 0;
    comprasComDatas.forEach(c => {
      const pedido = new Date(c.data_pedido!);
      const entrada = new Date(c.data_entrada!);
      const diffDias = Math.floor((entrada.getTime() - pedido.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDias >= 0) leadTimeTotal += diffDias;
    });
    const leadTimeMedio = comprasComDatas.length > 0 ? Math.round(leadTimeTotal / comprasComDatas.length) : 0;

    // 3. Pedidos emergenciais (assumindo pedidos com lead time < 3 dias)
    const emergenciais = comprasComDatas.filter(c => {
      const pedido = new Date(c.data_pedido!);
      const entrada = new Date(c.data_entrada!);
      const diffDias = Math.floor((entrada.getTime() - pedido.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias >= 0 && diffDias < 3;
    });
    const custoEmergencial = emergenciais.reduce((s, c) => s + ((c.quantidade ?? 0) * (c.valor_un ?? 0)), 0);

    // 4. Análise de contratos (verificar se há campo de tipo de compra)
    // Como não temos campo de contrato vs spot, vamos contar grupos com compras recorrentes
    const porGrupo: Record<string, number> = {};
    compras.forEach(c => {
      porGrupo[c.grupo] = (porGrupo[c.grupo] || 0) + 1;
    });
    const gruposRecorrentes = Object.entries(porGrupo).filter(([_, count]) => count > 5).length;
    const totalGrupos = Object.keys(porGrupo).length;
    const percRecorrente = totalGrupos > 0 ? (gruposRecorrentes / totalGrupos) * 100 : 0;

    return {
      percRiscoUnico,
      produtosUnicoFornecedor,
      totalProdutos,
      leadTimeMedio,
      custoEmergencial,
      numEmergenciais: emergenciais.length,
      percRecorrente,
      gruposRecorrentes,
    };
  }, [compras]);

  // ── Dados para IA (Sessão 2) ──────────────────────────────────────────────
  const dadosParaIA = useMemo(() => {
    const total = compras.reduce((s, c) => s + ((c.quantidade ?? 0) * (c.valor_un ?? 0)), 0);
    const notas = new Set(compras.map((c: any) => c.nf)).size;
    const fornecedores = new Set(compras.map(c => c.fornecedor)).size;
    const produtos = new Set(compras.map(c => c.produto)).size;
    const porFornecedor: Record<string, number> = {};
    compras.forEach(c => {
      const v = (c.quantidade ?? 0) * (c.valor_un ?? 0);
      porFornecedor[c.fornecedor] = (porFornecedor[c.fornecedor] || 0) + v;
    });
    const top3Fornecedores = Object.entries(porFornecedor).sort((a,b) => b[1]-a[1]).slice(0,3).map(([nome, valor]) => ({ nome, valor: Math.round(valor) }));
    const porGrupo: Record<string, number> = {};
    compras.forEach(c => { porGrupo[c.grupo] = (porGrupo[c.grupo] || 0) + ((c.quantidade ?? 0) * (c.valor_un ?? 0)); });
    const top3Grupos = Object.entries(porGrupo).sort((a,b) => b[1]-a[1]).slice(0,3).map(([grupo, valor]) => ({ grupo, valor: Math.round(valor) }));
    return {
      totalComprado: Math.round(total),
      notasFiscais: notas,
      fornecedoresAtivos: fornecedores,
      produtosDistintos: produtos,
      percRiscoFornecedorUnico: Math.round(insightsCompras.percRiscoUnico),
      produtosComUmFornecedor: insightsCompras.produtosUnicoFornecedor,
      leadTimeMedioDias: insightsCompras.leadTimeMedio,
      pedidosEmergenciais: insightsCompras.numEmergenciais,
      custoEmergencial: Math.round(insightsCompras.custoEmergencial),
      gruposRecorrentes: insightsCompras.gruposRecorrentes,
      top3Fornecedores,
      top3Grupos,
    };
  }, [compras, insightsCompras]);

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
                  {filiais.filter(f => !dwFilter.empresa || (f as any).empresaId === dwFilter.empresa).map((f) => (
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
          {(() => {
            const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
            const anoAtual = new Date().getFullYear();
            const anoAnt = anoAtual - 1;
            const valoresAtual = dadosGraficos.comparativoAnual.map(m => m.anoAtual);
            const valoresAnt = dadosGraficos.comparativoAnual.map(m => m.anoAnterior);
            const maxVal = Math.max(...valoresAtual, ...valoresAnt, 1);
            const fmtY = (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}k` : `${v.toFixed(0)}`;

            const buildPath = (vals: number[], w: number, h: number, padL: number, padR: number, padT: number, padB: number) => {
              const innerW = w - padL - padR;
              const innerH = h - padT - padB;
              if (vals.length === 0) return "";
              return vals.map((v, i) => {
                const x = padL + (i / (vals.length - 1)) * innerW;
                const y = padT + innerH * (1 - v / maxVal);
                return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(" ");
            };

            const temDados = valoresAtual.some(v => v > 0) || valoresAnt.some(v => v > 0);
            const top5 = dadosGraficos.top5Fornecedores;
            const maxFornec = Math.max(...top5.map(f => f.valor), 1);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 auto-rows-fr items-stretch">
                {/* Gráfico 1 — Linha: Compras mensais ano atual vs anterior */}
                <AnimatedCard delay={500} className="h-full">
                  <div className="relative overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4 flex flex-col gap-2 h-full min-h-[320px]">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/50 to-transparent" />
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: "var(--sgt-text-muted)" }}>Compras Mensais — {anoAtual} vs {anoAnt}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-[2px] w-4 rounded-full bg-amber-400 inline-block" />
                          <span className="text-[9px] font-semibold text-amber-400">{anoAtual}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,3"/></svg>
                          <span className="text-[9px] font-semibold text-slate-400">{anoAnt}</span>
                        </div>
                      </div>
                    </div>
                    {!temDados ? (
                      <div className="flex flex-1 items-center justify-center text-[12px] text-slate-500">Sem dados no período</div>
                    ) : (
                      <svg viewBox="0 0 480 260" preserveAspectRatio="xMidYMid meet" className="w-full flex-1 min-h-[180px]">
                        <defs>
                          <linearGradient id="comprasGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.25"/>
                            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        {[0.25,0.5,0.75,1].map(f => (
                          <line key={f} x1={48} y1={16+(260-16-28)*(1-f)} x2={472} y2={16+(260-16-28)*(1-f)} stroke="var(--sgt-border-subtle)" strokeWidth={0.5} strokeDasharray="4,4"/>
                        ))}
                        {[0.25,0.5,0.75,1].map(f => (
                          <text key={f} x={44} y={16+(260-16-28)*(1-f)+4} textAnchor="end" fontSize={8} fill="var(--sgt-text-muted)" fontFamily="system-ui">{fmtY(maxVal*f)}</text>
                        ))}
                        <path d={`${buildPath(valoresAtual,480,260,48,8,16,28)} L472,232 L48,232 Z`} fill="url(#comprasGrad)"/>
                        <path d={buildPath(valoresAnt,480,260,48,8,16,28)} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.6}/>
                        <path d={buildPath(valoresAtual,480,260,48,8,16,28)} fill="none" stroke="#fbbf24" strokeWidth={2.5}/>
                        {months.map((m,i) => (
                          <text key={m} x={48+(i/11)*424} y={255} textAnchor="middle" fontSize={8.5} fill="var(--sgt-text-muted)" fontFamily="system-ui">{m}</text>
                        ))}
                      </svg>
                    )}
                  </div>
                </AnimatedCard>

                {/* Gráfico 2 — Barras: Top 5 Fornecedores */}
                <AnimatedCard delay={560} className="h-full">
                  <div className="relative overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4 flex flex-col gap-2 h-full min-h-[320px]">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-400/50 to-transparent" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: "var(--sgt-text-muted)" }}>Top 5 Fornecedores</span>
                    {top5.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center text-[12px] text-slate-500">Sem dados no período</div>
                    ) : (
                      <div className="flex flex-col gap-2.5 flex-1 justify-center pt-2">
                        {top5.map((f, i) => {
                          const pct = (f.valor / maxFornec) * 100;
                          const isMax = i === 0;
                          return (
                            <div key={f.nome} className="flex flex-col gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-medium truncate" style={{ color: "var(--sgt-text-secondary)" }}>{f.nome}</span>
                                <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: isMax ? "#22d3ee" : "var(--sgt-text-secondary)" }}>{fmtK(f.valor)}</span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${Math.max(pct, 2)}%`,
                                    background: isMax ? "linear-gradient(90deg,#22d3ee,#0891b2)" : "linear-gradient(90deg,rgba(34,211,238,0.6),rgba(8,145,178,0.4))",
                                    boxShadow: isMax ? "0 0 10px rgba(34,211,238,0.3)" : "none",
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </AnimatedCard>
              </div>
            );
          })()}

          {/* ════════ SESSÃO 2 — INSIGHTS POR IA ════════ */}
          <SectionDivider
            numero={2}
            titulo="Insights por IA"
            subtitulo="Análise inteligente dos dados do período — recomendações acionáveis geradas por IA"
            color="violet"
          />
          <InsightsSection
            setor="compras"
            dados={dadosParaIA}
            periodo={`${dwFilter.dataInicio} a ${dwFilter.dataFim}`}
          />


          {/* ════════ SESSÃO 3 — DETALHAMENTO ════════ */}
          <SectionDivider
            numero={3}
            titulo="Detalhamento"
            subtitulo="Documentos e registros que compõem os dados do período"
            color="blue"
          />

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
          </div> {/* Fecha padding wrapper */}
        </section>
      </div>
    </div>
  );
}
