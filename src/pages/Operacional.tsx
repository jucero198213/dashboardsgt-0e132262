import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Radio, Search, AlertTriangle, ChevronUp, ChevronDown,
  X, ChevronLeft, ChevronRight, Filter, FileText,
  Activity, MapPin, Truck, Wrench, Clock, TrendingUp,
  Navigation, Users, BarChart3, Zap, AlertCircle,
  CheckCircle2, RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as ReTooltip, CartesianGrid,
} from "recharts";
import sgtLogo from "@/assets/sgt-logo.png";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { UpdateButton } from "@/components/shared/UpdateButton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCooldown } from "@/hooks/useCooldown";
import { fetchOperacional, type OperacionalRow } from "@/lib/dwApi";
import { RAW } from "@/lib/theme";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtNum  = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const fmtPct  = (v: number) => `${v.toFixed(0)}%`;

const fmtHora = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const fmtDataHora = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

const minAtraso = (original: string | null, real: string | null): number | null => {
  if (!original || !real) return null;
  const o = new Date(original), r = new Date(real);
  if (isNaN(o.getTime()) || isNaN(r.getTime())) return null;
  return Math.round((r.getTime() - o.getTime()) / 60000);
};

const minPrevisao = (previsao: string | null): number | null => {
  if (!previsao) return null;
  const p = new Date(previsao);
  if (isNaN(p.getTime())) return null;
  return Math.round((p.getTime() - Date.now()) / 60000);
};

// ─── Paleta ───────────────────────────────────────────────────────────────────
const PALETTE = [
  RAW.accent.cyan, RAW.accent.emerald, RAW.accent.violet,
  RAW.accent.amber, RAW.accent.rose,   "#fb923c", "#94a3b8",
];
const colorFor = (_: string, i: number) => PALETTE[i % PALETTE.length];

// ─── Situação → estilo ────────────────────────────────────────────────────────
const SITUAC_STYLE: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  EM_ROTA:      { bg: "bg-cyan-500/10",    text: "text-cyan-300",    ring: "ring-cyan-500/30",    label: "Em rota"      },
  ENTREGUE:     { bg: "bg-emerald-500/10", text: "text-emerald-300", ring: "ring-emerald-500/30", label: "Entregue"     },
  AGUARDANDO:   { bg: "bg-amber-500/10",   text: "text-amber-300",   ring: "ring-amber-500/30",   label: "Aguardando"   },
  ATRASADO:     { bg: "bg-rose-500/10",    text: "text-rose-300",    ring: "ring-rose-500/30",    label: "Atrasado"     },
  MANUTENCAO:   { bg: "bg-violet-500/10",  text: "text-violet-300",  ring: "ring-violet-500/30",  label: "Manutenção"   },
  CANCELADO:    { bg: "bg-slate-500/10",   text: "text-slate-400",   ring: "ring-slate-500/20",   label: "Cancelado"    },
};
const getSituacStyle = (raw: string | null) => {
  if (!raw) return SITUAC_STYLE["AGUARDANDO"];
  const key = Object.keys(SITUAC_STYLE).find(k =>
    raw.toUpperCase().includes(k) ||
    (k === "EM_ROTA" && (raw.toUpperCase().includes("ROTA") || raw.toUpperCase().includes("VIAGEM"))) ||
    (k === "ATRASADO" && raw.toUpperCase().includes("ATRASO"))
  );
  return SITUAC_STYLE[key ?? "AGUARDANDO"] ?? SITUAC_STYLE["AGUARDANDO"];
};

// ─── Tooltip dark ─────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-cyan-400/30 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? "#fff" }} className="text-[12px] font-semibold">
          {formatter ? formatter(p.value, p.name) : `${p.name}: ${p.value}`}
        </p>
      ))}
    </div>
  );
};

// ─── Tipo local enriquecido ────────────────────────────────────────────────────
interface Viagem {
  id:               string;
  veiculo:          string;
  veiculo2:         string | null;
  veiculo3:         string | null;
  motorista:        string | null;
  latitude:         number | null;
  longitude:        number | null;
  referencia:       string | null;
  tipoDoc:          string | null;
  codDoc:           string | null;
  filialDoc:        string | null;
  remetente:        string | null;
  destinatario:     string | null;
  datSaiOriginal:   string | null;
  datSaiReal:       string | null;
  percCompleto:     number;
  prevChegada:      string | null;
  situacaoViagem:   string | null;
  descSituacao:     string | null;
  descOrigem:       string | null;
  descDestino:      string | null;
  latRemetente:     number | null;
  longRemetente:    number | null;
  latDestinatario:  number | null;
  longDestinatario: number | null;
  totalItens:       number;
  itensReal:        number;
  classiVei:        string | null;
  situacVei:        string | null;
  emManutencao:     boolean;
  // calculados
  minAtrasoSaida:   number | null;
  minParaChegar:    number | null;
  temAtraso:        boolean;
  prevUltrapassada: boolean;
  itensDivergentes: boolean;
  semGps:           boolean;
  rota:             string;
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Operacional() {
  const cooldown = useCooldown("dw_operacional_fetch_ts");

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [dados,        setDados]        = useState<OperacionalRow[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [error,        setError]        = useState<string | null>(null);
  const [lastUpdate,   setLastUpdate]   = useState<Date | null>(null);

  // Filtros locais
  const [filtroSituacao,  setFiltroSituacao]  = useState("Todos");
  const [filtroMotorista, setFiltroMotorista] = useState("Todos");
  const [filtroClassi,    setFiltroClassi]    = useState("Todos");
  const [filtroManut,     setFiltroManut]     = useState("Todos");
  const [search,          setSearch]          = useState("");

  // Tabela
  const [sortCol, setSortCol] = useState<keyof Viagem>("percCompleto");
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
      { at: 30, label: "Buscando posições em tempo real..." },
      { at: 65, label: "Calculando indicadores operacionais..." },
      { at: 88, label: "Processando alertas e rotas..." },
    ];
    const iv = window.setInterval(() => {
      const spd = cur < 35 ? 4 + Math.random() * 3 : cur < 75 ? 2 + Math.random() * 2 : 0.5 + Math.random();
      cur = Math.min(cur + spd, 95);
      const p = [...phases].reverse().find(ph => cur >= ph.at);
      if (p) setLoadingPhase(p.label);
      setProgress(Math.round(cur));
    }, 120);

    try {
      const res = await fetchOperacional();
      setDados(res.data ?? []);
      setLastUpdate(new Date());
      cooldown.start();
    } catch (err) {
      setError((err as Error).message ?? "Erro ao carregar dados");
    } finally {
      clearInterval(iv);
      setProgress(100);
      setLoadingPhase("");
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (cooldown.canFetch) carregarDados(); }, [cooldown.canFetch]);

