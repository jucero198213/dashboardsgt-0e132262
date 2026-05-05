import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wrench, RefreshCw, Search, AlertTriangle, TrendingUp, TrendingDown,
  Calendar, ChevronUp, ChevronDown, BarChart3, CheckCircle2, CheckCircle,
  AlertCircle, Activity, DollarSign, Hash, X, ChevronLeft,
  ChevronRight, Package, Users, FileText, Zap, ShieldAlert,
  Clock, Filter, Layers
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as ReTooltip, CartesianGrid, LineChart, Line,
  AreaChart, Area, Cell
} from "recharts";
import sgtLogo from "@/assets/sgt-logo.png";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { InsightsSection } from "@/components/shared/InsightsSection";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { UpdateButton } from "@/components/shared/UpdateButton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useCooldown } from "@/hooks/useCooldown";
import {
  fetchManutencao,
  type ManutencaoRow
} from "@/lib/dwApi";
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

// ─── Paleta de cores alinhada ao theme.ts ─────────────────────────────────────
const PALETTE = [
  RAW.accent.violet,
  RAW.accent.cyan,
  RAW.accent.amber,
  RAW.accent.emerald,
  RAW.accent.rose,
  RAW.accent.red,
  "#fb923c",
  "#94a3b8",
];
const colorFor = (_key: string, i: number) => PALETTE[i % PALETTE.length];

// Mapa de situação → estilo visual
const SITUACAO_STYLE: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  CONCLUIDO:     { bg: "bg-emerald-500/10", text: "text-emerald-300", ring: "ring-emerald-500/30", label: "Concluído" },
  ANDAMENTO:     { bg: "bg-amber-500/10",   text: "text-amber-300",   ring: "ring-amber-500/30",   label: "Andamento" },
  CANCELADO:     { bg: "bg-rose-500/10",    text: "text-rose-300",    ring: "ring-rose-500/30",    label: "Cancelado" },
  INCONSISTENTE: { bg: "bg-slate-500/10",   text: "text-slate-300",   ring: "ring-slate-500/30",  label: "Inconsistente" },
};

const TIPO_LABEL: Record<string, string> = {
  SERVICOEXTERNO: "Externo",
  SERVICOINTERNO: "Interno",
};

// ─── Tooltip dark customizado ─────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-violet-400/30 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? "#fff" }} className="text-[12px] font-semibold">
          {formatter ? formatter(p.value, p.name) : `${p.name}: ${p.value}`}
        </p>
      ))}
    </div>
  );
};

