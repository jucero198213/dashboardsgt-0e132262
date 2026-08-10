import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Radio, Search, AlertTriangle, ChevronUp, ChevronDown,
  X, ChevronLeft, ChevronRight, Filter, FileText,
  Activity, MapPin, Truck, Wrench, Clock, TrendingUp,
  Navigation, Users, BarChart3, Zap, AlertCircle,
  CheckCircle2, RefreshCw, LayoutGrid, Table2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as ReTooltip, CartesianGrid,
} from "recharts";
import sgtLogo from "@/assets/sgt-logo.png";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { KpiCard } from "@/components/indicators/KpiCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { UpdateButton } from "@/components/shared/UpdateButton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCooldown } from "@/hooks/useCooldown";
import { fetchOperacional, type OperacionalRow } from "@/lib/dwApi";
import { RAW } from "@/lib/theme";
import { InsightsSection } from "@/components/shared/InsightsSection";
import { VeiculosMap } from "@/components/operacional/VeiculosMap";
import { ViagensDialog } from "@/components/operacional/ViagensDialog";
import { GooeyInput } from "@/components/ui/gooey-input";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtNum = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${v.toFixed(0)}%`;

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
  "#fbbf24", "#f59e0b", "#fcd34d",
  "#d97706", "#fde68a", "#b45309", "#94a3b8",
];
const colorFor = (_: string, i: number) => PALETTE[i % PALETTE.length];

// ─── Situação → estilo ────────────────────────────────────────────────────────
const SITUAC_STYLE: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  EM_ROTA: { bg: "bg-cyan-500/10", text: "text-cyan-300", ring: "ring-cyan-500/30", label: "Em rota" },
  ENTREGUE: { bg: "bg-emerald-500/10", text: "text-emerald-300", ring: "ring-emerald-500/30", label: "Entregue" },
  AGUARDANDO: { bg: "bg-amber-500/10", text: "text-amber-300", ring: "ring-amber-500/30", label: "Aguardando" },
  ATRASADO: { bg: "bg-rose-500/10", text: "text-rose-300", ring: "ring-rose-500/30", label: "Atrasado" },
  MANUTENCAO: { bg: "bg-violet-500/10", text: "text-violet-300", ring: "ring-violet-500/30", label: "Manutenção" },
  CANCELADO: { bg: "bg-slate-500/10", text: "text-slate-400", ring: "ring-slate-500/20", label: "Cancelado" },
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
  id: string;
  veiculo: string;
  veiculo2: string | null;
  veiculo3: string | null;
  motorista: string | null;
  latitude: number | null;
  longitude: number | null;
  referencia: string | null;
  tipoDoc: string | null;
  codDoc: string | null;
  filialDoc: string | null;
  remetente: string | null;
  destinatario: string | null;
  datSaiOriginal: string | null;
  datSaiReal: string | null;
  percCompleto: number;
  prevChegada: string | null;
  situacaoViagem: string | null;
  descSituacao: string | null;
  descOrigem: string | null;
  descDestino: string | null;
  latRemetente: number | null;
  longRemetente: number | null;
  latDestinatario: number | null;
  longDestinatario: number | null;
  totalItens: number;
  itensReal: number;
  classiVei: string | null;
  situacVei: string | null;
  emManutencao: boolean;
  // calculados
  minAtrasoSaida: number | null;
  minParaChegar: number | null;
  temAtraso: boolean;
  prevUltrapassada: boolean;
  itensDivergentes: boolean;
  semGps: boolean;
  rota: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Operacional() {
  const cooldown = useCooldown("dw_operacional_fetch_ts");

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [dados, setDados] = useState<OperacionalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Filtros locais
  const [filtroSituacao, setFiltroSituacao] = useState("Todos");
  const [filtroMotorista, setFiltroMotorista] = useState("Todos");
  const [filtroClassi, setFiltroClassi] = useState("Todos");
  const [filtroManut, setFiltroManut] = useState("Todos");
  const [search, setSearch] = useState("");

  // Tabela
  const [sortCol, setSortCol] = useState<keyof Viagem>("percCompleto");
  const [sortAsc, setSortAsc] = useState(false);
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);

  // Dialog de detalhamento dos KPIs
  const [kpiDialog, setKpiDialog] = useState<null | "andamento" | "rota" | "manutencao" | "atraso">(null);
  // View da seção "Viagens em Andamento" — padrão Bancos (Cards / Tabela)
  const [viagensView, setViagensView] = useState<"cards" | "tabela" | "analytics">("cards");

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
      const atraso = minAtraso(d.data_saida_original, d.data_saida_real);
      const paraCh = minPrevisao(d.previsao_chegada);
      const perc = d.percentual_completo ?? 0;
      const totalIt = d.total_itens ?? 0;
      const realIt = d.itens_real ?? 0;
      const manut = String(d.em_manutencao ?? "").toUpperCase() === "S";
      const semGps = !d.latitude && !d.longitude;
      const orig = d.descricao_origem ?? d.remetente ?? "—";
      const dest = d.descricao_destino ?? d.destinatario ?? "—";
      const origCurta = orig.length > 18 ? orig.slice(0, 18) + "…" : orig;
      const destCurta = dest.length > 18 ? dest.slice(0, 18) + "…" : dest;
      return {
        id: String(d.ID ?? ""),
        veiculo: String(d.veiculo ?? "—"),
        veiculo2: d.veiculo2 ? String(d.veiculo2) : null,
        veiculo3: d.veiculo3 ? String(d.veiculo3) : null,
        motorista: d.motorista,
        latitude: d.latitude ? Number(d.latitude) : null,
        longitude: d.longitude ? Number(d.longitude) : null,
        referencia: d.referencia,
        tipoDoc: d.tipo_documento,
        codDoc: d.codigo_documento ? String(d.codigo_documento) : null,
        filialDoc: d.filial_documento ? String(d.filial_documento) : null,
        remetente: d.remetente,
        destinatario: d.destinatario,
        datSaiOriginal: d.data_saida_original,
        datSaiReal: d.data_saida_real,
        percCompleto: perc,
        prevChegada: d.previsao_chegada,
        situacaoViagem: d.situacao_viagem,
        descSituacao: d.descricao_situacao,
        descOrigem: orig,
        descDestino: dest,
        latRemetente: d.latitude_remetente ? Number(d.latitude_remetente) : null,
        longRemetente: d.longitude_remetente ? Number(d.longitude_remetente) : null,
        latDestinatario: d.latitude_destinatario ? Number(d.latitude_destinatario) : null,
        longDestinatario: d.longitude_destinatario ? Number(d.longitude_destinatario) : null,
        totalItens: totalIt,
        itensReal: realIt,
        classiVei: d.classificacao_veiculo,
        situacVei: d.situacao_veiculo,
        emManutencao: manut,
        minAtrasoSaida: atraso,
        minParaChegar: paraCh,
        temAtraso: atraso !== null && atraso > 0,
        prevUltrapassada: paraCh !== null && paraCh < 0 && perc < 100,
        itensDivergentes: totalIt > 0 && realIt > 0 && realIt !== totalIt,
        semGps: semGps,
        rota: `${origCurta} → ${destCurta}`,
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
      if (filtroSituacao !== "Todos" && v.descSituacao !== filtroSituacao) return false;
      if (filtroMotorista !== "Todos" && v.motorista !== filtroMotorista) return false;
      if (filtroClassi !== "Todos" && v.classiVei !== filtroClassi) return false;
      if (filtroManut === "Sim" && !v.emManutencao) return false;
      if (filtroManut === "Não" && v.emManutencao) return false;
      return true;
    });
  }, [viagens, filtroSituacao, filtroMotorista, filtroClassi, filtroManut]);

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const emAndamento = filtrados.filter(v => v.percCompleto > 0 && v.percCompleto < 100 && !v.emManutencao);
    const emRota = filtrados.filter(v => !v.emManutencao && v.percCompleto < 100);
    const emManutencao = filtrados.filter(v => v.emManutencao);
    const comAtraso = filtrados.filter(v => v.temAtraso);
    const avgPerc = filtrados.length > 0
      ? filtrados.reduce((s, v) => s + v.percCompleto, 0) / filtrados.length : 0;
    return { emAndamento: emAndamento.length, emRota: emRota.length, emManutencao: emManutencao.length, comAtraso: comAtraso.length, avgPerc };
  }, [filtrados]);

  // ── Alertas ───────────────────────────────────────────────────────────────
  const alertas = useMemo(() => ({
    atrasados: filtrados.filter(v => v.temAtraso).length,
    emManutencao: filtrados.filter(v => v.emManutencao).length,
    prevUltrapassada: filtrados.filter(v => v.prevUltrapassada).length,
    itensDiverg: filtrados.filter(v => v.itensDivergentes).length,
    semGps: filtrados.filter(v => v.semGps && !v.emManutencao).length,
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
        const pct = total > 0 ? (v.pontual / total) * 100 : 0;
        return { filial, ...v, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [filtrados]);

  // ── Mapa SVG interno ──────────────────────────────────────────────────────
  // Usa lat/long para plotar pontos proporcionalmente no SVG (Brasil aproximado)
  const mapaDots = useMemo(() => {
    const comGps = filtrados.filter(v => v.latitude && v.longitude);
    if (!comGps.length) return [];
    const lats = comGps.map(v => v.latitude!);
    const longs = comGps.map(v => v.longitude!);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...longs), maxLng = Math.max(...longs);
    const ranLat = maxLat - minLat || 1;
    const ranLng = maxLng - minLng || 1;
    return comGps.map(v => ({
      x: ((v.longitude! - minLng) / ranLng) * 90 + 5,   // 5–95%
      y: 100 - ((v.latitude! - minLat) / ranLat) * 90 - 5, // 5–95% invertido
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

  const SortIcon = ({ col }: { col: keyof Viagem }) => {
    if (sortCol !== col) return <ChevronUp className="w-2.5 h-2.5 opacity-20" />;
    if (sortAsc) return <ChevronUp className="w-2.5 h-2.5 text-cyan-400" />;
    return <ChevronDown className="w-2.5 h-2.5 text-cyan-400" />;
  };

  const tabelaOrdenada = useMemo(() => {
    return [...tabelaBuscada].sort((a, b) => {
      const va = a[sortCol] ?? "", vb = b[sortCol] ?? "";
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return sortAsc ? cmp : -cmp;
    });
  }, [tabelaBuscada, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(tabelaOrdenada.length / PAGE_SIZE));
  const tabelaPagina = tabelaOrdenada.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Analytics da seção (deriva de tabelaBuscada → respeita a busca) ──────────
  const viagensAnalytics = useMemo(() => {
    const base = tabelaBuscada;
    const n = base.length;

    const sitMap = new Map<string, number>();
    base.forEach(v => { const k = v.descSituacao ?? "Não informado"; sitMap.set(k, (sitMap.get(k) ?? 0) + 1); });
    const porSituacao = [...sitMap.entries()].sort((a, b) => b[1] - a[1]);

    const rotaMap = new Map<string, number>();
    base.forEach(v => { const k = v.rota || "—"; rotaMap.set(k, (rotaMap.get(k) ?? 0) + 1); });
    const topRotas = [...rotaMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    const motMap = new Map<string, number>();
    base.forEach(v => { const k = v.motorista ?? "Não informado"; motMap.set(k, (motMap.get(k) ?? 0) + 1); });
    const topMotoristas = [...motMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    const faixasDef = [
      { label: "Não iniciada", min: 0, max: 0, cor: RAW.accent.rose },
      { label: "1–39%", min: 1, max: 39, cor: RAW.accent.amber },
      { label: "40–79%", min: 40, max: 79, cor: RAW.accent.emerald },
      { label: "80–99%", min: 80, max: 99, cor: RAW.accent.cyan },
      { label: "Concluída", min: 100, max: 100, cor: RAW.accent.violet },
    ];
    const faixas = faixasDef.map(f => ({ ...f, qtd: base.filter(v => v.percCompleto >= f.min && v.percCompleto <= f.max).length }));

    const comSaida = base.filter(v => v.datSaiReal && v.datSaiOriginal);
    const atrasadas = comSaida.filter(v => v.temAtraso).length;
    const pontuais = comSaida.length - atrasadas;
    const pctPontual = comSaida.length > 0 ? (pontuais / comSaida.length) * 100 : 0;
    const atrasos = comSaida.filter(v => v.temAtraso && v.minAtrasoSaida != null).map(v => v.minAtrasoSaida!);
    const mediaAtraso = atrasos.length > 0 ? Math.round(atrasos.reduce((s, a) => s + a, 0) / atrasos.length) : 0;
    const emManut = base.filter(v => v.emManutencao).length;

    return { n, porSituacao, topRotas, topMotoristas, faixas, pontuais, atrasadas, pctPontual, mediaAtraso, emManut };
  }, [tabelaBuscada]);

  // ── TONE_COLORS → migrado para KPI_STYLE (padrão SGT, nível de módulo) ────────

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

          <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 overflow-hidden w-full">

            {/* ════ NAVBAR DESKTOP ════ */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              {/* Logo + título */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-400/70">Workspace</span>
                  <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">Operacional</span>
                </div>
              </div>

              {/* Badge LIVE */}
              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Tempo real</span>
              </div>

              <div className="h-5 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

              {/* Filtros inline na navbar */}
              <div className="flex flex-1 items-center gap-1.5 min-w-0 overflow-hidden">
                <Filter className="w-3 h-3 text-cyan-400/50 shrink-0" />

                <Select value={filtroSituacao} onValueChange={v => { setFiltroSituacao(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[90px] max-w-[140px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[12px] text-slate-300 focus:border-cyan-500/30 focus:outline-none">
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent>{situacoes.map(s => <SelectItem key={s} value={s}>{s === "Todos" ? "Situação" : s}</SelectItem>)}</SelectContent>
                </Select>

                <Select value={filtroMotorista} onValueChange={v => { setFiltroMotorista(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[90px] max-w-[160px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[12px] text-slate-300 focus:border-cyan-500/30 focus:outline-none">
                    <SelectValue placeholder="Motorista" />
                  </SelectTrigger>
                  <SelectContent>{motoristas.map(m => <SelectItem key={m} value={m}>{m === "Todos" ? "Motorista" : m}</SelectItem>)}</SelectContent>
                </Select>

                <Select value={filtroClassi} onValueChange={v => { setFiltroClassi(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[80px] max-w-[140px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[12px] text-slate-300 focus:border-cyan-500/30 focus:outline-none">
                    <SelectValue placeholder="Classif." />
                  </SelectTrigger>
                  <SelectContent>{classificacoes.map(c => <SelectItem key={c} value={c}>{c === "Todos" ? "Classificação" : c}</SelectItem>)}</SelectContent>
                </Select>

                <Select value={filtroManut} onValueChange={v => { setFiltroManut(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[90px] max-w-[130px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[12px] text-slate-300 focus:border-cyan-500/30 focus:outline-none">
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
                    className="flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-500/[0.08] px-2 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-400/12 transition-all shrink-0"
                  >
                    <X className="w-2.5 h-2.5" /> Limpar
                  </button>
                )}

                <UpdateButton onClick={() => carregarDados(true)} isFetching={loading} loadingPhase={loadingPhase} progress={progress} cooldownOverride={cooldown} />

                {lastUpdate && (
                  <span className="text-[10px] text-slate-500 shrink-0 ml-1 hidden xl:block">
                    {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>

              <HomeButton />
            </div>

            {/* Mobile nav */}
            <div className="flex sm:hidden items-center gap-2 py-1">
              <MobileNav />
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img src={sgtLogo} alt="SGT" className="block h-7 w-auto shrink-0 object-contain" />
                <div className="h-5 w-px shrink-0" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-400/70">Workspace</span>
                  <span className="text-[20px] font-black tracking-[-0.03em] dark:text-white text-slate-800 truncate">Operacional</span>
                </div>
              </div>
              <UpdateButton onClick={() => carregarDados(true)} isFetching={loading} loadingPhase={loadingPhase} progress={progress} compact cooldownOverride={cooldown} />
              <HomeButton />
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




            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1 lg:[&>*:last-child]:col-span-1">
              <AnimatedCard delay={80}>
                <KpiCard label="Viagens em Andamento" value={loading ? "—" : fmtNum(kpis.emAndamento)} subtitle="0% < PERC < 100% · clique p/ detalhes" icon={Navigation} tone="cyan" loading={loading} onClick={() => setKpiDialog("andamento")} />
              </AnimatedCard>
              <AnimatedCard delay={120}>
                <KpiCard label="Veículos em Rota" value={loading ? "—" : fmtNum(kpis.emRota)} subtitle="Fora de manutenção · clique p/ detalhes" icon={Truck} tone="emerald" loading={loading} onClick={() => setKpiDialog("rota")} />
              </AnimatedCard>
              <AnimatedCard delay={160}>
                <KpiCard label="Em Manutenção" value={loading ? "—" : fmtNum(kpis.emManutencao)} subtitle="EM_MANUTENCAO = S · clique p/ detalhes" icon={Wrench} tone="amber" loading={loading} onClick={() => setKpiDialog("manutencao")} />
              </AnimatedCard>
              <AnimatedCard delay={200}>
                <KpiCard label="Com Atraso na Saída" value={loading ? "—" : fmtNum(kpis.comAtraso)} subtitle="SAIDA_REAL > ORIGINAL · clique p/ detalhes" icon={AlertCircle} tone="rose" loading={loading} onClick={() => setKpiDialog("atraso")} />
              </AnimatedCard>
              <AnimatedCard delay={240}>
                <KpiCard label="Conclusão Média" value={loading ? "—" : fmtPct(kpis.avgPerc)} subtitle="AVG(PERC_COMPLETO)" icon={TrendingUp} tone="violet" loading={loading} />
              </AnimatedCard>
            </div>



            {/* ── LINHA 2: Mapa grande (2/3) + Alertas (1/3) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

              {/* Mapa de posições — ocupa 2/3 */}
              <AnimatedCard delay={300} className="lg:col-span-2">
                <div className="rounded-[14px] sm:rounded-[16px] border p-4 h-full flex flex-col" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">Posições em Tempo Real</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-[11px]">
                      {[
                        { label: "Em rota", color: RAW.accent.cyan },
                        { label: "Aguardando", color: RAW.accent.amber },
                        { label: "Atrasado", color: RAW.accent.rose },
                        { label: "Manutenção", color: RAW.accent.violet },
                      ].map(l => (
                        <span key={l.label} className="flex items-center gap-1.5" style={{ color: l.color }}>
                          <span className="inline-block w-2 h-2 rounded-full" style={{ background: l.color }} />
                          {l.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Mapa Leaflet — interativo com zoom */}
                  <div
                    className="relative rounded-[12px] overflow-hidden flex-1"
                    style={{ minHeight: 420, background: "#060d1a", border: `0.5px solid ${RAW.borderDefault}` }}
                  >
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center text-[13px] text-slate-600 z-[500]">Carregando posições...</div>
                    ) : (
                      <VeiculosMap
                        veiculos={filtrados
                          .filter(v => v.latitude != null && v.longitude != null)
                          .map(v => ({
                            veiculo: v.veiculo,
                            motorista: v.motorista,
                            latitude: v.latitude!,
                            longitude: v.longitude!,
                            perc: v.percCompleto,
                            rota: v.rota,
                            emManutencao: v.emManutencao,
                            temAtraso: v.temAtraso,
                            descSituacao: v.descSituacao,
                          }))}
                      />
                    )}

                    <div className="absolute top-3 left-3 text-[12px] font-semibold text-cyan-400/90 bg-slate-950/70 px-2 py-1 rounded backdrop-blur z-[500] pointer-events-none">
                      {filtrados.filter(v => v.latitude && v.longitude).length} veículos com GPS
                    </div>
                  </div>
                </div>
              </AnimatedCard>

              {/* Alertas Operacionais — 1/3, ao lado do mapa */}
              <AnimatedCard delay={320}>
                <div className="rounded-[14px] sm:rounded-[16px] border p-4 h-full flex flex-col" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-4 shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">Alertas Operacionais</span>
                  </div>
                  <div className="flex flex-col gap-3 flex-1">
                    {[
                      { label: "Saída com atraso", count: alertas.atrasados, cls: "bg-rose-500/10 border-rose-500/20", dot: RAW.accent.rose, txtCls: "text-rose-300", pulse: true },
                      { label: "Em manutenção", count: alertas.emManutencao, cls: "bg-violet-500/10 border-violet-500/20", dot: RAW.accent.violet, txtCls: "text-violet-300", pulse: true },
                      { label: "Previsão ultrapassada", count: alertas.prevUltrapassada, cls: "bg-amber-500/10 border-amber-500/20", dot: RAW.accent.amber, txtCls: "text-amber-300", pulse: alertas.prevUltrapassada > 0 },
                      { label: "Itens divergentes", count: alertas.itensDiverg, cls: "bg-amber-500/10 border-amber-500/20", dot: "#f59e0b", txtCls: "text-yellow-300", pulse: false },
                      { label: "Sem GPS / referência", count: alertas.semGps, cls: "bg-cyan-500/10 border-cyan-500/20", dot: RAW.accent.cyan, txtCls: "text-cyan-300", pulse: false },
                    ].map(({ label, count, cls, dot, txtCls, pulse }) => (
                      <div key={label} className={`flex items-center gap-3 rounded-[12px] border px-4 py-3 flex-1 ${cls}`}>
                        <span className="relative flex w-2 h-2 shrink-0">
                          {pulse && count > 0 && <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: dot }} />}
                          <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: dot }} />
                        </span>
                        <span className="text-[13px] text-slate-400 flex-1 leading-tight">{label}</span>
                        <span className={`text-[28px] font-black tabular-nums ${txtCls}`}>{loading ? "—" : count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedCard>
            </div>

            {/* ── LINHA 3: Situação+Classificação + Top Rotas + Top Motoristas ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              {/* Situação das Viagens + Classificação Veículo — unificados */}
              <AnimatedCard delay={360}>
                <div className="rounded-[14px] sm:rounded-[16px] border p-4 h-full flex flex-col gap-4" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  {/* Situação */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">Situação das Viagens</span>
                    </div>
                    {distSituacao.length === 0
                      ? <div className="text-[13px] text-slate-600">{loading ? "Carregando..." : "Sem dados"}</div>
                      : <div className="space-y-2">
                        {distSituacao.map(r => {
                          const total = distSituacao.reduce((s, x) => s + x.qtd, 0);
                          return (
                            <div key={r.nome} className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.fill }} />
                              <span className="text-[13px] text-slate-300 flex-1 truncate">{r.nome}</span>
                              <span className="text-[11px] text-slate-500">{total > 0 ? `${((r.qtd / total) * 100).toFixed(0)}%` : ""}</span>
                              <span className="text-[14px] font-bold w-7 text-right" style={{ color: r.fill }}>{r.qtd}</span>
                            </div>
                          );
                        })}
                      </div>
                    }
                  </div>

                  {/* Divisor */}
                  <div className="h-px shrink-0" style={{ background: RAW.borderDefault }} />

                  {/* Classificação */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Truck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">Classificação Veículo</span>
                    </div>
                    <div className="space-y-2">
                      {distClassi.slice(0, 6).map(r => {
                        const total = distClassi.reduce((s, x) => s + x.qtd, 0);
                        return (
                          <div key={r.nome} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.fill }} />
                            <span className="text-[13px] text-slate-300 flex-1 truncate">{r.nome}</span>
                            <span className="text-[11px] text-slate-500">{total > 0 ? `${((r.qtd / total) * 100).toFixed(0)}%` : ""}</span>
                            <span className="text-[14px] font-bold" style={{ color: r.fill }}>{r.qtd}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </AnimatedCard>

              {/* Top Rotas */}
              <AnimatedCard delay={420}>
                <div className="rounded-[14px] sm:rounded-[16px] border p-4 h-full" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">Top Rotas</span>
                    <span className="ml-auto text-[10px] text-slate-600 uppercase tracking-[0.12em]">Origem → Destino</span>
                  </div>
                  {topRotas.length === 0
                    ? <div className="flex h-16 items-center justify-center text-[13px] text-slate-600">{loading ? "Carregando..." : "Sem dados"}</div>
                    : <div className="space-y-2">
                      {topRotas.map((r, i) => {
                        const max = topRotas[0].qtd;
                        return (
                          <div key={r.rota} className="flex items-center gap-2">
                            <span className="w-4 text-[12px] font-bold text-slate-600 shrink-0 text-right">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[12px] text-slate-300 truncate">{r.rota}</span>
                                <span className="text-[13px] font-bold shrink-0 ml-2" style={{ color: r.fill }}>{r.qtd}</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
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
              <AnimatedCard delay={450}>
                <div className="rounded-[14px] sm:rounded-[16px] border p-4 h-full" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">Motoristas em Rota</span>
                    <span className="ml-auto text-[10px] text-slate-600 uppercase tracking-[0.12em]">Top 8</span>
                  </div>
                  {topMotoristas.length === 0
                    ? <div className="flex h-16 items-center justify-center text-[13px] text-slate-600">{loading ? "Carregando..." : "Sem dados"}</div>
                    : <div className="space-y-2">
                      {topMotoristas.map((r, i) => {
                        const max = topMotoristas[0].qtd;
                        return (
                          <div key={r.nome} className="flex items-center gap-2">
                            <span className="w-4 text-[12px] font-bold text-slate-600 shrink-0 text-right">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[13px] text-slate-300 truncate">{r.nome}</span>
                                <span className="text-[13px] font-bold shrink-0 ml-2" style={{ color: r.fill }}>{r.qtd}</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
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
            </div>



            {/* ════════════════════════════════════════════════════════
                INSIGHTS POR IA
            ════════════════════════════════════════════════════════ */}
            <InsightsSection
              setor="operacional"
              dados={{
                viagensEmAndamento: kpis.emAndamento,
                viagensEmRota: kpis.emRota,
                emManutencao: kpis.emManutencao,
                comAtraso: kpis.comAtraso,
                percMedioCompleto: parseFloat(kpis.avgPerc.toFixed(1)),
                percAtraso: kpis.emAndamento > 0 ? parseFloat(((kpis.comAtraso / kpis.emAndamento) * 100).toFixed(1)) : 0,
                atrasados: alertas.atrasados,
                prevUltrapassada: alertas.prevUltrapassada,
                itensDivergentes: alertas.itensDiverg,
                semGps: alertas.semGps,
                totalViagens: filtrados.length,
                distSituacao: distSituacao.slice(0, 6).map(s => ({ situacao: s.nome, qtd: s.qtd })),
                distClassificacao: distClassi.slice(0, 6).map(c => ({ classificacao: c.nome, qtd: c.qtd })),
                qtdMotoristas: new Set(filtrados.map(v => v.motorista).filter(Boolean)).size,
                qtdClientes: new Set(filtrados.map(v => v.destinatario).filter(Boolean)).size,
                viagensCompletas: filtrados.filter(v => v.percCompleto >= 100).length,
                viagensNaoIniciadas: filtrados.filter(v => v.percCompleto === 0 && !v.emManutencao).length,
              }}
              autoGenerate={true}
            />


            <AnimatedCard delay={500}>
              <div className="rounded-[14px] sm:rounded-[16px] border" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>

                <div className="flex flex-wrap items-center gap-2 px-3 pt-3 pb-2 border-b" style={{ borderColor: RAW.borderDefault }}>
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">Viagens em Andamento</span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/[0.07] px-2 py-0.5 text-[9px] font-semibold text-cyan-300">
                    {fmtNum(tabelaBuscada.length)} registros
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <GooeyInput
                      placeholder="Buscar veículo, motorista, rota..."
                      value={search}
                      onValueChange={(v) => { setSearch(v); setPage(1); }}
                    />
                    {/* Toggle de visualização — padrão tela Bancos */}
                    <div className="flex items-center gap-1 rounded-lg border border-[var(--sgt-border-subtle)] bg-white/[0.04] p-0.5">
                      {([
                        { id: "cards" as const, icon: LayoutGrid, label: "Cards" },
                        { id: "tabela" as const, icon: Table2, label: "Tabela" },
                        { id: "analytics" as const, icon: BarChart3, label: "Analytics" },
                      ]).map(t => {
                        const Icon = t.icon;
                        const active = viagensView === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setViagensView(t.id)}
                            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${active ? "bg-cyan-400/15 text-cyan-200" : "text-slate-500 hover:text-slate-300"}`}
                          >
                            <Icon className="h-3 w-3" /><span className="hidden sm:inline"> {t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ══════════ VIEW: CARDS (padrão Bancos) ══════════ */}
                {viagensView === "cards" && (
                  <div className="p-3">
                    {loading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="rounded-[14px] border border-white/[0.06] bg-[var(--sgt-bg-card)] p-3.5 h-[150px]">
                            <div className="h-3 w-1/2 rounded-full bg-white/[0.05] animate-pulse mb-3" />
                            <div className="h-2 w-3/4 rounded-full bg-white/[0.04] animate-pulse mb-2" />
                            <div className="h-2 w-2/3 rounded-full bg-white/[0.04] animate-pulse" />
                          </div>
                        ))}
                      </div>
                    ) : tabelaPagina.length === 0 ? (
                      <div className="py-8 text-center text-[12px] text-slate-600">Nenhum registro encontrado</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {tabelaPagina.map((v, i) => {
                          const sit = getSituacStyle(v.descSituacao);
                          const atMin = v.minAtrasoSaida;
                          const progCor = v.emManutencao
                            ? RAW.accent.violet
                            : v.percCompleto >= 80 ? RAW.accent.cyan
                              : v.percCompleto >= 40 ? RAW.accent.emerald
                                : RAW.accent.amber;
                          return (
                            <AnimatedCard key={`${v.id}-${i}`} delay={i * 40}>
                              <div className="group relative flex h-full flex-col overflow-hidden rounded-[14px] border border-white/[0.07] bg-[var(--sgt-bg-card)] p-3.5 transition-all duration-300 hover:-translate-y-[3px] hover:border-cyan-400/20 shadow-[0_2px_20px_rgba(0,0,0,0.35)]">
                                {/* Header: veículo + situação */}
                                <div className="flex items-start justify-between gap-2 mb-2.5">
                                  <div className="min-w-0">
                                    <span className="font-mono text-[15px] font-bold text-cyan-300">{v.veiculo}</span>
                                    {v.veiculo2 && <span className="text-[9px] text-slate-600 block">+{v.veiculo2}</span>}
                                  </div>
                                  <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] ring-1 ${sit.bg} ${sit.text} ${sit.ring}`}>
                                    {v.descSituacao ?? "—"}
                                  </span>
                                </div>

                                {/* Motorista + rota */}
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Users className="w-3 h-3 text-slate-600 shrink-0" />
                                  <span className="text-[12px] text-slate-300 truncate">{v.motorista ?? "—"}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mb-3">
                                  <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                                  <span className="text-[10px] text-slate-500 truncate">{v.rota}</span>
                                </div>

                                {/* Progresso */}
                                <div className="mt-auto">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">Concluído</span>
                                    <span className="text-[11px] font-bold" style={{ color: progCor }}>{v.percCompleto}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: RAW.surfaceInset }}>
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${v.percCompleto}%`, background: progCor }} />
                                  </div>
                                </div>

                                {/* Footer: saída real + manutenção */}
                                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.06]">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-slate-600" />
                                    {v.datSaiReal ? (
                                      <span className={`text-[10px] font-medium ${v.temAtraso ? "text-rose-300" : "text-emerald-300"}`}>
                                        {fmtHora(v.datSaiReal)}
                                        {atMin !== null && atMin !== 0 && (
                                          <span className={`ml-1 text-[8px] font-bold ${atMin > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                            {atMin > 0 ? `+${atMin}min` : `${atMin}min`}
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-600">Sem saída</span>
                                    )}
                                  </div>
                                  {v.emManutencao && (
                                    <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-bold text-violet-300 ring-1 ring-violet-500/30">MANUT.</span>
                                  )}
                                </div>
                              </div>
                            </AnimatedCard>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════ VIEW: TABELA ══════════ */}
                {viagensView === "tabela" && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--sgt-border-subtle)", background: "var(--sgt-table-head)" }}>
                        {([
                          { key: "veiculo", label: "Veículo", align: "left", resp: "" },
                          { key: "motorista", label: "Motorista", align: "left", resp: "hidden md:table-cell" },
                          { key: "rota", label: "Origem → Destino", align: "left", resp: "hidden sm:table-cell" },
                          { key: "datSaiOriginal", label: "Saída Prev.", align: "center", resp: "hidden lg:table-cell" },
                          { key: "datSaiReal", label: "Saída Real", align: "center", resp: "hidden lg:table-cell" },
                          { key: "percCompleto", label: "% Concluído", align: "left", resp: "" },
                          { key: "prevChegada", label: "Prev. Chegada", align: "center", resp: "hidden xl:table-cell" },
                          { key: "descSituacao", label: "Situação", align: "center", resp: "" },
                          { key: "emManutencao", label: "Manut.", align: "center", resp: "hidden md:table-cell" },
                        ] as { key: keyof Viagem; label: string; align: string; resp: string }[]).map(c => (
                          <th
                            key={c.key}
                            onClick={() => handleSort(c.key)}
                            className={`px-3 py-2 cursor-pointer select-none text-[12px] font-bold uppercase tracking-[0.15em] text-slate-500 hover:text-slate-300 transition-colors ${c.resp}`}
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
                              <td key={j} className="px-4 py-3">
                                <div className="h-2 rounded-full bg-white/[0.04] animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : tabelaPagina.length === 0 ? (
                        <tr><td colSpan={9} className="py-8 text-center text-[12px] text-slate-600">Nenhum registro encontrado</td></tr>
                      ) : (
                        tabelaPagina.map((v, i) => {
                          const sit = getSituacStyle(v.descSituacao);
                          const atMin = v.minAtrasoSaida;
                          const chegMin = v.minParaChegar;
                          const progCor = v.emManutencao ? RAW.accent.violet : v.percCompleto >= 80 ? RAW.accent.cyan : v.percCompleto >= 40 ? RAW.accent.emerald : RAW.accent.amber;
                          return (
                            <tr key={`${v.id}-${i}`} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${RAW.borderDefault}` }}>
                              {/* Veículo */}
                              <td className="px-4 py-3">
                                <div>
                                  <span className="font-mono text-[14px] font-semibold text-cyan-300">{v.veiculo}</span>
                                  {v.veiculo2 && <span className="text-[9px] text-slate-600 block">+{v.veiculo2}</span>}
                                </div>
                              </td>
                              {/* Motorista */}
                              <td className="px-4 py-3 hidden md:table-cell">
                                <span className="text-[14px] text-slate-300 truncate max-w-[130px] block">{v.motorista ?? "—"}</span>
                              </td>
                              {/* Rota */}
                              <td className="px-4 py-3 hidden sm:table-cell">
                                <span className="text-[10px] text-slate-400 block max-w-[200px] truncate">{v.rota}</span>
                              </td>
                              {/* Saída Prev */}
                              <td className="px-4 py-3 hidden lg:table-cell text-center">
                                <span className="text-[10px] text-slate-400">{fmtHora(v.datSaiOriginal)}</span>
                              </td>
                              {/* Saída Real */}
                              <td className="px-4 py-3 hidden lg:table-cell text-center">
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
                              <td className="px-4 py-3">
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
                )}

                {/* ══════════ VIEW: ANALYTICS ══════════ */}
                {viagensView === "analytics" && (
                  <div className="p-3">
                    {viagensAnalytics.n === 0 ? (
                      <div className="py-8 text-center text-[12px] text-slate-600">Sem dados para análise</div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                        {/* Progresso das viagens */}
                        <AnimatedCard>
                          <div className="rounded-[14px] border h-full" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                            <div className="flex items-center gap-2 px-4 pt-3.5 pb-3 border-b" style={{ borderColor: RAW.borderDefault }}>
                              <Activity className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">Progresso das Viagens</span>
                            </div>
                            <div className="p-4 space-y-2.5">
                              {viagensAnalytics.faixas.map(f => {
                                const max = Math.max(...viagensAnalytics.faixas.map(x => x.qtd), 1);
                                const pct = (f.qtd / max) * 100;
                                return (
                                  <div key={f.label} className="flex items-center gap-3">
                                    <span className="text-[11px] text-slate-400 w-[100px] shrink-0">{f.label}</span>
                                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: f.cor }} />
                                    </div>
                                    <span className="text-[11px] font-bold tabular-nums w-8 text-right shrink-0" style={{ color: f.cor }}>{f.qtd}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </AnimatedCard>

                        {/* Pontualidade na saída */}
                        <AnimatedCard delay={60}>
                          <div className="rounded-[14px] border h-full" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                            <div className="flex items-center gap-2 px-4 pt-3.5 pb-3 border-b" style={{ borderColor: RAW.borderDefault }}>
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">Pontualidade na Saída</span>
                            </div>
                            <div className="p-4">
                              <div className="flex items-end justify-between mb-3">
                                <div>
                                  <p className="text-[28px] font-black leading-none text-emerald-300 tabular-nums">{viagensAnalytics.pctPontual.toFixed(0)}%</p>
                                  <p className="text-[10px] text-slate-500 mt-1">saídas no prazo</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600">Atraso médio</p>
                                  <p className="text-[18px] font-bold text-rose-300 tabular-nums">{viagensAnalytics.mediaAtraso} <span className="text-[11px] font-medium text-slate-500">min</span></p>
                                </div>
                              </div>
                              <div className="flex gap-1 h-2.5 rounded-full overflow-hidden mb-2" style={{ background: RAW.surfaceInset }}>
                                <div className="h-full rounded-full bg-emerald-400/70 transition-all duration-500" style={{ width: `${viagensAnalytics.pctPontual}%` }} />
                                <div className="h-full rounded-full bg-rose-400/70 transition-all duration-500" style={{ width: `${(viagensAnalytics.pontuais + viagensAnalytics.atrasadas) > 0 ? 100 - viagensAnalytics.pctPontual : 0}%` }} />
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-medium">
                                <span className="text-emerald-300">{viagensAnalytics.pontuais} pontuais</span>
                                <span className="text-rose-300">{viagensAnalytics.atrasadas} atrasadas</span>
                              </div>
                            </div>
                          </div>
                        </AnimatedCard>

                        {/* Top Rotas */}
                        <AnimatedCard delay={120}>
                          <div className="rounded-[14px] border h-full" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                            <div className="flex items-center gap-2 px-4 pt-3.5 pb-3 border-b" style={{ borderColor: RAW.borderDefault }}>
                              <MapPin className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">Top Rotas</span>
                            </div>
                            <div className="p-4 space-y-2.5">
                              {viagensAnalytics.topRotas.map(([rota, qtd], i) => {
                                const max = viagensAnalytics.topRotas[0]?.[1] ?? 1;
                                const pct = (qtd / max) * 100;
                                return (
                                  <div key={i} className="flex items-center gap-3">
                                    <span className="text-[11px] text-slate-400 w-[150px] truncate shrink-0" title={rota}>{rota}</span>
                                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                                      <div className="h-full rounded-full bg-amber-400/70 transition-all duration-500" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[11px] font-bold tabular-nums text-amber-300 w-8 text-right shrink-0">{qtd}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </AnimatedCard>

                        {/* Top Motoristas */}
                        <AnimatedCard delay={180}>
                          <div className="rounded-[14px] border h-full" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                            <div className="flex items-center gap-2 px-4 pt-3.5 pb-3 border-b" style={{ borderColor: RAW.borderDefault }}>
                              <Users className="w-3.5 h-3.5 text-violet-400" />
                              <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">Top Motoristas</span>
                            </div>
                            <div className="p-4 space-y-2.5">
                              {viagensAnalytics.topMotoristas.map(([nome, qtd], i) => {
                                const max = viagensAnalytics.topMotoristas[0]?.[1] ?? 1;
                                const pct = (qtd / max) * 100;
                                return (
                                  <div key={i} className="flex items-center gap-3">
                                    <span className="text-[11px] text-slate-400 w-[150px] truncate shrink-0" title={nome}>{nome}</span>
                                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                                      <div className="h-full rounded-full bg-violet-400/70 transition-all duration-500" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[11px] font-bold tabular-nums text-violet-300 w-8 text-right shrink-0">{qtd}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </AnimatedCard>

                        {/* Distribuição por situação — largura total */}
                        <AnimatedCard delay={240} className="lg:col-span-2">
                          <div className="rounded-[14px] border" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                            <div className="flex items-center gap-2 px-4 pt-3.5 pb-3 border-b" style={{ borderColor: RAW.borderDefault }}>
                              <Radio className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">Distribuição por Situação</span>
                            </div>
                            <div className="p-4 space-y-2.5">
                              {viagensAnalytics.porSituacao.map(([sit, qtd], i) => {
                                const max = viagensAnalytics.porSituacao[0]?.[1] ?? 1;
                                const pct = (qtd / max) * 100;
                                const cor = [RAW.accent.cyan, RAW.accent.emerald, RAW.accent.amber, RAW.accent.rose, RAW.accent.violet][i % 5];
                                const share = viagensAnalytics.n > 0 ? (qtd / viagensAnalytics.n) * 100 : 0;
                                return (
                                  <div key={i} className="flex items-center gap-3">
                                    <span className="text-[11px] text-slate-400 w-[160px] truncate shrink-0" title={sit}>{sit}</span>
                                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cor }} />
                                    </div>
                                    <span className="text-[10px] text-slate-600 w-10 text-right shrink-0 tabular-nums">{share.toFixed(0)}%</span>
                                    <span className="text-[11px] font-bold tabular-nums w-8 text-right shrink-0" style={{ color: cor }}>{qtd}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </AnimatedCard>

                      </div>
                    )}
                  </div>
                )}

                {/* Paginação */}
                {viagensView !== "analytics" && tabelaOrdenada.length > PAGE_SIZE && (
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

      {/* Dialog de detalhamento dos KPIs */}
      <ViagensDialog
        open={kpiDialog !== null}
        onOpenChange={(o) => !o && setKpiDialog(null)}
        title={
          kpiDialog === "andamento" ? "Viagens em Andamento" :
            kpiDialog === "rota" ? "Veículos em Rota" :
              kpiDialog === "manutencao" ? "Veículos em Manutenção" :
                kpiDialog === "atraso" ? "Saídas com Atraso" : ""
        }
        subtitle={
          kpiDialog === "andamento" ? "0% < % concluído < 100% e fora de manutenção" :
            kpiDialog === "rota" ? "Fora de manutenção e não finalizadas" :
              kpiDialog === "manutencao" ? "EM_MANUTENCAO = S" :
                kpiDialog === "atraso" ? "SAIDA_REAL > SAIDA_ORIGINAL" : ""
        }
        rows={
          kpiDialog === "andamento" ? filtrados.filter(v => v.percCompleto > 0 && v.percCompleto < 100 && !v.emManutencao) :
            kpiDialog === "rota" ? filtrados.filter(v => !v.emManutencao && v.percCompleto < 100) :
              kpiDialog === "manutencao" ? filtrados.filter(v => v.emManutencao) :
                kpiDialog === "atraso" ? filtrados.filter(v => v.temAtraso) : []
        }
      />
    </div>
  );
}