  // ── Normalização enriquecida ────────────────────────────────────────────────
  const viagens = useMemo<Viagem[]>(() => {
    return dados.map(d => {
      const atraso   = minAtraso(d.data_saida_original, d.data_saida_real);
      const paraCh   = minPrevisao(d.previsao_chegada);
      const perc     = d.percentual_completo ?? 0;
      const totalIt  = d.total_itens ?? 0;
      const realIt   = d.itens_real  ?? 0;
      const manut    = String(d.em_manutencao ?? "").toUpperCase() === "S" || d.em_manutencao === true;
      const semGps   = !d.latitude && !d.longitude;
      const orig     = d.descricao_origem   ?? d.remetente   ?? "—";
      const dest     = d.descricao_destino  ?? d.destinatario ?? "—";
      const origCurta = orig.length > 18 ? orig.slice(0, 18) + "…" : orig;
      const destCurta = dest.length > 18 ? dest.slice(0, 18) + "…" : dest;
      return {
        id:               String(d.id ?? ""),
        veiculo:          String(d.veiculo ?? "—"),
        veiculo2:         d.veiculo2 ? String(d.veiculo2) : null,
        veiculo3:         d.veiculo3 ? String(d.veiculo3) : null,
        motorista:        d.motorista,
        latitude:         d.latitude  ? Number(d.latitude)  : null,
        longitude:        d.longitude ? Number(d.longitude) : null,
        referencia:       d.referencia,
        tipoDoc:          d.tipo_documento,
        codDoc:           d.codigo_documento ? String(d.codigo_documento) : null,
        filialDoc:        d.filial_documento ? String(d.filial_documento) : null,
        remetente:        d.remetente,
        destinatario:     d.destinatario,
        datSaiOriginal:   d.data_saida_original,
        datSaiReal:       d.data_saida_real,
        percCompleto:     perc,
        prevChegada:      d.previsao_chegada,
        situacaoViagem:   d.situacao_viagem,
        descSituacao:     d.descricao_situacao,
        descOrigem:       orig,
        descDestino:      dest,
        latRemetente:     d.latitude_remetente  ? Number(d.latitude_remetente)  : null,
        longRemetente:    d.longitude_remetente ? Number(d.longitude_remetente) : null,
        latDestinatario:  d.latitude_destinatario  ? Number(d.latitude_destinatario)  : null,
        longDestinatario: d.longitude_destinatario ? Number(d.longitude_destinatario) : null,
        totalItens:       totalIt,
        itensReal:        realIt,
        classiVei:        d.classificacao_veiculo,
        situacVei:        d.situacao_veiculo,
        emManutencao:     manut,
        minAtrasoSaida:   atraso,
        minParaChegar:    paraCh,
        temAtraso:        atraso !== null && atraso > 0,
        prevUltrapassada: paraCh !== null && paraCh < 0 && perc < 100,
        itensDivergentes: totalIt > 0 && realIt > 0 && realIt !== totalIt,
        semGps:           semGps,
        rota:             `${origCurta} → ${destCurta}`,
      };
    });
  }, [dados]);

  // ── Listas únicas para filtros ───────────────────────────────────────────────
  const motoristas = useMemo(() => {
    const s = new Set<string>();
    viagens.forEach(v => { if (v.motorista) s.add(v.motorista); });
    return ["Todos", ...Array.from(s).sort()];
  }, [viagens]);

  const classificacoes = useMemo(() => {
    const s = new Set<string>();
    viagens.forEach(v => { if (v.classiVei) s.add(v.classiVei); });
    return ["Todos", ...Array.from(s).sort()];
  }, [viagens]);

