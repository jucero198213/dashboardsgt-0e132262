import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, TrendingDown, Clock, CheckCircle, AlertTriangle,
  Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  LayoutDashboard, CalendarClock, AlertOctagon, Zap, Percent, Construction,
} from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { InsightsSection } from "@/components/shared/InsightsSection";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { KpiCard } from "@/components/indicators/KpiCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { UpdateButton } from "@/components/shared/UpdateButton";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import sgtLogo from "@/assets/sgt-logo.png";
import { GooeyInput } from "@/components/ui/gooey-input";

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtK = (v: number) => v >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v/1e3).toFixed(0)}k` : fmtBRL(v);
const fmtData = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const PAGE_SIZE = 50;

// ─── Visões do Contas a Receber ────────────────────────────────────────────
type ViewMode = "executivo" | "a_vencer" | "vencidos" | "liberado_antecipar";

const VIEWS: { id: ViewMode; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "executivo",           label: "Executivo",              icon: LayoutDashboard },
  { id: "a_vencer",            label: "A Vencer",                icon: CalendarClock   },
  { id: "vencidos",            label: "Vencidos",                icon: AlertOctagon    },
  { id: "liberado_antecipar",  label: "Liberado p/ Antecipar",   icon: Zap             },
];

// ─── Agrupamento por mês de emissão (Card 1 e drill-down) ──────────────────
const MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const monthKey   = (iso: string) => (iso ?? "").slice(0, 7); // "YYYY-MM"
const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  const idx = parseInt(m, 10) - 1;
  return `${MESES_PT[idx] ?? "?"}/${(y ?? "").slice(2)}`;
};

function groupByEmissionMonth(rows: { dataEmissao: string; valor: number }[]) {
  const map = new Map<string, { value: number; count: number }>();
  rows.forEach((c) => {
    const key = monthKey(c.dataEmissao);
    if (!key) return;
    const cur = map.get(key) ?? { value: 0, count: 0 };
    map.set(key, { value: cur.value + c.valor, count: cur.count + 1 });
  });
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ label: monthLabel(key), value: v.value, count: v.count, color: "#06b6d4" }));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GRÁFICOS PREMIUM
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Barras Verticais genéricas (aging, composição mensal etc.) ───────────────
const VerticalBarChart = ({ data }: { data: any[] }) => {
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

// ─── Lista ranqueada (grupo/cliente) — barra de participação + drill-down ─────
const RankedList = ({
  data, color = "#f59e0b", onRowClick, emptyMessage = "Sem dados no período selecionado",
}: {
  data: { nome: string; valor: number }[];
  color?: string;
  onRowClick?: (nome: string) => void;
  emptyMessage?: string;
}) => {
  const total = data.reduce((s, d) => s + d.valor, 0);

  if (data.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-10 text-center text-[12px] text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      {data.map((r, i) => {
        const barW = total > 0 ? Math.min((r.valor / total) * 100, 100) : 0;
        const pct = total > 0 ? (r.valor / total) * 100 : 0;
        return (
          <button
            key={r.nome}
            type="button"
            onClick={onRowClick ? () => onRowClick(r.nome) : undefined}
            disabled={!onRowClick}
            className={`grid grid-cols-[minmax(0,1fr)_5.5rem_3rem] gap-3 px-3.5 py-2.5 items-center border-b border-[var(--sgt-divider)] last:border-0 text-left w-full transition-colors ${
              onRowClick ? "cursor-pointer hover:bg-white/[0.03]" : "cursor-default"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[10px] font-bold shrink-0 w-4 text-right tabular-nums text-slate-600">{i + 1}</span>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-[12px] font-semibold truncate text-[var(--sgt-text-primary)]">{r.nome}</span>
                <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barW}%`, background: color }} />
                </div>
              </div>
            </div>
            <span className="text-[12px] font-bold tabular-nums text-right text-[var(--sgt-text-primary)]">{fmtK(r.valor)}</span>
            <span className="text-[11px] font-bold tabular-nums text-right text-slate-500">{pct.toFixed(0)}%</span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Gauge semicircular — Taxa de Inadimplência ────────────────────────────────
const InadimplenciaGauge = ({ percent }: { percent: number }) => {
  const p = Math.max(0, Math.min(percent, 100));
  const cx = 100, cy = 92, r = 72;
  const pt = (pct: number) => {
    const a = Math.PI - (pct / 100) * Math.PI;
    return { x: +(cx + r * Math.cos(a)).toFixed(2), y: +(cy - r * Math.sin(a)).toFixed(2) };
  };
  const end = pt(p);
  const largeArc = p > 50 ? 1 : 0;
  const color = p >= 15 ? "#f43f5e" : p >= 5 ? "#f59e0b" : "#10b981";

  return (
    <svg viewBox="0 0 200 112" className="h-full w-full max-w-[240px]">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="16" strokeLinecap="round" />
      {p > 0 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`}
          fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" style={{ transition: "d 0.4s" }} />
      )}
      <text x={cx} y={cy - 12} textAnchor="middle" fill="white" fontSize="26" fontWeight="900">{p.toFixed(1)}%</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="700" letterSpacing="0.5">
        vencido / carteira elegível
      </text>
      <text x={cx - r} y={cy + 26} fill="rgba(255,255,255,0.25)" fontSize="9">0%</text>
      <text x={cx + r - 16} y={cy + 26} fill="rgba(255,255,255,0.25)" fontSize="9">100%</text>
    </svg>
  );
};

