import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Fuel, RefreshCw, Search, TrendingUp, TrendingDown,
  Calendar, ChevronUp, ChevronDown, BarChart3,
  DollarSign, Hash, X, ChevronLeft, ChevronRight,
  Filter, Layers, Droplets, Gauge, MapPin, FileText,
  Activity, Car, Users, Zap,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as ReTooltip, CartesianGrid,
  AreaChart, Area, Cell,
} from "recharts";
import sgtLogo from "@/assets/sgt-logo.png";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { UpdateButton } from "@/components/shared/UpdateButton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useCooldown } from "@/hooks/useCooldown";
import { fetchAbastecimento, type AbastecimentoRow } from "@/lib/dwApi";
import { RAW } from "@/lib/theme";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(2).replace(".", ",")}M`
  : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(1).replace(".", ",")}k`
  : fmtBRL(v);

const fmtNum = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const fmtData = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

const fmtLitros = (v: number) =>
  v >= 1e3 ? `${(v / 1e3).toFixed(1).replace(".", ",")}kL` : `${fmtNum(v)} L`;

const fmtMedia = (v: number | null) =>
  v && v > 0 ? `${v.toFixed(1)} km/L` : "—";

// ─── Paleta de cores alinhada ao theme.ts ────────────────────────────────────
const PALETTE = [
  RAW.accent.amber,
  RAW.accent.cyan,
  RAW.accent.emerald,
  RAW.accent.violet,
  RAW.accent.rose,
  RAW.accent.red,
  "#fb923c",
  "#94a3b8",
];
const colorFor = (_key: string, i: number) => PALETTE[i % PALETTE.length];

// ─── Tooltip dark customizado ─────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-amber-400/30 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? "#fff" }} className="text-[12px] font-semibold">
          {formatter ? formatter(p.value, p.name) : `${p.name}: ${p.value}`}
        </p>
      ))}
    </div>
  );
};

// ─── Tipo para registros agregados ───────────────────────────────────────────
interface AbastecimentoAgregado {
  codaba:          string;
  veiculo:         string;
  motorista:       string | null;
  posto:           string | null;
  estado:          string | null;
  vlrtot:          number;
  quanti:          number;
  datref:          string | null;
  numdoc:          string | null;
  marca:           string | null;
  modelo:          string | null;
  linha:           string | null;
  media:           number | null;
  ultkmt:          number | null;
  atukmt:          number | null;
  medfab:          number | null;
  frota:           string | null;
  tipoCombustivel: string | null;
  notaFiscal:      string | null;
  kmRodados:       number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function Abastecimento() {
  const navigate = useNavigate();
  const { dwFilter, setDwFilter } = useFinancialData();
  const cooldown = useCooldown("dw_abastecimento_fetch_ts");

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [dados, setDados]             = useState<AbastecimentoRow[]>([]);
  const [loading, setLoading]         = useState(false);
  const [progress, setProgress]       = useState(0);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [error, setError]             = useState<string | null>(null);

  // Filtros locais
  const [filtroFrota,      setFiltroFrota]      = useState("Todos");
  const [filtroCombustivel,setFiltroCombustivel] = useState("Todos");
  const [filtroMotorista,  setFiltroMotorista]   = useState("Todos");
  const [filtroEstado,     setFiltroEstado]      = useState("Todos");
  const [search, setSearch] = useState("");

  // Tabela
  const [sortCol, setSortCol] = useState<keyof AbastecimentoAgregado>("datref");
  const [sortAsc, setSortAsc] = useState(false);
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);

  // ── Carregamento ────────────────────────────────────────────────────────────
  const carregarDados = useCallback(async (force = false) => {
    if (!force && !cooldown.canFetch) return;
    setLoading(true);
    setError(null);
    setProgress(0);
    setLoadingPhase("Conectando ao DW...");

    let cur = 0;
    const phases = [
      { at: 30, label: "Buscando registros de abastecimento..." },
      { at: 65, label: "Calculando consumo e médias..." },
      { at: 88, label: "Gerando rankings e análises..." },
    ];
    const iv = window.setInterval(() => {
      const spd = cur < 35 ? 4 + Math.random() * 3 : cur < 75 ? 2 + Math.random() * 2 : 0.5 + Math.random();
      cur = Math.min(cur + spd, 95);
      const p = [...phases].reverse().find(ph => cur >= ph.at);
      if (p) setLoadingPhase(p.label);
      setProgress(Math.round(cur));
    }, 120);

    try {
      const res = await fetchAbastecimento({
        dataInicio: dwFilter.dataInicio,
        dataFim:    dwFilter.dataFim,
      });
      setDados(res.data ?? []);
      cooldown.start();
    } catch (err) {
      setError((err as Error).message ?? "Erro ao carregar dados");
    } finally {
      clearInterval(iv);
      setProgress(100);
      setLoadingPhase("");
      setLoading(false);
    }
  }, [dwFilter.dataInicio, dwFilter.dataFim]);