  const situacoes = useMemo(() => {
    const s = new Set<string>();
    viagens.forEach(v => { if (v.descSituacao) s.add(v.descSituacao); });
    return ["Todos", ...Array.from(s).sort()];
  }, [viagens]);

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    return viagens.filter(v => {
      if (filtroSituacao  !== "Todos" && v.descSituacao !== filtroSituacao) return false;
      if (filtroMotorista !== "Todos" && v.motorista    !== filtroMotorista) return false;
      if (filtroClassi    !== "Todos" && v.classiVei    !== filtroClassi)   return false;
      if (filtroManut     === "Sim"   && !v.emManutencao)                   return false;
      if (filtroManut     === "Não"   &&  v.emManutencao)                   return false;
      return true;
    });
  }, [viagens, filtroSituacao, filtroMotorista, filtroClassi, filtroManut]);

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const emAndamento    = filtrados.filter(v => v.percCompleto > 0 && v.percCompleto < 100 && !v.emManutencao);
    const emRota         = filtrados.filter(v => !v.emManutencao && v.percCompleto < 100);
    const emManutencao   = filtrados.filter(v => v.emManutencao);
    const comAtraso      = filtrados.filter(v => v.temAtraso);
    const avgPerc        = filtrados.length > 0
      ? filtrados.reduce((s, v) => s + v.percCompleto, 0) / filtrados.length : 0;
    return { emAndamento: emAndamento.length, emRota: emRota.length, emManutencao: emManutencao.length, comAtraso: comAtraso.length, avgPerc };
  }, [filtrados]);

  // ── Alertas ───────────────────────────────────────────────────────────────
  const alertas = useMemo(() => ({
    atrasados:       filtrados.filter(v => v.temAtraso).length,
    emManutencao:    filtrados.filter(v => v.emManutencao).length,
    prevUltrapassada:filtrados.filter(v => v.prevUltrapassada).length,
    itensDiverg:     filtrados.filter(v => v.itensDivergentes).length,
    semGps:          filtrados.filter(v => v.semGps && !v.emManutencao).length,
  }), [filtrados]);

  // ── Distribuição por situação ─────────────────────────────────────────────
  const distSituacao = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach(v => {
      const k = v.descSituacao ?? "Não informado";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([nome, qtd], i) => ({ nome, qtd, fill: colorFor(nome, i) }));
  }, [filtrados]);

  // ── Distribuição por classificação ────────────────────────────────────────
  const distClassi = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach(v => {
      const k = v.classiVei ?? "Não informado";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([nome, qtd], i) => ({ nome, qtd, fill: colorFor(nome, i) }));
  }, [filtrados]);

  // ── Situação do veículo ───────────────────────────────────────────────────
  const distSituacVei = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach(v => {
      const k = v.situacVei ?? "Não informado";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([nome, qtd], i) => ({ nome, qtd, fill: colorFor(nome, i) }));
  }, [filtrados]);

  // ── Top Rotas ─────────────────────────────────────────────────────────────
  const topRotas = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach(v => {
      const orig = (v.descOrigem ?? "?").slice(0, 20);
      const dest = (v.descDestino ?? "?").slice(0, 20);
      const k = `${orig} → ${dest}`;
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([rota, qtd], i) => ({ rota, qtd, fill: colorFor(rota, i) }));
  }, [filtrados]);

  // ── Top Motoristas ────────────────────────────────────────────────────────
  const topMotoristas = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach(v => {
      const k = v.motorista ?? "Não informado";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([nome, qtd], i) => ({ nome, qtd, fill: colorFor(nome, i) }));
  }, [filtrados]);

  // ── Pontualidade por filial ───────────────────────────────────────────────
  const pontualFilial = useMemo(() => {
    const map = new Map<string, { pontual: number; atrasado: number }>();
    filtrados.forEach(v => {
      const k = v.filialDoc ?? "S/F";
      if (!map.has(k)) map.set(k, { pontual: 0, atrasado: 0 });
      const e = map.get(k)!;
      if (v.datSaiReal && v.datSaiOriginal) {
        if (v.temAtraso) e.atrasado++; else e.pontual++;
      }
    });
    return Array.from(map.entries())
      .filter(([, v]) => v.pontual + v.atrasado > 0)
      .map(([filial, v]) => {
        const total = v.pontual + v.atrasado;
        const pct   = total > 0 ? (v.pontual / total) * 100 : 0;
        return { filial, ...v, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [filtrados]);

  // ── Mapa SVG interno ──────────────────────────────────────────────────────
  // Usa lat/long para plotar pontos proporcionalmente no SVG (Brasil aproximado)
  const mapaDots = useMemo(() => {
    const comGps = filtrados.filter(v => v.latitude && v.longitude);
    if (!comGps.length) return [];
    const lats  = comGps.map(v => v.latitude!);
    const longs = comGps.map(v => v.longitude!);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...longs), maxLng = Math.max(...longs);
    const ranLat = maxLat - minLat || 1;
    const ranLng = maxLng - minLng || 1;
    return comGps.map(v => ({
      x:  ((v.longitude! - minLng) / ranLng) * 90 + 5,   // 5–95%
      y:  100 - ((v.latitude!  - minLat) / ranLat) * 90 - 5, // 5–95% invertido
      sit: v.descSituacao ?? "",
      vei: v.veiculo,
      mot: v.motorista ?? "",
      perc: v.percCompleto,
      manut: v.emManutencao,
    }));
  }, [filtrados]);

  const mapaDotColor = (d: typeof mapaDots[0]) => {
    if (d.manut) return RAW.accent.violet;
    const s = d.sit.toUpperCase();
    if (s.includes("ROTA") || s.includes("VIAGEM")) return RAW.accent.cyan;
    if (s.includes("ATRASO") || s.includes("ATRASADO")) return RAW.accent.rose;
    if (s.includes("AGUARD")) return RAW.accent.amber;
    if (s.includes("ENTREGUE") || s.includes("CONCLU")) return RAW.accent.emerald;
    return RAW.accent.cyan;
  };

  // ── Tabela ─────────────────────────────────────────────────────────────────
  const tabelaBuscada = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filtrados;
    return filtrados.filter(v =>
      v.veiculo.toLowerCase().includes(q) ||
      (v.motorista ?? "").toLowerCase().includes(q) ||
      v.rota.toLowerCase().includes(q) ||
      (v.codDoc ?? "").toLowerCase().includes(q)
    );
  }, [filtrados, search]);

  const handleSort = (col: keyof Viagem) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(false); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: keyof Viagem }) =>
    sortCol !== col
      ? <ChevronUp className="w-2.5 h-2.5 opacity-20" />
      : sortAsc ? <ChevronUp className="w-2.5 h-2.5 text-cyan-400" /> : <ChevronDown className="w-2.5 h-2.5 text-cyan-400" />;

  const tabelaOrdenada = useMemo(() => {
    return [...tabelaBuscada].sort((a, b) => {
      const va = a[sortCol] ?? "", vb = b[sortCol] ?? "";
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return sortAsc ? cmp : -cmp;
    });
  }, [tabelaBuscada, sortCol, sortAsc]);

  const totalPages   = Math.max(1, Math.ceil(tabelaOrdenada.length / PAGE_SIZE));
  const tabelaPagina = tabelaOrdenada.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── TONE_COLORS ─────────────────────────────────────────────────────────────
  const TC = {
    cyan:    { border: "border-cyan-400/20",    icon: "text-cyan-300",    bg: "bg-cyan-400/[0.08]",    glow: RAW.accent.cyan,    sub: "text-cyan-400"    },
    emerald: { border: "border-emerald-400/20", icon: "text-emerald-300", bg: "bg-emerald-400/[0.08]", glow: RAW.accent.emerald, sub: "text-emerald-400" },
    amber:   { border: "border-amber-400/20",   icon: "text-amber-300",   bg: "bg-amber-400/[0.08]",   glow: RAW.accent.amber,   sub: "text-amber-400"   },
    rose:    { border: "border-rose-400/20",    icon: "text-rose-300",    bg: "bg-rose-400/[0.08]",    glow: RAW.accent.rose,    sub: "text-rose-400"    },
    violet:  { border: "border-violet-400/20",  icon: "text-violet-300",  bg: "bg-violet-400/[0.08]",  glow: RAW.accent.violet,  sub: "text-violet-400"  },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col transition-all duration-300 min-h-[100dvh] overflow-auto px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* Gradientes de fundo — tom cyan */}
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(8,145,178,0.22),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_55%_40%_at_100%_110%,rgba(6,182,212,0.10),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:opacity-100" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.72) 100%)" }} />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-hidden"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          {/* Barra de progresso */}
          <div className="h-[3px] w-full shrink-0 overflow-hidden rounded-t-[24px] bg-transparent">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-400 shadow-[0_0_12px_rgba(8,145,178,0.5)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, opacity: loading ? 1 : 0 }}
            />
          </div>

          <div className="relative flex flex-col flex-1 min-h-0 gap-3 p-2 sm:p-3 lg:p-4 w-full overflow-auto">

            {/* ════ NAVBAR DESKTOP ════ */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              <div className="flex items-center gap-3">
                <img src={sgtLogo} alt="SGT" className="block h-8 w-auto shrink-0 object-contain" />
                <div className="h-6 w-px" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-400/70">Workspace</span>
                  <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">Operacional</span>
                </div>
              </div>

              {/* Badge LIVE pulsante */}
              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">LIVE</span>
              </div>

              {lastUpdate && (
                <span className="text-[10px] text-slate-500">
                  Atualizado às {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}

              <div className="h-6 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />
              <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
                <UpdateButton onClick={() => carregarDados(true)} isFetching={loading} loadingPhase={loadingPhase} progress={progress} cooldownOverride={cooldown} />
              </div>
              <HomeButton />
            </div>

            {/* Mobile nav */}
            <div className="flex sm:hidden items-center justify-between gap-2 py-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={sgtLogo} alt="SGT" className="block h-7 w-auto shrink-0 object-contain" />
                <div className="h-5 w-px shrink-0" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-400/70">Workspace</span>
                  <span className="text-[15px] font-black tracking-[-0.03em] dark:text-white text-slate-800 truncate">Operacional</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <UpdateButton onClick={() => carregarDados(true)} isFetching={loading} loadingPhase={loadingPhase} progress={progress} compact cooldownOverride={cooldown} />
                <HomeButton />
                <MobileNav />
              </div>
            </div>

            <div className="h-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-[12px] text-rose-200">
                <strong>Erro:</strong> {error}
              </div>
            )}
            {loading && loadingPhase && (
              <div className="flex items-center gap-2 text-[11px] text-cyan-300/80">
                <div className="h-1 w-32 overflow-hidden rounded-full bg-cyan-400/10">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-200 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <span>{loadingPhase}</span>
              </div>
            )}

            {/* ════ FILTROS ════ */}
            <AnimatedCard delay={60}>
              <div className="flex flex-wrap items-center gap-2 rounded-[14px] border px-3 py-2" style={{ background: RAW.surfaceInset, borderColor: RAW.borderDefault }}>
                <Filter className="w-3.5 h-3.5 text-cyan-400/60 shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500 shrink-0">Filtros</span>
                <div className="h-4 w-px bg-white/[0.07] shrink-0" />

                <Select value={filtroSituacao} onValueChange={v => { setFiltroSituacao(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[90px] max-w-[150px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-cyan-500/30 focus:outline-none">
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent>{situacoes.map(s => <SelectItem key={s} value={s}>{s === "Todos" ? "Situação" : s}</SelectItem>)}</SelectContent>
                </Select>

                <Select value={filtroMotorista} onValueChange={v => { setFiltroMotorista(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[100px] max-w-[180px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-cyan-500/30 focus:outline-none">
                    <SelectValue placeholder="Motorista" />
                  </SelectTrigger>
                  <SelectContent>{motoristas.map(m => <SelectItem key={m} value={m}>{m === "Todos" ? "Motorista" : m}</SelectItem>)}</SelectContent>
                </Select>

                <Select value={filtroClassi} onValueChange={v => { setFiltroClassi(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[90px] max-w-[140px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-cyan-500/30 focus:outline-none">
                    <SelectValue placeholder="Classif." />
                  </SelectTrigger>
                  <SelectContent>{classificacoes.map(c => <SelectItem key={c} value={c}>{c === "Todos" ? "Classificação" : c}</SelectItem>)}</SelectContent>
                </Select>

                <Select value={filtroManut} onValueChange={v => { setFiltroManut(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[90px] max-w-[130px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-cyan-500/30 focus:outline-none">
                    <SelectValue placeholder="Manutenção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Manutenção</SelectItem>
                    <SelectItem value="Sim">Em manutenção</SelectItem>
                    <SelectItem value="Não">Sem manutenção</SelectItem>
                  </SelectContent>
                </Select>

                {(filtroSituacao !== "Todos" || filtroMotorista !== "Todos" || filtroClassi !== "Todos" || filtroManut !== "Todos") && (
                  <button
                    onClick={() => { setFiltroSituacao("Todos"); setFiltroMotorista("Todos"); setFiltroClassi("Todos"); setFiltroManut("Todos"); setPage(1); }}
                    className="flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-500/[0.08] px-2.5 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-400/12 transition-all"
                  >
                    <X className="w-2.5 h-2.5" /> Limpar
                  </button>
                )}
                <div className="ml-auto text-[10px] text-slate-500">{fmtNum(filtrados.length)} registros</div>
              </div>
            </AnimatedCard>

            {/* ════════════════════════════════════════════════════════
                SEÇÃO 1 — INDICADORES OPERACIONAIS
            ════════════════════════════════════════════════════════ */}
            <div className="flex items-center gap-2 mt-1">
              <Radio className="w-3 h-3 text-cyan-400/60" />
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Indicadores Operacionais</span>
              <div className="flex-1 h-px" style={{ background: RAW.borderDefault }} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {[
                { label: "Viagens em Andamento", value: loading ? "—" : fmtNum(kpis.emAndamento), sub: "0% < PERC < 100%",       Icon: Navigation, tone: "cyan"    as const, delay: 80  },
                { label: "Veículos em Rota",      value: loading ? "—" : fmtNum(kpis.emRota),      sub: "Fora de manutenção",     Icon: Truck,      tone: "emerald" as const, delay: 120 },
                { label: "Em Manutenção",          value: loading ? "—" : fmtNum(kpis.emManutencao),sub: "EM_MANUTENCAO = S",      Icon: Wrench,     tone: "amber"   as const, delay: 160 },
                { label: "Com Atraso na Saída",    value: loading ? "—" : fmtNum(kpis.comAtraso),  sub: "SAIDA_REAL > ORIGINAL",  Icon: AlertCircle,tone: "rose"    as const, delay: 200 },
                { label: "Conclusão Média",        value: loading ? "—" : fmtPct(kpis.avgPerc),    sub: "AVG(PERC_COMPLETO)",     Icon: TrendingUp, tone: "violet"  as const, delay: 240 },
              ].map(({ label, value, sub, Icon, tone, delay }) => {
                const t = TC[tone];
                return (
                  <AnimatedCard key={label} delay={delay}>
                    <div className={`relative overflow-hidden rounded-[18px] border p-3.5 transition-all duration-300 hover:border-white/[0.11] ${t.border}`} style={{ background: RAW.surfacePrimary }}>
                      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[${t.glow}]/50 to-transparent`} />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-1">{label}</p>
                          <p className={`text-[22px] font-black leading-none tracking-tight dark:text-white ${loading ? "animate-pulse" : ""}`}>{value}</p>
                          <p className={`text-[10px] font-medium mt-1.5 ${t.sub}`}>{sub}</p>
                        </div>
                        <div className={`shrink-0 rounded-xl p-2 ${t.bg} border ${t.border}`}>
                          <Icon className={`w-4 h-4 ${t.icon}`} />
                        </div>
                      </div>
                      <div className="pointer-events-none absolute inset-0 rounded-[18px]" style={{ background: `radial-gradient(circle at 100% 100%, ${t.glow}1a, transparent 65%)` }} />
                    </div>
                  </AnimatedCard>
                );
              })}
            </div>

            {/* ════════════════════════════════════════════════════════
                SEÇÃO 2 — ANÁLISE OPERACIONAL
            ════════════════════════════════════════════════════════ */}
            <div className="flex items-center gap-2 mt-1">
              <BarChart3 className="w-3 h-3 text-cyan-400/60" />
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Análise Operacional</span>
              <div className="flex-1 h-px" style={{ background: RAW.borderDefault }} />
            </div>

            {/* Row 1: Mapa SVG + Situação + Classificação */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">

              {/* Mapa de posições */}
              <AnimatedCard delay={300} className="lg:col-span-2">
                <div className="rounded-[18px] border p-3" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Posições em Tempo Real</span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px]">
                      {[
                        { label: "Em rota",    color: RAW.accent.cyan    },
                        { label: "Aguardando", color: RAW.accent.amber   },
                        { label: "Atrasado",   color: RAW.accent.rose    },
                        { label: "Manutenção", color: RAW.accent.violet  },
                      ].map(l => (
                        <span key={l.label} className="flex items-center gap-1" style={{ color: l.color }}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
                          {l.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* SVG Mapa */}
                  <div
                    className="relative rounded-[12px] overflow-hidden"
                    style={{ height: 200, background: "#060d1a", border: `0.5px solid ${RAW.borderDefault}` }}
                  >
                    {/* Grid de fundo */}
                    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
                      <defs>
                        <pattern id="mapgrid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(6,182,212,0.06)" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#mapgrid)" />
                    </svg>

                    {/* Dots dos veículos */}
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-600">Carregando posições...</div>
                    ) : mapaDots.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-600">
                        Sem coordenadas GPS disponíveis
                      </div>
                    ) : (
                      mapaDots.map((d, i) => (
                        <div
                          key={i}
                          className="absolute group"
                          style={{ left: `${d.x}%`, top: `${d.y}%`, transform: "translate(-50%,-50%)" }}
                          title={`${d.vei} — ${d.mot} (${d.perc}%)`}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full border border-white/40 cursor-pointer transition-transform hover:scale-150"
                            style={{ background: mapaDotColor(d), boxShadow: `0 0 5px ${mapaDotColor(d)}` }}
                          />
                          {/* Tooltip hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                            <div className="rounded-md border border-white/10 bg-slate-950/95 px-2 py-1 text-[9px] text-slate-200 whitespace-nowrap shadow-xl">
                              <div className="font-mono font-bold" style={{ color: mapaDotColor(d) }}>{d.vei}</div>
                              <div className="text-slate-400">{d.mot}</div>
                              <div className="text-slate-400">{d.perc}% concluído</div>
                            </div>
                            <div className="w-1.5 h-1.5 rotate-45 border-r border-b border-white/10 bg-slate-950 -mt-0.5" />
                          </div>
                        </div>
                      ))
                    )}

                    {/* Contador canto */}
                    <div className="absolute top-2 left-2 text-[9px] font-semibold text-cyan-400/70">
                      {mapaDots.length} veículos com GPS
                    </div>
                    <div className="absolute bottom-2 right-2 text-[8px] text-slate-600">VEI_LATITU · VEI_LONGIT</div>
                  </div>
                </div>
              </AnimatedCard>

              {/* Situação das Viagens + Veículos */}
              <AnimatedCard delay={320}>
                <div className="rounded-[18px] border p-3 h-full flex flex-col gap-3" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Situação das Viagens</span>
                    </div>
                    {distSituacao.length === 0
                      ? <div className="text-[11px] text-slate-600">{loading ? "Carregando..." : "Sem dados"}</div>
                      : <div className="space-y-1.5">
                          {distSituacao.map(r => {
                            const total = distSituacao.reduce((s, x) => s + x.qtd, 0);
                            return (
                              <div key={r.nome} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.fill }} />
                                <span className="text-[10px] text-slate-300 flex-1 truncate">{r.nome}</span>
                                <span className="text-[9px] text-slate-500">{total > 0 ? `${((r.qtd / total) * 100).toFixed(0)}%` : ""}</span>
                                <span className="text-[10px] font-bold w-7 text-right" style={{ color: r.fill }}>{r.qtd}</span>
                              </div>
                            );
                          })}
                        </div>
                    }
                  </div>

                  <div className="border-t pt-2.5" style={{ borderColor: RAW.borderDefault }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Classificação Veículo</span>
                    </div>
                    <div className="space-y-1.5">
                      {distClassi.slice(0, 4).map(r => {
                        const total = distClassi.reduce((s, x) => s + x.qtd, 0);
                        return (
                          <div key={r.nome} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.fill }} />
                            <span className="text-[10px] text-slate-300 flex-1 truncate">{r.nome}</span>
                            <span className="text-[10px] font-bold" style={{ color: r.fill }}>{r.qtd}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            </div>

            {/* Row 2: Top Rotas + Top Motoristas + Alertas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">

              {/* Top Rotas */}
              <AnimatedCard delay={360}>
                <div className="rounded-[18px] border p-3" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Top Rotas</span>
                    <span className="ml-auto text-[8px] text-slate-600 uppercase tracking-[0.15em]">Origem → Destino</span>
                  </div>
                  {topRotas.length === 0
                    ? <div className="flex h-16 items-center justify-center text-[11px] text-slate-600">{loading ? "Carregando..." : "Sem dados"}</div>
                    : <div className="space-y-1.5">
                        {topRotas.map((r, i) => {
                          const max = topRotas[0].qtd;
                          return (
                            <div key={r.rota} className="flex items-center gap-2">
                              <span className="w-4 text-[9px] font-bold text-slate-600 shrink-0 text-right">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[9px] text-slate-300 truncate">{r.rota}</span>
                                  <span className="text-[10px] font-bold shrink-0 ml-2" style={{ color: r.fill }}>{r.qtd}</span>
                                </div>
                                <div className="h-1 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                                  <div className="h-full rounded-full" style={{ width: `${(r.qtd / max) * 100}%`, background: r.fill, opacity: 0.85 }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                  }
                </div>
              </AnimatedCard>

              {/* Top Motoristas */}
              <AnimatedCard delay={390}>
                <div className="rounded-[18px] border p-3" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Motoristas em Rota</span>
                    <span className="ml-auto text-[8px] text-slate-600 uppercase tracking-[0.15em]">Top 8</span>
                  </div>
                  {topMotoristas.length === 0
                    ? <div className="flex h-16 items-center justify-center text-[11px] text-slate-600">{loading ? "Carregando..." : "Sem dados"}</div>
                    : <div className="space-y-1.5">
                        {topMotoristas.map((r, i) => {
                          const max = topMotoristas[0].qtd;
                          return (
                            <div key={r.nome} className="flex items-center gap-2">
                              <span className="w-4 text-[9px] font-bold text-slate-600 shrink-0 text-right">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[10px] text-slate-300 truncate">{r.nome}</span>
                                  <span className="text-[10px] font-bold shrink-0 ml-2" style={{ color: r.fill }}>{r.qtd}</span>
                                </div>
                                <div className="h-1 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                                  <div className="h-full rounded-full" style={{ width: `${(r.qtd / max) * 100}%`, background: r.fill, opacity: 0.85 }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                  }
                </div>
              </AnimatedCard>

              {/* Alertas Operacionais */}
              <AnimatedCard delay={420}>
                <div className="rounded-[18px] border p-3" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Alertas Operacionais</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: "Saída com atraso",        count: alertas.atrasados,        cls: "bg-rose-500/10 border-rose-500/20",   dot: RAW.accent.rose,    txtCls: "text-rose-300",   pulse: true  },
                      { label: "Em manutenção",            count: alertas.emManutencao,     cls: "bg-violet-500/10 border-violet-500/20",dot: RAW.accent.violet,  txtCls: "text-violet-300", pulse: true  },
                      { label: "Previsão ultrapassada",    count: alertas.prevUltrapassada, cls: "bg-amber-500/10 border-amber-500/20",  dot: RAW.accent.amber,   txtCls: "text-amber-300",  pulse: alertas.prevUltrapassada > 0 },
                      { label: "Itens divergentes",        count: alertas.itensDiverg,      cls: "bg-amber-500/10 border-amber-500/20",  dot: "#f59e0b",          txtCls: "text-yellow-300", pulse: false },
                      { label: "Sem GPS / referência",     count: alertas.semGps,           cls: "bg-cyan-500/10 border-cyan-500/20",    dot: RAW.accent.cyan,    txtCls: "text-cyan-300",   pulse: false },
                    ].map(({ label, count, cls, dot, txtCls, pulse }) => (
                      <div key={label} className={`flex items-center gap-2 rounded-[10px] border px-2.5 py-1.5 ${cls}`}>
                        <span className="relative flex w-1.5 h-1.5 shrink-0">
                          {pulse && count > 0 && <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: dot }} />}
                          <span className="relative inline-flex w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                        </span>
                        <span className="text-[10px] text-slate-400 flex-1">{label}</span>
                        <span className={`text-[13px] font-black ${txtCls}`}>{loading ? "—" : count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedCard>
            </div>

            {/* Pontualidade por Filial */}
            {pontualFilial.length > 0 && (
              <AnimatedCard delay={450}>
                <div className="rounded-[18px] border p-3" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Pontualidade de Saída por Filial</span>
                    <span className="ml-auto text-[8px] text-slate-600 uppercase tracking-[0.15em]">SAIDA_REAL vs SAIDA_ORIGINAL</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {pontualFilial.map(r => {
                      const cor = r.pct >= 80 ? RAW.accent.emerald : r.pct >= 60 ? RAW.accent.amber : RAW.accent.rose;
                      return (
                        <div key={r.filial} className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-200">{r.filial}</span>
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span style={{ color: RAW.accent.emerald }}>+{r.pontual}</span>
                            <span style={{ color: RAW.accent.rose }}>−{r.atrasado}</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${r.pct}%`, background: cor }} />
                          </div>
                          <span className="text-[13px] font-black" style={{ color: cor }}>{fmtPct(r.pct)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </AnimatedCard>
            )}

            {/* ════════════════════════════════════════════════════════
                SEÇÃO 3 — DETALHAMENTO DE VIAGENS
            ════════════════════════════════════════════════════════ */}
            <div className="flex items-center gap-2 mt-1">
              <FileText className="w-3 h-3 text-cyan-400/60" />
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Detalhamento de Viagens</span>
              <div className="flex-1 h-px" style={{ background: RAW.borderDefault }} />
            </div>

            <AnimatedCard delay={500}>
              <div className="rounded-[18px] border" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>

                <div className="flex flex-wrap items-center gap-2 px-3 pt-3 pb-2 border-b" style={{ borderColor: RAW.borderDefault }}>
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Viagens em Andamento</span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/[0.07] px-2 py-0.5 text-[9px] font-semibold text-cyan-300">
                    {fmtNum(tabelaBuscada.length)} registros
                  </span>
                  <div className="ml-auto relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPage(1); }}
                      placeholder="Buscar veículo, motorista, rota..."
                      className="h-7 rounded-xl border border-white/[0.08] bg-white/[0.04] pl-6 pr-3 text-[11px] text-slate-300 placeholder-slate-600 focus:border-cyan-500/30 focus:outline-none transition-all w-[210px]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${RAW.borderDefault}`, background: RAW.surfaceInset }}>
                        {([
                          { key: "veiculo",       label: "Veículo",       align: "left",   resp: "" },
                          { key: "motorista",     label: "Motorista",     align: "left",   resp: "hidden md:table-cell" },
                          { key: "rota",          label: "Origem → Destino", align: "left", resp: "hidden sm:table-cell" },
                          { key: "datSaiOriginal",label: "Saída Prev.",   align: "center", resp: "hidden lg:table-cell" },
                          { key: "datSaiReal",    label: "Saída Real",    align: "center", resp: "hidden lg:table-cell" },
                          { key: "percCompleto",  label: "% Concluído",   align: "left",   resp: "" },
                          { key: "prevChegada",   label: "Prev. Chegada", align: "center", resp: "hidden xl:table-cell" },
                          { key: "descSituacao",  label: "Situação",      align: "center", resp: "" },
                          { key: "emManutencao",  label: "Manut.",        align: "center", resp: "hidden md:table-cell" },
                        ] as { key: keyof Viagem; label: string; align: string; resp: string }[]).map(c => (
                          <th
                            key={c.key}
                            onClick={() => handleSort(c.key)}
                            className={`px-3 py-2 cursor-pointer select-none text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500 hover:text-slate-300 transition-colors ${c.resp}`}
                            style={{ textAlign: c.align as any }}
                          >
                            <span className="inline-flex items-center gap-0.5">{c.label}<SortIcon col={c.key} /></span>
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
                        <tr><td colSpan={9} className="py-8 text-center text-[12px] text-slate-600">Nenhum registro encontrado</td></tr>
                      ) : (
                        tabelaPagina.map((v, i) => {
                          const sit    = getSituacStyle(v.descSituacao);
                          const atMin  = v.minAtrasoSaida;
                          const chegMin = v.minParaChegar;
                          const progCor = v.emManutencao ? RAW.accent.violet : v.percCompleto >= 80 ? RAW.accent.cyan : v.percCompleto >= 40 ? RAW.accent.emerald : RAW.accent.amber;
                          return (
                            <tr key={`${v.id}-${i}`} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${RAW.borderDefault}` }}>
                              {/* Veículo */}
                              <td className="px-3 py-2.5">
                                <div>
                                  <span className="font-mono text-[11px] font-semibold text-cyan-300">{v.veiculo}</span>
                                  {v.veiculo2 && <span className="text-[9px] text-slate-600 block">+{v.veiculo2}</span>}
                                </div>
                              </td>
                              {/* Motorista */}
                              <td className="px-3 py-2.5 hidden md:table-cell">
                                <span className="text-[10px] text-slate-300 truncate max-w-[130px] block">{v.motorista ?? "—"}</span>
                              </td>
                              {/* Rota */}
                              <td className="px-3 py-2.5 hidden sm:table-cell">
                                <span className="text-[10px] text-slate-400 block max-w-[200px] truncate">{v.rota}</span>
                              </td>
                              {/* Saída Prev */}
                              <td className="px-3 py-2.5 hidden lg:table-cell text-center">
                                <span className="text-[10px] text-slate-400">{fmtHora(v.datSaiOriginal)}</span>
                              </td>
                              {/* Saída Real */}
                              <td className="px-3 py-2.5 hidden lg:table-cell text-center">
                                {v.datSaiReal
                                  ? <div className="inline-flex flex-col items-center">
                                      <span className={`text-[10px] font-medium ${v.temAtraso ? "text-rose-300" : "text-emerald-300"}`}>{fmtHora(v.datSaiReal)}</span>
                                      {atMin !== null && atMin !== 0 && (
                                        <span className={`text-[8px] font-bold ${atMin > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                          {atMin > 0 ? `+${atMin}min` : `${atMin}min`}
                                        </span>
                                      )}
                                    </div>
                                  : <span className="text-[10px] text-slate-600">—</span>
                                }
                              </td>
                              {/* % Concluído */}
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2 min-w-[80px]">
                                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${v.percCompleto}%`, background: progCor }} />
                                  </div>
                                  <span className="text-[10px] font-bold shrink-0 w-7 text-right" style={{ color: progCor }}>{v.percCompleto}%</span>
                                </div>
                              </td>
                              {/* Prev Chegada */}
                              <td className="px-3 py-2.5 hidden xl:table-cell text-center">
                                {v.prevChegada
                                  ? <div className="inline-flex flex-col items-center">
                                      <span className="text-[10px] text-slate-400">{fmtHora(v.prevChegada)}</span>
                                      {chegMin !== null && (
                                        <span className={`text-[8px] font-bold ${chegMin < 0 ? "text-rose-400" : chegMin < 60 ? "text-amber-400" : "text-slate-500"}`}>
                                          {chegMin < 0 ? `${Math.abs(chegMin)}min atrás` : chegMin < 60 ? `${chegMin}min` : `${Math.floor(chegMin / 60)}h`}
                                        </span>
                                      )}
                                    </div>
                                  : <span className="text-[10px] text-slate-600">—</span>
                                }
                              </td>
                              {/* Situação */}
                              <td className="px-3 py-2.5 text-center">
                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] ring-1 ${sit.bg} ${sit.text} ${sit.ring}`}>
                                  {v.descSituacao ?? "—"}
                                </span>
                              </td>
                              {/* Manutenção */}
                              <td className="px-3 py-2.5 hidden md:table-cell text-center">
                                {v.emManutencao
                                  ? <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-bold text-violet-300 ring-1 ring-violet-500/30">SIM</span>
                                  : <span className="text-[10px] text-slate-600">—</span>
                                }
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
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] text-slate-400 transition-all hover:border-cyan-400/30 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let p: number;
                        if (totalPages <= 5) p = i + 1;
                        else if (page <= 3) p = i + 1;
                        else if (page >= totalPages - 2) p = totalPages - 4 + i;
                        else p = page - 2 + i;
                        return (
                          <button key={p} onClick={() => setPage(p)} className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-semibold transition-all ${page === p ? "border border-cyan-400/40 bg-cyan-500/[0.15] text-cyan-300" : "border border-white/[0.06] text-slate-500 hover:border-cyan-400/20 hover:text-cyan-300"}`}>
                            {p}
                          </button>
                        );
                      })}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] text-slate-400 transition-all hover:border-cyan-400/30 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedCard>

          </div>
        </section>
      </div>
    </div>
  );
}