// ─── Tipo para ordens agregadas ───────────────────────────────────────────────
interface OrdemAgregada {
  ordem: string;
  veiculo: string;
  dataordem: string | null;
  situacao: string | null;
  tiposervico: string | null;
  classificacao: string | null;
  fornecedor: string | null;
  filial: string | null;
  totalCusto: number;
  totalPecas: number;
  totalMO: number;
  qtdItens: number;
  diasAberto: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function Manutencao() {
  const navigate = useNavigate();
  const { dwFilter, setDwFilter, filiais, empresas } = useFinancialData();
  const manutCooldown = useCooldown("dw_manutencao_fetch_ts");
  const filiaisFiltradas = filiais.filter(f => !dwFilter.empresa || f.empresa === dwFilter.empresa);

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [dados, setDados] = useState<ManutencaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Filtros locais
  const [filtroAno, setFiltroAno] = useState<string>("Todos");
  const [filtroMes, setFiltroMes] = useState<string>("Todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("Todos");
  const [filtroSituacao, setFiltroSituacao] = useState<string>("Todos");
  const [filtroClassif, setFiltroClassif] = useState<string>("Todos");
  const [search, setSearch] = useState("");

  // Tabela
  const [sortCol, setSortCol] = useState<keyof OrdemAgregada>("totalCusto");
  const [sortAsc, setSortAsc] = useState(false);
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);

  // Modal validação
  const [validacaoAberta, setValidacaoAberta] = useState<string | null>(null);

  // ── Carregamento ────────────────────────────────────────────────────────────
  const carregarDados = useCallback(async (force = false) => {
    if (!force && !manutCooldown.canFetch) return;
    setLoading(true);
    setError(null);
    setProgress(0);
    setLoadingPhase("Conectando ao DW...");

    let cur = 0;
    const phases = [
      { at: 30, label: "Buscando ordens de manutenção..." },
      { at: 70, label: "Processando custos e indicadores..." },
      { at: 88, label: "Gerando análises e validações..." },
    ];
    const iv = window.setInterval(() => {
      const spd = cur < 35 ? 4 + Math.random() * 3 : cur < 75 ? 2 + Math.random() * 2 : 0.5 + Math.random();
      cur = Math.min(cur + spd, 95);
      const p = [...phases].reverse().find(ph => cur >= ph.at);
      if (p) setLoadingPhase(p.label);
      setProgress(Math.round(cur));
    }, 120);

    try {
      const res = await fetchManutencao({
        dataInicio: dwFilter.dataInicio,
        dataFim: dwFilter.dataFim,
        filial: dwFilter.filial ?? null,
      });
      setDados(res.data ?? []);
      manutCooldown.start();
    } catch (err) {
      setError((err as Error).message ?? "Erro ao carregar dados");
    } finally {
      clearInterval(iv);
      setProgress(100);
      setLoadingPhase("");
      setLoading(false);
    }
  }, [dwFilter.dataInicio, dwFilter.dataFim, dwFilter.filial]);

  useEffect(() => { carregarDados(); }, []);

  // ── Listas únicas para filtros ───────────────────────────────────────────────
  const anos = useMemo(() => {
    const s = new Set<string>();
    dados.forEach(d => {
      if (!d.dataordem) return;
      const y = new Date(d.dataordem).getFullYear();
      if (!isNaN(y)) s.add(String(y));
    });
    return ["Todos", ...Array.from(s).sort().reverse()];
  }, [dados]);

  const meses = useMemo(() => {
    const NOMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const s = new Set<string>();
    dados.forEach(d => {
      if (!d.dataordem) return;
      const dt = new Date(d.dataordem);
      if (!isNaN(dt.getTime())) s.add(String(dt.getMonth() + 1).padStart(2, "0"));
    });
    const sorted = Array.from(s).sort();
    return ["Todos", ...sorted.map(m => ({ value: m, label: NOMES[parseInt(m) - 1] }))];
  }, [dados]);

  const classificacoes = useMemo(() => {
    const s = new Set<string>();
    dados.forEach(d => { if (d.classificacao) s.add(d.classificacao); });
    return ["Todos", ...Array.from(s).sort()];
  }, [dados]);

  // ── Filtragem dos dados brutos ───────────────────────────────────────────────
  const dadosFiltrados = useMemo(() => {
    return dados.filter(d => {
      if (d.situacao === "CANCELADO") return false; // excluir cancelados do agregado padrão
      const dt = d.dataordem ? new Date(d.dataordem) : null;
      if (filtroAno !== "Todos" && (!dt || String(dt.getFullYear()) !== filtroAno)) return false;
      if (filtroMes !== "Todos" && (!dt || String(dt.getMonth() + 1).padStart(2, "0") !== filtroMes)) return false;
      if (filtroTipo !== "Todos" && d.tiposervico !== filtroTipo) return false;
      if (filtroSituacao !== "Todos" && d.situacao !== filtroSituacao) return false;
      if (filtroClassif !== "Todos" && d.classificacao !== filtroClassif) return false;
      return true;
    });
  }, [dados, filtroAno, filtroMes, filtroTipo, filtroSituacao, filtroClassif]);

  // ── Agrupamento por ordem ────────────────────────────────────────────────────
  const ordens = useMemo(() => {
    const map = new Map<string, OrdemAgregada>();
    for (const d of dadosFiltrados) {
      const key = String(d.ordem ?? "SEM-OS");
      if (!map.has(key)) {
        const diasAberto = d.dataordem
          ? Math.floor((Date.now() - new Date(d.dataordem).getTime()) / 86_400_000)
          : null;
        map.set(key, {
          ordem: key,
          veiculo: String(d.veiculo ?? "—"),
          dataordem: d.dataordem,
          situacao: d.situacao,
          tiposervico: d.tiposervico,
          classificacao: d.classificacao,
          fornecedor: d.fornecedor,
          filial: d.filial,
          totalCusto: 0,
          totalPecas: 0,
          totalMO: 0,
          qtdItens: 0,
          diasAberto,
        });
      }
      const o = map.get(key)!;
      const custo = (d.custo ?? 0) * (d.qtd ?? 1);
      const pecas = (d.valorpc ?? 0) + (d.valorpc2 ?? 0);
      const mo    = (d.valormo ?? 0) + (d.valormo2 ?? 0);
      o.totalCusto += custo;
      o.totalPecas += pecas;
      o.totalMO    += mo;
      o.qtdItens   += 1;
      // Usa fornecedor mais recente / prioritário
      if (!o.fornecedor && d.fornecedor) o.fornecedor = d.fornecedor;
    }
    return Array.from(map.values());
  }, [dadosFiltrados]);

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalOS      = ordens.length;
    const totalPecas   = ordens.reduce((s, o) => s + o.totalPecas, 0);
    const totalMO      = ordens.reduce((s, o) => s + o.totalMO, 0);
    const totalCusto   = ordens.reduce((s, o) => s + o.totalCusto, 0);
    const custoMedioOS = totalOS > 0 ? totalCusto / totalOS : 0;
    const externas = ordens.filter(o => o.tiposervico === "SERVICOEXTERNO").length;
    const internas = ordens.filter(o => o.tiposervico === "SERVICOINTERNO").length;
    const abertas  = ordens.filter(o => o.situacao === "ANDAMENTO").length;
    return { totalOS, totalPecas, totalMO, totalCusto, custoMedioOS, externas, internas, abertas };
  }, [ordens]);

  // ── Custo Mensal (área) ───────────────────────────────────────────────────────
  const custoPorMes = useMemo(() => {
    const NOMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const map = new Map<string, { pecas: number; mo: number }>();
    for (const d of dadosFiltrados) {
      if (!d.dataordem) continue;
      const dt = new Date(d.dataordem);
      if (isNaN(dt.getTime())) continue;
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(k)) map.set(k, { pecas: 0, mo: 0 });
      const e = map.get(k)!;
      e.pecas += (d.valorpc ?? 0) + (d.valorpc2 ?? 0);
      e.mo    += (d.valormo ?? 0) + (d.valormo2 ?? 0);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([k, v]) => {
        const [y, m] = k.split("-");
        return { mes: `${NOMES[parseInt(m) - 1]}/${y.slice(2)}`, ...v, total: v.pecas + v.mo };
      });
  }, [dadosFiltrados]);

  // ── Ranking de peças por veículo (top 10) ────────────────────────────────────
  const rankingVeiculo = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dadosFiltrados) {
      const k = String(d.veiculo ?? "Indefinido");
      map.set(k, (map.get(k) ?? 0) + (d.valorpc ?? 0) + (d.valorpc2 ?? 0));
    }
    return Array.from(map.entries())
      .map(([veiculo, custo], i) => ({ veiculo, custo, fill: colorFor(veiculo, i) }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 10);
  }, [dadosFiltrados]);

  // ── Ranking de peças por fornecedor (top 10) ─────────────────────────────────
  const rankingFornecedor = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dadosFiltrados) {
      const k = d.fornecedor?.trim() || "Sem fornecedor";
      map.set(k, (map.get(k) ?? 0) + (d.valorpc ?? 0) + (d.valorpc2 ?? 0));
    }
    return Array.from(map.entries())
      .map(([fornecedor, custo], i) => ({
        fornecedor: fornecedor.length > 22 ? fornecedor.slice(0, 22) + "…" : fornecedor,
        fornecedorFull: fornecedor,
        custo,
        fill: colorFor(fornecedor, i),
      }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 10);
  }, [dadosFiltrados]);

  // ── Distribuição por classificação ───────────────────────────────────────────
  const distClassif = useMemo(() => {
    const map = new Map<string, number>();
    ordens.forEach(o => {
      const k = o.classificacao?.trim() || "Sem classificação";
      map.set(k, (map.get(k) ?? 0) + o.totalCusto);
    });
    return Array.from(map.entries())
      .map(([nome, custo], i) => ({ nome, custo, fill: colorFor(nome, i) }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 6);
  }, [ordens]);

  // ── Validações Analíticas ────────────────────────────────────────────────────
  const validacoes = useMemo(() => {
    // ① Custos elevados: OS com custo > média + 2σ
    const custos = ordens.filter(o => o.totalCusto > 0).map(o => o.totalCusto);
    const media = custos.length > 0 ? custos.reduce((s, x) => s + x, 0) / custos.length : 0;
    const desvio = custos.length > 0
      ? Math.sqrt(custos.reduce((s, x) => s + (x - media) ** 2, 0) / custos.length)
      : 0;
    const limiteOutlier = media + 2 * desvio;

    const outliersCusto = ordens.filter(o => o.totalCusto > limiteOutlier && limiteOutlier > 0);

    // ② OS em aberto há mais de 30 dias
    const ordensTravadas = ordens.filter(o =>
      o.situacao === "ANDAMENTO" && o.diasAberto !== null && o.diasAberto > 30
    );

    // ③ OS externas sem fornecedor cadastrado
    const semFornecedor = ordens.filter(o =>
      o.tiposervico === "SERVICOEXTERNO" && (!o.fornecedor || o.fornecedor.trim() === "")
    );

    // ④ Concentração excessiva de custo num único veículo (> 30% do total)
    const totalGeral = ordens.reduce((s, o) => s + o.totalCusto, 0);
    const custoVeiculo = new Map<string, number>();
    ordens.forEach(o => {
      custoVeiculo.set(o.veiculo, (custoVeiculo.get(o.veiculo) ?? 0) + o.totalCusto);
    });
    const topVeiculoEntry = Array.from(custoVeiculo.entries()).sort((a, b) => b[1] - a[1])[0];
    const concentracaoVeiculo = topVeiculoEntry && totalGeral > 0
      ? topVeiculoEntry[1] / totalGeral
      : 0;
    const concentracoesAltas = concentracaoVeiculo > 0.3
      ? ordens.filter(o => o.veiculo === topVeiculoEntry[0])
      : [];

    // ⑤ Corretiva dominante (> 70% das ordens classificadas são corretivas)
    const comClassif = ordens.filter(o => o.classificacao);
    const corretivas = comClassif.filter(o =>
      o.classificacao?.toUpperCase().includes("CORRET")
    );
    const ratioCorretiva = comClassif.length > 0 ? corretivas.length / comClassif.length : 0;

    // ⑥ Ordens com MO zero mas com peças > 0 (possível sub-lançamento)
    const semMO = ordens.filter(o => o.totalPecas > 0 && o.totalMO === 0);

    return {
      outliersCusto,
      ordensTravadas,
      semFornecedor,
      concentracoesAltas,
      concentracaoVeiculo,
      topVeiculoNome: topVeiculoEntry?.[0],
      ratioCorretiva,
      corretivas: corretivas.length,
      semMO,
      mediaCusto: media,
      limiteOutlier,
    };
  }, [ordens]);

  // ── Modal de validação ────────────────────────────────────────────────────────
  const validacaoLista = useMemo(() => {
    if (!validacaoAberta) return [];
    const map: Record<string, OrdemAgregada[]> = {
      outliersCusto:       validacoes.outliersCusto,
      ordensTravadas:      validacoes.ordensTravadas,
      semFornecedor:       validacoes.semFornecedor,
      concentracoesAltas:  validacoes.concentracoesAltas,
      semMO:               validacoes.semMO,
    };
    return map[validacaoAberta] ?? [];
  }, [validacaoAberta, validacoes]);

  // ── Tabela de ordens com search + sort + paginação ───────────────────────────
  const ordensSearchadas = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return ordens;
    return ordens.filter(o =>
      o.ordem.toLowerCase().includes(q) ||
      o.veiculo.toLowerCase().includes(q) ||
      (o.fornecedor ?? "").toLowerCase().includes(q) ||
      (o.classificacao ?? "").toLowerCase().includes(q)
    );
  }, [ordens, search]);

  const handleSort = (col: keyof OrdemAgregada) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const tabelaOrdenada = useMemo(() => {
    return [...ordensSearchadas].sort((a, b) => {
      const va = a[sortCol]; const vb = b[sortCol];
      if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
      return sortAsc
        ? String(va ?? "").localeCompare(String(vb ?? ""))
        : String(vb ?? "").localeCompare(String(va ?? ""));
    });
  }, [ordensSearchadas, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(tabelaOrdenada.length / PAGE_SIZE));
  const tabelaPagina = tabelaOrdenada.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filtroAno, filtroMes, filtroTipo, filtroSituacao, filtroClassif, search]);

  const SortIcon = ({ col }: { col: keyof OrdemAgregada }) =>
    sortCol === col
      ? (sortAsc ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />)
      : <ChevronDown className="w-3 h-3 ml-0.5 opacity-20" />;

  // ─── Cards de validação config ─────────────────────────────────────────────
  const validCards = [
    {
      key:      "outliersCusto",
      icon:     AlertTriangle,
      label:    "OS com Custo Elevado",
      desc:     `Acima de ${fmtK(validacoes.limiteOutlier)} (média + 2σ)`,
      count:    validacoes.outliersCusto.length,
      tone:     "rose" as const,
      severity: validacoes.outliersCusto.length > 0,
    },
    {
      key:      "ordensTravadas",
      icon:     Clock,
      label:    "OS Travadas (> 30 dias)",
      desc:     "Em andamento sem encerramento",
      count:    validacoes.ordensTravadas.length,
      tone:     "amber" as const,
      severity: validacoes.ordensTravadas.length > 0,
    },
    {
      key:      "semFornecedor",
      icon:     ShieldAlert,
      label:    "Externas sem Fornecedor",
      desc:     "Serviço externo sem vínculo",
      count:    validacoes.semFornecedor.length,
      tone:     "violet" as const,
      severity: validacoes.semFornecedor.length > 0,
    },
    {
      key:      "concentracoesAltas",
      icon:     TrendingUp,
      label:    "Concentração por Veículo",
      desc:     validacoes.concentracaoVeiculo > 0.3
        ? `${(validacoes.concentracaoVeiculo * 100).toFixed(0)}% em ${validacoes.topVeiculoNome}`
        : "Distribuição equilibrada",
      count:    validacoes.concentracoesAltas.length,
      tone:     "cyan" as const,
      severity: validacoes.concentracaoVeiculo > 0.3,
    },
    {
      key:      null,
      icon:     Layers,
      label:    "Índice Corretiva",
      desc:     validacoes.ratioCorretiva > 0.7
        ? `Alta: ${(validacoes.ratioCorretiva * 100).toFixed(0)}% das OS classificadas`
        : validacoes.ratioCorretiva > 0
        ? `${(validacoes.ratioCorretiva * 100).toFixed(0)}% das OS classificadas`
        : "Sem dados de classificação",
      count:    validacoes.corretivas,
      tone:     "emerald" as const,
      severity: validacoes.ratioCorretiva > 0.7,
    },
    {
      key:      "semMO",
      icon:     Zap,
      label:    "Peças sem Mão de Obra",
      desc:     "OS com peças lançadas mas MO = 0",
      count:    validacoes.semMO.length,
      tone:     "amber" as const,
      severity: validacoes.semMO.length > 3,
    },
  ];

  const TONE_COLORS = {
    rose:    { border: "border-rose-400/20",    icon: "text-rose-300",    bg: "bg-rose-400/[0.08]",    glow: RAW.accent.rose,    sub: "text-rose-400"    },
    amber:   { border: "border-amber-400/20",   icon: "text-amber-300",   bg: "bg-amber-400/[0.08]",   glow: RAW.accent.amber,   sub: "text-amber-400"   },
    violet:  { border: "border-violet-400/20",  icon: "text-violet-300",  bg: "bg-violet-400/[0.08]",  glow: RAW.accent.violet,  sub: "text-violet-400"  },
    cyan:    { border: "border-cyan-400/20",    icon: "text-cyan-300",    bg: "bg-cyan-400/[0.08]",    glow: RAW.accent.cyan,    sub: "text-cyan-400"    },
    emerald: { border: "border-emerald-400/20", icon: "text-emerald-300", bg: "bg-emerald-400/[0.08]", glow: RAW.accent.emerald, sub: "text-emerald-400" },
  };

  // ═════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="flex flex-col transition-all duration-300 min-h-[100dvh] overflow-auto px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* ── Gradientes de fundo ── */}
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(109,40,217,0.22),transparent_60%)]" />
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
              className="h-full bg-gradient-to-r from-violet-500 via-violet-400 to-cyan-400 shadow-[0_0_12px_rgba(139,92,246,0.5)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, opacity: loading ? 1 : 0 }}
            />
          </div>

          <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 overflow-hidden w-full">

            {/* ════════ NAVBAR ════════ */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              <div className="flex items-center gap-3">
                <img src={sgtLogo} alt="SGT" className="block h-8 w-auto shrink-0 object-contain" />
                <div className="h-6 w-px" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-violet-400/70">Workspace</span>
                  <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">Manutenção de Frota</span>
                </div>
              </div>

              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">DW Conectado</span>
              </div>

              <div className="h-6 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

              <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
                <DatePickerInput value={dwFilter.dataInicio} onChange={v => setDwFilter("dataInicio", v)} placeholder="Data início" />
                <DatePickerInput value={dwFilter.dataFim}    onChange={v => setDwFilter("dataFim", v)}    placeholder="Data fim" />
                <div className="h-4 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />
                <Select value={dwFilter.empresa ?? "__all__"} onValueChange={v => setDwFilter("empresa", v === "__all__" ? null : v)}>
                  <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[130px] rounded-lg text-[12px]"><SelectValue placeholder="Empresa" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Todas</SelectItem>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={dwFilter.filial ?? "__all__"} onValueChange={v => setDwFilter("filial", v === "__all__" ? null : v)}>
                  <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[140px] rounded-lg text-[12px]"><SelectValue placeholder="Filial" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Todas</SelectItem>{filiaisFiltradas.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                </Select>
                <UpdateButton onClick={carregarDados} isFetching={loading} loadingPhase={loadingPhase} progress={progress} cooldownOverride={manutCooldown} />
              </div>

              <HomeButton />
            </div>

            {/* Mobile nav */}
            <div className="flex sm:hidden items-center justify-between gap-2 py-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={sgtLogo} alt="SGT" className="block h-7 w-auto shrink-0 object-contain" />
                <div className="h-5 w-px shrink-0" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-violet-400/70">Workspace</span>
                  <span className="text-[15px] font-black tracking-[-0.03em] dark:text-white text-slate-800 truncate">Manutenção</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <UpdateButton onClick={carregarDados} isFetching={loading} loadingPhase={loadingPhase} progress={progress} compact cooldownOverride={manutCooldown} />
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
              <div className="flex items-center gap-2 text-[11px] text-violet-300/80">
                <div className="h-1 w-32 overflow-hidden rounded-full bg-violet-400/10">
                  <div className="h-full bg-gradient-to-r from-violet-400 to-violet-200 transition-all duration-300" style={{ width: `${progress}%` }} />
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
                <Filter className="w-3.5 h-3.5 text-violet-400/60 shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500 shrink-0">Filtros</span>
                <div className="h-4 w-px bg-white/[0.07] shrink-0" />

                {/* Ano */}
                <Select value={filtroAno} onValueChange={setFiltroAno}>
                  <SelectTrigger className="h-7 min-w-[72px] max-w-[90px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-violet-500/30 focus:outline-none">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map(a => <SelectItem key={a} value={a}>{a === "Todos" ? "Ano" : a}</SelectItem>)}
                  </SelectContent>
                </Select>

                {/* Mês */}
                <Select value={filtroMes} onValueChange={setFiltroMes}>
                  <SelectTrigger className="h-7 min-w-[72px] max-w-[90px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-violet-500/30">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Mês</SelectItem>
                    {(meses.slice(1) as { value: string; label: string }[]).map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Tipo de ordem */}
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="h-7 min-w-[90px] max-w-[120px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-violet-500/30">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Tipo</SelectItem>
                    <SelectItem value="SERVICOEXTERNO">Externo</SelectItem>
                    <SelectItem value="SERVICOINTERNO">Interno</SelectItem>
                  </SelectContent>
                </Select>

                {/* Situação */}
                <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
                  <SelectTrigger className="h-7 min-w-[90px] max-w-[120px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-violet-500/30">
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Situação</SelectItem>
                    <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                    <SelectItem value="ANDAMENTO">Andamento</SelectItem>
                    <SelectItem value="INCONSISTENTE">Inconsistente</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  </SelectContent>
                </Select>

                {/* Classificação */}
                <Select value={filtroClassif} onValueChange={setFiltroClassif}>
                  <SelectTrigger className="h-7 min-w-[100px] max-w-[140px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-violet-500/30">
                    <SelectValue placeholder="Classificação" />
                  </SelectTrigger>
                  <SelectContent>
                    {classificacoes.map(c => (
                      <SelectItem key={c} value={c}>{c === "Todos" ? "Classificação" : c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Badges dos filtros ativos */}
                {(filtroAno !== "Todos" || filtroMes !== "Todos" || filtroTipo !== "Todos" || filtroSituacao !== "Todos" || filtroClassif !== "Todos") && (
                  <button
                    onClick={() => { setFiltroAno("Todos"); setFiltroMes("Todos"); setFiltroTipo("Todos"); setFiltroSituacao("Todos"); setFiltroClassif("Todos"); }}
                    className="flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-500/[0.08] px-2.5 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-400/12 transition-all"
                  >
                    <X className="w-2.5 h-2.5" /> Limpar
                  </button>
                )}

                <div className="ml-auto text-[10px] text-slate-500">
                  {fmtNum(ordens.length)} OS • {fmtNum(dadosFiltrados.length)} itens
                </div>
              </div>
            </AnimatedCard>

            {/* ════════ KPI ROW (5 cards) ════════ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {[
                {
                  label: "Ordens de Serviço",
                  value: loading ? "—" : fmtNum(kpis.totalOS),
                  sub: `${fmtNum(kpis.abertas)} em andamento`,
                  Icon: Hash,
                  tone: "violet" as const,
                  delay: 80,
                },
                {
                  label: "Custo de Peças",
                  value: loading ? "—" : fmtK(kpis.totalPecas),
                  sub: kpis.totalCusto > 0 ? `${((kpis.totalPecas / kpis.totalCusto) * 100).toFixed(0)}% do total` : "—",
                  Icon: Package,
                  tone: "cyan" as const,
                  delay: 120,
                },
                {
                  label: "Mão de Obra",
                  value: loading ? "—" : fmtK(kpis.totalMO),
                  sub: kpis.totalCusto > 0 ? `${((kpis.totalMO / kpis.totalCusto) * 100).toFixed(0)}% do total` : "—",
                  Icon: Users,
                  tone: "emerald" as const,
                  delay: 160,
                },
                {
                  label: "Custo Total",
                  value: loading ? "—" : fmtK(kpis.totalCusto),
                  sub: `${fmtNum(kpis.externas)} ext • ${fmtNum(kpis.internas)} int`,
                  Icon: DollarSign,
                  tone: "amber" as const,
                  delay: 200,
                },
                {
                  label: "Custo Médio / OS",
                  value: loading ? "—" : fmtK(kpis.custoMedioOS),
                  sub: `base: ${fmtNum(kpis.totalOS)} ordens`,
                  Icon: BarChart3,
                  tone: "rose" as const,
                  delay: 240,
                },
              ].map(({ label, value, sub, Icon, tone, delay }) => {
                const t = TONE_COLORS[tone];
                return (
                  <AnimatedCard key={label} delay={delay}>
                    <div
                      className={`relative overflow-hidden rounded-[14px] sm:rounded-[16px] border p-3.5 transition-all duration-300 hover:border-white/[0.11] ${t.border}`}
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
                      {/* Spot glow */}
                      <div className="pointer-events-none absolute inset-0 rounded-[14px] sm:rounded-[16px]"
                        style={{ background: `radial-gradient(circle at 100% 100%, ${t.glow}1a, transparent 65%)` }} />
                    </div>
                  </AnimatedCard>
                );
              })}
            </div>

            {/* ════════ SESSÃO 2 — INSIGHTS POR IA ════════ */}
            <SectionDivider
              numero={2}
              titulo="Insights por IA"
              subtitulo="Análise inteligente da manutenção — recomendações acionáveis geradas por IA"
              color="violet"
            />
            <InsightsSection
              setor="manutencao"
              dados={{
                totalOrdens: kpis.totalOS,
                ordensAbertas: kpis.abertas,
                custoTotal: Math.round(kpis.totalCusto),
                custoMedioOrdem: Math.round(kpis.custoMedioOS),
                custoTotalPecas: Math.round(kpis.totalPecas),
                custoTotalMaoDeObra: Math.round(kpis.totalMO),
                ordensExternas: kpis.externas,
                ordensInternas: kpis.internas,
                top5Veiculos: rankingVeiculo.slice(0, 5).map(v => ({ veiculo: (v as any).codvei ?? (v as any).veiculo, custo: Math.round(v.custo), ordens: (v as any).qtd ?? 0 })),
              }}
              periodo={`${dwFilter.dataInicio} a ${dwFilter.dataFim}`}
            />
            {/* REMOVIDO: grid de insights fixos — substituído por IA acima */}
            <div className="hidden grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              
              {/* Insight 1: CPK - Custo por KM */}
              <AnimatedCard delay={300}>
                <div className="relative overflow-hidden rounded-[14px] border border-cyan-500/20 bg-[var(--sgt-bg-card)] p-3.5 hover:border-cyan-400/30 transition-all">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-2xl"></div>
                  <div className="relative">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-400/70">CPK</p>
                        <p className="text-xl font-black text-white mt-0.5">R$ 2.45/km</p>
                      </div>
                      <DollarSign className="h-4 w-4 text-cyan-400/60" />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Custo de manutenção por km rodado. <span className="text-cyan-400 font-semibold">Monitorar por veículo</span> e identificar outliers.
                    </p>
                  </div>
                </div>
              </AnimatedCard>

              {/* Insight 2: Preventiva vs Corretiva */}
              <AnimatedCard delay={340}>
                <div className="relative overflow-hidden rounded-[14px] border border-emerald-500/20 bg-[var(--sgt-bg-card)] p-3.5 hover:border-emerald-400/30 transition-all">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl"></div>
                  <div className="relative">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-400/70">Preventiva</p>
                        <p className="text-xl font-black text-white mt-0.5">58%</p>
                      </div>
                      <CheckCircle className="h-4 w-4 text-emerald-400/60" />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Meta: <span className="text-emerald-400 font-semibold">&gt;70% preventiva</span>. Aumentar manutenções programadas reduz custos e paradas.
                    </p>
                  </div>
                </div>
              </AnimatedCard>

              {/* Insight 3: MTBF - Tempo Médio Entre Falhas */}
              <AnimatedCard delay={380}>
                <div className="relative overflow-hidden rounded-[14px] border border-amber-500/20 bg-[var(--sgt-bg-card)] p-3.5 hover:border-amber-400/30 transition-all">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl"></div>
                  <div className="relative">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-400/70">MTBF</p>
                        <p className="text-xl font-black text-white mt-0.5">45 dias</p>
                      </div>
                      <Clock className="h-4 w-4 text-amber-400/60" />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Tempo médio entre falhas <span className="text-amber-400 font-semibold">varia por modelo</span>. Identificar veículos problema.
                    </p>
                  </div>
                </div>
              </AnimatedCard>

              {/* Insight 4: Renovação de Frota */}
              <AnimatedCard delay={420}>
                <div className="relative overflow-hidden rounded-[14px] border border-rose-500/20 bg-[var(--sgt-bg-card)] p-3.5 hover:border-rose-400/30 transition-all">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full blur-2xl"></div>
                  <div className="relative">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-rose-400/70">Renovar?</p>
                        <p className="text-lg font-black text-white mt-0.5">8 anos</p>
                      </div>
                      <AlertTriangle className="h-4 w-4 text-rose-400/60" />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      <span className="text-rose-400 font-semibold">Renovar ou manter</span> veículos com X anos/km? Analisar curva de custo por idade.
                    </p>
                  </div>
                </div>
              </AnimatedCard>

              {/* Insight 5: Oficina Interna */}
              <AnimatedCard delay={460}>
                <div className="relative overflow-hidden rounded-[14px] border border-blue-500/20 bg-[var(--sgt-bg-card)] p-3.5 hover:border-blue-400/30 transition-all">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl"></div>
                  <div className="relative">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-400/70">Estratégia</p>
                        <p className="text-lg font-black text-white mt-0.5">Ampliar?</p>
                      </div>
                      <Users className="h-4 w-4 text-blue-400/60" />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Vale <span className="text-blue-400 font-semibold">ampliar oficina interna</span> vs continuar terceirizando? Calcular ROI.
                    </p>
                  </div>
                </div>
              </AnimatedCard>

              {/* Insight 6: Telemetria Preditiva */}
              <AnimatedCard delay={500}>
                <div className="relative overflow-hidden rounded-[14px] border border-violet-500/20 bg-[var(--sgt-bg-card)] p-3.5 hover:border-violet-400/30 transition-all">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/5 rounded-full blur-2xl"></div>
                  <div className="relative">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-violet-400/70">Inovação</p>
                        <p className="text-lg font-black text-white mt-0.5">IoT?</p>
                      </div>
                      <TrendingUp className="h-4 w-4 text-violet-400/60" />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Investir em <span className="text-violet-400 font-semibold">telemetria preditiva</span> (sensores, IA) traz ROI considerando frota atual?
                    </p>
                  </div>
                </div>
              </AnimatedCard>

            </div>

            {/* ════════ SESSÃO 3 — DETALHAMENTO ════════ */}
            <SectionDivider
              numero={3}
              titulo="Detalhamento"
              subtitulo="Ordens de serviço e registros que compõem os dados do período"
              color="blue"
            />

            {/* ════════ VALIDAÇÕES ANALÍTICAS ════════ */}
            <AnimatedCard delay={280}>
              <div className="rounded-[14px] sm:rounded-[16px] border p-3" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Validações Analíticas</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {validCards.map(({ key, icon: Icon, label, desc, count, tone, severity }) => {
                    const t = TONE_COLORS[tone];
                    const hasModal = !!key && count > 0;
                    return (
                      <button
                        key={label}
                        disabled={!hasModal}
                        onClick={() => hasModal && setValidacaoAberta(key)}
                        className={`group relative text-left rounded-[14px] border p-2.5 transition-all duration-200 ${
                          hasModal ? "cursor-pointer hover:border-white/[0.14] hover:scale-[1.02]" : "cursor-default"
                        } ${severity ? t.border : "border-white/[0.06]"}`}
                        style={{ background: "var(--sgt-bg-card)" }}
                      >
                        <div className="flex items-start justify-between gap-1.5 mb-1.5">
                          <div className={`rounded-lg p-1.5 ${t.bg} ${t.border} border`}>
                            <Icon className={`w-3 h-3 ${t.icon}`} />
                          </div>
                          <span className={`text-[17px] font-black leading-none ${severity ? t.icon : "text-slate-500"}`}>
                            {loading ? "—" : fmtNum(count)}
                          </span>
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 leading-tight mb-0.5">{label}</p>
                        <p className={`text-[9px] leading-tight ${severity ? t.sub : "text-slate-600"}`}>{desc}</p>
                        {hasModal && (
                          <span className={`mt-1.5 inline-flex text-[8px] font-semibold uppercase tracking-[0.2em] ${t.icon} opacity-60 group-hover:opacity-100`}>
                            Ver detalhes →
                          </span>
                        )}
                        {severity && (
                          <span className={`absolute top-2 right-2 flex h-1.5 w-1.5 rounded-full`} style={{ backgroundColor: t.glow }}>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: t.glow }} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </AnimatedCard>

            {/* ════════ CUSTO MENSAL ════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">

              {/* Gráfico custo mensal — 2 colunas */}
              <AnimatedCard delay={340} className="lg:col-span-2">
                <div className="rounded-[14px] sm:rounded-[16px] border p-3 h-[220px] flex flex-col" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Custo Mensal de Manutenção</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[9px] text-violet-400"><span className="w-2 h-2 rounded-full inline-block" style={{ background: RAW.accent.violet }} />Peças</span>
                      <span className="flex items-center gap-1 text-[9px] text-cyan-400"><span className="w-2 h-2 rounded-full inline-block" style={{ background: RAW.accent.cyan }} />MO</span>
                    </div>
                  </div>
                  {custoPorMes.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-[11px] text-slate-600">
                      {loading ? "Carregando..." : "Sem dados no período"}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={custoPorMes} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={RAW.accent.violet} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={RAW.accent.violet} stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={RAW.accent.cyan} stopOpacity={0.20} />
                            <stop offset="95%" stopColor={RAW.accent.cyan} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="mes" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => fmtK(v)} width={52} />
                        <ReTooltip content={<DarkTooltip formatter={(v: number, n: string) => `${n === "pecas" ? "Peças" : "MO"}: ${fmtBRL(v)}`} />} />
                        <Area type="monotone" dataKey="pecas" name="Peças" stroke={RAW.accent.violet} strokeWidth={2} fill="url(#gradViolet)" dot={false} />
                        <Area type="monotone" dataKey="mo"    name="MO"    stroke={RAW.accent.cyan}   strokeWidth={2} fill="url(#gradCyan)"   dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </AnimatedCard>

              {/* Distribuição por classificação */}
              <AnimatedCard delay={360}>
                <div className="rounded-[14px] sm:rounded-[16px] border p-3 h-[220px] flex flex-col" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Custo por Classificação</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {distClassif.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-[11px] text-slate-600">
                        {loading ? "Carregando..." : "Sem dados"}
                      </div>
                    ) : (
                      <div className="space-y-1.5 h-full overflow-auto pr-1">
                        {distClassif.map((c, i) => {
                          const pct = kpis.totalCusto > 0 ? (c.custo / kpis.totalCusto) * 100 : 0;
                          return (
                            <div key={c.nome}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] text-slate-400 truncate max-w-[130px]">{c.nome}</span>
                                <span className="text-[10px] font-semibold text-slate-300 shrink-0">{fmtK(c.custo)}</span>
                              </div>
                              <div className="h-1 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, background: c.fill }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </AnimatedCard>
            </div>

            {/* ════════ RANKINGS ════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">

              {/* Ranking Peças por Veículo */}
              <AnimatedCard delay={400}>
                <div className="rounded-[14px] sm:rounded-[16px] border p-3" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Ranking de Peças por Veículo</span>
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

              {/* Ranking Peças por Fornecedor */}
              <AnimatedCard delay={440}>
                <div className="rounded-[14px] sm:rounded-[16px] border p-3" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Ranking de Peças por Fornecedor</span>
                    <span className="ml-auto text-[8px] text-slate-600 uppercase tracking-[0.2em]">Top 10</span>
                  </div>
                  {rankingFornecedor.length === 0 ? (
                    <div className="flex h-16 items-center justify-center text-[11px] text-slate-600">
                      {loading ? "Carregando..." : "Sem dados"}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {rankingFornecedor.map((r, i) => {
                        const max = rankingFornecedor[0].custo;
                        const pct = max > 0 ? (r.custo / max) * 100 : 0;
                        return (
                          <div key={r.fornecedorFull} className="flex items-center gap-2">
                            <span className="w-5 text-[9px] font-bold text-slate-600 shrink-0 text-right">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-medium text-slate-300 truncate">{r.fornecedor}</span>
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

            {/* ════════ TABELA DE ORDENS ════════ */}
            <AnimatedCard delay={500}>
              <div className="rounded-[14px] sm:rounded-[16px] border" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
                {/* Header tabela */}
                <div className="flex flex-wrap items-center gap-2 px-3 pt-3 pb-2 border-b" style={{ borderColor: RAW.borderDefault }}>
                  <FileText className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Detalhamento de Ordens</span>
                  <span className="rounded-full border border-violet-400/20 bg-violet-500/[0.07] px-2 py-0.5 text-[9px] font-semibold text-violet-300">
                    {fmtNum(ordensSearchadas.length)} OS
                  </span>
                  <div className="ml-auto relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar OS, veículo, fornecedor..."
                      className="h-7 rounded-xl border border-white/[0.08] bg-white/[0.04] pl-6 pr-3 text-[11px] text-slate-300 placeholder-slate-600 focus:border-violet-500/30 focus:outline-none transition-all w-[200px]"
                    />
                  </div>
                </div>

                {/* Tabela */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${RAW.borderDefault}`, background: RAW.surfaceInset }}>
                        {([
                          { key: "ordem",        label: "OS",             align: "left",   resp: ""                  },
                          { key: "veiculo",      label: "Veículo",        align: "left",   resp: ""                  },
                          { key: "dataordem",    label: "Data",           align: "center", resp: "hidden sm:table-cell" },
                          { key: "tiposervico",  label: "Tipo",           align: "center", resp: "hidden md:table-cell" },
                          { key: "situacao",     label: "Situação",       align: "center", resp: ""                  },
                          { key: "classificacao",label: "Classificação",  align: "left",   resp: "hidden lg:table-cell" },
                          { key: "fornecedor",   label: "Fornecedor",     align: "left",   resp: "hidden xl:table-cell" },
                          { key: "totalPecas",   label: "Peças",          align: "right",  resp: "hidden sm:table-cell" },
                          { key: "totalMO",      label: "MO",             align: "right",  resp: "hidden md:table-cell" },
                          { key: "totalCusto",   label: "Total",          align: "right",  resp: ""                  },
                        ] as { key: keyof OrdemAgregada; label: string; align: string; resp: string }[]).map(c => (
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
                            {Array.from({ length: 10 }).map((_, j) => (
                              <td key={j} className="px-3 py-2.5">
                                <div className="h-2 rounded-full bg-white/[0.04] animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : tabelaPagina.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-[12px] text-slate-600">
                            Nenhuma ordem encontrada
                          </td>
                        </tr>
                      ) : (
                        tabelaPagina.map((o, i) => {
                          const sit = SITUACAO_STYLE[o.situacao ?? ""] ?? SITUACAO_STYLE.INCONSISTENTE;
                          return (
                            <tr
                              key={o.ordem}
                              className="transition-colors hover:bg-white/[0.02]"
                              style={{ borderBottom: `1px solid ${RAW.borderDefault}` }}
                            >
                              <td className="px-3 py-2.5">
                                <span className="font-mono text-[11px] text-violet-300">{o.ordem}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-[11px] font-medium text-slate-300">{o.veiculo}</span>
                              </td>
                              <td className="px-3 py-2.5 hidden sm:table-cell text-center">
                                <span className="text-[11px] text-slate-400">{fmtData(o.dataordem)}</span>
                              </td>
                              <td className="px-3 py-2.5 hidden md:table-cell text-center">
                                <span className={`text-[9px] font-semibold uppercase tracking-[0.15em] ${o.tiposervico === "SERVICOEXTERNO" ? "text-cyan-400" : "text-violet-400"}`}>
                                  {TIPO_LABEL[o.tiposervico ?? ""] ?? "—"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.15em] ring-1 ${sit.bg} ${sit.text} ${sit.ring}`}>
                                  {sit.label}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 hidden lg:table-cell">
                                <span className="text-[10px] text-slate-400">{o.classificacao ?? "—"}</span>
                              </td>
                              <td className="px-3 py-2.5 hidden xl:table-cell">
                                <span className="text-[10px] text-slate-400 max-w-[140px] block truncate">{o.fornecedor ?? "—"}</span>
                              </td>
                              <td className="px-3 py-2.5 hidden sm:table-cell text-right">
                                <span className="text-[11px] font-medium text-cyan-300">{o.totalPecas > 0 ? fmtK(o.totalPecas) : "—"}</span>
                              </td>
                              <td className="px-3 py-2.5 hidden md:table-cell text-right">
                                <span className="text-[11px] font-medium text-emerald-300">{o.totalMO > 0 ? fmtK(o.totalMO) : "—"}</span>
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <span className="text-[12px] font-bold text-slate-200">{fmtK(o.totalCusto)}</span>
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
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] text-slate-400 transition-all hover:border-violet-400/30 hover:text-violet-300 disabled:opacity-30 disabled:cursor-not-allowed"
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
                                ? "border border-violet-400/40 bg-violet-500/[0.15] text-violet-300"
                                : "border border-white/[0.06] text-slate-500 hover:border-violet-400/20 hover:text-violet-300"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] text-slate-400 transition-all hover:border-violet-400/30 hover:text-violet-300 disabled:opacity-30 disabled:cursor-not-allowed"
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

      {/* ════════ MODAL VALIDAÇÃO ════════ */}
      {validacaoAberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(2,3,12,0.80)" }}
          onClick={() => setValidacaoAberta(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[80vh] flex flex-col rounded-2xl border border-violet-400/20 shadow-2xl"
            style={{ background: "var(--sgt-bg-section)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-white/[0.07]">
              <div>
                <h3 className="text-[13px] font-bold text-slate-100">
                  {validacaoAberta === "outliersCusto"      && "OS com Custo Elevado (Outliers)"}
                  {validacaoAberta === "ordensTravadas"     && "OS em Andamento há mais de 30 dias"}
                  {validacaoAberta === "semFornecedor"      && "OS Externas sem Fornecedor Cadastrado"}
                  {validacaoAberta === "concentracoesAltas" && `Concentração de Custo — Veículo ${validacoes.topVeiculoNome}`}
                  {validacaoAberta === "semMO"              && "OS com Peças mas sem Mão de Obra"}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {validacaoAberta === "outliersCusto"      && `Limite: ${fmtK(validacoes.limiteOutlier)} (média ${fmtK(validacoes.mediaCusto)} + 2σ)`}
                  {validacaoAberta === "ordensTravadas"     && "Possível gargalo operacional — verificar encerramento"}
                  {validacaoAberta === "semFornecedor"      && "Qualidade de dados — vincular fornecedor nos itens externos"}
                  {validacaoAberta === "concentracoesAltas" && `${(validacoes.concentracaoVeiculo * 100).toFixed(0)}% do custo total concentrado neste veículo`}
                  {validacaoAberta === "semMO"              && "Possível sub-lançamento — revisar custo de mão de obra"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">{validacaoLista.length} encontrado(s)</span>
                <button
                  onClick={() => setValidacaoAberta(null)}
                  className="rounded-lg border border-white/[0.08] p-1.5 text-slate-400 hover:border-rose-400/30 hover:text-rose-300 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Body modal */}
            <div className="flex-1 overflow-auto px-4 pb-4 pt-3">
              {validacaoLista.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400/60" />
                  <p className="text-[12px] text-slate-500">Nenhum registro encontrado para esta validação</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {validacaoLista.map(o => {
                    const sit = SITUACAO_STYLE[o.situacao ?? ""] ?? SITUACAO_STYLE.INCONSISTENTE;
                    return (
                      <div
                        key={o.ordem}
                        className="flex items-center gap-3 rounded-[12px] border px-3 py-2.5 transition-all hover:border-white/[0.11]"
                        style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-violet-300 font-semibold">{o.ordem}</span>
                            <span className={`text-[8px] font-bold uppercase tracking-[0.15em] ring-1 rounded-full px-1.5 py-0.5 ${sit.bg} ${sit.text} ${sit.ring}`}>
                              {sit.label}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 truncate">
                            Veículo: <span className="text-slate-300">{o.veiculo}</span>
                            {o.fornecedor && <> • Forn: <span className="text-slate-300">{o.fornecedor}</span></>}
                            {o.classificacao && <> • Classif: <span className="text-slate-300">{o.classificacao}</span></>}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-black text-slate-100">{fmtBRL(o.totalCusto)}</p>
                          <p className="text-[9px] text-slate-500">{fmtData(o.dataordem)}{o.diasAberto !== null && ` • ${o.diasAberto}d`}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
