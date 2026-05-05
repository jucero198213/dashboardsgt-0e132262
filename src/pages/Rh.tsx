import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users, Search, TrendingUp, TrendingDown,
  ChevronUp, ChevronDown, X, ChevronLeft, ChevronRight,
  Filter, AlertTriangle, FileText, Activity,
  UserCheck, UserMinus, UserPlus, Clock, ShieldAlert,
  BarChart3, Hash, Calendar, Eye,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as ReTooltip, CartesianGrid, Cell,
} from "recharts";
import sgtLogo from "@/assets/sgt-logo.png";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { UpdateButton } from "@/components/shared/UpdateButton";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useCooldown } from "@/hooks/useCooldown";
import { fetchRh, type RhRow } from "@/lib/dwApi";
import { RAW } from "@/lib/theme";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtNum  = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const fmtPct  = (v: number) => `${v.toFixed(1)}%`;

const fmtData = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

const fmtAnos = (anos: number) =>
  anos < 1 ? `${Math.round(anos * 12)} meses` : `${anos.toFixed(1)} anos`;

const calcIdade = (dataNasc: string | null): number | null => {
  if (!dataNasc) return null;
  const d = new Date(dataNasc);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86_400_000));
};

const calcAnos = (dataAdm: string | null): number | null => {
  if (!dataAdm) return null;
  const d = new Date(dataAdm);
  if (isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / (365.25 * 86_400_000);
};

const diasAteCnhVencer = (vencha: string | null): number | null => {
  if (!vencha) return null;
  const d = new Date(vencha);
  if (isNaN(d.getTime())) return null;
  return Math.floor((d.getTime() - Date.now()) / 86_400_000);
};

const NOMES_MES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ─── Paleta ───────────────────────────────────────────────────────────────────
const PALETTE = [
  RAW.accent.emerald, RAW.accent.cyan, RAW.accent.violet,
  RAW.accent.amber, RAW.accent.rose, RAW.accent.red,
  "#fb923c", "#94a3b8",
];
const colorFor = (_: string, i: number) => PALETTE[i % PALETTE.length];

// ─── Tooltip dark ─────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-emerald-400/30 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? "#fff" }} className="text-[12px] font-semibold">
          {formatter ? formatter(p.value, p.name) : `${p.name}: ${p.value}`}
        </p>
      ))}
    </div>
  );
};

// ─── Tipo local enriquecido ────────────────────────────────────────────────────
interface Colaborador {
  codmot:           string;
  nome:             string;
  funcao:           string | null;
  tipoFunc:         string | null;
  situacao:         string | null;
  sexo:             string | null;
  codFilial:        string | null;
  datAdm:           string | null;
  datDem:           string | null;
  motivoDem:        string | null;
  catCnh:           string | null;
  validadeCnh:      string | null;
  ufCnh:            string | null;
  numeroCpf:        string | null;
  temCpf:           boolean;
  temCnh:           boolean;
  anosEmpresa:      number | null;
  diasCnhVencer:    number | null;
  ativo:            boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function Rh() {
  const { dwFilter, setDwFilter } = useFinancialData();
  const cooldown = useCooldown("dw_rh_fetch_ts");

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [dados,        setDados]        = useState<RhRow[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [error,        setError]        = useState<string | null>(null);

  // Filtros locais
  const [filtroSituacao,  setFiltroSituacao]  = useState("Todos");
  const [filtroFilial,    setFiltroFilial]    = useState("Todos");
  const [filtroFuncao,    setFiltroFuncao]    = useState("Todos");
  const [filtroCatCnh,    setFiltroCatCnh]    = useState("Todos");
  const [filtroTipo,      setFiltroTipo]      = useState("Todos");
  const [search,          setSearch]          = useState("");
  // Filtro rápido Ativo/Inativo na tabela de detalhamento
  const [tabelaSituacao,  setTabelaSituacao]  = useState<"Todos" | "A" | "I">("Todos");

  // Modais popup
  const [modalAdm,      setModalAdm]      = useState(false);
  const [modalDem,      setModalDem]      = useState(false);
  const [modalCnh30,    setModalCnh30]    = useState(false);
  const [modalAlertas,  setModalAlertas]  = useState(false);

  // Tabela
  const [sortCol, setSortCol] = useState<keyof Colaborador>("datAdm");
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
      { at: 30, label: "Buscando colaboradores..." },
      { at: 65, label: "Calculando indicadores de quadro..." },
      { at: 88, label: "Processando turnover e alertas..." },
    ];
    const iv = window.setInterval(() => {
      const spd = cur < 35 ? 4 + Math.random() * 3 : cur < 75 ? 2 + Math.random() * 2 : 0.5 + Math.random();
      cur = Math.min(cur + spd, 95);
      const p = [...phases].reverse().find(ph => cur >= ph.at);
      if (p) setLoadingPhase(p.label);
      setProgress(Math.round(cur));
    }, 120);

    try {
      const res = await fetchRh({ situacao: null });
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
  }, []);

  useEffect(() => { if (cooldown.canFetch) carregarDados(); }, [cooldown.canFetch]);

  // ── Normalização enriquecida ────────────────────────────────────────────────
  const colaboradores = useMemo<Colaborador[]>(() => {
    const n = (v: string | null | undefined) => (v ?? "").trim() || null;
    const ns = (v: string | null | undefined) => (v ?? "").trim();
    return dados.map(d => {
      const sit = ns(d.situacao).toUpperCase();
      const isAtivo = sit === "A";
      return {
        codmot:        String(d.codmot ?? "").trim(),
        nome:          ns(d.motorista) || "—",
        funcao:        n(d.funcao),
        tipoFunc:      n(d.tipo_funcionario),
        situacao:      sit || null,
        sexo:          n(d.sexo),
        codFilial:     d.codigo_filial ? String(d.codigo_filial).trim() : null,
        datAdm:        d.data_admissao,
        datDem:        d.data_demissao,
        motivoDem:     n(d.motivo_demissao),
        catCnh:        n(d.categoria_habilitacao),
        validadeCnh:   d.validade_habilitacao,
        ufCnh:         n(d.uf_habilitacao),
        numeroCpf:     d.numero_cpf ? String(d.numero_cpf).trim() : null,
        temCpf:        !!(d.numero_cpf && String(d.numero_cpf).trim()),
        temCnh:        !!(d.habilitacao && String(d.habilitacao).trim()),
        anosEmpresa:   isAtivo ? calcAnos(d.data_admissao) : null,
        diasCnhVencer: diasAteCnhVencer(d.validade_habilitacao),
        ativo:         isAtivo,
      };
    });
  }, [dados]);

  // ── Listas únicas para filtros ───────────────────────────────────────────────
  const filiais = useMemo(() => {
    const s = new Set<string>();
    colaboradores.forEach(c => { if (c.codFilial) s.add(c.codFilial); });
    return ["Todos", ...Array.from(s).sort()];
  }, [colaboradores]);

  const funcoes = useMemo(() => {
    const s = new Set<string>();
    colaboradores.forEach(c => { if (c.funcao) s.add(c.funcao); });
    return ["Todos", ...Array.from(s).sort()];
  }, [colaboradores]);