  useEffect(() => { if (cooldown.canFetch) carregarDados(); }, [cooldown.canFetch]);

  // ── Listas únicas para filtros ───────────────────────────────────────────────
  const frotas = useMemo(() => {
    const s = new Set<string>();
    dados.forEach(d => { if (d.frota) s.add(d.frota); });
    return ["Todos", ...Array.from(s).sort()];
  }, [dados]);

  const combustiveis = useMemo(() => {
    const s = new Set<string>();
    dados.forEach(d => { if (d.tipo_combustivel) s.add(d.tipo_combustivel); });
    return ["Todos", ...Array.from(s).sort()];
  }, [dados]);

  const motoristas = useMemo(() => {
    const s = new Set<string>();
    dados.forEach(d => { if (d.motorista) s.add(d.motorista); });
    return ["Todos", ...Array.from(s).sort()];
  }, [dados]);

  const estados = useMemo(() => {
    const s = new Set<string>();
    dados.forEach(d => { if (d.estado) s.add(d.estado); });
    return ["Todos", ...Array.from(s).sort()];
  }, [dados]);

  // ── Filtragem ────────────────────────────────────────────────────────────────
  const dadosFiltrados = useMemo(() => {
    return dados.filter(d => {
      if (filtroFrota       !== "Todos" && d.frota           !== filtroFrota)       return false;
      if (filtroCombustivel !== "Todos" && d.tipo_combustivel !== filtroCombustivel) return false;
      if (filtroMotorista   !== "Todos" && d.motorista        !== filtroMotorista)   return false;
      if (filtroEstado      !== "Todos" && d.estado           !== filtroEstado)      return false;
      return true;
    });
  }, [dados, filtroFrota, filtroCombustivel, filtroMotorista, filtroEstado]);

  // ── Normalização para tabela ─────────────────────────────────────────────────
  const registros = useMemo<AbastecimentoAgregado[]>(() => {
    return dadosFiltrados.map(d => ({
      codaba:          String(d.codaba ?? ""),
      veiculo:         String(d.veiculo ?? "—"),
      motorista:       d.motorista,
      posto:           d.posto,
      estado:          d.estado,
      vlrtot:          d.vlrtot ?? 0,
      quanti:          d.quanti ?? 0,
      datref:          d.datref,
      numdoc:          d.numdoc ? String(d.numdoc) : null,
      marca:           d.marca,
      modelo:          d.modelo,
      linha:           d.linha ? String(d.linha) : null,
      media:           d.media && d.media > 0 ? d.media : null,
      ultkmt:          d.ultkmt,
      atukmt:          d.atukmt,
      medfab:          d.medfab && d.medfab > 0 ? d.medfab : null,
      frota:           d.frota,
      tipoCombustivel: d.tipo_combustivel,
      notaFiscal:      d.nota_fiscal ? String(d.nota_fiscal) : null,
      kmRodados:       Math.max(0, (d.atukmt ?? 0) - (d.ultkmt ?? 0)),
    }));
  }, [dadosFiltrados]);

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalCusto   = registros.reduce((s, r) => s + r.vlrtot, 0);
    const totalLitros  = registros.reduce((s, r) => s + r.quanti, 0);
    const precoMedio   = totalLitros > 0 ? totalCusto / totalLitros : 0;
    const totalKm      = registros.reduce((s, r) => s + r.kmRodados, 0);
    const qtdAbast     = registros.length;

    const comMedia     = registros.filter(r => r.media && r.media > 0);
    const mediaConsumo = comMedia.length > 0
      ? comMedia.reduce((s, r) => s + r.media!, 0) / comMedia.length : 0;

    const comFab       = registros.filter(r => r.medfab && r.medfab > 0);
    const mediaFabrica = comFab.length > 0
      ? comFab.reduce((s, r) => s + r.medfab!, 0) / comFab.length : 0;

    const deltaMedia   = mediaFabrica > 0
      ? ((mediaConsumo - mediaFabrica) / mediaFabrica) * 100 : null;

