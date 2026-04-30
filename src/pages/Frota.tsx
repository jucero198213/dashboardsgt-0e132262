import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck, RefreshCw, Search, AlertTriangle, TrendingUp, Wrench,
  Calendar, MapPin, ChevronUp, ChevronDown, BarChart3,
  CheckCircle2, AlertCircle, Activity, DollarSign, Hash, X,
  ChevronLeft, ChevronRight
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as ReTooltip, CartesianGrid, LineChart, Line,
  PieChart, Pie, Cell
} from "recharts";
import sgtLogo from "@/assets/sgt-logo.png";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { UpdateButton } from "@/components/shared/UpdateButton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import {
  fetchFrota, fetchManutencao,
  type FrotaRow, type ManutencaoRow
} from "@/lib/dwApi";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")}M`
  : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}k`
  : fmtBRL(v);

const fmtNum = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const fmtData = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
};

// ─── Cores por Marca ──────────────────────────────────────────────────────────
const MARCA_COLORS: Record<string, { color: string; rgb: string }> = {
  SCANIA:          { color: "#22d3ee", rgb: "34,211,238" },
  VOLVO:           { color: "#a78bfa", rgb: "167,139,250" },
  MERCEDES:        { color: "#94a3b8", rgb: "148,163,184" },
  "MERCEDES-BENZ": { color: "#94a3b8", rgb: "148,163,184" },
  VOLKSWAGEN:      { color: "#60a5fa", rgb: "96,165,250" },
  VW:              { color: "#60a5fa", rgb: "96,165,250" },
  FORD:            { color: "#3b82f6", rgb: "59,130,246" },
  IVECO:           { color: "#f87171", rgb: "248,113,113" },
  DAF:             { color: "#fbbf24", rgb: "251,191,36" },
  MAN:             { color: "#fb923c", rgb: "251,146,60" },
};

function getMarcaColor(marca: string | null) {
  if (!marca) return { color: "#94a3b8", rgb: "148,163,184" };
  const key = Object.keys(MARCA_COLORS).find(k => marca.toUpperCase().includes(k));
  return key ? MARCA_COLORS[key] : { color: "#94a3b8", rgb: "148,163,184" };
}

// ─── Cores por Situação ───────────────────────────────────────────────────────
const SITUACAO_STYLE: Record<string, { bg: string; text: string; ring: string }> = {
  ATIVO:    { bg: "bg-emerald-500/10", text: "text-emerald-300", ring: "ring-emerald-500/30" },
  BAIXADO:  { bg: "bg-rose-500/10",    text: "text-rose-300",    ring: "ring-rose-500/30" },
  INATIVO:  { bg: "bg-slate-500/10",   text: "text-slate-300",   ring: "ring-slate-500/30" },
};

// ─── Tipo agregado: veículo + métricas de manutenção ──────────────────────────
interface VeiculoEnriquecido extends FrotaRow {
  custoManut: number;
  qtdOrdens: number;
  ordensAbertas: number;
  ultimaManut: string | null;
  diasDesdeUltima: number | null;
  idade: number | null;
}

// ─── Tooltip dark customizado para recharts ───────────────────────────────────
const DarkTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-amber-400/30 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[12px] font-semibold text-white">
          {formatter ? formatter(p.value, p.name) : `${p.name}: ${p.value}`}
        </p>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function Frota() {
  const navigate = useNavigate();

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [frota, setFrota] = useState<FrotaRow[]>([]);
  const [manutencao, setManutencao] = useState<ManutencaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [filtroSituacao, setFiltroSituacao] = useState<"TODOS" | "ATIVO" | "BAIXADO" | "INATIVO">("ATIVO");
  const [filtroMarca, setFiltroMarca] = useState<string>("Todas");
  const [filtroFrota, setFiltroFrota] = useState<string>("Todas");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<keyof VeiculoEnriquecido>("custoManut");
  const [sortAsc, setSortAsc] = useState(false);

  // Modal de validação
  const [validacaoAberta, setValidacaoAberta] = useState<string | null>(null);

  // ── Carregamento ────────────────────────────────────────────────────────────
  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setLoadingPhase("Conectando ao DW...");

    let cur = 0;
    const phases = [
      { at: 25, label: "Buscando cadastro da frota..." },
      { at: 60, label: "Buscando ordens de manutenção..." },
      { at: 85, label: "Cruzando dados e gerando análises..." },
    ];
    const iv = window.setInterval(() => {
      const spd = cur < 30 ? 4 + Math.random() * 3 : cur < 70 ? 2 + Math.random() * 2 : 0.5 + Math.random() * 0.8;
      cur = Math.min(cur + spd, 95);
      const p = [...phases].reverse().find(ph => cur >= ph.at);
      if (p) setLoadingPhase(p.label);
      setProgress(Math.round(cur));
    }, 120);

    try {
      const [frRes, mnRes] = await Promise.all([
        fetchFrota(),
        fetchManutencao(),
      ]);
      setFrota(frRes.data ?? []);
      setManutencao(mnRes.data ?? []);
    } catch (err) {
      setError((err as Error).message ?? "Erro ao carregar dados");
    } finally {
      clearInterval(iv);
      setProgress(100);
      setLoadingPhase("");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // ── Index manutenção por veículo ────────────────────────────────────────────
  const manutencaoPorVeiculo = useMemo(() => {
    const map = new Map<string, { custo: number; qtd: number; abertas: number; ultima: string | null }>();
    for (const m of manutencao) {
      const key = String(m.veiculo ?? "");
      if (!key) continue;
      const cur = map.get(key) ?? { custo: 0, qtd: 0, abertas: 0, ultima: null };
      cur.custo += (m.custo ?? 0) * (m.qtd ?? 0);
      cur.qtd += 1;
      if (m.situacao === "ANDAMENTO" || m.situacao === "INCONSISTENTE") cur.abertas += 1;
      if (m.dataordem && (!cur.ultima || m.dataordem > cur.ultima)) cur.ultima = m.dataordem;
      map.set(key, cur);
    }
    return map;
  }, [manutencao]);

  // ── Frota enriquecida ──────────────────────────────────────────────────────
  const frotaEnriquecida: VeiculoEnriquecido[] = useMemo(() => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    return frota.map(v => {
      const m = manutencaoPorVeiculo.get(String(v.codvei));
      let diasDesdeUltima: number | null = null;
      if (m?.ultima) {
        const dUlt = new Date(m.ultima);
        if (!isNaN(dUlt.getTime())) {
          diasDesdeUltima = Math.floor((hoje.getTime() - dUlt.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
      const idade = v.anofab ? anoAtual - v.anofab : null;
      return {
        ...v,
        custoManut: m?.custo ?? 0,
        qtdOrdens: m?.qtd ?? 0,
        ordensAbertas: m?.abertas ?? 0,
        ultimaManut: m?.ultima ?? null,
        diasDesdeUltima,
        idade,
      };
    });
  }, [frota, manutencaoPorVeiculo]);

  // ── Listas de filtros ──────────────────────────────────────────────────────
  const marcas = useMemo(() => {
    const set = new Set<string>();
    frota.forEach(v => v.marca && set.add(v.marca));
    return ["Todas", ...Array.from(set).sort()];
  }, [frota]);

  const frotasGrupos = useMemo(() => {
    const set = new Set<string>();
    frota.forEach(v => v.frota && set.add(v.frota));
    return ["Todas", ...Array.from(set).sort()];
  }, [frota]);

  // ── Frota filtrada ─────────────────────────────────────────────────────────
  const frotaFiltrada = useMemo(() => {
    return frotaEnriquecida.filter(v => {
      const matchSit = filtroSituacao === "TODOS" || v.situacao === filtroSituacao;
      const matchMarca = filtroMarca === "Todas" || v.marca === filtroMarca;
      const matchFrota = filtroFrota === "Todas" || v.frota === filtroFrota;
      const q = search.toLowerCase();
      const matchSearch = !q || [
        v.codvei, v.chassi, v.frota, v.marca, v.modelo, v.municipio, v.classificacao
      ].some(x => String(x ?? "").toLowerCase().includes(q));
      return matchSit && matchMarca && matchFrota && matchSearch;
    });
  }, [frotaEnriquecida, filtroSituacao, filtroMarca, filtroFrota, search]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const ativos = frotaFiltrada.filter(v => v.situacao === "ATIVO");
    const idades = ativos.map(v => v.idade).filter((x): x is number => x !== null);
    const idadeMedia = idades.length > 0 ? idades.reduce((s, x) => s + x, 0) / idades.length : 0;
    const custoTotal = frotaFiltrada.reduce((s, v) => s + v.custoManut, 0);
    const custoMedio = ativos.length > 0 ? custoTotal / ativos.length : 0;
    const totalOrdens = frotaFiltrada.reduce((s, v) => s + v.qtdOrdens, 0);
    const ordensAbertas = frotaFiltrada.reduce((s, v) => s + v.ordensAbertas, 0);
    return {
      total: frotaFiltrada.length,
      ativos: ativos.length,
      idadeMedia,
      custoTotal,
      custoMedio,
      totalOrdens,
      ordensAbertas,
    };
  }, [frotaFiltrada]);

  // ── Validações Analíticas ──────────────────────────────────────────────────
  const validacoes = useMemo(() => {
    const custosComOrdem = frotaEnriquecida
      .filter(v => v.situacao === "ATIVO" && v.qtdOrdens > 0)
      .map(v => v.custoManut);
    const media = custosComOrdem.length > 0 ? custosComOrdem.reduce((s, x) => s + x, 0) / custosComOrdem.length : 0;
    const variancia = custosComOrdem.length > 0
      ? custosComOrdem.reduce((s, x) => s + (x - media) ** 2, 0) / custosComOrdem.length
      : 0;
    const desvio = Math.sqrt(variancia);
    const limite = media + 2 * desvio;

    return {
      semManutencao: frotaEnriquecida.filter(v => v.situacao === "ATIVO" && v.qtdOrdens === 0),
      custoExcessivo: frotaEnriquecida.filter(v =>
        v.situacao === "ATIVO" && v.qtdOrdens > 0 && v.custoManut > limite && limite > 0
      ),
      baixadosComManut: frotaEnriquecida.filter(v =>
        v.situacao === "BAIXADO" && v.diasDesdeUltima !== null && v.diasDesdeUltima <= 90
      ),
      idadeAlta: frotaEnriquecida.filter(v =>
        v.situacao === "ATIVO" && v.idade !== null && v.idade > 15
      ),
      anoInconsistente: frotaEnriquecida.filter(v =>
        v.anofab && v.anomod && v.anomod < v.anofab
      ),
      semMunicipio: frotaEnriquecida.filter(v => v.situacao === "ATIVO" && !v.municipio),
      ordensTravadas: manutencao.filter(m => {
        if (m.situacao !== "ANDAMENTO" || !m.dataordem) return false;
        const dias = Math.floor((Date.now() - new Date(m.dataordem).getTime()) / (1000 * 60 * 60 * 24));
        return dias > 30;
      }),
      limiteCusto: limite,
      mediaCusto: media,
    };
  }, [frotaEnriquecida, manutencao]);

  // ── Top 10 custo ───────────────────────────────────────────────────────────
  const top10Custo = useMemo(() => {
    return [...frotaEnriquecida]
      .filter(v => v.custoManut > 0)
      .sort((a, b) => b.custoManut - a.custoManut)
      .slice(0, 10)
      .map(v => ({
        nome: `${v.codvei} • ${(v.modelo ?? "").slice(0, 18)}`,
        custo: v.custoManut,
        ordens: v.qtdOrdens,
        marca: v.marca ?? "—",
        fill: getMarcaColor(v.marca).color,
      }));
  }, [frotaEnriquecida]);

  // ── Distribuição por marca ─────────────────────────────────────────────────
  const distMarca = useMemo(() => {
    const map = new Map<string, number>();
    frotaFiltrada.forEach(v => {
      const k = v.marca ?? "Sem marca";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nome, qtd]) => ({ nome, qtd, color: getMarcaColor(nome).color }))
      .sort((a, b) => b.qtd - a.qtd);
  }, [frotaFiltrada]);

  // ── Distribuição por classificação ─────────────────────────────────────────
  const distClassif = useMemo(() => {
    const map = new Map<string, number>();
    frotaFiltrada.forEach(v => {
      const k = v.classificacao ?? "Sem classificação";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 8);
  }, [frotaFiltrada]);

  // ── Custo por mês ──────────────────────────────────────────────────────────
  const custoPorMes = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of manutencao) {
      if (!m.dataordem || m.situacao === "CANCELADO") continue;
      const d = new Date(m.dataordem);
      if (isNaN(d.getTime())) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const v = (m.custo ?? 0) * (m.qtd ?? 0);
      map.set(k, (map.get(k) ?? 0) + v);
    }
    return Array.from(map.entries())
      .map(([mes, custo]) => ({ mes: mes.slice(2).replace("-", "/"), custo }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12);
  }, [manutencao]);

  // ── Custo médio por idade ──────────────────────────────────────────────────
  const custoPorIdade = useMemo(() => {
    const faixas: Record<string, { soma: number; qtd: number }> = {
      "0-3":   { soma: 0, qtd: 0 },
      "4-7":   { soma: 0, qtd: 0 },
      "8-11":  { soma: 0, qtd: 0 },
      "12-15": { soma: 0, qtd: 0 },
      "16+":   { soma: 0, qtd: 0 },
    };
    frotaEnriquecida.forEach(v => {
      if (v.idade === null || v.situacao !== "ATIVO") return;
      const f = v.idade <= 3 ? "0-3"
        : v.idade <= 7 ? "4-7"
        : v.idade <= 11 ? "8-11"
        : v.idade <= 15 ? "12-15"
        : "16+";
      faixas[f].soma += v.custoManut;
      faixas[f].qtd += 1;
    });
    return Object.entries(faixas).map(([faixa, { soma, qtd }]) => ({
      faixa, medio: qtd > 0 ? soma / qtd : 0, qtd,
    }));
  }, [frotaEnriquecida]);

  // ── Sort tabela ────────────────────────────────────────────────────────────
  const handleSort = (col: keyof VeiculoEnriquecido) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const tabelaOrdenada = useMemo(() => {
    return [...frotaFiltrada].sort((a, b) => {
      const va = a[sortCol]; const vb = b[sortCol];
      if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
      return sortAsc
        ? String(va ?? "").localeCompare(String(vb ?? ""))
        : String(vb ?? "").localeCompare(String(va ?? ""));
    });
  }, [frotaFiltrada, sortCol, sortAsc]);

  // Lista de veículos para o modal de validação aberta
  const validacaoLista = useMemo(() => {
    if (!validacaoAberta) return [];
    const map: Record<string, VeiculoEnriquecido[]> = {
      semManutencao:    validacoes.semManutencao,
      custoExcessivo:   validacoes.custoExcessivo,
      baixadosComManut: validacoes.baixadosComManut,
      idadeAlta:        validacoes.idadeAlta,
      anoInconsistente: validacoes.anoInconsistente,
      semMunicipio:     validacoes.semMunicipio,
    };
    return map[validacaoAberta] ?? [];
  }, [validacaoAberta, validacoes]);

  const COLS = [
    { key: "codvei",       label: "Código",     align: "left",   numeric: false },
    { key: "frota",        label: "Frota",      align: "left",   numeric: false },
    { key: "marca",        label: "Marca",      align: "left",   numeric: false },
    { key: "modelo",       label: "Modelo",     align: "left",   numeric: false },
    { key: "anofab",       label: "Ano",        align: "center", numeric: true  },
    { key: "idade",        label: "Idade",      align: "center", numeric: true  },
    { key: "municipio",    label: "Município",  align: "left",   numeric: false },
    { key: "situacao",     label: "Situação",   align: "center", numeric: false },
    { key: "qtdOrdens",    label: "Ordens",     align: "center", numeric: true  },
    { key: "custoManut",   label: "Custo Manut.", align: "right",  numeric: true  },
    { key: "ultimaManut",  label: "Última Manut.", align: "center", numeric: false },
  ] as const;

  // ═════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="flex flex-col transition-all duration-300 min-h-[100dvh] overflow-auto px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* Gradientes de fundo no padrão SGT */}
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(160,100,4,0.22),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_50%_40%_at_100%_105%,rgba(6,182,212,0.07),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:opacity-100" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.68) 100%)" }} />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px]"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          <div className="relative flex flex-col flex-1 min-h-0 gap-3 p-2 sm:p-3 lg:p-4 w-full">

            {/* ════════ NAVBAR ════════ */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              <div className="flex items-center gap-3">
                <img src={sgtLogo} alt="SGT" className="block h-8 w-auto shrink-0 object-contain" />
                <div className="h-6 w-px" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
                  <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">Gestão de Frota</span>
                </div>
              </div>

              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">DW Conectado</span>
              </div>

              <div className="flex-1" />

              {/* Filtros desktop */}
              <Select value={filtroSituacao} onValueChange={(v) => setFiltroSituacao(v as any)}>
                <SelectTrigger className="h-8 w-[120px] text-[11px] border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVO">Ativos</SelectItem>
                  <SelectItem value="BAIXADO">Baixados</SelectItem>
                  <SelectItem value="INATIVO">Inativos</SelectItem>
                  <SelectItem value="TODOS">Todos</SelectItem>
                </SelectContent>
              </Select>

              <button
                onClick={carregarDados}
                disabled={loading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-medium transition-all border-amber-400/30 bg-amber-400/[0.12] text-amber-200 hover:border-amber-400/50 hover:bg-amber-400/[0.2] disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                {loading ? `${progress}%` : "Atualizar"}
              </button>

              <HomeButton />
            </div>

            {/* Mobile nav */}
            <MobileNav />

            <div className="h-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

            {/* ════════ ERRO ════════ */}
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-[12px] text-rose-200">
                <strong>Erro:</strong> {error}
              </div>
            )}

            {/* ════════ LOADING PHASE ════════ */}
            {loading && loadingPhase && (
              <div className="flex items-center gap-2 text-[11px] text-amber-300/80">
                <div className="h-1 w-32 overflow-hidden rounded-full bg-amber-400/10">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span>{loadingPhase}</span>
              </div>
            )}

            {/* ════════ KPI ROW (4 cards) ════════ */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 shrink-0">
              {[
                {
                  label: "Frota Ativa", value: loading ? "—" : fmtNum(kpis.ativos),
                  sub: `${fmtNum(kpis.total)} no recorte`,
                  icon: Truck, color: "cyan", rgb: "6,182,212",
                  stripe: "from-cyan-400/60 to-cyan-700/20",
                  border: "border-cyan-400/[0.12]",
                  glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]",
                  iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]",
                  iconTxt: "text-cyan-300",
                  sub2: "text-cyan-500/80",
                },
                {
                  label: "Idade Média", value: loading ? "—" : `${kpis.idadeMedia.toFixed(1)} anos`,
                  sub: "veículos ativos",
                  icon: Calendar, color: "violet", rgb: "139,92,246",
                  stripe: "from-violet-400/60 to-violet-700/20",
                  border: "border-violet-400/[0.12]",
                  glow: "hover:shadow-[0_4px_40px_rgba(139,92,246,0.18)]",
                  iconBg: "bg-violet-400/[0.08] border border-violet-400/[0.15]",
                  iconTxt: "text-violet-300",
                  sub2: "text-violet-500/80",
                },
                {
                  label: "Custo de Manutenção", value: loading ? "—" : fmtK(kpis.custoTotal),
                  sub: `${fmtNum(kpis.totalOrdens)} ordens`,
                  icon: Wrench, color: "rose", rgb: "244,63,94",
                  stripe: "from-rose-400/60 to-rose-700/20",
                  border: "border-rose-400/[0.12]",
                  glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]",
                  iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]",
                  iconTxt: "text-rose-300",
                  sub2: "text-rose-500/80",
                },
                {
                  label: "Custo Médio / Veículo", value: loading ? "—" : fmtK(kpis.custoMedio),
                  sub: `${fmtNum(kpis.ordensAbertas)} ordens abertas`,
                  icon: DollarSign, color: "amber", rgb: "245,158,11",
                  stripe: "from-amber-400/60 to-amber-700/20",
                  border: "border-amber-400/[0.12]",
                  glow: "hover:shadow-[0_4px_40px_rgba(245,158,11,0.18)]",
                  iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]",
                  iconTxt: "text-amber-300",
                  sub2: "text-amber-500/80",
                },
              ].map((k, i) => (
                <AnimatedCard key={k.label} delay={i * 60}>
                  <div className={`group relative flex min-h-[100px] flex-col overflow-hidden rounded-[14px] sm:rounded-[16px] border ${k.border} bg-[var(--sgt-bg-card)] transition-all duration-300 hover:-translate-y-[3px] ${k.glow} shadow-[0_2px_20px_rgba(0,0,0,0.4)] p-3 xl:p-4`}>
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
                      <p className="mt-auto pt-2 font-black leading-none tracking-[-0.05em] text-white text-[clamp(1rem,2vw,1.6rem)] overflow-hidden text-ellipsis whitespace-nowrap">{k.value}</p>
                      <p className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${k.sub2}`}>{k.sub}</p>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>

            {/* ════════ VALIDAÇÕES ANALÍTICAS ════════ */}
            <div className="rounded-[14px] border border-amber-400/15 bg-gradient-to-br from-amber-500/[0.04] to-rose-500/[0.02] p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/[0.12] border border-amber-400/[0.2]">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                </div>
                <h3 className="text-[12px] font-bold uppercase tracking-[0.25em] text-amber-300">Validações Analíticas</h3>
                <div className="flex-1" />
                <span className="text-[10px] text-slate-500">Clique em qualquer alerta para detalhar</span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
                {[
                  {
                    key: "semManutencao",
                    label: "Sem Manutenção",
                    desc: "ativos sem ordens",
                    qtd: validacoes.semManutencao.length,
                    icon: AlertCircle,
                    severity: validacoes.semManutencao.length > 5 ? "high" : "low",
                  },
                  {
                    key: "custoExcessivo",
                    label: "Custo Excessivo",
                    desc: `> ${fmtK(validacoes.limiteCusto)} (μ+2σ)`,
                    qtd: validacoes.custoExcessivo.length,
                    icon: TrendingUp,
                    severity: "high",
                  },
                  {
                    key: "idadeAlta",
                    label: "Idade > 15 anos",
                    desc: "candidatos a renovação",
                    qtd: validacoes.idadeAlta.length,
                    icon: Calendar,
                    severity: validacoes.idadeAlta.length > 10 ? "high" : "med",
                  },
                  {
                    key: "baixadosComManut",
                    label: "Baixados c/ Manut.",
                    desc: "manutenção ≤ 90d",
                    qtd: validacoes.baixadosComManut.length,
                    icon: AlertTriangle,
                    severity: validacoes.baixadosComManut.length > 0 ? "high" : "ok",
                  },
                  {
                    key: "anoInconsistente",
                    label: "Ano Inconsistente",
                    desc: "modelo < fabricação",
                    qtd: validacoes.anoInconsistente.length,
                    icon: AlertCircle,
                    severity: validacoes.anoInconsistente.length > 0 ? "med" : "ok",
                  },
                  {
                    key: "semMunicipio",
                    label: "Sem Município",
                    desc: "cadastro incompleto",
                    qtd: validacoes.semMunicipio.length,
                    icon: MapPin,
                    severity: validacoes.semMunicipio.length > 0 ? "med" : "ok",
                  },
                ].map((alert) => {
                  const tone = alert.qtd === 0
                    ? { ring: "ring-emerald-400/20", bg: "bg-emerald-500/[0.03]", text: "text-emerald-300", icon: "text-emerald-400/60", label: "text-emerald-300/80", num: "text-emerald-200" }
                    : alert.severity === "high"
                    ? { ring: "ring-rose-400/30", bg: "bg-rose-500/[0.06]", text: "text-rose-300", icon: "text-rose-400", label: "text-rose-300/90", num: "text-rose-200" }
                    : alert.severity === "med"
                    ? { ring: "ring-amber-400/30", bg: "bg-amber-500/[0.06]", text: "text-amber-300", icon: "text-amber-400", label: "text-amber-300/90", num: "text-amber-200" }
                    : { ring: "ring-slate-400/20", bg: "bg-slate-500/[0.04]", text: "text-slate-300", icon: "text-slate-400", label: "text-slate-300/80", num: "text-slate-200" };
                  return (
                    <button
                      key={alert.key}
                      onClick={() => alert.qtd > 0 && setValidacaoAberta(alert.key)}
                      disabled={alert.qtd === 0}
                      className={`group flex flex-col rounded-lg ring-1 ${tone.ring} ${tone.bg} px-3 py-2.5 text-left transition-all hover:-translate-y-[1px] ${alert.qtd === 0 ? "cursor-default" : "cursor-pointer hover:ring-2"} disabled:opacity-70`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <alert.icon className={`h-3.5 w-3.5 ${tone.icon}`} />
                        {alert.qtd === 0 && <CheckCircle2 className="h-3 w-3 text-emerald-400/70" />}
                      </div>
                      <p className={`mt-1.5 text-[18px] font-black leading-none tracking-tight ${tone.num}`}>
                        {fmtNum(alert.qtd)}
                      </p>
                      <p className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${tone.label}`}>
                        {alert.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{alert.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ════════ GRÁFICOS - LINHA 1 ════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 shrink-0">
              {/* Top 10 custo */}
              <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-3.5 w-3.5 text-rose-400" />
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">Top 10 — Custo de Manutenção</h3>
                </div>
                <div style={{ height: 280 }}>
                  {top10Custo.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-[12px] text-slate-500">
                      Sem dados de manutenção
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={top10Custo} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => fmtK(v)} />
                        <YAxis type="category" dataKey="nome" tick={{ fill: "#cbd5e1", fontSize: 10 }} width={150} />
                        <ReTooltip content={<DarkTooltip formatter={(v: number) => fmtBRL(v)} />} />
                        <Bar dataKey="custo" radius={[0, 4, 4, 0]}>
                          {top10Custo.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} fillOpacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Distribuição por marca */}
              <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-3.5 w-3.5 text-cyan-400" />
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">Distribuição por Marca</h3>
                </div>
                <div style={{ height: 280 }} className="flex items-center">
                  {distMarca.length === 0 ? (
                    <div className="flex w-full h-full items-center justify-center text-[12px] text-slate-500">
                      Sem dados
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 w-full h-full items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distMarca}
                            dataKey="qtd"
                            nameKey="nome"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={2}
                            stroke="rgba(2,6,23,0.6)"
                            strokeWidth={2}
                          >
                            {distMarca.map((d, i) => (
                              <Cell key={i} fill={d.color} />
                            ))}
                          </Pie>
                          <ReTooltip content={<DarkTooltip formatter={(v: number, name: string) => `${name}: ${fmtNum(v)} veíc.`} />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-1 max-h-[260px] overflow-auto pr-2">
                        {distMarca.slice(0, 8).map((m) => (
                          <div key={m.nome} className="flex items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: m.color }} />
                              <span className="truncate text-slate-300">{m.nome}</span>
                            </div>
                            <span className="font-semibold text-slate-200">{m.qtd}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ════════ GRÁFICOS - LINHA 2 ════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 shrink-0">
              {/* Custo por mês */}
              <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-3.5 w-3.5 text-amber-400" />
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">Custo de Manutenção / Mês</h3>
                </div>
                <div style={{ height: 240 }}>
                  {custoPorMes.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-[12px] text-slate-500">Sem dados</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={custoPorMes} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="custoLine" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                        <XAxis dataKey="mes" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => fmtK(v)} />
                        <ReTooltip content={<DarkTooltip formatter={(v: number) => fmtBRL(v)} />} />
                        <Line type="monotone" dataKey="custo" stroke="#fbbf24" strokeWidth={2} dot={{ fill: "#fbbf24", r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Custo médio por idade */}
              <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-3.5 w-3.5 text-violet-400" />
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">Custo Médio por Faixa de Idade</h3>
                </div>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={custoPorIdade} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="faixa" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => fmtK(v)} />
                      <ReTooltip content={<DarkTooltip formatter={(v: number, name: string) => name === "medio" ? `Custo médio: ${fmtBRL(v)}` : `${name}: ${v}`} />} />
                      <Bar dataKey="medio" fill="#a78bfa" radius={[6, 6, 0, 0]} fillOpacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ════════ FILTROS DA TABELA ════════ */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por código, chassi, modelo, município..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-[12px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/40"
                />
              </div>

              <Select value={filtroMarca} onValueChange={setFiltroMarca}>
                <SelectTrigger className="h-9 w-[140px] text-[11px] border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]">
                  <SelectValue placeholder="Marca" />
                </SelectTrigger>
                <SelectContent>
                  {marcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filtroFrota} onValueChange={setFiltroFrota}>
                <SelectTrigger className="h-9 w-[160px] text-[11px] border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]">
                  <SelectValue placeholder="Frota" />
                </SelectTrigger>
                <SelectContent>
                  {frotasGrupos.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>

              <span className="text-[11px] text-slate-500">
                {fmtNum(tabelaOrdenada.length)} de {fmtNum(frotaEnriquecida.length)} veículos
              </span>
            </div>

            {/* ════════ TABELA ════════ */}
            <div className="flex-1 min-h-[400px] overflow-auto rounded-lg border border-[var(--sgt-border-subtle)]">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 z-10" style={{ background: "var(--sgt-bg-base)" }}>
                  <tr>
                    {COLS.map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key as keyof VeiculoEnriquecido)}
                        className={`px-3 py-2.5 font-semibold text-slate-400 cursor-pointer select-none hover:text-amber-300 transition ${
                          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortCol === col.key && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-t border-[var(--sgt-border-subtle)]">
                        {COLS.map((c, j) => (
                          <td key={j} className="px-3 py-2.5"><div className="h-3 w-full animate-pulse rounded bg-[var(--sgt-border-subtle)]" /></td>
                        ))}
                      </tr>
                    ))
                  ) : tabelaOrdenada.length === 0 ? (
                    <tr>
                      <td colSpan={COLS.length} className="px-4 py-12 text-center text-slate-500">
                        <Truck className="mx-auto h-8 w-8 mb-2 opacity-40" />
                        <p>Nenhum veículo encontrado com os filtros aplicados</p>
                      </td>
                    </tr>
                  ) : (
                    tabelaOrdenada.slice(0, 200).map((v) => {
                      const sit = SITUACAO_STYLE[v.situacao] ?? SITUACAO_STYLE.INATIVO;
                      const marcaCor = getMarcaColor(v.marca);
                      return (
                        <tr key={v.codvei} className="border-t border-[var(--sgt-border-subtle)] hover:bg-amber-400/[0.03] transition-colors">
                          <td className="px-3 py-2 font-mono font-semibold text-white">{v.codvei}</td>
                          <td className="px-3 py-2 text-slate-300">{v.frota ?? "—"}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: marcaCor.color }} />
                              <span className="text-slate-200">{v.marca ?? "—"}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-300 max-w-[200px] truncate" title={v.modelo ?? ""}>{v.modelo ?? "—"}</td>
                          <td className="px-3 py-2 text-center text-slate-400">{v.anofab ?? "—"}</td>
                          <td className="px-3 py-2 text-center">
                            {v.idade !== null
                              ? <span className={v.idade > 15 ? "text-rose-300 font-semibold" : "text-slate-300"}>{v.idade}</span>
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-400 max-w-[140px] truncate" title={v.municipio ?? ""}>{v.municipio ?? "—"}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ${sit.bg} ${sit.text} ${sit.ring}`}>
                              {v.situacao}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-slate-300">
                            {v.qtdOrdens > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                {fmtNum(v.qtdOrdens)}
                                {v.ordensAbertas > 0 && (
                                  <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-200 font-bold">{v.ordensAbertas} ab.</span>
                                )}
                              </span>
                            ) : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-rose-200">
                            {v.custoManut > 0 ? fmtBRL(v.custoManut) : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-400 text-[11px]">{fmtData(v.ultimaManut)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {tabelaOrdenada.length > 200 && (
                <div className="px-3 py-2 text-center text-[11px] text-slate-500 border-t border-[var(--sgt-border-subtle)]">
                  Exibindo os primeiros 200 — refine os filtros para ver mais.
                </div>
              )}
            </div>

          </div>
        </section>
      </div>

      {/* ════════ MODAL DE VALIDAÇÃO ════════ */}
      {validacaoAberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          onClick={() => setValidacaoAberta(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[80vh] flex flex-col rounded-2xl border border-amber-400/20 bg-[var(--sgt-bg-section)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--sgt-border-subtle)]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h2 className="text-[14px] font-bold text-white">
                  {validacaoAberta === "semManutencao" && "Veículos ativos sem manutenção registrada"}
                  {validacaoAberta === "custoExcessivo" && `Veículos com custo acima de ${fmtK(validacoes.limiteCusto)}`}
                  {validacaoAberta === "idadeAlta" && "Veículos ativos com mais de 15 anos"}
                  {validacaoAberta === "baixadosComManut" && "Veículos baixados com manutenção recente (≤ 90 dias)"}
                  {validacaoAberta === "anoInconsistente" && "Veículos com ano modelo < ano fabricação"}
                  {validacaoAberta === "semMunicipio" && "Veículos ativos sem município cadastrado"}
                </h2>
                <span className="text-[11px] text-slate-500 ml-2">{validacaoLista.length} encontrado(s)</span>
              </div>
              <button
                onClick={() => setValidacaoAberta(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-slate-400 text-left">
                    <th className="px-2 py-2">Código</th>
                    <th className="px-2 py-2">Frota</th>
                    <th className="px-2 py-2">Marca / Modelo</th>
                    <th className="px-2 py-2 text-center">Ano</th>
                    <th className="px-2 py-2 text-center">Idade</th>
                    <th className="px-2 py-2 text-right">Custo Manut.</th>
                    <th className="px-2 py-2 text-center">Última</th>
                  </tr>
                </thead>
                <tbody>
                  {validacaoLista.map(v => (
                    <tr key={v.codvei} className="border-t border-[var(--sgt-border-subtle)]">
                      <td className="px-2 py-2 font-mono font-semibold text-white">{v.codvei}</td>
                      <td className="px-2 py-2 text-slate-300">{v.frota ?? "—"}</td>
                      <td className="px-2 py-2 text-slate-300 truncate max-w-[200px]" title={`${v.marca} ${v.modelo}`}>
                        {v.marca} {v.modelo}
                      </td>
                      <td className="px-2 py-2 text-center text-slate-400">{v.anofab ?? "—"}</td>
                      <td className="px-2 py-2 text-center">
                        {v.idade !== null
                          ? <span className={v.idade > 15 ? "text-rose-300 font-semibold" : "text-slate-300"}>{v.idade}</span>
                          : "—"}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-rose-200">
                        {v.custoManut > 0 ? fmtBRL(v.custoManut) : "—"}
                      </td>
                      <td className="px-2 py-2 text-center text-slate-400">{fmtData(v.ultimaManut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validacaoLista.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-[12px]">Nenhum item na lista.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