  const catsCnh = useMemo(() => {
    const s = new Set<string>();
    colaboradores.forEach(c => { if (c.catCnh) s.add(c.catCnh); });
    return ["Todos", ...Array.from(s).sort()];
  }, [colaboradores]);

  const tiposFunc = useMemo(() => {
    const s = new Set<string>();
    colaboradores.forEach(c => { if (c.tipoFunc) s.add(c.tipoFunc); });
    return ["Todos", ...Array.from(s).sort()];
  }, [colaboradores]);

  // ── Filtros locais aplicados ─────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    return colaboradores.filter(c => {
      if (filtroSituacao !== "Todos" && c.situacao !== filtroSituacao) return false;
      if (filtroFilial   !== "Todos" && c.codFilial !== filtroFilial)   return false;
      if (filtroFuncao   !== "Todos" && c.funcao    !== filtroFuncao)   return false;
      if (filtroCatCnh   !== "Todos" && c.catCnh    !== filtroCatCnh)   return false;
      if (filtroTipo     !== "Todos" && c.tipoFunc  !== filtroTipo)     return false;
      return true;
    });
  }, [colaboradores, filtroSituacao, filtroFilial, filtroFuncao, filtroCatCnh, filtroTipo]);

  // ── Helper: está no período selecionado ──────────────────────────────────────
  const noPeríodo = useCallback((dateStr: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const ini = dwFilter.dataInicio ? new Date(dwFilter.dataInicio) : null;
    const fim = dwFilter.dataFim    ? new Date(dwFilter.dataFim)    : null;
    if (ini && d < ini) return false;
    if (fim && d > fim) return false;
    return true;
  }, [dwFilter.dataInicio, dwFilter.dataFim]);

  // ── KPIs de quadro ────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const ativos     = filtrados.filter(c => c.ativo);
    const admissoes  = filtrados.filter(c => noPeríodo(c.datAdm));
    const demissoes  = filtrados.filter(c => noPeríodo(c.datDem));
    const cnh30      = filtrados.filter(c => c.diasCnhVencer !== null && c.diasCnhVencer >= 0 && c.diasCnhVencer <= 30 && c.ativo);
    const comAnos    = ativos.filter(c => c.anosEmpresa !== null);
    const mediaAnos  = comAnos.length > 0
      ? comAnos.reduce((s, c) => s + c.anosEmpresa!, 0) / comAnos.length : 0;
    const turnover   = ativos.length > 0 ? (demissoes.length / ativos.length) * 100 : 0;
    return { ativos: ativos.length, admissoes: admissoes.length, demissoes: demissoes.length, cnh30: cnh30.length, mediaAnos, turnover, totalDemissoes: demissoes };
  }, [filtrados, noPeríodo]);

  // ── Análise por Função ─────────────────────────────────────────────────────
  const distFuncao = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.filter(c => c.ativo).forEach(c => {
      const k = c.funcao ?? "Não informado";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([nome, qtd], i) => ({ nome, qtd, fill: colorFor(nome, i) }));
  }, [filtrados]);

  // ── Distribuição Categoria CNH ─────────────────────────────────────────────
  const distCatCnh = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.filter(c => c.ativo).forEach(c => {
      const k = c.catCnh ?? "Sem CNH";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    const ORDEM = ["E", "D", "C", "B", "A", "Sem CNH"];
    return Array.from(map.entries())
      .sort((a, b) => ORDEM.indexOf(a[0]) - ORDEM.indexOf(b[0]))
      .map(([cat, qtd], i) => ({ cat, qtd, fill: colorFor(cat, i) }));
  }, [filtrados]);

  // ── Distribuição Tipo / Sexo ───────────────────────────────────────────────
  const distTipo = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.filter(c => c.ativo).forEach(c => {
      const k = c.tipoFunc ?? "Não informado";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([nome, qtd], i) => ({ nome, qtd, fill: colorFor(nome, i) }));
  }, [filtrados]);

  const distSexo = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.filter(c => c.ativo).forEach(c => {
      const k = c.sexo ?? "Não informado";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([nome, qtd], i) => ({ nome, qtd, fill: colorFor(nome, i + 3) }));
  }, [filtrados]);

  // ── Faixas de Tempo de Casa ────────────────────────────────────────────────
  const distTempoCasa = useMemo(() => {
    const faixas: Record<string, number> = { "< 1 ano": 0, "1 – 3 anos": 0, "3 – 5 anos": 0, "5 – 10 anos": 0, "> 10 anos": 0 };
    filtrados.filter(c => c.ativo && c.anosEmpresa !== null).forEach(c => {
      const a = c.anosEmpresa!;
      if      (a < 1)  faixas["< 1 ano"]++;
      else if (a < 3)  faixas["1 – 3 anos"]++;
      else if (a < 5)  faixas["3 – 5 anos"]++;
      else if (a < 10) faixas["5 – 10 anos"]++;
      else             faixas["> 10 anos"]++;
    });
    const cores = [RAW.accent.cyan, RAW.accent.cyan, RAW.accent.emerald, RAW.accent.violet, RAW.accent.amber];
    return Object.entries(faixas).map(([faixa, qtd], i) => ({ faixa, qtd, fill: cores[i] }));
  }, [filtrados]);

  // ── Alertas CNH ───────────────────────────────────────────────────────────
  const alertas = useMemo(() => {
    const ativos = filtrados.filter(c => c.ativo);
    return {
      cnhVencida:  ativos.filter(c => c.diasCnhVencer !== null && c.diasCnhVencer < 0 && c.temCnh).length,
      cnh30:       ativos.filter(c => c.diasCnhVencer !== null && c.diasCnhVencer >= 0 && c.diasCnhVencer <= 30).length,
      cnh60:       ativos.filter(c => c.diasCnhVencer !== null && c.diasCnhVencer > 30 && c.diasCnhVencer <= 60).length,
      semCnh:      ativos.filter(c => !c.temCnh).length,
      semCpf:      ativos.filter(c => !c.temCpf).length,
    };
  }, [filtrados]);

  // ── Turnover: evolução mensal ──────────────────────────────────────────────
  const evolucaoMensal = useMemo(() => {
    const map = new Map<string, { adm: number; dem: number }>();
    colaboradores.forEach(c => {
      if (c.datAdm && noPeríodo(c.datAdm)) {
        const dt = new Date(c.datAdm);
        if (!isNaN(dt.getTime())) {
          const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
          if (!map.has(k)) map.set(k, { adm: 0, dem: 0 });
          map.get(k)!.adm++;
        }
      }
      if (c.datDem && noPeríodo(c.datDem)) {
        const dt = new Date(c.datDem);
        if (!isNaN(dt.getTime())) {
          const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
          if (!map.has(k)) map.set(k, { adm: 0, dem: 0 });
          map.get(k)!.dem++;
        }
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => {
        const [, m] = k.split("-");
        return { mes: NOMES_MES[parseInt(m) - 1], ...v };
      });
  }, [colaboradores, noPeríodo]);

  // ── Motivo de Demissão ─────────────────────────────────────────────────────
  const distMotivoDem = useMemo(() => {
    const map = new Map<string, number>();
    kpis.totalDemissoes.forEach(c => {
      const k = c.motivoDem ?? "Não informado";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nome, qtd]) => ({ nome, qtd }));
  }, [kpis.totalDemissoes]);

  // ── Turnover por Filial ────────────────────────────────────────────────────
  const turnoverFilial = useMemo(() => {
    const mapAtivos = new Map<string, number>();
    const mapDem    = new Map<string, number>();
    const mapAdm    = new Map<string, number>();
    colaboradores.forEach(c => {
      const f = c.codFilial ?? "S/F";
      if (c.ativo) mapAtivos.set(f, (mapAtivos.get(f) ?? 0) + 1);
      if (noPeríodo(c.datDem)) mapDem.set(f, (mapDem.get(f) ?? 0) + 1);
      if (noPeríodo(c.datAdm)) mapAdm.set(f, (mapAdm.get(f) ?? 0) + 1);
    });
    return Array.from(mapAtivos.entries())
      .map(([filial, ativos]) => {
        const dem = mapDem.get(filial) ?? 0;
        const adm = mapAdm.get(filial) ?? 0;
        const pct = ativos > 0 ? (dem / ativos) * 100 : 0;
        return { filial, ativos, dem, adm, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [colaboradores, noPeríodo]);

  // ── KPIs Turnover ─────────────────────────────────────────────────────────
  const kpisTurnover = useMemo(() => {
    const saldo    = kpis.admissoes - kpis.demissoes;
    const topMotivo = distMotivoDem[0]?.nome ?? "—";
    const comDem   = kpis.totalDemissoes.filter(c => c.anosEmpresa !== null || calcAnos(c.datAdm) !== null);
    const mediaAnos = comDem.length > 0
      ? comDem.reduce((s, c) => {
          const a = c.datDem && c.datAdm
            ? (new Date(c.datDem).getTime() - new Date(c.datAdm).getTime()) / (365.25 * 86_400_000)
            : 0;
          return s + a;
        }, 0) / comDem.length
      : 0;
    return { saldo, topMotivo, mediaAnos };
  }, [kpis, distMotivoDem]);

  // ── Tabela ─────────────────────────────────────────────────────────────────
  // ── Dados dos modais ──────────────────────────────────────────────────────
  const listaAdmissoes = useMemo(() =>
    filtrados.filter(c => noPeríodo(c.datAdm))
      .sort((a, b) => (b.datAdm ?? "").localeCompare(a.datAdm ?? ""))
  , [filtrados, noPeríodo]);

  const listaDemissoes = useMemo(() =>
    filtrados.filter(c => noPeríodo(c.datDem))
      .sort((a, b) => (b.datDem ?? "").localeCompare(a.datDem ?? ""))
  , [filtrados, noPeríodo]);

  const listaCnh30 = useMemo(() =>
    filtrados.filter(c => c.ativo && c.diasCnhVencer !== null && c.diasCnhVencer <= 30)
      .sort((a, b) => (a.diasCnhVencer ?? 999) - (b.diasCnhVencer ?? 999))
  , [filtrados]);

  const listaAlertas = useMemo(() => ({
    cnhVencida:  filtrados.filter(c => c.ativo && c.temCnh && c.diasCnhVencer !== null && c.diasCnhVencer < 0)
                          .sort((a, b) => (a.diasCnhVencer ?? 0) - (b.diasCnhVencer ?? 0)),
    cnh30:       filtrados.filter(c => c.ativo && c.diasCnhVencer !== null && c.diasCnhVencer >= 0 && c.diasCnhVencer <= 30)
                          .sort((a, b) => (a.diasCnhVencer ?? 999) - (b.diasCnhVencer ?? 999)),
    cnh60:       filtrados.filter(c => c.ativo && c.diasCnhVencer !== null && c.diasCnhVencer > 30 && c.diasCnhVencer <= 60)
                          .sort((a, b) => (a.diasCnhVencer ?? 999) - (b.diasCnhVencer ?? 999)),
    semCnh:      filtrados.filter(c => c.ativo && !c.temCnh),
    semCpf:      filtrados.filter(c => c.ativo && !c.temCpf),
  }), [filtrados]);

  const tabelaBuscada = useMemo(() => {
    const q = search.trim().toLowerCase();
    return filtrados.filter(c => {
      if (tabelaSituacao !== "Todos" && c.situacao !== tabelaSituacao) return false;
      if (!q) return true;
      return (
        c.nome.toLowerCase().includes(q) ||
        c.codmot.toLowerCase().includes(q) ||
        (c.funcao ?? "").toLowerCase().includes(q) ||
        (c.codFilial ?? "").toLowerCase().includes(q)
      );
    });
  }, [filtrados, search, tabelaSituacao]);

  const handleSort = (col: keyof Colaborador) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(false); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: keyof Colaborador }) => {
    if (sortCol !== col) return <ChevronUp className="w-2.5 h-2.5 opacity-20" />;
    return sortAsc ? <ChevronUp className="w-2.5 h-2.5 text-emerald-400" /> : <ChevronDown className="w-2.5 h-2.5 text-emerald-400" />;
  };

  const tabelaOrdenada = useMemo(() => {
    return [...tabelaBuscada].sort((a, b) => {
      const va = a[sortCol] ?? "";
      const vb = b[sortCol] ?? "";
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return sortAsc ? cmp : -cmp;
    });
  }, [tabelaBuscada, sortCol, sortAsc]);

  const totalPages   = Math.max(1, Math.ceil(tabelaOrdenada.length / PAGE_SIZE));
  const tabelaPagina = tabelaOrdenada.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── TONE_COLORS ─────────────────────────────────────────────────────────────
  const TC = {
    emerald: { border: "border-emerald-400/20", icon: "text-emerald-300", bg: "bg-emerald-400/[0.08]", glow: RAW.accent.emerald, sub: "text-emerald-400" },
    cyan:    { border: "border-cyan-400/20",    icon: "text-cyan-300",    bg: "bg-cyan-400/[0.08]",    glow: RAW.accent.cyan,    sub: "text-cyan-400"    },
    rose:    { border: "border-rose-400/20",    icon: "text-rose-300",    bg: "bg-rose-400/[0.08]",    glow: RAW.accent.rose,    sub: "text-rose-400"    },
    amber:   { border: "border-amber-400/20",   icon: "text-amber-300",   bg: "bg-amber-400/[0.08]",   glow: RAW.accent.amber,   sub: "text-amber-400"   },
    violet:  { border: "border-violet-400/20",  icon: "text-violet-300",  bg: "bg-violet-400/[0.08]",  glow: RAW.accent.violet,  sub: "text-violet-400"  },
  };

  // ── Helper: badge CNH ────────────────────────────────────────────────────────
  const cnhBadge = (dias: number | null, temCnh: boolean) => {
    if (!temCnh) return <span className="text-[10px] text-slate-500">—</span>;
    if (dias === null) return <span className="text-[10px] text-slate-500">—</span>;
    if (dias < 0)   return <span className="rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[8px] font-bold text-rose-300 ring-1 ring-rose-500/30">VENCIDA</span>;
    if (dias <= 30) return <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-300 ring-1 ring-amber-500/30">{dias}d ⚠</span>;
    if (dias <= 60) return <span className="rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-yellow-300 ring-1 ring-yellow-500/20">{dias}d</span>;
    return <span className="text-[10px] text-emerald-400">{fmtData(null)}</span>;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="flex flex-col transition-all duration-300 min-h-[100dvh] overflow-auto px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* Gradientes de fundo */}
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(5,150,105,0.20),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_55%_40%_at_100%_110%,rgba(6,182,212,0.06),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:opacity-100" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.72) 100%)" }} />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-hidden"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          {/* Barra de progresso */}
          <div className="h-[3px] w-full shrink-0 overflow-hidden rounded-t-[24px] bg-transparent">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-400 shadow-[0_0_12px_rgba(5,150,105,0.5)] transition-all duration-500 ease-out"
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
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-400/70">Workspace</span>
                  <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">RH — Gestão de Colaboradores</span>
                </div>
              </div>
              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">DW Conectado</span>
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
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-emerald-400/70">Workspace</span>
                  <span className="text-[15px] font-black tracking-[-0.03em] dark:text-white text-slate-800 truncate">RH</span>
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
            {loading && loadingPhase && (
              <div className="flex items-center gap-2 text-[11px] text-emerald-300/80">
                <div className="h-1 w-32 overflow-hidden rounded-full bg-emerald-400/10">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-200 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <span>{loadingPhase}</span>
              </div>
            )}

            {/* ════ FILTROS ════ */}
            <AnimatedCard delay={60}>
              <div className="flex flex-wrap items-center gap-2 rounded-[14px] border px-3 py-2" style={{ background: RAW.surfaceInset, borderColor: RAW.borderDefault }}>
                <Filter className="w-3.5 h-3.5 text-emerald-400/60 shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500 shrink-0">Filtros</span>
                <div className="h-4 w-px bg-white/[0.07] shrink-0" />

                {[
                  { label: "Situação",  value: filtroSituacao,  set: setFiltroSituacao,  items: ["Todos","A","I"] },
                ].map(({ label, value, set, items }) => (
                  <Select key={label} value={value} onValueChange={v => { set(v); setPage(1); }}>
                    <SelectTrigger className="h-7 min-w-[80px] max-w-[110px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-emerald-500/30 focus:outline-none">
                      <SelectValue placeholder={label} />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map(i => <SelectItem key={i} value={i}>{i === "Todos" ? label : i === "A" ? "Ativo" : i === "I" ? "Inativo" : i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ))}

                <Select value={filtroFilial} onValueChange={v => { setFiltroFilial(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[70px] max-w-[110px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-emerald-500/30 focus:outline-none">
                    <SelectValue placeholder="Filial" />
                  </SelectTrigger>
                  <SelectContent>{filiais.map(f => <SelectItem key={f} value={f}>{f === "Todos" ? "Filial" : f}</SelectItem>)}</SelectContent>
                </Select>

                <Select value={filtroFuncao} onValueChange={v => { setFiltroFuncao(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[90px] max-w-[160px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-emerald-500/30 focus:outline-none">
                    <SelectValue placeholder="Função" />
                  </SelectTrigger>
                  <SelectContent>{funcoes.map(f => <SelectItem key={f} value={f}>{f === "Todos" ? "Função" : f}</SelectItem>)}</SelectContent>
                </Select>

                <Select value={filtroCatCnh} onValueChange={v => { setFiltroCatCnh(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[70px] max-w-[100px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-emerald-500/30 focus:outline-none">
                    <SelectValue placeholder="CNH" />
                  </SelectTrigger>
                  <SelectContent>{catsCnh.map(c => <SelectItem key={c} value={c}>{c === "Todos" ? "Cat. CNH" : c}</SelectItem>)}</SelectContent>
                </Select>

                <Select value={filtroTipo} onValueChange={v => { setFiltroTipo(v); setPage(1); }}>
                  <SelectTrigger className="h-7 min-w-[90px] max-w-[140px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-slate-300 focus:border-emerald-500/30 focus:outline-none">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>{tiposFunc.map(t => <SelectItem key={t} value={t}>{t === "Todos" ? "Tipo" : t}</SelectItem>)}</SelectContent>
                </Select>

                {(filtroSituacao !== "Todos" || filtroFilial !== "Todos" || filtroFuncao !== "Todos" || filtroCatCnh !== "Todos" || filtroTipo !== "Todos") && (
                  <button
                    onClick={() => { setFiltroSituacao("Todos"); setFiltroFilial("Todos"); setFiltroFuncao("Todos"); setFiltroCatCnh("Todos"); setFiltroTipo("Todos"); setPage(1); }}
                    className="flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-500/[0.08] px-2.5 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-400/12 transition-all"
                  >
                    <X className="w-2.5 h-2.5" /> Limpar
                  </button>
                )}
                <div className="ml-auto text-[10px] text-slate-500">{fmtNum(filtrados.length)} colaboradores</div>
              </div>
            </AnimatedCard>

            {/* ════════════════════════════════════════════════════════
                SEÇÃO 1 — INDICADORES DE QUADRO
            ════════════════════════════════════════════════════════ */}
            <div className="flex items-center gap-2 mt-1">
              <Activity className="w-3 h-3 text-emerald-400/60" />
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Indicadores de Quadro</span>
              <div className="flex-1 h-px" style={{ background: RAW.borderDefault }} />
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {[
                { label: "Colaboradores Ativos", value: loading ? "—" : fmtNum(kpis.ativos),      sub: "SITUAC = \"A\"",                   Icon: UserCheck,  tone: "emerald" as const, delay: 80,  modal: null             },
                { label: "Admissões no Período", value: loading ? "—" : fmtNum(kpis.admissoes),   sub: "DATADM no intervalo",              Icon: UserPlus,   tone: "cyan"    as const, delay: 120, modal: "adm"            },
                { label: "Demissões no Período", value: loading ? "—" : fmtNum(kpis.demissoes),   sub: `Turnover: ${fmtPct(kpis.turnover)}`, Icon: UserMinus, tone: "rose"    as const, delay: 160, modal: "dem"            },
                { label: "CNH a Vencer (30d)",   value: loading ? "—" : fmtNum(kpis.cnh30),       sub: "VENCHA ≤ hoje + 30 dias",          Icon: ShieldAlert, tone: "amber"  as const, delay: 200, modal: "cnh30"          },
                { label: "Tempo Médio de Casa",  value: loading ? "—" : fmtAnos(kpis.mediaAnos),  sub: "AVG(hoje − DATADM) ativos",        Icon: Clock,      tone: "violet"  as const, delay: 240, modal: null             },
              ].map(({ label, value, sub, Icon, tone, delay, modal }) => {
                const t = TC[tone];
                const hasModal = !!modal && !loading;
                const handleClick = () => {
                  if (!hasModal) return;
                  if (modal === "adm")   setModalAdm(true);
                  if (modal === "dem")   setModalDem(true);
                  if (modal === "cnh30") setModalCnh30(true);
                };
                return (
                  <AnimatedCard key={label} delay={delay}>
                    <div
                      className={`relative overflow-hidden rounded-[18px] border p-3.5 transition-all duration-300 hover:border-white/[0.11] ${t.border} ${hasModal ? "cursor-pointer" : ""}`}
                      style={{ background: RAW.surfacePrimary }}
                      onClick={handleClick}
                    >
                      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[${t.glow}]/50 to-transparent`} />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-1">{label}</p>
                          <p className={`text-[22px] font-black leading-none tracking-tight dark:text-white text-slate-800 ${loading ? "animate-pulse" : ""}`}>{value}</p>
                          <p className={`text-[10px] font-medium mt-1.5 ${t.sub}`}>{sub}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <div className={`shrink-0 rounded-xl p-2 ${t.bg} border ${t.border}`}>
                            <Icon className={`w-4 h-4 ${t.icon}`} />
                          </div>
                          {hasModal && (
                            <div className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-semibold border ${t.border} ${t.bg} ${t.icon}`}>
                              <Eye className="w-2.5 h-2.5" />
                              <span>Ver</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="pointer-events-none absolute inset-0 rounded-[18px]" style={{ background: `radial-gradient(circle at 100% 100%, ${t.glow}1a, transparent 65%)` }} />
                    </div>
                  </AnimatedCard>
                );
              })}
            </div>

            {/* ════════════════════════════════════════════════════════
                SEÇÃO 2 — ANÁLISE DE QUADRO
            ════════════════════════════════════════════════════════ */}
            <div className="flex items-center gap-2 mt-1">
              <BarChart3 className="w-3 h-3 text-emerald-400/60" />
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Análise de Quadro</span>
              <div className="flex-1 h-px" style={{ background: RAW.borderDefault }} />
            </div>

            {/* Row 1: Função | Categoria CNH | Tipo+Sexo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">

              {/* Por Função */}
              <AnimatedCard delay={300}>
                <div className="rounded-[18px] border p-3" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Hash className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Por Função / Cargo</span>
                    <span className="ml-auto text-[8px] text-slate-600 uppercase tracking-[0.2em]">Top 8</span>
                  </div>
                  {distFuncao.length === 0
                    ? <div className="flex h-16 items-center justify-center text-[11px] text-slate-600">{loading ? "Carregando..." : "Sem dados"}</div>
                    : <div className="space-y-1.5">
                        {distFuncao.map((r, i) => {
                          const max = distFuncao[0].qtd;
                          return (
                            <div key={r.nome} className="flex items-center gap-2">
                              <span className="w-4 text-[9px] font-bold text-slate-600 shrink-0 text-right">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[10px] font-medium text-slate-300 truncate">{r.nome}</span>
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

              {/* Categoria CNH */}
              <AnimatedCard delay={330}>
                <div className="rounded-[18px] border p-3" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Categoria de CNH</span>
                  </div>
                  {distCatCnh.length === 0
                    ? <div className="flex h-16 items-center justify-center text-[11px] text-slate-600">{loading ? "Carregando..." : "Sem dados"}</div>
                    : <div className="space-y-2">
                        {distCatCnh.map(r => {
                          const total = distCatCnh.reduce((s, x) => s + x.qtd, 0);
                          return (
                            <div key={r.cat} className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: r.fill }} />
                              <span className="text-[10px] text-slate-300 flex-1">{r.cat}</span>
                              <span className="text-[9px] text-slate-500">{total > 0 ? `${((r.qtd / total) * 100).toFixed(0)}%` : "—"}</span>
                              <span className="text-[10px] font-bold w-8 text-right" style={{ color: r.fill }}>{r.qtd}</span>
                            </div>
                          );
                        })}
                      </div>
                  }
                </div>
              </AnimatedCard>

              {/* Tipo + Sexo */}
              <AnimatedCard delay={360}>
                <div className="rounded-[18px] border p-3 h-full" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Tipo de Funcionário</span>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {distTipo.map(r => {
                      const total = distTipo.reduce((s, x) => s + x.qtd, 0);
                      return (
                        <div key={r.nome} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.fill }} />
                          <span className="text-[10px] text-slate-300 flex-1 truncate">{r.nome}</span>
                          <span className="text-[10px] font-bold" style={{ color: r.fill }}>{r.qtd} <span className="text-slate-500 font-normal">({total > 0 ? ((r.qtd / total) * 100).toFixed(0) : 0}%)</span></span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t pt-2.5" style={{ borderColor: RAW.borderDefault }}>
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 block mb-2">Sexo</span>
                    <div className="space-y-1.5">
                      {distSexo.map(r => {
                        const total = distSexo.reduce((s, x) => s + x.qtd, 0);
                        return (
                          <div key={r.nome} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.fill }} />
                            <span className="text-[10px] text-slate-300 flex-1">{r.nome}</span>
                            <span className="text-[10px] font-bold" style={{ color: r.fill }}>{r.qtd} <span className="text-slate-500 font-normal">({total > 0 ? ((r.qtd / total) * 100).toFixed(0) : 0}%)</span></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            </div>

            {/* Row 2: Tempo de Casa | Alertas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">

              {/* Tempo de Casa */}
              <AnimatedCard delay={390}>
                <div className="rounded-[18px] border p-3" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Tempo de Casa — Faixas (Ativos)</span>
                  </div>
                  <div className="space-y-1.5">
                    {distTempoCasa.map(r => {
                      const max = Math.max(...distTempoCasa.map(x => x.qtd), 1);
                      return (
                        <div key={r.faixa} className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 w-[80px] shrink-0">{r.faixa}</span>
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(r.qtd / max) * 100}%`, background: r.fill }} />
                          </div>
                          <span className="text-[10px] font-bold w-7 text-right" style={{ color: r.fill }}>{r.qtd}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </AnimatedCard>

              {/* Alertas CNH */}
              <AnimatedCard delay={420}>
                <div className="rounded-[18px] border p-3" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Alertas Operacionais</span>
                    <button
                      onClick={() => setModalAlertas(true)}
                      className="ml-auto flex items-center gap-0.5 rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-1.5 py-0.5 text-[8px] font-semibold text-amber-300 hover:bg-amber-400/12 transition-all"
                    >
                      <Eye className="w-2.5 h-2.5" /><span>Ver</span>
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: "CNH vencida",           count: alertas.cnhVencida, cls: "bg-rose-500/10 border-rose-500/20 text-rose-300", dotCls: "bg-rose-400", severity: true  },
                      { label: "CNH vence em 30 dias",  count: alertas.cnh30,      cls: "bg-amber-500/10 border-amber-500/20 text-amber-300", dotCls: "bg-amber-400", severity: alertas.cnh30 > 0 },
                      { label: "CNH vence em 60 dias",  count: alertas.cnh60,      cls: "bg-yellow-500/10 border-yellow-500/20 text-yellow-300", dotCls: "bg-yellow-400", severity: false },
                      { label: "Sem CNH cadastrada",    count: alertas.semCnh,     cls: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300", dotCls: "bg-cyan-400", severity: false },
                      { label: "Sem CPF cadastrado",    count: alertas.semCpf,     cls: "bg-slate-500/10 border-slate-500/20 text-slate-300", dotCls: "bg-slate-400", severity: false },
                    ].map(({ label, count, cls, dotCls, severity }) => (
                      <div key={label} className={`flex items-center gap-2 rounded-[10px] border px-2.5 py-1.5 ${cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls} ${severity && count > 0 ? "animate-pulse" : ""}`} />
                        <span className="text-[10px] flex-1">{label}</span>
                        <span className="text-[12px] font-black">{loading ? "—" : count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedCard>
            </div>

            {/* ════════════════════════════════════════════════════════
                SEÇÃO 3 — TURNOVER
            ════════════════════════════════════════════════════════ */}
            <div className="flex items-center gap-2 mt-1">
              <TrendingDown className="w-3 h-3 text-rose-400/60" />
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Turnover</span>
              <div className="flex-1 h-px" style={{ background: RAW.borderDefault }} />
            </div>

            {/* KPIs Turnover */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Turnover no Período", value: loading ? "—" : fmtPct(kpis.turnover), sub: "Dem ÷ Ativos × 100",       Icon: TrendingDown, tone: "rose"   as const, delay: 460 },
                { label: "Saldo Líquido",        value: loading ? "—" : (kpisTurnover.saldo >= 0 ? `+${kpisTurnover.saldo}` : `${kpisTurnover.saldo}`), sub: "Admissões − Demissões", Icon: TrendingUp, tone: "cyan" as const, delay: 480 },
                { label: "Motivo + Frequente",   value: loading ? "—" : kpisTurnover.topMotivo.slice(0, 16), sub: "MOTBAI top 1",          Icon: FileText,  tone: "amber"  as const, delay: 500 },
                { label: "Perm. Média Demitidos",value: loading ? "—" : fmtAnos(kpisTurnover.mediaAnos), sub: "AVG(DATBAI − DATADM)",   Icon: Clock,     tone: "violet" as const, delay: 520 },
              ].map(({ label, value, sub, Icon, tone, delay }) => {
                const t = TC[tone];
                return (
                  <AnimatedCard key={label} delay={delay}>
                    <div className={`relative overflow-hidden rounded-[18px] border p-3.5 transition-all duration-300 hover:border-white/[0.11] ${t.border}`} style={{ background: RAW.surfacePrimary }}>
                      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[${t.glow}]/50 to-transparent`} />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-1">{label}</p>
                          <p className={`text-[18px] font-black leading-none tracking-tight dark:text-white text-slate-800 ${loading ? "animate-pulse" : ""}`}>{value}</p>
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

            {/* Evolução Mensal + Motivo Demissão */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">

              {/* Evolução Mensal — 2 cols */}
              <AnimatedCard delay={540} className="lg:col-span-2">
                <div className="rounded-[18px] border p-3 h-[220px] flex flex-col" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Admissões vs Demissões — Mensal</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[9px] text-emerald-400"><span className="w-2 h-2 rounded-full inline-block" style={{ background: RAW.accent.emerald }} />Admissões</span>
                      <span className="flex items-center gap-1 text-[9px] text-rose-400"><span className="w-2 h-2 rounded-full inline-block" style={{ background: RAW.accent.rose }} />Demissões</span>
                    </div>
                  </div>
                  {evolucaoMensal.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-[11px] text-slate-600">{loading ? "Carregando..." : "Sem movimentações no período"}</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={evolucaoMensal} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={10}>
                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                        <ReTooltip content={<DarkTooltip formatter={(v: number, n: string) => `${n}: ${v}`} />} />
                        <Bar dataKey="adm" name="Admissões" fill={RAW.accent.emerald} opacity={0.85} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="dem" name="Demissões" fill={RAW.accent.rose}    opacity={0.85} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </AnimatedCard>

              {/* Motivo Demissão */}
              <AnimatedCard delay={560}>
                <div className="rounded-[18px] border p-3 h-[220px] flex flex-col" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Motivo de Demissão</span>
                  </div>
                  {distMotivoDem.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-[11px] text-slate-600">{loading ? "Carregando..." : "Sem demissões no período"}</div>
                  ) : (
                    <div className="flex-1 space-y-2 overflow-auto pr-1">
                      {distMotivoDem.map((r, i) => {
                        const max = distMotivoDem[0].qtd;
                        const fill = [RAW.accent.rose, RAW.accent.amber, "#fb923c", RAW.accent.violet, RAW.accent.cyan, "#94a3b8"][i] ?? "#94a3b8";
                        return (
                          <div key={r.nome}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-slate-300 truncate max-w-[140px]">{r.nome}</span>
                              <span className="text-[10px] font-bold shrink-0 ml-1" style={{ color: fill }}>{r.qtd}</span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(r.qtd / max) * 100}%`, background: fill }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </AnimatedCard>
            </div>

            {/* Turnover por Filial */}
            <AnimatedCard delay={580}>
              <div className="rounded-[18px] border p-3" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Turnover por Filial</span>
                  <span className="text-[8px] text-slate-600 ml-auto uppercase tracking-[0.2em]">Demissões ÷ Ativos × 100</span>
                </div>
                {turnoverFilial.length === 0 ? (
                  <div className="flex h-10 items-center justify-center text-[11px] text-slate-600">{loading ? "Carregando..." : "Sem dados"}</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {turnoverFilial.map(r => {
                      const max = Math.max(...turnoverFilial.map(x => x.pct), 0.1);
                      const cor = r.pct > 6 ? RAW.accent.rose : r.pct > 3 ? RAW.accent.amber : RAW.accent.emerald;
                      return (
                        <div key={r.filial} className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-200">{r.filial}</span>
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span style={{ color: RAW.accent.emerald }}>Adm: {r.adm}</span>
                            <span style={{ color: RAW.accent.rose }}>Dem: {r.dem}</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: RAW.surfaceInset }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(r.pct / max) * 100}%`, background: cor }} />
                          </div>
                          <span className="text-[13px] font-black" style={{ color: cor }}>{fmtPct(r.pct)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </AnimatedCard>

            {/* ════════════════════════════════════════════════════════
                SEÇÃO 4 — DETALHAMENTO
            ════════════════════════════════════════════════════════ */}
            <div className="flex items-center gap-2 mt-1">
              <FileText className="w-3 h-3 text-emerald-400/60" />
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Detalhamento</span>
              <div className="flex-1 h-px" style={{ background: RAW.borderDefault }} />
            </div>

            {/* Tabela */}
            <AnimatedCard delay={620}>
              <div className="rounded-[18px] border" style={{ background: RAW.surfacePrimary, borderColor: RAW.borderDefault }}>

                <div className="flex flex-wrap items-center gap-2 px-3 pt-3 pb-2 border-b" style={{ borderColor: RAW.borderDefault }}>
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Colaboradores</span>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.07] px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                    {fmtNum(tabelaBuscada.length)} registros
                  </span>
                  {/* Botões rápidos Ativo / Inativo */}
                  <div className="flex items-center gap-1 ml-1">
                    {(["Todos", "A", "I"] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => { setTabelaSituacao(v); setPage(1); }}
                        className={`h-6 rounded-lg px-2 text-[9px] font-semibold transition-all border ${
                          tabelaSituacao === v
                            ? v === "A"
                              ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                              : v === "I"
                              ? "bg-rose-500/20 border-rose-400/40 text-rose-300"
                              : "bg-white/[0.08] border-white/[0.15] text-slate-200"
                            : "bg-transparent border-white/[0.06] text-slate-500 hover:border-white/[0.12] hover:text-slate-300"
                        }`}
                      >
                        {v === "Todos" ? "Todos" : v === "A" ? "Ativos" : "Inativos"}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPage(1); }}
                      placeholder="Buscar nome, matrícula, função..."
                      className="h-7 rounded-xl border border-white/[0.08] bg-white/[0.04] pl-6 pr-3 text-[11px] text-slate-300 placeholder-slate-600 focus:border-emerald-500/30 focus:outline-none transition-all w-[210px]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${RAW.borderDefault}`, background: RAW.surfaceInset }}>
                        {([
                          { key: "codmot",     label: "Matríc.",     align: "left",   resp: "" },
                          { key: "nome",       label: "Nome",        align: "left",   resp: "" },
                          { key: "funcao",     label: "Função",      align: "left",   resp: "hidden md:table-cell" },
                          { key: "codFilial",  label: "Filial",      align: "center", resp: "hidden sm:table-cell" },
                          { key: "tipoFunc",   label: "Tipo",        align: "center", resp: "hidden lg:table-cell" },
                          { key: "datAdm",     label: "Admissão",    align: "center", resp: "hidden sm:table-cell" },
                          { key: "anosEmpresa",label: "Tempo Casa",  align: "center", resp: "hidden md:table-cell" },
                          { key: "catCnh",     label: "CNH",         align: "center", resp: "hidden lg:table-cell" },
                          { key: "validadeCnh",label: "Val. CNH",    align: "center", resp: "hidden xl:table-cell" },
                          { key: "situacao",   label: "Situação",    align: "center", resp: "" },
                        ] as { key: keyof Colaborador; label: string; align: string; resp: string }[]).map(c => (
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
                            {Array.from({ length: 10 }).map((_, j) => (
                              <td key={j} className="px-3 py-2.5">
                                <div className="h-2 rounded-full bg-white/[0.04] animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : tabelaPagina.length === 0 ? (
                        <tr><td colSpan={10} className="py-8 text-center text-[12px] text-slate-600">Nenhum colaborador encontrado</td></tr>
                      ) : (
                        tabelaPagina.map((c, i) => (
                          <tr key={`${c.codmot}-${i}`} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${RAW.borderDefault}` }}>
                            <td className="px-3 py-2.5"><span className="font-mono text-[11px] text-emerald-300">{c.codmot}</span></td>
                            <td className="px-3 py-2.5"><span className="text-[11px] font-medium text-slate-200 truncate max-w-[150px] block">{c.nome}</span></td>
                            <td className="px-3 py-2.5 hidden md:table-cell"><span className="text-[10px] text-slate-400 truncate max-w-[120px] block">{c.funcao ?? "—"}</span></td>
                            <td className="px-3 py-2.5 hidden sm:table-cell text-center"><span className="text-[10px] font-mono text-slate-400">{c.codFilial ?? "—"}</span></td>
                            <td className="px-3 py-2.5 hidden lg:table-cell text-center">
                              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-cyan-400">{c.tipoFunc ?? "—"}</span>
                            </td>
                            <td className="px-3 py-2.5 hidden sm:table-cell text-center"><span className="text-[11px] text-slate-400">{fmtData(c.datAdm)}</span></td>
                            <td className="px-3 py-2.5 hidden md:table-cell text-center">
                              <span className="text-[11px] text-slate-300">{c.ativo && c.anosEmpresa !== null ? fmtAnos(c.anosEmpresa) : "—"}</span>
                            </td>
                            <td className="px-3 py-2.5 hidden lg:table-cell text-center">
                              {c.catCnh
                                ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-2 py-0.5 text-[9px] font-bold text-emerald-300">{c.catCnh}</span>
                                : <span className="text-[10px] text-slate-600">—</span>}
                            </td>
                            <td className="px-3 py-2.5 hidden xl:table-cell text-center">
                              {cnhBadge(c.diasCnhVencer, c.temCnh)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.15em] ring-1 ${
                                c.situacao === "A"
                                  ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
                                  : "bg-rose-500/10 text-rose-300 ring-rose-500/30"
                              }`}>
                                {c.situacao === "A" ? "Ativo" : c.situacao === "I" ? "Inativo" : c.situacao ?? "—"}
                              </span>
                            </td>
                          </tr>
                        ))
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
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] text-slate-400 transition-all hover:border-emerald-400/30 hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let p: number;
                        if (totalPages <= 5) p = i + 1;
                        else if (page <= 3) p = i + 1;
                        else if (page >= totalPages - 2) p = totalPages - 4 + i;
                        else p = page - 2 + i;
                        return (
                          <button key={p} onClick={() => setPage(p)} className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-semibold transition-all ${page === p ? "border border-emerald-400/40 bg-emerald-500/[0.15] text-emerald-300" : "border border-white/[0.06] text-slate-500 hover:border-emerald-400/20 hover:text-emerald-300"}`}>
                            {p}
                          </button>
                        );
                      })}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] text-slate-400 transition-all hover:border-emerald-400/30 hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed">
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

      {/* ═══════════════════════════════════════════════════════════
          MODAL — ADMISSÕES NO PERÍODO
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={modalAdm} onOpenChange={setModalAdm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" style={{ background: "var(--sgt-bg-section)", borderColor: RAW.borderDefault }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[13px] font-bold text-slate-200">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              Admissões no Período
              <span className="ml-auto rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-2 py-0.5 text-[9px] font-semibold text-cyan-300">
                {listaAdmissoes.length} admissões
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 mt-2">
            {listaAdmissoes.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-[12px] text-slate-600">Nenhuma admissão no período selecionado</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${RAW.borderDefault}`, background: RAW.surfaceInset }}>
                    {["Matríc.", "Nome", "Função", "Filial", "Admissão", "Situação"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listaAdmissoes.map((c, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: `1px solid ${RAW.borderDefault}` }}>
                      <td className="px-3 py-2 font-mono text-[10px] text-cyan-300">{c.codmot}</td>
                      <td className="px-3 py-2 text-[11px] font-medium text-slate-200">{c.nome}</td>
                      <td className="px-3 py-2 text-[10px] text-slate-400">{c.funcao ?? "—"}</td>
                      <td className="px-3 py-2 text-[10px] text-slate-400">{c.codFilial ?? "—"}</td>
                      <td className="px-3 py-2 text-[10px] text-emerald-300 font-medium">{fmtData(c.datAdm)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-semibold ring-1 ${c.situacao === "A" ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30" : "bg-rose-500/10 text-rose-300 ring-rose-500/30"}`}>
                          {c.situacao === "A" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          MODAL — DEMISSÕES NO PERÍODO
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={modalDem} onOpenChange={setModalDem}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" style={{ background: "var(--sgt-bg-section)", borderColor: RAW.borderDefault }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[13px] font-bold text-slate-200">
              <UserMinus className="w-4 h-4 text-rose-400" />
              Demissões no Período
              <span className="ml-auto rounded-full border border-rose-400/20 bg-rose-500/[0.08] px-2 py-0.5 text-[9px] font-semibold text-rose-300">
                {listaDemissoes.length} demissões
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 mt-2">
            {listaDemissoes.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-[12px] text-slate-600">Nenhuma demissão no período selecionado</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${RAW.borderDefault}`, background: RAW.surfaceInset }}>
                    {["Matríc.", "Nome", "Função", "Filial", "Demissão", "Motivo"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listaDemissoes.map((c, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: `1px solid ${RAW.borderDefault}` }}>
                      <td className="px-3 py-2 font-mono text-[10px] text-rose-300">{c.codmot}</td>
                      <td className="px-3 py-2 text-[11px] font-medium text-slate-200">{c.nome}</td>
                      <td className="px-3 py-2 text-[10px] text-slate-400">{c.funcao ?? "—"}</td>
                      <td className="px-3 py-2 text-[10px] text-slate-400">{c.codFilial ?? "—"}</td>
                      <td className="px-3 py-2 text-[10px] text-rose-300 font-medium">{fmtData(c.datDem)}</td>
                      <td className="px-3 py-2 text-[10px] text-slate-400 max-w-[140px] truncate">{c.motivoDem ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          MODAL — CNH A VENCER (30 dias)
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={modalCnh30} onOpenChange={setModalCnh30}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" style={{ background: "var(--sgt-bg-section)", borderColor: RAW.borderDefault }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[13px] font-bold text-slate-200">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              CNH a Vencer — próximos 30 dias
              <span className="ml-auto rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-2 py-0.5 text-[9px] font-semibold text-amber-300">
                {listaCnh30.length} motoristas
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 mt-2">
            {listaCnh30.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-[12px] text-slate-600">Nenhuma CNH vencendo nos próximos 30 dias</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${RAW.borderDefault}`, background: RAW.surfaceInset }}>
                    {["Matríc.", "Nome", "Função", "Filial", "Cat.", "Vencimento", "Dias Restantes"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listaCnh30.map((c, i) => {
                    const dias = c.diasCnhVencer ?? 0;
                    const cor  = dias < 0 ? "text-rose-300" : dias <= 10 ? "text-rose-300" : dias <= 20 ? "text-amber-300" : "text-yellow-300";
                    return (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: `1px solid ${RAW.borderDefault}` }}>
                        <td className="px-3 py-2 font-mono text-[10px] text-amber-300">{c.codmot}</td>
                        <td className="px-3 py-2 text-[11px] font-medium text-slate-200">{c.nome}</td>
                        <td className="px-3 py-2 text-[10px] text-slate-400">{c.funcao ?? "—"}</td>
                        <td className="px-3 py-2 text-[10px] text-slate-400">{c.codFilial ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">{c.catCnh ?? "—"}</span>
                        </td>
                        <td className="px-3 py-2 text-[10px] text-slate-300">{fmtData(c.validadeCnh)}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[11px] font-black ${cor}`}>
                            {dias < 0 ? `${Math.abs(dias)}d vencida` : dias === 0 ? "HOJE" : `${dias}d`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          MODAL — ALERTAS OPERACIONAIS
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={modalAlertas} onOpenChange={setModalAlertas}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" style={{ background: "var(--sgt-bg-section)", borderColor: RAW.borderDefault }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[13px] font-bold text-slate-200">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Alertas Operacionais — Detalhamento
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 mt-2 space-y-4">
            {([
              { titulo: "CNH Vencida",         lista: listaAlertas.cnhVencida, cor: "rose",   campo: "diasCnhVencer" as const, label: (c: Colaborador) => `${Math.abs(c.diasCnhVencer ?? 0)}d vencida`  },
              { titulo: "CNH vence em 30 dias", lista: listaAlertas.cnh30,     cor: "amber",  campo: "diasCnhVencer" as const, label: (c: Colaborador) => `${c.diasCnhVencer ?? 0}d restantes`           },
              { titulo: "CNH vence em 60 dias", lista: listaAlertas.cnh60,     cor: "yellow", campo: "diasCnhVencer" as const, label: (c: Colaborador) => `${c.diasCnhVencer ?? 0}d restantes`           },
              { titulo: "Sem CNH cadastrada",   lista: listaAlertas.semCnh,    cor: "cyan",   campo: null,                     label: (_: Colaborador) => "Sem CNH"                                       },
              { titulo: "Sem CPF cadastrado",   lista: listaAlertas.semCpf,    cor: "slate",  campo: null,                     label: (_: Colaborador) => "Sem CPF"                                       },
            ] as const).filter(g => g.lista.length > 0).map(({ titulo, lista, cor, label }) => (
              <div key={titulo}>
                <div className={`flex items-center gap-2 mb-2 px-1`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    cor === "rose" ? "bg-rose-400" : cor === "amber" ? "bg-amber-400" :
                    cor === "yellow" ? "bg-yellow-400" : cor === "cyan" ? "bg-cyan-400" : "bg-slate-400"
                  }`} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{titulo}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ring-1 ${
                    cor === "rose" ? "bg-rose-500/10 text-rose-300 ring-rose-500/30" :
                    cor === "amber" ? "bg-amber-500/10 text-amber-300 ring-amber-500/30" :
                    cor === "yellow" ? "bg-yellow-500/10 text-yellow-300 ring-yellow-500/30" :
                    cor === "cyan" ? "bg-cyan-500/10 text-cyan-300 ring-cyan-500/30" : "bg-slate-500/10 text-slate-300 ring-slate-500/20"
                  }`}>{lista.length}</span>
                </div>
                <div className="rounded-[12px] border overflow-hidden" style={{ borderColor: RAW.borderDefault }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: RAW.surfaceInset, borderBottom: `1px solid ${RAW.borderDefault}` }}>
                        {["Matríc.", "Nome", "Função", "Filial", "Cat. CNH", "Validade", "Status"].map(h => (
                          <th key={h} className="px-3 py-1.5 text-left text-[8px] font-bold uppercase tracking-[0.15em] text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((c, i) => (
                        <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: i < lista.length - 1 ? `1px solid ${RAW.borderDefault}` : "none" }}>
                          <td className="px-3 py-2 font-mono text-[10px] text-amber-300">{c.codmot}</td>
                          <td className="px-3 py-2 text-[11px] font-medium text-slate-200">{c.nome}</td>
                          <td className="px-3 py-2 text-[10px] text-slate-400">{c.funcao ?? "—"}</td>
                          <td className="px-3 py-2 text-[10px] text-slate-400">{c.codFilial ?? "—"}</td>
                          <td className="px-3 py-2">
                            {c.catCnh
                              ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">{c.catCnh}</span>
                              : <span className="text-[10px] text-slate-600">—</span>}
                          </td>
                          <td className="px-3 py-2 text-[10px] text-slate-300">{fmtData(c.validadeCnh)}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] font-bold ${
                              cor === "rose" ? "text-rose-300" : cor === "amber" ? "text-amber-300" :
                              cor === "yellow" ? "text-yellow-300" : "text-slate-400"
                            }`}>{label(c)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {Object.values(listaAlertas).every(l => l.length === 0) && (
              <div className="flex h-24 items-center justify-center text-[12px] text-slate-600">Nenhum alerta no momento</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