    return { totalCusto, totalLitros, precoMedio, totalKm, qtdAbast, mediaConsumo, mediaFabrica, deltaMedia };
  }, [registros]);

  // ── Evolução de Custo por Dia ─────────────────────────────────────────────
  const custoPorDia = useMemo(() => {
    const map = new Map<string, { custo: number; litros: number }>();
    for (const r of registros) {
      if (!r.datref) continue;
      const dt = new Date(r.datref);
      if (isNaN(dt.getTime())) continue;
      const k = dt.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!map.has(k)) map.set(k, { custo: 0, litros: 0 });
      const e = map.get(k)!;
      e.custo  += r.vlrtot;
      e.litros += r.quanti;
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => {
        const [, m, d] = k.split("-");
        return { dia: `${d}/${m}`, ...v };
      });
  }, [registros]);

  // ── Distribuição por Combustível ──────────────────────────────────────────
  const distCombustivel = useMemo(() => {
    const map = new Map<string, { custo: number; litros: number; qtd: number }>();
    for (const r of registros) {
      const k = r.tipoCombustivel ?? "Não informado";
      if (!map.has(k)) map.set(k, { custo: 0, litros: 0, qtd: 0 });
      const e = map.get(k)!;
      e.custo  += r.vlrtot;
      e.litros += r.quanti;
      e.qtd    += 1;
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].custo - a[1].custo)
      .map(([nome, v], i) => ({ nome, ...v, fill: colorFor(nome, i) }));
  }, [registros]);

  // ── Ranking Veículos ──────────────────────────────────────────────────────
  const rankingVeiculo = useMemo(() => {
    const map = new Map<string, { custo: number; litros: number; km: number; qtd: number }>();
    for (const r of registros) {
      const k = r.veiculo;
      if (!map.has(k)) map.set(k, { custo: 0, litros: 0, km: 0, qtd: 0 });
      const e = map.get(k)!;
      e.custo  += r.vlrtot;
      e.litros += r.quanti;
      e.km     += r.kmRodados;
      e.qtd    += 1;
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].custo - a[1].custo)
      .slice(0, 10)
      .map(([veiculo, v], i) => ({ veiculo, ...v, fill: colorFor(veiculo, i) }));
  }, [registros]);

  // ── Ranking Motoristas ────────────────────────────────────────────────────
  const rankingMotorista = useMemo(() => {
    const map = new Map<string, { custo: number; litros: number; qtd: number }>();
    for (const r of registros) {
      const k = r.motorista ?? "Não informado";
      if (!map.has(k)) map.set(k, { custo: 0, litros: 0, qtd: 0 });
      const e = map.get(k)!;
      e.custo  += r.vlrtot;
      e.litros += r.quanti;
      e.qtd    += 1;
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].custo - a[1].custo)
      .slice(0, 10)
      .map(([motorista, v], i) => ({ motorista, ...v, fill: colorFor(motorista, i) }));
  }, [registros]);

  // ── Comparativo Média Real vs Fábrica por Frota ──────────────────────────
  const comparativoFrota = useMemo(() => {
    const map = new Map<string, { sumReal: number; sumFab: number; cntReal: number; cntFab: number }>();
    for (const r of registros) {
      const k = r.frota ?? "Sem frota";
      if (!map.has(k)) map.set(k, { sumReal: 0, sumFab: 0, cntReal: 0, cntFab: 0 });
      const e = map.get(k)!;
      if (r.media && r.media > 0)  { e.sumReal += r.media;  e.cntReal += 1; }
      if (r.medfab && r.medfab > 0){ e.sumFab  += r.medfab; e.cntFab  += 1; }
    }
    return Array.from(map.entries())
      .map(([frota, v]) => ({
        frota,
        real:    v.cntReal > 0 ? parseFloat((v.sumReal / v.cntReal).toFixed(2)) : 0,
        fabrica: v.cntFab  > 0 ? parseFloat((v.sumFab  / v.cntFab).toFixed(2))  : 0,
      }))
      .filter(r => r.real > 0 || r.fabrica > 0)
      .sort((a, b) => b.real - a.real);
  }, [registros]);

  // ── Tabela: busca, ordenação, paginação ──────────────────────────────────
  const tabelaFiltrada = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registros;
    return registros.filter(r =>
      r.veiculo.toLowerCase().includes(q) ||
      (r.motorista ?? "").toLowerCase().includes(q) ||
      (r.posto ?? "").toLowerCase().includes(q) ||
      (r.tipoCombustivel ?? "").toLowerCase().includes(q) ||
      (r.notaFiscal ?? "").toLowerCase().includes(q)
    );
  }, [registros, search]);

  const handleSort = (col: keyof AbastecimentoAgregado) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(false); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: keyof AbastecimentoAgregado }) => {
    if (sortCol !== col) return <ChevronUp className="w-2.5 h-2.5 opacity-20" />;
    return sortAsc
      ? <ChevronUp   className="w-2.5 h-2.5 text-amber-400" />
      : <ChevronDown className="w-2.5 h-2.5 text-amber-400" />;
  };

  const tabelaOrdenada = useMemo(() => {
    return [...tabelaFiltrada].sort((a, b) => {
      const va = a[sortCol] ?? "";
      const vb = b[sortCol] ?? "";
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb), "pt-BR");
      return sortAsc ? cmp : -cmp;
    });
  }, [tabelaFiltrada, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(tabelaOrdenada.length / PAGE_SIZE));
  const tabelaPagina = tabelaOrdenada.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── TONE_COLORS ─────────────────────────────────────────────────────────────
  const TONE_COLORS = {
    rose:    { border: "border-rose-400/20",    icon: "text-rose-300",    bg: "bg-rose-400/[0.08]",    glow: RAW.accent.rose,    sub: "text-rose-400"    },
    amber:   { border: "border-amber-400/20",   icon: "text-amber-300",   bg: "bg-amber-400/[0.08]",   glow: RAW.accent.amber,   sub: "text-amber-400"   },
    violet:  { border: "border-violet-400/20",  icon: "text-violet-300",  bg: "bg-violet-400/[0.08]",  glow: RAW.accent.violet,  sub: "text-violet-400"  },
    cyan:    { border: "border-cyan-400/20",    icon: "text-cyan-300",    bg: "bg-cyan-400/[0.08]",    glow: RAW.accent.cyan,    sub: "text-cyan-400"    },
    emerald: { border: "border-emerald-400/20", icon: "text-emerald-300", bg: "bg-emerald-400/[0.08]", glow: RAW.accent.emerald, sub: "text-emerald-400" },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="flex flex-col transition-all duration-300 min-h-[100dvh] overflow-auto px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* ── Gradientes de fundo ── */}
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(180,110,4,0.22),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_55%_40%_at_100%_110%,rgba(6,182,212,0.07),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:opacity-100" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.72) 100%)" }} />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-hidden"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          {/* Barra de progresso */}
          <div className="h-[3px] w-full shrink-0 overflow-hidden rounded-t-[24px] bg-transparent">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, opacity: loading ? 1 : 0 }}
            />
          </div>

          <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 overflow-hidden w-full">

            {/* ════════ NAVBAR DESKTOP ════════ */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              <div className="flex items-center gap-3">
                <img src={sgtLogo} alt="SGT" className="block h-8 w-auto shrink-0 object-contain" />
                <div className="h-6 w-px" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
                  <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">Abastecimento</span>
                </div>
              </div>

              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">DW Conectado</span>
              </div>

              <div className="h-6 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

              <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
                <DatePickerInput value={dwFilter.dataInicio} onChange={v => setDwFilter("dataInicio", v)} placeholder="Data início" />
                <DatePickerInput value={dwFilter.dataFim}    onChange={v => setDwFilter("dataFim", v)}    placeholder="Data fim" />
                <UpdateButton onClick={carregarDados} isFetching={loading} loadingPhase={loadingPhase} progress={progress} cooldownOverride={cooldown} />
              </div>

              <HomeButton />
            </div>

            {/* Mobile nav */}
            <div className="flex sm:hidden items-center justify-between gap-2 py-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={sgtLogo} alt="SGT" className="block h-7 w-auto shrink-0 object-contain" />
                <div className="h-5 w-px shrink-0" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">Workspace</span>
                  <span className="text-[15px] font-black tracking-[-0.03em] dark:text-white text-slate-800 truncate">Abastecimento</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <UpdateButton onClick={carregarDados} isFetching={loading} loadingPhase={loadingPhase} progress={progress} compact cooldownOverride={cooldown} />
                <HomeButton />
                <MobileNav />
              </div>
            </div>

            <div className="h-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

            {/* Erro */}
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-[12px] text-rose-200">
                <strong>Erro:</strong> {error}
              </div>
            )}

            {/* Loading phase */}
            {loading && loadingPhase && (
              <div className="flex items-center gap-2 text-[11px] text-amber-300/80">
                <div className="h-1 w-32 overflow-hidden rounded-full bg-amber-400/10">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <span>{loadingPhase}</span>
              </div>
            )}

            {/* ════════ FILTROS LOCAIS ════════ */}
            <AnimatedCard delay={60}>
              <div
                className="flex flex-wrap items-center gap-2 rounded-[14px] border px-3 py-2"
                style={{ background: RAW.surfaceInset, borderColor: RAW.borderDefault }}
              >
                <Filter className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500 shrink-0">Filtros</span>
                <div className="h-4 w-px bg-white/[0.07] shrink-0" />

                {/* Frota */}
                <Select value={filtroFrota} onValueChange={v => { setFiltroFrota(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[80px] max-w-[130px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-amber-500/30 focus:outline-none">
                    <SelectValue placeholder="Frota" />
                  </SelectTrigger>
                  <SelectContent>
                    {frotas.map(f => <SelectItem key={f} value={f}>{f === "Todos" ? "Frota" : f}</SelectItem>)}
                  </SelectContent>
                </Select>

                {/* Combustível */}
                <Select value={filtroCombustivel} onValueChange={v => { setFiltroCombustivel(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[90px] max-w-[140px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-amber-500/30 focus:outline-none">
                    <SelectValue placeholder="Combustível" />
                  </SelectTrigger>
                  <SelectContent>
                    {combustiveis.map(c => <SelectItem key={c} value={c}>{c === "Todos" ? "Combustível" : c}</SelectItem>)}
                  </SelectContent>
                </Select>

                {/* Motorista */}
                <Select value={filtroMotorista} onValueChange={v => { setFiltroMotorista(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[100px] max-w-[160px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-amber-500/30 focus:outline-none">
                    <SelectValue placeholder="Motorista" />
                  </SelectTrigger>
                  <SelectContent>
                    {motoristas.map(m => <SelectItem key={m} value={m}>{m === "Todos" ? "Motorista" : m}</SelectItem>)}
                  </SelectContent>
                </Select>

                {/* Estado */}
                <Select value={filtroEstado} onValueChange={v => { setFiltroEstado(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[70px] max-w-[100px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-amber-500/30 focus:outline-none">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estados.map(e => <SelectItem key={e} value={e}>{e === "Todos" ? "Estado" : e}</SelectItem>)}
                  </SelectContent>
                </Select>

                {/* Limpar filtros */}
                {(filtroFrota !== "Todos" || filtroCombustivel !== "Todos" || filtroMotorista !== "Todos" || filtroEstado !== "Todos") && (
                  <button
                    onClick={() => { setFiltroFrota("Todos"); setFiltroCombustivel("Todos"); setFiltroMotorista("Todos"); setFiltroEstado("Todos"); setPage(1); }}
                    className="flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-500/[0.08] px-2.5 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-400/12 transition-all"
                  >
                    <X className="w-2.5 h-2.5" /> Limpar
                  </button>
                )}

                <div className="ml-auto text-[10px] text-slate-500">
                  {fmtNum(registros.length)} registros
                </div>
              </div>
            </AnimatedCard>

            {/* ════════════════════════════════════════════════════════════════
                SEÇÃO 1 — INDICADORES E ANÁLISE DE CONSUMO
            ════════════════════════════════════════════════════════════════ */}
            <div className="flex items-center gap-2 mt-1">
              <Activity className="w-3 h-3 text-amber-400/60" />
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Indicadores e Análise de Consumo</span>
              <div className="flex-1 h-px" style={{ background: RAW.borderDefault }} />
            </div>

            {/* ── KPI Cards (5) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {[
                {
                  label: "Custo Total",
                  value: loading ? "—" : fmtK(kpis.totalCusto),
                  sub: loading ? "" : `Média/abast.: ${fmtK(kpis.qtdAbast > 0 ? kpis.totalCusto / kpis.qtdAbast : 0)}`,
                  Icon: DollarSign,
                  tone: "amber" as const,
                  delay: 80,
                },
                {
                  label: "Volume Total",
                  value: loading ? "—" : fmtLitros(kpis.totalLitros),
                  sub: loading ? "" : `Preço médio: R$ ${kpis.precoMedio.toFixed(2).replace(".", ",")}/L`,
                  Icon: Droplets,
                  tone: "cyan" as const,
                  delay: 120,
                },
                {
                  label: "Abastecimentos",
                  value: loading ? "—" : fmtNum(kpis.qtdAbast),
                  sub: loading ? "" : `${distCombustivel.length} tipo(s) de combustível`,
                  Icon: Hash,
                  tone: "rose" as const,
                  delay: 160,
                },
                {
                  label: "Média Consumo",
                  value: loading ? "—" : fmtMedia(kpis.mediaConsumo),
                  sub: loading ? "" : kpis.deltaMedia !== null
                    ? `Fábrica: ${fmtMedia(kpis.mediaFabrica)} (${kpis.deltaMedia >= 0 ? "+" : ""}${kpis.deltaMedia.toFixed(1)}%)`
                    : "Fábrica: —",
                  Icon: Gauge,
                  tone: "violet" as const,
                  delay: 200,
                },
                {
                  label: "KM Rodados",
                  value: loading ? "—" : fmtNum(kpis.totalKm) + " km",
                  sub: loading ? "" : kpis.totalLitros > 0
                    ? `Custo/km: R$ ${(kpis.totalCusto / kpis.totalKm || 0).toFixed(2).replace(".", ",")}` : "—",
                  Icon: TrendingUp,
                  tone: "emerald" as const,
                  delay: 240,
                },
              ].map(({ label, value, sub, Icon, tone, delay }) => {
                const t = TONE_COLORS[tone];
                return (
                  <AnimatedCard key={label} delay={delay}>
                    <div
                      className={`relative overflow-hidden rounded-[14px] sm:rounded-[16px] border p-3.5 transition-all duration-300 hover:-translate-y-[3px] hover:border-white/[0.11] ${t.border}`}
                      style={{ background: "var(--sgt-bg-card)" }}
                    >
                      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[${t.glow}]/50 to-transparent`} />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-1">{label}</p>
                          <p className={`text-[22px] font-black leading-none tracking-tight dark:text-white text-slate-800 ${loading ? "animate-pulse" : ""}`}>
                            {value}
                          </p>
                          <p className={`text-[10px] font-medium mt-1.5 ${t.sub}`}>{sub}</p>
                        </div>
                        <div className={`shrink-0 rounded-xl p-2 ${t.bg} border ${t.border}`}>
                          <Icon className={`w-4 h-4 ${t.icon}`} />
                        </div>
                      </div>
                      <div className="pointer-events-none absolute inset-0 rounded-[14px] sm:rounded-[16px]"
                        style={{ background: `radial-gradient(circle at 100% 100%, ${t.glow}1a, transparent 65%)` }} />
                    </div>
                  </AnimatedCard>
                );
              })}
            </div>

            {/* ── Gráficos Linha 1: Evolução de Custo + Distribuição Combustível ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">

              {/* Evolução de Custo Diário — 2 colunas */}
              <AnimatedCard delay={300} className="lg:col-span-2">
                <div className="rounded-[14px] sm:rounded-[16px] border p-3 h-[220px] flex flex-col" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Evolução do Custo Diário</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[9px] text-amber-400">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: RAW.accent.amber }} />Custo (R$)
                      </span>
                      <span className="flex items-center gap-1 text-[9px] text-cyan-400">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: RAW.accent.cyan }} />Litros
                      </span>
                    </div>
                  </div>
                  {custoPorDia.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-[11px] text-slate-600">
                      {loading ? "Carregando..." : "Sem dados no período"}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={custoPorDia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={RAW.accent.amber} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={RAW.accent.amber} stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="gradCyanAba" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={RAW.accent.cyan} stopOpacity={0.20} />
                            <stop offset="95%" stopColor={RAW.accent.cyan} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="dia" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis yAxisId="custo" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => fmtK(v)} width={52} />
                        <YAxis yAxisId="litros" orientation="right" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}kL`} width={38} />
                        <ReTooltip content={<DarkTooltip formatter={(v: number, n: string) => n === "custo" ? `Custo: ${fmtBRL(v)}` : `Litros: ${fmtNum(v)} L`} />} />
                        <Area yAxisId="custo"  type="monotone" dataKey="custo"  name="custo"  stroke={RAW.accent.amber} strokeWidth={2} fill="url(#gradAmber)"   dot={false} />
                        <Area yAxisId="litros" type="monotone" dataKey="litros" name="litros" stroke={RAW.accent.cyan}  strokeWidth={1.5} fill="url(#gradCyanAba)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </AnimatedCard>

              {/* Distribuição por Combustível */}
              <AnimatedCard delay={320}>
                <div className="rounded-[14px] sm:rounded-[16px] border p-3 h-[220px] flex flex-col" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Por Combustível</span>
                  </div>
                  <div className="flex-1 overflow-auto space-y-2 pr-1">
                    {distCombustivel.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-[11px] text-slate-600">
                        {loading ? "Carregando..." : "Sem dados"}
                      </div>
                    ) : (
                      distCombustivel.map(c => {
                        const pct = kpis.totalCusto > 0 ? (c.custo / kpis.totalCusto) * 100 : 0;
                        return (
                          <div key={c.nome}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-slate-300 truncate max-w-[130px]">{c.nome}</span>
                              <span className="text-[10px] font-bold shrink-0 ml-1" style={{ color: c.fill }}>{pct.toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: c.fill }} />
                              </div>
                              <span className="text-[9px] text-slate-500 shrink-0 w-[52px] text-right">{fmtK(c.custo)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </AnimatedCard>
            </div>

            {/* ── Gráficos Linha 2: Rankings Veículos + Motoristas ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">

              {/* Ranking Veículos */}
              <AnimatedCard delay={360}>
                <div className="rounded-[14px] sm:rounded-[16px] border p-3" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Car className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Ranking de Veículos por Custo</span>
                    <span className="ml-auto text-[8px] text-slate-600 uppercase tracking-[0.2em]">Top 10</span>
                  </div>
                  {rankingVeiculo.length === 0 ? (
                    <div className="flex h-16 items-center justify-center text-[11px] text-slate-600">
                      {loading ? "Carregando..." : "Sem dados"}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {rankingVeiculo.map((r, i) => {
                        const max = rankingVeiculo[0].custo;
                        const pct = max > 0 ? (r.custo / max) * 100 : 0;
                        return (
                          <div key={r.veiculo} className="flex items-center gap-2">
                            <span className="w-5 text-[9px] font-bold text-slate-600 shrink-0 text-right">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-medium text-slate-300 truncate">{r.veiculo}</span>
                                <span className="text-[10px] font-bold shrink-0 ml-2" style={{ color: r.fill }}>{fmtK(r.custo)}</span>
                              </div>
                              <div className="h-1 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.fill, opacity: 0.85 }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </AnimatedCard>

              {/* Ranking Motoristas */}
              <AnimatedCard delay={400}>
                <div className="rounded-[14px] sm:rounded-[16px] border p-3" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Ranking de Motoristas por Custo</span>
                    <span className="ml-auto text-[8px] text-slate-600 uppercase tracking-[0.2em]">Top 10</span>
                  </div>
                  {rankingMotorista.length === 0 ? (
                    <div className="flex h-16 items-center justify-center text-[11px] text-slate-600">
                      {loading ? "Carregando..." : "Sem dados"}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {rankingMotorista.map((r, i) => {
                        const max = rankingMotorista[0].custo;
                        const pct = max > 0 ? (r.custo / max) * 100 : 0;
                        return (
                          <div key={r.motorista} className="flex items-center gap-2">
                            <span className="w-5 text-[9px] font-bold text-slate-600 shrink-0 text-right">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-medium text-slate-300 truncate">{r.motorista}</span>
                                <span className="text-[10px] font-bold shrink-0 ml-2" style={{ color: r.fill }}>{fmtK(r.custo)}</span>
                              </div>
                              <div className="h-1 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.fill, opacity: 0.85 }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </AnimatedCard>
            </div>

            {/* ── Gráfico: Comparativo Média Real vs Fábrica por Frota ── */}
            {comparativoFrota.length > 0 && (
              <AnimatedCard delay={440}>
                <div className="rounded-[14px] sm:rounded-[16px] border p-3 h-[220px] flex flex-col" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Média de Consumo Real vs Fábrica por Frota (km/L)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[9px] text-violet-400">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: RAW.accent.violet }} />Real
                      </span>
                      <span className="flex items-center gap-1 text-[9px] text-slate-400">
                        <span className="w-2 h-2 rounded-sm inline-block opacity-40" style={{ background: RAW.accent.violet }} />Fábrica
                      </span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparativoFrota} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={16}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="frota" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}`} width={32} />
                      <ReTooltip content={<DarkTooltip formatter={(v: number, n: string) => `${n}: ${v.toFixed(1)} km/L`} />} />
                      <Bar dataKey="real"    name="Real"    fill={RAW.accent.violet} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="fabrica" name="Fábrica" fill={RAW.accent.violet} opacity={0.3} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </AnimatedCard>
            )}

            {/* ════════════════════════════════════════════════════════════════
                SEÇÃO 2 — DETALHAMENTO
            ════════════════════════════════════════════════════════════════ */}
            <div className="flex items-center gap-2 mt-1">
              <FileText className="w-3 h-3 text-amber-400/60" />
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Detalhamento</span>
              <div className="flex-1 h-px" style={{ background: RAW.borderDefault }} />
            </div>

            {/* ════════ TABELA ════════ */}
            <AnimatedCard delay={500}>
              <div className="rounded-[14px] sm:rounded-[16px] border" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>

                {/* Header tabela */}
                <div className="flex flex-wrap items-center gap-2 px-3 pt-3 pb-2 border-b" style={{ borderColor: RAW.borderDefault }}>
                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Registros de Abastecimento</span>
                  <span className="rounded-full border border-amber-400/20 bg-amber-500/[0.07] px-2 py-0.5 text-[9px] font-semibold text-amber-300">
                    {fmtNum(tabelaFiltrada.length)} registros
                  </span>
                  <div className="ml-auto relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPage(1); }}
                      placeholder="Buscar veículo, motorista, posto..."
                      className="h-7 rounded-xl border border-white/[0.08] bg-white/[0.04] pl-6 pr-3 text-[11px] text-slate-300 placeholder-slate-600 focus:border-amber-500/30 focus:outline-none transition-all w-[210px]"
                    />
                  </div>
                </div>

                {/* Tabela */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${RAW.borderDefault}`, background: RAW.surfaceInset }}>
                        {([
                          { key: "datref",          label: "Data",        align: "left",   resp: "" },
                          { key: "veiculo",         label: "Veículo",     align: "left",   resp: "" },
                          { key: "motorista",       label: "Motorista",   align: "left",   resp: "hidden md:table-cell" },
                          { key: "tipoCombustivel", label: "Combustível", align: "center", resp: "hidden sm:table-cell" },
                          { key: "quanti",          label: "Litros",      align: "right",  resp: "hidden sm:table-cell" },
                          { key: "vlrtot",          label: "Valor",       align: "right",  resp: "" },
                          { key: "media",           label: "km/L",        align: "center", resp: "hidden lg:table-cell" },
                          { key: "posto",           label: "Posto",       align: "left",   resp: "hidden xl:table-cell" },
                          { key: "notaFiscal",      label: "NF",          align: "center", resp: "hidden lg:table-cell" },
                        ] as { key: keyof AbastecimentoAgregado; label: string; align: string; resp: string }[]).map(c => (
                          <th
                            key={c.key}
                            onClick={() => handleSort(c.key)}
                            className={`px-3 py-2 cursor-pointer select-none text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500 hover:text-slate-300 transition-colors ${c.resp}`}
                            style={{ textAlign: c.align as any }}
                          >
                            <span className="inline-flex items-center gap-0.5">
                              {c.label}
                              <SortIcon col={c.key} />
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${RAW.borderDefault}` }}>
                            {Array.from({ length: 9 }).map((_, j) => (
                              <td key={j} className="px-3 py-2.5">
                                <div className="h-2 rounded-full bg-white/[0.04] animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : tabelaPagina.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-[12px] text-slate-600">
                            Nenhum registro encontrado
                          </td>
                        </tr>
                      ) : (
                        tabelaPagina.map((r, i) => {
                          const deltaKmL = r.media && r.medfab && r.medfab > 0
                            ? ((r.media - r.medfab) / r.medfab) * 100 : null;
                          return (
                            <tr
                              key={`${r.codaba}-${i}`}
                              className="transition-colors hover:bg-white/[0.02]"
                              style={{ borderBottom: `1px solid ${RAW.borderDefault}` }}
                            >
                              {/* Data */}
                              <td className="px-3 py-2.5">
                                <span className="text-[11px] text-slate-400">{fmtData(r.datref)}</span>
                              </td>
                              {/* Veículo */}
                              <td className="px-3 py-2.5">
                                <div>
                                  <span className="font-mono text-[11px] font-semibold text-amber-300">{r.veiculo}</span>
                                  {(r.marca || r.modelo) && (
                                    <p className="text-[9px] text-slate-600 truncate max-w-[120px]">
                                      {[r.marca, r.modelo].filter(Boolean).join(" · ")}
                                    </p>
                                  )}
                                </div>
                              </td>
                              {/* Motorista */}
                              <td className="px-3 py-2.5 hidden md:table-cell">
                                <span className="text-[10px] text-slate-300 truncate max-w-[140px] block">{r.motorista ?? "—"}</span>
                              </td>
                              {/* Combustível */}
                              <td className="px-3 py-2.5 hidden sm:table-cell text-center">
                                <span className="rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-2 py-0.5 text-[9px] font-semibold text-amber-300 uppercase tracking-[0.1em]">
                                  {r.tipoCombustivel ?? "—"}
                                </span>
                              </td>
                              {/* Litros */}
                              <td className="px-3 py-2.5 hidden sm:table-cell text-right">
                                <span className="font-mono text-[11px] text-cyan-300">{r.quanti > 0 ? `${r.quanti.toFixed(1)} L` : "—"}</span>
                              </td>
                              {/* Valor */}
                              <td className="px-3 py-2.5 text-right">
                                <span className="text-[12px] font-bold text-slate-200">{fmtBRL(r.vlrtot)}</span>
                              </td>
                              {/* km/L */}
                              <td className="px-3 py-2.5 hidden lg:table-cell text-center">
                                {r.media && r.media > 0 ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className={`text-[11px] font-semibold ${deltaKmL !== null && deltaKmL < -5 ? "text-rose-300" : deltaKmL !== null && deltaKmL > 5 ? "text-emerald-300" : "text-slate-300"}`}>
                                      {r.media.toFixed(1)}
                                    </span>
                                    {deltaKmL !== null && (
                                      <span className={`text-[8px] font-bold ${deltaKmL < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                        {deltaKmL >= 0 ? "+" : ""}{deltaKmL.toFixed(0)}%
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-600">—</span>
                                )}
                              </td>
                              {/* Posto */}
                              <td className="px-3 py-2.5 hidden xl:table-cell">
                                <div>
                                  <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">{r.posto ?? "—"}</span>
                                  {r.estado && <span className="text-[9px] text-slate-600">{r.estado}</span>}
                                </div>
                              </td>
                              {/* NF */}
                              <td className="px-3 py-2.5 hidden lg:table-cell text-center">
                                <span className="font-mono text-[10px] text-slate-500">{r.notaFiscal ?? "—"}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                {tabelaOrdenada.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: RAW.borderDefault }}>
                    <span className="text-[10px] text-slate-500">
                      {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, tabelaOrdenada.length)} de {fmtNum(tabelaOrdenada.length)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] text-slate-400 transition-all hover:border-amber-400/30 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let p: number;
                        if (totalPages <= 5) p = i + 1;
                        else if (page <= 3) p = i + 1;
                        else if (page >= totalPages - 2) p = totalPages - 4 + i;
                        else p = page - 2 + i;
                        return (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-semibold transition-all ${
                              page === p
                                ? "border border-amber-400/40 bg-amber-500/[0.15] text-amber-300"
                                : "border border-white/[0.06] text-slate-500 hover:border-amber-400/20 hover:text-amber-300"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] text-slate-400 transition-all hover:border-amber-400/30 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedCard>

          </div>{/* fim gap-3 */}
        </section>
      </div>
    </div>
  );
}
