import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, TrendingDown, Clock, CheckCircle, AlertTriangle,
  Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { InsightsSection } from "@/components/shared/InsightsSection";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { UpdateButton } from "@/components/shared/UpdateButton";
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
const fmtData = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const PAGE_SIZE = 50;

// ═══════════════════════════════════════════════════════════════════════════════
//  GRÁFICOS PREMIUM
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Aging de Vencidos (Barras Verticais) ─────────────────────────────────────
const AgingChart = ({ data }: { data: any[] }) => {
  const [hover, setHover] = useState<number | null>(null);
  
  const svgW = 520; const svgH = 300;
  const padL = 60; const padR = 25; const padTop = 25; const padBot = 38;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padTop - padBot;
  
  const maxVal = Math.max(...data.map(d => d.value), 1) * 1.15;
  const barW = (chartW - (data.length - 1) * 16) / data.length;
  
  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-full w-full" onMouseLeave={() => setHover(null)}>
      <defs>
        {data.map((d, i) => (
          <linearGradient key={i} id={`aging-g-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={d.color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={d.color} stopOpacity="0.7" />
          </linearGradient>
        ))}
      </defs>
      
      {/* Grid */}
      {[0, 0.5, 1].map(frac => {
        const y = padTop + chartH * (1 - frac);
        return (
          <g key={frac}>
            <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            {frac > 0 && (
              <text x={padL - 6} y={y + 3} fill="#64748b" fontSize="9" fontWeight="500" textAnchor="end">
                {fmtK(maxVal * frac)}
              </text>
            )}
          </g>
        );
      })}
      
      {/* Barras */}
      {data.map((d, i) => {
        const x = padL + i * (barW + 16);
        const h = (d.value / maxVal) * chartH;
        const y = padTop + chartH - h;
        const isHover = hover === i;
        
        return (
          <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: "pointer" }}>
            <rect x={x} y={y} width={barW} height={h} rx="4"
              fill={`url(#aging-g-${i})`} opacity={isHover ? 1 : 0.88}
              stroke={isHover ? d.color : "none"} strokeWidth="2"
              style={{ transition: "all 0.2s" }} />
            
            <text x={x + barW / 2} y={svgH - padBot + 18} fill="#94a3b8" fontSize="9" fontWeight="600" textAnchor="middle">
              {d.label}
            </text>
            
            {isHover && (
              <>
                <rect x={x + barW / 2 - 50} y={y - 34} width="100" height="24" rx="4"
                  fill="rgba(2,6,23,0.96)" stroke={`${d.color}60`} strokeWidth="1" />
                <text x={x + barW / 2} y={y - 20} fill={d.color} fontSize="8" fontWeight="500" textAnchor="middle">
                  {d.count} docs
                </text>
                <text x={x + barW / 2} y={y - 12} fill="white" fontSize="10" fontWeight="700" textAnchor="middle">
                  {fmtBRL(d.value)}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─── Top Fornecedores (Barras Horizontais) ────────────────────────────────────
const TopFornecedoresChart = ({ data }: { data: any[] }) => {
  const [hover, setHover] = useState<number | null>(null);
  
  const svgW = 520; const svgH = 300;
  const padL = 150; const padR = 75; const padTop = 20; const padBot = 20;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padTop - padBot;
  
  const maxVal = Math.max(...data.map(d => d.valor), 1) * 1.08;
  const barH = (chartH - (data.length - 1) * 8) / data.length;
  
  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-full w-full" onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="forn-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      
      {/* Grid */}
      {[0.5, 1].map(frac => {
        const x = padL + chartW * frac;
        return (
          <g key={frac}>
            <line x1={x} y1={padTop} x2={x} y2={svgH - padBot} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={x} y={svgH - padBot + 12} fill="#64748b" fontSize="9" fontWeight="500" textAnchor="middle">
              {fmtK(maxVal * frac)}
            </text>
          </g>
        );
      })}
      
      {/* Barras */}
      {data.map((d, i) => {
        const y = padTop + i * (barH + 8);
        const w = (d.valor / maxVal) * chartW;
        const isHover = hover === i;
        
        return (
          <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: "pointer" }}>
            <text x={padL - 6} y={y + barH / 2 + 3} fill="#cbd5e1" fontSize="9" fontWeight="500" textAnchor="end">
              {d.nome}
            </text>
            
            <rect x={padL} y={y} width={w} height={barH} rx="3"
              fill="url(#forn-grad)" opacity={isHover ? 1 : 0.88} />
            
            <text x={padL + w + 5} y={y + barH / 2 + 3} fill="#06b6d4" fontSize="9" fontWeight="600">
              {fmtK(d.valor)}
            </text>
            
            {isHover && (
              <g>
                <rect x={padL + w / 2 - 60} y={y - 22} width="120" height="18" rx="4"
                  fill="rgba(2,6,23,0.96)" stroke="rgba(6,182,212,0.4)" strokeWidth="1" />
                <text x={padL + w / 2} y={y - 9} fill="#06b6d4" fontSize="9" fontWeight="600" textAnchor="middle">
                  {fmtBRL(d.valor)}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function ContasAPagar() {
  const navigate = useNavigate();
  const { contasPagar, resumo, isFetchingDw, dwFilter, setDwFilter, filiais, empresas, fetchFromDW, loadingPhase, progress } = useFinancialData();
  const { contasPagar: resumoPagar } = resumo;

  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const filiaisFiltradas = filiais.filter(f => !dwFilter.empresa || f.empresa === dwFilter.empresa);

  // ── Atualização com progresso ──────────────────────────────────────────────
  const handleUpdate = async () => {
    try {
      await fetchFromDW();
    } catch (err) {
      console.error("Erro ao atualizar dados:", err);
    }
  };

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

  // ── INSIGHTS (cálculos reais) ──────────────────────────────────────────────
  const insightsData = useMemo(() => {
    // 1. DPO - Prazo médio de pagamento (entre vencimento e pagamento)
    const pagos = contasPagar.filter(c => c.dataPagamento);
    let dpoTotal = 0;
    pagos.forEach(c => {
      const venc = new Date(c.vencimento);
      const pag = new Date(c.dataPagamento!);
      const diffDias = Math.floor((pag.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
      dpoTotal += diffDias;
    });
    const dpo = pagos.length > 0 ? Math.round(dpoTotal / pagos.length) : 0;
    // Positivo = paga após vencimento, Negativo = paga antes do vencimento

    // 2. Economia potencial com descontos antecipação (assumindo 2% desconto em 30% dos valores)
    const totalAberto = contasPagar.filter(c => (c.status as string) === "Aberto").reduce((s, c) => s + c.valor, 0);
    const economiaPotencial = totalAberto * 0.30 * 0.02; // 30% dos valores com 2% desconto

    // 3. Títulos com problemas (duplicados ou sem documento fiscal)
    const titulosProblema = contasPagar.filter(c => 
      !c.documento || c.documento === "" || c.documento.toLowerCase().includes("dup")
    ).length;

    // 4. Custos com atraso (juros/multas - estimativa 2% sobre vencidos)
    const custoAtraso = contasPagar
      .filter(c => c.status === "Vencido")
      .reduce((s, c) => s + c.valor, 0) * 0.02;

    // 5. Concentração em fornecedores (top 3 = quanto % do total?)
    const porFornecedor: Record<string, number> = {};
    contasPagar.forEach(c => {
      porFornecedor[c.fornecedor] = (porFornecedor[c.fornecedor] || 0) + c.valor;
    });
    const top3Fornecedores = Object.values(porFornecedor)
      .sort((a, b) => b - a)
      .slice(0, 3)
      .reduce((s, v) => s + v, 0);
    const totalGeral = contasPagar.reduce((s, c) => s + c.valor, 0);
    const concentracao = totalGeral > 0 ? (top3Fornecedores / totalGeral) * 100 : 0;

    return {
      dpo,
      economiaPotencial,
      titulosProblema,
      custoAtraso,
      concentracao,
    };
  }, [contasPagar]);

  const kpis = [
    {
      label: "Valor Previsto", value: fmtK(resumoPagar.valorAPagar),
      sub: "Total a pagar", icon: DollarSign, color: "cyan", rgb: "6,182,212",
      stripe: "from-cyan-400/60 to-cyan-700/20",
      border: "border-cyan-400/[0.12]",
      glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]",
      iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]",
      iconTxt: "text-cyan-300",
      sub2: "text-cyan-500/80",
    },
    {
      label: "Valor Pago", value: fmtK(resumoPagar.valorPago),
      sub: `${resumoPagar.valorAPagar > 0 ? ((resumoPagar.valorPago / resumoPagar.valorAPagar) * 100).toFixed(1) : 0}% pago`,
      icon: CheckCircle, color: "emerald", rgb: "16,185,129",
      stripe: "from-emerald-400/60 to-emerald-700/20",
      border: "border-emerald-400/[0.12]",
      glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]",
      iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]",
      iconTxt: "text-emerald-300",
      sub2: "text-emerald-500/80",
    },
    {
      label: "Saldo em Aberto", value: fmtK(resumoPagar.saldoAPagar),
      sub: "Pendente", icon: Clock, color: "amber", rgb: "251,191,36",
      stripe: "from-amber-400/60 to-amber-700/20",
      border: "border-amber-400/[0.12]",
      glow: "hover:shadow-[0_4px_40px_rgba(251,191,36,0.18)]",
      iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]",
      iconTxt: "text-amber-300",
      sub2: "text-amber-500/80",
    },
    {
      label: "Vencidos", value: fmtK(totalVencido),
      sub: `${contasPagar.filter(c => c.status === "Vencido").length} documentos`,
      icon: AlertTriangle, color: "rose", rgb: "244,63,94",
      stripe: "from-rose-400/60 to-rose-700/20",
      border: "border-rose-400/[0.12]",
      glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]",
      iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]",
      iconTxt: "text-rose-300",
      sub2: "text-rose-500/80",
    },
  ];

  // ── Dados para gráficos ────────────────────────────────────────────────────
  const aging = useMemo(() => {
    const today = new Date();
    const buckets = [
      { label: "1-30 dias", value: 0, count: 0, color: "#fbbf24" },
      { label: "31-60 dias", value: 0, count: 0, color: "#fb923c" },
      { label: "61-90 dias", value: 0, count: 0, color: "#f87171" },
      { label: "+90 dias", value: 0, count: 0, color: "#ef4444" },
    ];
    contasPagar.filter(c => c.status === "Vencido").forEach(c => {
      const days = Math.floor((today.getTime() - new Date(c.vencimento).getTime()) / 86_400_000);
      const idx = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3;
      buckets[idx].value += c.valor;
      buckets[idx].count += 1;
    });
    return buckets;
  }, [contasPagar]);

  const topFornecedores = useMemo(() => {
    const map = new Map<string, number>();
    contasPagar.forEach(c => map.set(c.fornecedor, (map.get(c.fornecedor) ?? 0) + c.valor));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, valor]) => ({ nome, valor, fill: "#06b6d4" }));
  }, [contasPagar]);

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
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-500 ease-out"
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
            borderColor: "var(--sgt-border-subtle)",
            boxShadow: "var(--sgt-section-shadow)",
          }}
        >
          <div className="relative flex flex-col flex-1 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 w-full">
            
            {/* Container com scroll */}
            <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 overflow-hidden w-full">
        
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

          <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Tempo real</span>
          </div>

          <div className="h-6 w-px shrink-0 bg-[var(--sgt-divider)]" />

          {/* Filtros */}
          <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
            <DatePickerInput value={dwFilter.dataInicio} onChange={v => setDwFilter("dataInicio", v)} placeholder="Data início" />
            <DatePickerInput value={dwFilter.dataFim} onChange={v => setDwFilter("dataFim", v)} placeholder="Data fim" />
            <div className="h-4 w-px shrink-0 bg-[var(--sgt-divider)]" />
            <Select value={dwFilter.empresa ?? "__all__"} onValueChange={v => setDwFilter("empresa", v === "__all__" ? null : v)}>
              <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[130px] rounded-lg text-[12px] transition-all">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dwFilter.filial ?? "__all__"} onValueChange={v => setDwFilter("filial", v === "__all__" ? null : v)}>
              <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[140px] rounded-lg text-[12px] transition-all">
                <SelectValue placeholder="Filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {filiaisFiltradas.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <UpdateButton onClick={handleUpdate} isFetching={isFetchingDw} progress={progress} loadingPhase={loadingPhase} />
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

        {/* ════════ SESSÃO 2 — INSIGHTS POR IA ════════ */}
        <SectionDivider
          numero={2}
          titulo="Insights por IA"
          subtitulo="Análise inteligente dos dados do período — recomendações acionáveis geradas por IA"
          color="amber"
        />
        <InsightsSection
          setor="contas_a_pagar"
          dados={{
            totalAPagar: resumoPagar.valorAPagar,
            totalPago: resumoPagar.valorPago,
            totalVencido: (resumoPagar as any).valorVencido ?? 0,
            totalAberto: (resumoPagar as any).valorAberto ?? 0,
            qtdTitulos: contasPagar.length,
            dpo: insightsData.dpo,
            economiaPotencial: Math.round(insightsData.economiaPotencial),
            titulosProblema: insightsData.titulosProblema,
            custoAtraso: Math.round(insightsData.custoAtraso),
            concentracaoTop3Fornecedores: Math.round(insightsData.concentracao),
          }}
          periodo={`${dwFilter.dataInicio} a ${dwFilter.dataFim}`}
        />
        {/* REMOVIDO: grid de insights fixos — substituído por IA acima */}
        <div className="hidden grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          
          {/* Insight 1: DPO e Tendência */}
          <AnimatedCard delay={300}>
            <div className="relative overflow-hidden rounded-[14px] border border-blue-500/20 bg-[var(--sgt-bg-card)] p-4 hover:border-blue-400/30 transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-400/70">DPO · Prazo Médio</p>
                    <p className="text-2xl font-black text-white mt-1">
                      {insightsData.dpo === 0 ? "—" : Math.abs(insightsData.dpo)} dias
                      {insightsData.dpo < 0 && <span className="text-[14px] text-emerald-400 ml-1">↑</span>}
                      {insightsData.dpo > 0 && <span className="text-[14px] text-amber-400 ml-1">↓</span>}
                    </p>
                  </div>
                  <Clock className="h-5 w-5 text-blue-400/60" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {insightsData.dpo === 0 ? "Sem dados de pagamento. " : 
                   insightsData.dpo < 0 ? `Pagando em média ${Math.abs(insightsData.dpo)} dias ANTES do vencimento. ` :
                   `Pagando em média ${insightsData.dpo} dias APÓS vencimento. `}
                  <span className="text-blue-400 font-semibold">Negociar prazos maiores</span> pode melhorar fluxo de caixa.
                </p>
              </div>
            </div>
          </AnimatedCard>

          {/* Insight 2: Descontos por Antecipação */}
          <AnimatedCard delay={350}>
            <div className="relative overflow-hidden rounded-[14px] border border-emerald-500/20 bg-[var(--sgt-bg-card)] p-4 hover:border-emerald-400/30 transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-400/70">Oportunidade</p>
                    <p className="text-2xl font-black text-white mt-1">{fmtK(insightsData.economiaPotencial)}</p>
                  </div>
                  <TrendingDown className="h-5 w-5 text-emerald-400/60" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Economia potencial com <span className="text-emerald-400 font-semibold">descontos por antecipação</span> (estimativa 2% em 30% dos valores). Avalie custo de capital antes de antecipar.
                </p>
              </div>
            </div>
          </AnimatedCard>

          {/* Insight 3: Centralização de Pagamentos */}
          <AnimatedCard delay={400}>
            <div className="relative overflow-hidden rounded-[14px] border border-amber-500/20 bg-[var(--sgt-bg-card)] p-4 hover:border-amber-400/30 transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-400/70">Concentração</p>
                    <p className="text-2xl font-black text-white mt-1">{insightsData.concentracao.toFixed(0)}%</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-amber-400/60" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Top 3 fornecedores representam {insightsData.concentracao.toFixed(0)}% do total. <span className="text-amber-400 font-semibold">Centralizar pagamentos</span> pode aumentar poder de negociação.
                </p>
              </div>
            </div>
          </AnimatedCard>

          {/* Insight 4: Títulos com Problemas */}
          <AnimatedCard delay={450}>
            <div className="relative overflow-hidden rounded-[14px] border border-rose-500/20 bg-[var(--sgt-bg-card)] p-4 hover:border-rose-400/30 transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-rose-400/70">Atenção</p>
                    <p className="text-2xl font-black text-white mt-1">{insightsData.titulosProblema} {insightsData.titulosProblema === 1 ? "título" : "títulos"}</p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-rose-400/60" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Títulos <span className="text-rose-400 font-semibold">duplicados ou sem NF</span> identificados. Revisar lançamentos para evitar pagamento em duplicidade.
                </p>
              </div>
            </div>
          </AnimatedCard>

          {/* Insight 5: Pagamentos com Atraso */}
          <AnimatedCard delay={500}>
            <div className="relative overflow-hidden rounded-[14px] border border-orange-500/20 bg-[var(--sgt-bg-card)] p-4 hover:border-orange-400/30 transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-orange-400/70">Custo Extra</p>
                    <p className="text-2xl font-black text-white mt-1">{fmtK(insightsData.custoAtraso)}</p>
                  </div>
                  <DollarSign className="h-5 w-5 text-orange-400/60" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Estimativa de custos com <span className="text-orange-400 font-semibold">juros e multas</span> (2% sobre vencidos). Priorizar pagamento dentro do prazo.
                </p>
              </div>
            </div>
          </AnimatedCard>

          {/* Insight 6: Risco Sacado */}
          <AnimatedCard delay={550}>
            <div className="relative overflow-hidden rounded-[14px] border border-violet-500/20 bg-[var(--sgt-bg-card)] p-4 hover:border-violet-400/30 transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/5 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-violet-400/70">Inovação</p>
                    <p className="text-lg font-black text-white mt-1">Forfait?</p>
                  </div>
                  <Clock className="h-5 w-5 text-violet-400/60" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Avaliar uso de <span className="text-violet-400 font-semibold">"risco sacado" (forfait)</span> para alongar prazos sem prejudicar relacionamento com fornecedores.
                </p>
              </div>
            </div>
          </AnimatedCard>

        </div>

        {/* ════════ SESSÃO 3 — DETALHAMENTO ════════ */}
        <SectionDivider
          numero={3}
          titulo="Detalhamento"
          subtitulo="Documentos e títulos que compõem os dados do período"
          color="violet"
        />

        {/* ════════ GRÁFICOS COMPARATIVOS ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Aging de Vencidos */}
          <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4">
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Aging · Títulos Vencidos
              </p>
            </div>
            <div className="h-[320px]">
              <AgingChart data={aging} />
            </div>
          </div>

          {/* Top 5 Fornecedores */}
          <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4">
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Top 5 · Maiores Fornecedores
              </p>
            </div>
            <div className="h-[320px]">
              <TopFornecedoresChart data={topFornecedores} />
            </div>
          </div>
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
                <tr style={{ borderBottom: "1px solid var(--sgt-border-subtle)", background: "var(--sgt-table-head)" }}>
                  <th className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort("documento")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                      Documento
                      {sortCol === "documento" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort("fornecedor")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                      Fornecedor
                      {sortCol === "fornecedor" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort("vencimento")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                      Vencimento
                      {sortCol === "vencimento" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right">
                    <button onClick={() => toggleSort("valor")} className="flex items-center gap-1 ml-auto text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                      Valor
                      {sortCol === "valor" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Status</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginados.map((conta, i) => (
                  <tr key={i} className="border-b border-[var(--sgt-border-subtle)] transition-colors hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5 text-[13px] font-medium text-white">{conta.documento}</td>
                    <td className="px-3 py-2.5 text-[13px] text-slate-300">{conta.fornecedor}</td>
                    <td className="px-3 py-2.5 text-[13px] text-slate-400">{fmtData(conta.vencimento)}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] font-semibold text-white">{fmtBRL(conta.valor)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        (conta.status as string) === "Pago" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-400/20" :
                        conta.status === "Vencido" ? "bg-rose-500/10 text-rose-300 border border-rose-400/20" :
                        conta.status === "Parcial" ? "bg-amber-500/10 text-amber-300 border border-amber-400/20" :
                        "bg-cyan-500/10 text-cyan-300 border border-cyan-400/20"
                      }`}>
                        {conta.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {paginados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[12px] text-slate-600">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                )}
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
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] text-slate-400 transition-all hover:border-amber-400/30 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  let p: number;
                  if (totalPaginas <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPaginas - 2) p = totalPaginas - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-semibold transition-all ${page === p ? "border border-amber-400/40 bg-amber-500/[0.15] text-amber-300" : "border border-white/[0.06] text-slate-500 hover:border-amber-400/20 hover:text-amber-300"}`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPaginas, page + 1))}
                  disabled={page === totalPaginas}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] text-slate-400 transition-all hover:border-amber-400/30 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          
          </div> {/* Fecha container com scroll */}
        </div>
        </div>
      </section>
      </div>
    </div>
  );
}