// ─── Card 2 — Detalhamento por Cliente e Mês de Emissão (drill-down) ──────────
const ClienteDrilldownCard = ({ contas }: { contas: { grupoCliente: string; cliente: string; dataEmissao: string; valor: number }[] }) => {
  const [grupo, setGrupo] = useState<string | null>(null);
  const [cliente, setCliente] = useState<string | null>(null);

  const porGrupo = useMemo(() => {
    const map = new Map<string, number>();
    contas.forEach((c) => map.set(c.grupoCliente, (map.get(c.grupoCliente) ?? 0) + c.valor));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([nome, valor]) => ({ nome, valor }));
  }, [contas]);

  const porCliente = useMemo(() => {
    if (!grupo) return [];
    const map = new Map<string, number>();
    contas.filter((c) => c.grupoCliente === grupo).forEach((c) => map.set(c.cliente, (map.get(c.cliente) ?? 0) + c.valor));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([nome, valor]) => ({ nome, valor }));
  }, [contas, grupo]);

  const porMes = useMemo(() => {
    if (!grupo || !cliente) return [];
    return groupByEmissionMonth(contas.filter((c) => c.grupoCliente === grupo && c.cliente === cliente));
  }, [contas, grupo, cliente]);

  const nivel = !grupo ? 0 : !cliente ? 1 : 2;

  return (
    <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 shrink-0 border-b border-[var(--sgt-border-subtle)]" style={{ background: "var(--sgt-table-head)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Detalhamento por Cliente e Mês de Emissão
        </p>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 py-2 shrink-0 border-b border-[var(--sgt-divider)] text-[11px] overflow-x-auto">
        <button
          type="button"
          onClick={() => { setGrupo(null); setCliente(null); }}
          className={`font-semibold whitespace-nowrap transition-colors ${!grupo ? "text-amber-300" : "text-slate-500 hover:text-white"}`}
        >
          Grupos de cliente
        </button>
        {grupo && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" />
            <button
              type="button"
              onClick={() => setCliente(null)}
              className={`font-semibold whitespace-nowrap truncate max-w-[140px] transition-colors ${!cliente ? "text-amber-300" : "text-slate-500 hover:text-white"}`}
            >
              {grupo}
            </button>
          </>
        )}
        {cliente && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" />
            <span className="font-semibold text-amber-300 whitespace-nowrap truncate max-w-[140px]">{cliente}</span>
          </>
        )}
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        {nivel === 0 && <RankedList data={porGrupo} color="#f59e0b" onRowClick={setGrupo} />}
        {nivel === 1 && <RankedList data={porCliente} color="#06b6d4" onRowClick={setCliente} />}
        {nivel === 2 && (
          <div className="flex-1 min-h-0 p-3">
            {porMes.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[12px] text-slate-600">Sem dados no período</div>
            ) : (
              <VerticalBarChart data={porMes} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Placeholder — visões ainda não implementadas ──────────────────────────────
const PlaceholderView = ({ view }: { view: ViewMode }) => {
  const meta: Record<Exclude<ViewMode, "executivo">, { titulo: string; desc: string }> = {
    a_vencer: {
      titulo: "A Vencer",
      desc: "Visão dedicada aos títulos ainda não vencidos, com projeção de fluxo de caixa por vencimento.",
    },
    vencidos: {
      titulo: "Vencidos",
      desc: "Visão dedicada à régua de cobrança e ao detalhamento dos títulos em atraso.",
    },
    liberado_antecipar: {
      titulo: "Liberado p/ Antecipar",
      desc: "Visão dedicada aos títulos elegíveis para antecipação/factoring.",
    },
  };
  const m = meta[view as Exclude<ViewMode, "executivo">];

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/[0.06]">
          <div className="absolute inset-0 rounded-2xl animate-pulse bg-amber-400/[0.04]" />
          <Construction className="h-7 w-7 text-amber-400/70 relative" />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-3 py-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Em desenvolvimento</span>
        </div>
        <h2 className="text-[18px] font-black tracking-[-0.02em] dark:text-white text-slate-800">{m.titulo}</h2>
        <p className="text-[12px] leading-relaxed text-slate-500">{m.desc}</p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function ContasAReceber() {
  const navigate = useNavigate();
  const { contasReceber, resumo, kpiExtra, isFetchingDw, dwFilter, setDwFilter, filiais, empresas, fetchFromDW, loadingPhase, progress } = useFinancialData();
  const { contasReceber: resumoReceber } = resumo;

  const [view, setView] = useState<ViewMode>("executivo");
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
    let list = contasReceber;
    
    if (filtroStatus !== "todos") {
      list = list.filter(c => c.status === filtroStatus);
    }
    
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.documento.toLowerCase().includes(q) ||
        c.cliente.toLowerCase().includes(q)
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
  }, [contasReceber, filtroStatus, search, sortCol, sortAsc]);

  const totalPaginas = Math.max(1, Math.ceil(contasFiltradas.length / PAGE_SIZE));
  const inicio = (page - 1) * PAGE_SIZE;
  const paginados = contasFiltradas.slice(inicio, inicio + PAGE_SIZE);

  function toggleSort(col: string) {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  }

  // ── INSIGHTS (cálculos reais) ──────────────────────────────────────────────
  const insightsDataReceber = useMemo(() => {
    // 1. DSO - Prazo médio de recebimento (entre emissão e recebimento)
    const recebidos = contasReceber.filter(c => (c as any).dataRecebimento);
    let dsoTotal = 0;
    recebidos.forEach(c => {
      const emissao = new Date((c as any).emissao);
      const receb = new Date((c as any).dataRecebimento!);
      const diffDias = Math.floor((receb.getTime() - emissao.getTime()) / (1000 * 60 * 60 * 24));
      dsoTotal += diffDias;
    });
    const dso = recebidos.length > 0 ? Math.round(dsoTotal / recebidos.length) : 0;

    // 2. Concentração em clientes (top 3 = quanto % do total?)
    const porCliente: Record<string, number> = {};
    contasReceber.forEach(c => {
      porCliente[c.cliente] = (porCliente[c.cliente] || 0) + c.valor;
    });
    const top3Clientes = Object.values(porCliente)
      .sort((a, b) => b - a)
      .slice(0, 3)
      .reduce((s, v) => s + v, 0);
    const totalGeralReceber = contasReceber.reduce((s, c) => s + c.valor, 0);
    const concentracaoClientes = totalGeralReceber > 0 ? (top3Clientes / totalGeralReceber) * 100 : 0;
    const numClientesTop3 = Object.entries(porCliente).sort((a, b) => b[1] - a[1]).slice(0, 3).length;

    // 3. Índice de glosa (assumindo 8-10% de diferença entre faturado e pago)
    const totalRecebido = contasReceber.filter(c => (c.status as string) === "Recebido").reduce((s, c) => s + c.valor, 0);
    const totalFaturado = contasReceber.reduce((s, c) => s + c.valor, 0);
    const glosa = totalFaturado > 0 ? ((totalFaturado - totalRecebido) / totalFaturado) * 100 : 0;

    // 4. Clientes inadimplentes recorrentes (vencidos há mais de 30 dias)
    const hoje = new Date();
    const inadimplentesRecorrentes = contasReceber.filter(c => {
      if (c.status !== "Vencido") return false;
      const venc = new Date(c.vencimento);
      const diasAtraso = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
      return diasAtraso > 30;
    });
    const clientesInadimplentes = new Set(inadimplentesRecorrentes.map(c => c.cliente)).size;

    return {
      dso,
      concentracaoClientes,
      numClientesTop3,
      glosa,
      clientesInadimplentes,
    };
  }, [contasReceber]);

  // ── KPIs Executivo ───────────────────────────────────────────────────────────
  // KPI 1: Vencimentos no Período — tudo cujo VENCIMENTO cai no filtro, independente da situação
  //         (já é exatamente o que resumoReceber.valorAReceber representa — ver FinancialDataContext)
  const vencimentosNoPeriodo = resumoReceber.valorAReceber;
  // KPI 3: Realizado no Período — recebido cujo vencimento estava no período (resumoReceber.valorRecebido)
  const realizadoNoPeriodo = resumoReceber.valorRecebido;
  // KPI 2: % Realização = Realizado / Vencimentos no período
  const percentualRealizacao = vencimentosNoPeriodo > 0 ? (realizadoNoPeriodo / vencimentosNoPeriodo) * 100 : 0;
  // KPI 4: Vencido Acumulado — estoque de inadimplência (regra já existente: DATA_VENCIMENTO < hoje e não recebido)
  const vencidoAcumulado = kpiExtra.inadimplencia;

  const kpisExecutivo = [
    { label: "Vencimentos no Período", value: fmtK(vencimentosNoPeriodo), subtitle: "Tudo que vence no período (recebido + a vencer + vencido)", icon: CalendarClock, tone: "cyan"    as const },
    { label: "% Realização",           value: `${percentualRealizacao.toFixed(1)}%`, subtitle: "Realizado ÷ Vencimentos no período", icon: Percent, tone: "emerald" as const },
    { label: "Realizado no Período",   value: fmtK(realizadoNoPeriodo), subtitle: "Efetivamente recebido no período", icon: CheckCircle, tone: "blue" as const },
    { label: "Vencido Acumulado",      value: fmtK(vencidoAcumulado), subtitle: `${kpiExtra.inadimplenciaDocs} títulos vencidos`, icon: AlertTriangle, tone: "rose" as const },
  ];

  // ── Dados para gráficos (visão Executivo) ────────────────────────────────────
  // Mesma população do KPI 1 (vencimento dentro do filtro de período) — usada nos
  // Cards 1 e 2 para "compor" o Contas a Receber vigente pelo mês de EMISSÃO.
  const contasNoPeriodo = useMemo(() =>
    contasReceber.filter(c => c.vencimento >= dwFilter.dataInicio && c.vencimento <= dwFilter.dataFim),
    [contasReceber, dwFilter.dataInicio, dwFilter.dataFim]
  );

  // Card 1 — Composição por Mês de Emissão
  const composicaoMesEmissao = useMemo(() => groupByEmissionMonth(contasNoPeriodo), [contasNoPeriodo]);

  // Card 3 — Clientes que Concentram o Vencido (agrupado por grupo de cliente)
  const vencidoPorGrupo = useMemo(() => {
    const map = new Map<string, number>();
    contasReceber.filter(c => c.status === "Vencido").forEach(c =>
      map.set(c.grupoCliente, (map.get(c.grupoCliente) ?? 0) + c.valor)
    );
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([nome, valor]) => ({ nome, valor }));
  }, [contasReceber]);

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
            <div className="flex flex-col leading-none">
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
              <span className="text-[17px] font-black tracking-[-0.03em] text-white">Contas a Receber</span>
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
        <div className="flex sm:hidden items-center gap-2">
          <MobileNav />
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img src={sgtLogo} alt="SGT" className="h-7 w-auto" />
            <div className="h-5 w-px bg-[var(--sgt-border-medium)]" />
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">Workspace</span>
              <span className="text-[15px] font-black tracking-[-0.03em] text-white truncate">Contas a Receber</span>
            </div>
          </div>
          <UpdateButton onClick={() => {}} isFetching={isFetchingDw} progress={0} compact />
          <HomeButton />
        </div>

        {/* ════════ SELETOR DE VISÕES ════════ */}
        <div className="flex items-center shrink-0">
          <div className="flex items-center gap-0.5 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] p-0.5 overflow-x-auto">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-semibold uppercase tracking-[0.06em] transition-all whitespace-nowrap ${
                  view === v.id
                    ? "border border-amber-400/40 bg-amber-500/15 text-amber-300"
                    : "border border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <v.icon className="h-3.5 w-3.5" />
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {view === "executivo" && (
        <>
        {/* ════════ KPIs ════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {kpisExecutivo.map((k, i) => (
            <AnimatedCard key={k.label} delay={i * 60}>
              <KpiCard label={k.label} value={k.value} subtitle={k.subtitle} icon={k.icon} tone={k.tone} loading={isFetchingDw} />
            </AnimatedCard>
          ))}
        </div>
        <InsightsSection
          setor="contas_a_receber"
          dados={{
            totalAReceber: resumoReceber.valorAReceber,
            totalRecebido: resumoReceber.valorRecebido,
            totalVencido: (resumoReceber as any).valorVencido ?? 0,
            totalAberto: (resumoReceber as any).valorAberto ?? 0,
            qtdTitulos: contasReceber.length,
            dso: insightsDataReceber.dso,
            concentracaoTop3Clientes: Math.round(insightsDataReceber.concentracaoClientes),
            glosaPercentual: parseFloat(insightsDataReceber.glosa.toFixed(1)),
            clientesInadimplentes: insightsDataReceber.clientesInadimplentes,
          }}
          periodo={`${dwFilter.dataInicio} a ${dwFilter.dataFim}`}
          autoGenerate={true}
        />
        {/* REMOVIDO: grid de insights fixos — substituído por IA acima */}
        <div className="hidden grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          
          {/* Insight 1: DSO - Prazo Médio de Recebimento */}
          <AnimatedCard delay={300}>
            <div className="relative overflow-hidden rounded-[14px] border border-cyan-500/20 bg-[var(--sgt-bg-card)] p-4 hover:border-cyan-400/30 transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-400/70">DSO · Prazo Médio</p>
                    <p className="text-2xl font-black text-white mt-1">{insightsDataReceber.dso} dias</p>
                  </div>
                  <Clock className="h-5 w-5 text-cyan-400/60" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Prazo médio de recebimento {insightsDataReceber.dso > 0 ? "" : "(sem dados). "}<span className="text-cyan-400 font-semibold">Revisar política de crédito</span> para clientes com atraso recorrente.
                </p>
              </div>
            </div>
          </AnimatedCard>

          {/* Insight 2: Risco de Concentração */}
          <AnimatedCard delay={350}>
            <div className="relative overflow-hidden rounded-[14px] border border-rose-500/20 bg-[var(--sgt-bg-card)] p-4 hover:border-rose-400/30 transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-rose-400/70">Risco</p>
                    <p className="text-2xl font-black text-white mt-1">{insightsDataReceber.numClientesTop3} {insightsDataReceber.numClientesTop3 === 1 ? "cliente" : "clientes"}</p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-rose-400/60" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Top {insightsDataReceber.numClientesTop3} = <span className="text-rose-400 font-semibold">{insightsDataReceber.concentracaoClientes.toFixed(0)}% do faturamento</span>. Risco de concentração - diversificar carteira.
                </p>
              </div>
            </div>
          </AnimatedCard>

          {/* Insight 3: Índice de Glosa */}
          <AnimatedCard delay={400}>
            <div className="relative overflow-hidden rounded-[14px] border border-amber-500/20 bg-[var(--sgt-bg-card)] p-4 hover:border-amber-400/30 transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-400/70">Glosa</p>
                    <p className="text-2xl font-black text-white mt-1">{insightsDataReceber.glosa.toFixed(1)}%</p>
                  </div>
                  <TrendingDown className="h-5 w-5 text-amber-400/60" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Diferença entre faturado e pago. <span className="text-amber-400 font-semibold">Reduzir glosa</span> via integração EDI ou portal do cliente.
                </p>
              </div>
            </div>
          </AnimatedCard>

          {/* Insight 4: Antecipação de Recebíveis */}
          <AnimatedCard delay={450}>
            <div className="relative overflow-hidden rounded-[14px] border border-emerald-500/20 bg-[var(--sgt-bg-card)] p-4 hover:border-emerald-400/30 transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-400/70">Oportunidade</p>
                    <p className="text-lg font-black text-white mt-1">Factoring?</p>
                  </div>
                  <DollarSign className="h-5 w-5 text-emerald-400/60" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Avaliar <span className="text-emerald-400 font-semibold">antecipação de recebíveis</span> (factoring/FIDC) considerando custo financeiro vs necessidade de caixa.
                </p>
              </div>
            </div>
          </AnimatedCard>

          {/* Insight 5: Inadimplentes Recorrentes */}
          <AnimatedCard delay={500}>
            <div className="relative overflow-hidden rounded-[14px] border border-red-500/20 bg-[var(--sgt-bg-card)] p-4 hover:border-red-400/30 transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-red-400/70">Ação Urgente</p>
                    <p className="text-2xl font-black text-white mt-1">{insightsDataReceber.clientesInadimplentes} {insightsDataReceber.clientesInadimplentes === 1 ? "cliente" : "clientes"}</p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-red-400/60" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Inadimplentes há mais de 30 dias. <span className="text-red-400 font-semibold">Bloquear ou renegociar</span> condições comerciais imediatamente.
                </p>
              </div>
            </div>
          </AnimatedCard>

          {/* Insight 6: Cobrança Digital */}
          <AnimatedCard delay={550}>
            <div className="relative overflow-hidden rounded-[14px] border border-blue-500/20 bg-[var(--sgt-bg-card)] p-4 hover:border-blue-400/30 transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-400/70">Modernização</p>
                    <p className="text-lg font-black text-white mt-1">Régua Digital</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-blue-400/60" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Política de cobrança <span className="text-blue-400 font-semibold">e-mail → telefone → notificação → protesto</span> está madura e digitalizada?
                </p>
              </div>
            </div>
          </AnimatedCard>

        </div>

        {/* ════════ ÁREA ANALÍTICA ════════ */}
        {/* Linha 1 — Composição por Mês de Emissão | Detalhamento por Cliente e Mês de Emissão */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
          <div className="h-[380px]">
            <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] flex flex-col h-full overflow-hidden">
              <div className="px-4 py-3 shrink-0 border-b border-[var(--sgt-border-subtle)]" style={{ background: "var(--sgt-table-head)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Composição por Mês de Emissão
                </p>
              </div>
              <div className="flex-1 min-h-0 p-3">
                {composicaoMesEmissao.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[12px] text-slate-600">
                    Sem dados no período selecionado
                  </div>
                ) : (
                  <VerticalBarChart data={composicaoMesEmissao} />
                )}
              </div>
            </div>
          </div>

          <div className="h-[380px]">
            <ClienteDrilldownCard contas={contasNoPeriodo} />
          </div>
        </div>

        {/* Linha 2 — Taxa de Inadimplência | Clientes que Concentram o Vencido */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
          <div className="h-[300px] lg:col-span-1">
            <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] flex flex-col h-full overflow-hidden">
              <div className="px-4 py-3 shrink-0 border-b border-[var(--sgt-border-subtle)]" style={{ background: "var(--sgt-table-head)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Taxa de Inadimplência
                </p>
              </div>
              <div className="flex flex-1 items-center justify-center p-3">
                <InadimplenciaGauge percent={kpiExtra.inadimplenciaPerc} />
              </div>
            </div>
          </div>

          <div className="h-[300px] lg:col-span-2">
            <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] flex flex-col h-full overflow-hidden">
              <div className="px-4 py-3 shrink-0 border-b border-[var(--sgt-border-subtle)]" style={{ background: "var(--sgt-table-head)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Clientes que Concentram o Vencido
                </p>
              </div>
              <RankedList data={vencidoPorGrupo} color="#f43f5e" emptyMessage="Nenhum título vencido no momento" />
            </div>
          </div>
        </div>

        {/* ════════ FILTROS ════════ */}
        <div className="flex flex-wrap items-center gap-2">
          <GooeyInput
            placeholder="Buscar por documento ou cliente..."
            value={search}
            onValueChange={(v) => setSearch(v)}
          />
          <div className="flex gap-2 overflow-x-auto">
            {["todos", "Em Aberto", "Vencido", "Parcial", "Recebido"].map((status) => (
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
                  <th className="px-3 py-2 text-left hidden sm:table-cell">
                    <button onClick={() => toggleSort("cliente")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                      Cliente
                      {sortCol === "cliente" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left hidden sm:table-cell">
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
                    <td className="px-3 py-2.5 text-[13px] text-slate-300 hidden sm:table-cell">{conta.cliente}</td>
                    <td className="px-3 py-2.5 text-[13px] text-slate-400 hidden sm:table-cell">{fmtData(conta.vencimento)}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] font-semibold text-white">{fmtBRL(conta.valor)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        (conta.status as string) === "Recebido" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-400/20" :
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
          
          </div> {/* Fecha TABELA */}
        </>
        )}

        {view !== "executivo" && <PlaceholderView view={view} />}

        </div> {/* Fecha container com scroll */}
        </div>
      </section>
      </div>
    </div>
  );
}
