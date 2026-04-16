import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, DollarSign, Percent, Target, TrendingUp, TrendingDown,
  ChevronRight, BarChart3, RefreshCw, Sparkles,
} from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { formatCurrency } from "@/data/mockData";
import { InsightsBlock } from "@/components/indicators/InsightsBlock";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCardSkeleton } from "@/components/shared/CardSkeleton";
import { useCallback, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";

// ─── Config ─────────────────────────────────────────────────────────────────
const INDICATOR_CODCUS: Record<string, string[]> = {
  "Compra de Ativo": ["26"],
  "Óleo Diesel":     ["21"],
  "Folha":           ["9"],
  "Imposto":         ["23"],
  "Pedágio":         ["24"],
  "Administrativo":  ["3"],
  "Manutenção":      ["4", "5", "6", "7", "25"],
};

const SUBTITLES: Record<string, string> = {
  "Compra de Ativo": "Investimentos em ativos fixos e equipamentos da empresa",
  "Óleo Diesel":     "Gastos com combustível diesel para operação da frota",
  "Folha":           "Despesas com pessoal, salários e encargos trabalhistas",
  "Imposto":         "Tributos, impostos e contribuições fiscais do período",
  "Pedágio":         "Custos com pedágios nas rotas operacionais",
  "Administrativo":  "Despesas administrativas gerais e de escritório",
  "Manutenção":      "Manutenção preventiva e corretiva de veículos e equipamentos",
};

// ─── Design system executivo — sem azul de template ─────────────────────────
type Tone = "cyan" | "emerald" | "amber" | "violet" | "rose";
const TONE: Record<Tone, {
  stripe: string; border: string; glow: string;
  iconBg: string; iconTxt: string; sub: string; spot: string;
}> = {
  cyan:    { stripe:"from-cyan-400/60 to-cyan-700/20",    border:"border-cyan-400/[0.12]",    glow:"hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]",    iconBg:"bg-cyan-400/[0.08] border border-cyan-400/[0.15]",    iconTxt:"text-cyan-300",    sub:"text-cyan-500/80",    spot:"rgba(6,182,212,0.10)" },
  emerald: { stripe:"from-emerald-400/60 to-emerald-700/20", border:"border-emerald-400/[0.12]", glow:"hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]", iconBg:"bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt:"text-emerald-300", sub:"text-emerald-500/80", spot:"rgba(16,185,129,0.10)" },
  amber:   { stripe:"from-amber-400/60 to-amber-700/20",   border:"border-amber-400/[0.12]",   glow:"hover:shadow-[0_4px_40px_rgba(245,158,11,0.18)]",   iconBg:"bg-amber-400/[0.08] border border-amber-400/[0.15]",   iconTxt:"text-amber-300",   sub:"text-amber-500/80",   spot:"rgba(245,158,11,0.10)" },
  violet:  { stripe:"from-violet-400/60 to-violet-700/20", border:"border-violet-400/[0.12]",  glow:"hover:shadow-[0_4px_40px_rgba(139,92,246,0.18)]",  iconBg:"bg-violet-400/[0.08] border border-violet-400/[0.15]",  iconTxt:"text-violet-300",  sub:"text-violet-500/80",  spot:"rgba(139,92,246,0.10)" },
  rose:    { stripe:"from-rose-400/60 to-rose-700/20",     border:"border-rose-400/[0.12]",    glow:"hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]",    iconBg:"bg-rose-400/[0.08] border border-rose-400/[0.15]",    iconTxt:"text-rose-300",    sub:"text-rose-500/80",    spot:"rgba(244,63,94,0.10)" },
};

const PAGE_SIZE_COMP = 8;
const PAGE_SIZE_DOCS = 50;

const fmt = (d: string | Date | null | undefined): string => {
  if (!d) return "—";
  if (d instanceof Date) return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  const s = String(d).trim();
  if (!s || s.toLowerCase() === "null") return "—";
  const parts = s.split("T")[0].split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return s;
};

// ─── Tooltip premium ────────────────────────────────────────────────────────
type TooltipPayloadItem = {
  dataKey?: string | number;
  color?: string;
  name?: string;
  value?: number;
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/[0.1] px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] dark:text-slate-600 text-slate-500">Dia {label}</p>
      {payload.map((p, idx) => (
        <div key={p.dataKey ?? idx} className="flex items-center gap-3">
          <span className="h-[3px] w-5 rounded-full shrink-0" style={{ background: p.color }} />
          <p className="text-[12px] font-medium dark:text-slate-400 text-slate-600">{p.name}</p>
          <p className="ml-auto pl-6 text-[13px] font-bold [color:var(--sgt-text-primary)]">{formatCurrency(typeof p.value === "number" ? p.value : 0)}</p>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card — nível executivo ──────────────────────────────────────────────
function KpiCardPremium({ label, value, subtitle, Icon, tone }: {
  label: string; value: string; subtitle: string; Icon: ComponentType<{ className?: string }>; tone: Tone;
}) {
  const t = TONE[tone];
  return (
    <div className={`group relative flex min-h-[110px] sm:min-h-[130px] md:min-h-[152px] flex-col overflow-hidden rounded-[14px] sm:rounded-[16px] md:rounded-[20px] border ${t.border} bg-[var(--sgt-bg-card)] transition-all duration-300 hover:-translate-y-[3px] ${t.glow} shadow-[0_2px_20px_rgba(0,0,0,0.4)]`}>

      {/* Stripe de cor no topo — identidade única por card */}
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${t.stripe}`} />

      {/* Spot glow no canto inferior direito */}
      <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36"
        style={{ background: `radial-gradient(circle at 100% 100%, ${t.spot}, transparent 65%)` }} />

      <div className="relative flex h-full flex-col p-3 sm:p-4 md:p-5">
        {/* Label + ícone */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-600 leading-tight">{label}</p>
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${t.iconBg} ${t.iconTxt} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Valor — protagonista da tela */}
        <p className="mt-auto pt-2 sm:pt-3 text-[clamp(1rem,4vw,1.875rem)] font-black leading-none tracking-[-0.05em] text-white break-words">
          {value}
        </p>

        {/* Subtítulo em tom */}
        <p className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${t.sub}`}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// ─── Config de headers contextuais por indicador ────────────────────────────
interface HeaderCfg {
  veilRgba: string;          // cor base do véu right-to-left
  stripe: string;            // classes gradient da stripe no topo
  border: string;            // border do card
  dotColor: string;          // classe da bolinha na info bar
  infoLabel: string;         // label uppercase esquerdo
  infoValue: string;         // valor principal da info bar
  infoValueColor: string;    // cor do valor principal
  extras: { text: string; color: string }[];
  codcus: string;
  badgeClass: string;        // borda + bg + text do badge
  badgeText: string;
}

const HEADER_CFG: Record<string, HeaderCfg> = {
  "Compra de Ativo": {
    veilRgba: "rgba(139,92,246,0.16)",
    stripe: "from-violet-400/60 to-violet-700/20",
    border: "border-violet-400/[0.12]",
    dotColor: "bg-violet-400", infoLabel: "ATIVO IMOBILIZADO",
    infoValue: "Equipamentos e Frota", infoValueColor: "text-violet-300",
    extras: [{ text: "IPCA ▲ +4,8% a.a.", color: "text-amber-400" }, { text: "Custo de reposição monitorado", color: "text-slate-500" }],
    codcus: "C. Custo 26",
    badgeClass: "border-violet-400/20 bg-violet-400/10 text-violet-300",
    badgeText: "Investimento Estratégico",
  },
  "Folha": {
    veilRgba: "rgba(52,211,153,0.13)",
    stripe: "from-emerald-400/60 to-emerald-700/20",
    border: "border-emerald-400/[0.12]",
    dotColor: "bg-emerald-400", infoLabel: "FOLHA DE PAGAMENTO",
    infoValue: "Salário Mín. R$ 1.518,00", infoValueColor: "text-emerald-300",
    extras: [{ text: "FGTS 8% + INSS 20%", color: "text-slate-400" }, { text: "Salários, encargos e benefícios", color: "text-slate-500" }],
    codcus: "C. Custo 09",
    badgeClass: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    badgeText: "Indicador Estratégico",
  },
  "Imposto": {
    veilRgba: "rgba(244,63,94,0.14)",
    stripe: "from-rose-400/60 to-rose-700/20",
    border: "border-rose-400/[0.12]",
    dotColor: "bg-rose-400", infoLabel: "OBRIGAÇÕES FISCAIS",
    infoValue: "ICMS · ISS · PIS · COFINS", infoValueColor: "text-rose-300",
    extras: [{ text: "Tributos estaduais e federais", color: "text-slate-400" }, { text: "Competência: período vigente", color: "text-slate-500" }],
    codcus: "C. Custo 23",
    badgeClass: "border-rose-400/20 bg-rose-400/10 text-rose-300",
    badgeText: "Indicador Estratégico",
  },
  "Pedágio": {
    veilRgba: "rgba(6,182,212,0.13)",
    stripe: "from-cyan-400/60 to-cyan-700/20",
    border: "border-cyan-400/[0.12]",
    dotColor: "bg-cyan-400", infoLabel: "CUSTOS VIÁRIOS",
    infoValue: "Rotas operacionais", infoValueColor: "text-cyan-300",
    extras: [{ text: "Tags e cancelamento monitorados", color: "text-slate-400" }, { text: "Praças em todas as rotas", color: "text-slate-500" }],
    codcus: "C. Custo 24",
    badgeClass: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    badgeText: "Indicador Estratégico",
  },
  "Administrativo": {
    veilRgba: "rgba(245,158,11,0.13)",
    stripe: "from-amber-400/60 to-amber-700/20",
    border: "border-amber-400/[0.12]",
    dotColor: "bg-amber-400", infoLabel: "DESPESAS GERAIS",
    infoValue: "Escritório e Serviços", infoValueColor: "text-amber-300",
    extras: [{ text: "Aluguel, utilities e terceiros", color: "text-slate-400" }, { text: "Overhead corporativo", color: "text-slate-500" }],
    codcus: "C. Custo 03",
    badgeClass: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    badgeText: "Indicador Estratégico",
  },
  "Manutenção": {
    veilRgba: "rgba(245,158,11,0.14)",
    stripe: "from-amber-400/60 to-orange-700/20",
    border: "border-amber-400/[0.12]",
    dotColor: "bg-orange-400", infoLabel: "MANUTENÇÃO DE FROTA",
    infoValue: "Preventiva e Corretiva", infoValueColor: "text-orange-300",
    extras: [{ text: "Peças, mão de obra e oficinas", color: "text-slate-400" }, { text: "Veículos e equipamentos", color: "text-slate-500" }],
    codcus: "C. Custo 04 · 05 · 06 · 07 · 25",
    badgeClass: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    badgeText: "Indicador Estratégico",
  },
};

// ─── Header contextual genérico (todos exceto Óleo Diesel) ───────────────────
function ContextualHeader({ indicador, navigate }: { indicador: { nome: string; percentualEsperado: number; percentualReal: number }; navigate: (p: string) => void }) {
  const cfg = HEADER_CFG[indicador.nome];
  const subtitle = SUBTITLES[indicador.nome] ?? "Detalhamento do indicador estratégico";

  return (
    <div className={`relative overflow-hidden rounded-[16px] sm:rounded-[20px] border ${cfg?.border ?? "border-white/[0.09]"} bg-[linear-gradient(150deg,rgba(10,16,36,0.98)_0%,rgba(5,9,20,1)_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_60px_rgba(0,0,0,0.5)]`}>

      {/* Stripe de identidade no topo */}
      {cfg && <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${cfg.stripe}`} />}

      {/* Véu de cor à direita */}
      {cfg && <div className="pointer-events-none absolute inset-y-0 right-0 w-[65%] bg-gradient-to-l to-transparent"
        style={{ backgroundImage: `linear-gradient(to left, ${cfg.veilRgba} 0%, ${cfg.veilRgba.replace(/[\d.]+\)$/, "0.04)")} 55%, transparent 100%)` }} />}

      {/* Info bar contextual */}
      {cfg && (
        <div className="relative z-10 flex flex-wrap items-center gap-2 sm:gap-4 border-b border-white/[0.06] bg-black/[0.22] px-3 sm:px-6 py-2">
          <div className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{cfg.infoLabel}</span>
            <span className={`ml-1 text-[12px] font-semibold ${cfg.infoValueColor}`}>{cfg.infoValue}</span>
          </div>
          {cfg.extras.map((e, i) => (
            <span key={i} className="flex items-center gap-3">
              <span className="h-3 w-px bg-white/10" />
              <span className={`text-[11px] ${e.color}`}>{e.text}</span>
            </span>
          ))}
          <span className="ml-auto text-[9px] text-slate-600">{cfg.codcus}</span>
        </div>
      )}

      {/* Conteúdo textual */}
      <div className="relative z-10 px-3 py-3 sm:px-6 sm:py-5">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate("/dashboard")}
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${cfg?.badgeClass ?? "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>
                <BarChart3 className="h-2.5 w-2.5" /> {cfg?.badgeText ?? "Indicador Estratégico"}
              </span>
            </div>
            <h1 className="bg-gradient-to-r from-white from-50% via-slate-200 to-slate-400 bg-clip-text text-[clamp(1.25rem,4vw,3rem)] font-extrabold tracking-[-0.04em] text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.06)]">
              {indicador.nome}
            </h1>
            <p className="mt-2.5 text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function IndicadorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { indicadores, dwRawData, dwChartData, dwFilter, setDwFilter, fetchFromDW, filiais, empresas, isProcessed, isFetchingDw } = useFinancialData();

  const [paginaComp, setPaginaComp] = useState(1);
  const [paginaDocs, setPaginaDocs] = useState(1);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [progress, setProgress] = useState(0);

  const indicador  = indicadores.find((i) => i.id === id);
  const codcusList = indicador ? (INDICATOR_CODCUS[indicador.nome] ?? []) : [];
  const di = dwFilter.dataInicio;
  const df = dwFilter.dataFim;

  const handleUpdate = useCallback(async () => {
    setProgress(0); setLoadingPhase("Conectando...");
    let cur = 0;
    const phases = [{ at: 20, label: "Buscando dados..." }, { at: 60, label: "Processando..." }, { at: 88, label: "Calculando..." }];
    const iv = window.setInterval(() => {
      cur = Math.min(cur + 3, 95); setProgress(Math.floor(cur));
      const p = [...phases].reverse().find((ph) => cur >= ph.at);
      if (p) setLoadingPhase(p.label);
    }, 200);
    try { await fetchFromDW(); window.clearInterval(iv); setLoadingPhase("Concluído!"); setProgress(100); }
    catch { window.clearInterval(iv); }
    finally { window.setTimeout(() => { setProgress(0); setLoadingPhase(""); }, 800); }
  }, [fetchFromDW]);

  const rowsFiltrados = useMemo(() => {
    if (!indicador || !codcusList.length) return [];
    return dwRawData.filter((r) => {
      if (r.ORIGEM !== "CP") return false;
      if (!codcusList.includes(String(r.CODCUS ?? "").trim())) return false;
      const em = r.DATA_EMISSAO ? String(r.DATA_EMISSAO).split("T")[0] : null;
      return em ? em >= di && em <= df : false;
    });
  }, [dwRawData, indicador, codcusList, di, df]);

  const totalValor = useMemo(() => rowsFiltrados.reduce((s, r) => s + (r.VLR_PARCELA ?? 0), 0), [rowsFiltrados]);

  const composicaoAll = useMemo(() => {
    const map: Record<string, number> = {};
    rowsFiltrados.forEach((r) => { const k = r.NOME_PARCEIRO || "N/A"; map[k] = (map[k] || 0) + (r.VLR_PARCELA ?? 0); });
    return Object.entries(map).map(([nome, valor]) => ({ nome, valor, pct: totalValor > 0 ? (valor / totalValor) * 100 : 0 })).sort((a, b) => b.valor - a.valor);
  }, [rowsFiltrados, totalValor]);

  const totalPaginasComp = Math.max(1, Math.ceil(composicaoAll.length / PAGE_SIZE_COMP));
  const composicaoPag    = composicaoAll.slice((paginaComp - 1) * PAGE_SIZE_COMP, paginaComp * PAGE_SIZE_COMP);

  const evolucaoDiaria = useMemo(() => {
    const mesAtual = di.substring(0, 7);
    const [ano, mes] = di.split("-").map(Number);
    const mesAnt = `${mes === 1 ? ano - 1 : ano}-${String(mes === 1 ? 12 : mes - 1).padStart(2, "0")}`;
    const byDay = (src: typeof dwRawData, pfx: string) => {
      const m: Record<string, number> = {};
      src.forEach((r) => {
        if (r.ORIGEM !== "CP" || !codcusList.includes(String(r.CODCUS ?? "").trim())) return;
        const em = r.DATA_EMISSAO ? String(r.DATA_EMISSAO).split("T")[0] : null;
        if (!em || !em.startsWith(pfx)) return;
        const dia = em.split("-")[2]; m[dia] = (m[dia] || 0) + (r.VLR_PARCELA ?? 0);
      }); return m;
    };
    const atual = byDay(dwRawData, mesAtual), anterior = byDay(dwChartData, mesAnt);
    const dias = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
    return dias.filter((d) => atual[d] !== undefined || anterior[d] !== undefined)
      .map((d) => ({ dia: Number(d), mesAtual: atual[d] ?? 0, mesAnterior: anterior[d] ?? 0 }));
  }, [dwRawData, dwChartData, di, codcusList]);

  const totalPaginasDocs = Math.max(1, Math.ceil(rowsFiltrados.length / PAGE_SIZE_DOCS));
  const docsPaginados    = rowsFiltrados.slice((paginaDocs - 1) * PAGE_SIZE_DOCS, paginaDocs * PAGE_SIZE_DOCS);

  const diffPct    = indicador ? indicador.percentualReal - indicador.percentualEsperado : 0;
  const isPositive = diffPct <= 0;

  const insights = useMemo(() => {
    if (!indicador) return [];
    const d = indicador.percentualReal - indicador.percentualEsperado, da = Math.abs(d);
    if (d > 3) return [{ type: "alert" as const, text: `Este indicador está ${da.toFixed(1)}% acima do esperado. Recomenda-se análise detalhada.` }];
    if (d < -3) return [{ type: "positive" as const, text: `Este indicador está ${da.toFixed(1)}% abaixo do esperado. Economia identificada no período.` }];
    return [{ type: "info" as const, text: `Indicador dentro da faixa esperada (diferença de ${da.toFixed(1)}%).` }];
  }, [indicador]);

  const filiaisFiltradas = dwFilter.empresa ? filiais.filter((f) => f.empresa === dwFilter.empresa) : filiais;

  const Paginacao = ({ atual, total, set }: { atual: number; total: number; set: (n: number) => void }) => {
    if (total <= 1) return null;
    return (
      <div className="flex items-center gap-1">
        <button onClick={() => set(Math.max(1, atual - 1))} disabled={atual === 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 bg-white/4 text-slate-500 hover:text-white disabled:opacity-25 transition-all">
          <ChevronRight className="h-3 w-3 rotate-180" />
        </button>
        {Array.from({ length: total }, (_, i) => i + 1).filter((p) => p === 1 || p === total || Math.abs(p - atual) <= 1)
          .reduce<(number | "…")[]>((acc, p, idx, arr) => { if (idx > 0 && (p as number) - (arr[idx-1] as number) > 1) acc.push("…"); acc.push(p); return acc; }, [])
          .map((p, i) => p === "…" ? <span key={`e${i}`} className="px-1 text-xs text-slate-700">…</span>
            : <button key={p} onClick={() => set(p as number)} className={`flex h-7 min-w-[28px] items-center justify-center rounded-lg border px-2 text-xs font-medium transition-all ${atual === p ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]" : "border-white/8 bg-white/4 text-slate-500 hover:text-white"}`}>{p}</button>
          )}
        <button onClick={() => set(Math.min(total, atual + 1))} disabled={atual === total} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 bg-white/4 text-slate-500 hover:text-white disabled:opacity-25 transition-all">
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    );
  };

  if (!indicador) return (
    <div className="flex min-h-screen items-center justify-center sgt-bg-base sgt-text">
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.18),transparent_60%)]" />
      <div className="relative text-center space-y-3">
        <p className="text-lg font-medium sgt-text">Indicador não encontrado</p>
        <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20 transition-all">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen sgt-bg-base sgt-text">

      {/* ── Atmosfera ── */}
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_75%_45%_at_50%_-10%,rgba(180,110,4,0.28),transparent_58%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_55%_40%_at_100%_110%,rgba(6,182,212,0.08),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere" style={{ background:"radial-gradient(ellipse 115% 115% at 50% 50%, transparent 12%, rgba(2,3,12,0.72) 100%)" }} />

      {/* Progress bar — âmbar coerente com tema */}
      {isFetchingDw && (
        <div className="fixed inset-x-0 top-0 z-50 h-[2px] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400 shadow-[0_0_14px_rgba(251,191,36,0.55)] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="relative w-full px-2 py-3 sm:px-4 sm:py-5 lg:px-8 lg:py-8 space-y-2 sm:space-y-4 lg:space-y-6">

          {/* ── Breadcrumb ── */}
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-2 text-xs text-slate-500">
              <button onClick={() => navigate("/dashboard")} className="transition-colors hover:text-slate-200">Dashboard</button>
              <ChevronRight className="h-3 w-3 opacity-40" />
              <span className="text-slate-300">{indicador.nome}</span>
            </nav>
            <UserMenu />
          </div>

          {/* ── Header — Óleo Diesel: A+C+D / demais: padrão ── */}
          {indicador.nome === "Óleo Diesel" ? (
            <div className="relative overflow-hidden rounded-[16px] sm:rounded-[20px] border border-amber-400/[0.12] bg-[linear-gradient(150deg,rgba(10,16,36,0.98)_0%,rgba(5,9,20,1)_100%)] shadow-[0_0_0_1px_rgba(201,162,39,0.06),0_20px_60px_rgba(0,0,0,0.5)]">

              {/* C — véu âmbar à direita */}
              <div className="pointer-events-none absolute inset-y-0 right-0 w-[65%] bg-gradient-to-l from-[rgba(201,162,39,0.17)] via-[rgba(201,162,39,0.05)] to-transparent" />

              {/* A — barra de preço ANP */}
              <div className="relative z-10 flex flex-wrap items-center gap-2 sm:gap-4 border-b border-white/[0.06] bg-black/[0.22] px-3 sm:px-6 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Diesel S-10</span>
                  <span className="ml-1 text-[12px] font-semibold text-amber-300">R$ 6,84/L</span>
                </div>
                <div className="hidden sm:block h-3 w-px bg-white/10" />
                <span className="hidden sm:inline text-[11px] font-medium text-emerald-400">▲ +2,3% vs mês anterior</span>
                <div className="hidden md:block h-3 w-px bg-white/10" />
                <span className="hidden md:inline text-[10px] text-slate-500">Referência nacional ANP</span>
                <span className="ml-auto text-[9px] text-slate-600">Atualizado hoje</span>
              </div>

              {/* D — gauge semicircular dinâmico */}
              <div className="absolute right-2 sm:right-5 top-[42px] sm:top-[48px] z-10 scale-75 sm:scale-100 origin-top-right">
                {(() => {
                  const cx = 60, cy = 72, r = 48;
                  const pReal = indicador.percentualReal;
                  const pMeta = indicador.percentualEsperado;
                  const pt = (pct: number, radius: number) => {
                    const a = Math.PI - (pct / 100) * Math.PI;
                    return { x: +(cx + radius * Math.cos(a)).toFixed(2), y: +(cy - radius * Math.sin(a)).toFixed(2) };
                  };
                  const fe  = pt(pReal, r);
                  const mo  = pt(pMeta, r + 7);
                  const mi  = pt(pMeta, r - 7);
                  const ml  = pt(pMeta, r + 15);
                  const laf = pReal > 50 ? 1 : 0;
                  return (
                    <svg viewBox="0 0 120 96" width="112" height="88">
                      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 0 ${cx+r} ${cy}`}
                        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" strokeLinecap="round"/>
                      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 ${laf} 0 ${fe.x} ${fe.y}`}
                        fill="none" stroke="#1fb8a6" strokeWidth="9" strokeLinecap="round"/>
                      <line x1={mi.x} y1={mi.y} x2={mo.x} y2={mo.y}
                        stroke="#c9a227" strokeWidth="2.5" strokeLinecap="round"/>
                      <circle cx={mo.x} cy={mo.y} r="3" fill="#c9a227"/>
                      <text x={ml.x} y={ml.y - 2} textAnchor="middle"
                        fill="#c9a227" fontSize="7" fontFamily="sans-serif">{pMeta}%</text>
                      <text x={cx} y={cy - 4} textAnchor="middle"
                        fill="white" fontSize="12" fontWeight="700" fontFamily="sans-serif">{pReal.toFixed(1)}%</text>
                      <text x={cx} y={cy + 6} textAnchor="middle"
                        fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="sans-serif">meta {pMeta}%</text>
                      <text x={cx-r-3} y={cy+14} fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="sans-serif">E</text>
                      <text x={cx+r-4} y={cy+14} fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="sans-serif">F</text>
                    </svg>
                  );
                })()}
              </div>

              {/* Conteúdo textual */}
              <div className="relative z-10 px-3 py-3 pr-[100px] sm:px-6 sm:py-5 sm:pr-[140px]">
                <div className="flex items-start gap-4">
                  <button onClick={() => navigate("/dashboard")}
                    className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.04)]">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                        <BarChart3 className="h-2.5 w-2.5" /> Indicador Estratégico
                      </span>
                    </div>
                    <h1 className="bg-gradient-to-r from-white from-50% via-slate-200 to-slate-400 bg-clip-text text-[clamp(1.25rem,4vw,3rem)] font-extrabold tracking-[-0.04em] text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.06)]">
                      {indicador.nome}
                    </h1>
                    <p className="mt-2.5 text-sm text-slate-500">{SUBTITLES[indicador.nome]}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ContextualHeader indicador={indicador} navigate={navigate} />
          )}

          {/* ── Filtros ── */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-[12px] sm:rounded-[16px] border border-white/[0.07] bg-[var(--sgt-bg-card)] px-2 sm:px-4 py-2 sm:py-3 overflow-hidden">
            {[
              { value: dwFilter.dataInicio, onChange: (v: string) => { setDwFilter("dataInicio", v); setPaginaComp(1); setPaginaDocs(1); }, type: "date" },
              { value: dwFilter.dataFim,    onChange: (v: string) => { setDwFilter("dataFim", v);    setPaginaComp(1); setPaginaDocs(1); }, type: "date" },
            ].map((inp, i) => (
              <input key={i} type="date" value={inp.value} onChange={(e) => inp.onChange(e.target.value)}
                className="h-7 sm:h-8 w-full min-w-[90px] max-w-[140px] rounded-lg sm:rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 sm:px-3 text-[11px] sm:text-sm text-slate-300 [color-scheme:dark] transition-all focus:border-amber-500/30 focus:outline-none" />
            ))}
            <select value={dwFilter.empresa ?? ""} onChange={(e) => { setDwFilter("empresa", e.target.value || null); setDwFilter("filial", null); }}
              className="h-7 sm:h-8 w-full min-w-[100px] max-w-[160px] rounded-lg sm:rounded-xl border border-white/[0.08] bg-[var(--sgt-input-bg)] px-2 sm:px-3 text-[11px] sm:text-sm text-slate-300 transition-all focus:border-amber-500/30 focus:outline-none">
              <option value="">Todas as empresas</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <select value={dwFilter.filial ?? ""} onChange={(e) => setDwFilter("filial", e.target.value || null)}
              className="h-7 sm:h-8 w-full min-w-[100px] max-w-[160px] rounded-lg sm:rounded-xl border border-white/[0.08] bg-[var(--sgt-input-bg)] px-2 sm:px-3 text-[11px] sm:text-sm text-slate-300 transition-all focus:border-amber-500/30 focus:outline-none">
              <option value="">Todas as filiais</option>
              {filiaisFiltradas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            <button onClick={() => void handleUpdate()} disabled={isFetchingDw}
              className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-all disabled:cursor-not-allowed ${isFetchingDw ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-amber-400/20 bg-amber-500/[0.08] text-amber-300 hover:bg-amber-400/12 hover:border-amber-400/30 hover:shadow-[0_0_18px_rgba(245,158,11,0.18)]"}`}>
              <RefreshCw className={`h-3.5 w-3.5 ${isFetchingDw ? "animate-spin" : ""}`} />
              {isFetchingDw
                ? <span className="flex items-center gap-2"><span className="hidden sm:inline">{loadingPhase}</span><span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">{progress}%</span></span>
                : "Atualizar"}
            </button>
          </div>

          {/* ── KPI Cards premium ── */}
          {isFetchingDw && !isProcessed ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map(i => <KpiCardSkeleton key={i} />)}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Valor Total",       value: formatCurrency(totalValor),                               subtitle: "Emissão no período",            Icon: DollarSign,    tone: "cyan"    as Tone },
                { label: "Percentual Real",   value: `${indicador.percentualReal.toFixed(1)}%`,                subtitle: "Do total de despesas",          Icon: Percent,       tone: (isPositive ? "emerald" : "amber") as Tone },
                { label: "Meta Esperada",     value: `${indicador.percentualEsperado}%`,                      subtitle: "Definido pela diretoria",       Icon: Target,        tone: "violet"  as Tone },
                { label: "Diferença",         value: `${diffPct > 0 ? "+" : ""}${diffPct.toFixed(1)}%`,       subtitle: isPositive ? "Abaixo do esperado" : "Acima do esperado", Icon: isPositive ? TrendingDown : TrendingUp, tone: isPositive ? "emerald" as Tone : "rose" as Tone },
              ].map((card, i) => (
                <div key={i} className="animate-[fadeSlideIn_0.5s_ease-out]" style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}>
                  <KpiCardPremium {...card} />
                </div>
              ))}
            </div>
          )}

          {/* ── Gráfico + Composição ── */}
          <div className="grid gap-2 sm:gap-3 md:gap-4 xl:grid-cols-[1.45fr_1fr] items-stretch">

            {/* Gráfico */}
            <div className="flex flex-col overflow-hidden rounded-[20px] border border-white/[0.07] bg-[var(--sgt-bg-card)] shadow-[0_2px_24px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-white/[0.11]">
              {/* Linha de cor no topo */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent pointer-events-none" />
              <div className="p-6 pb-0 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] dark:text-slate-500 text-slate-600">Evolução Diária</p>
                    <p className="mt-0.5 text-sm font-medium [color:var(--sgt-text-secondary)]">Mês Atual vs Mês Anterior</p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-2 text-slate-400">
                      <span className="h-[3px] w-7 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                      Mês atual
                    </span>
                    <span className="flex items-center gap-2 text-slate-500">
                      <span className="h-[2px] w-7 rounded-full bg-slate-600 inline-block [border-top:2px_dashed_rgba(100,116,139,0.6)]" />
                      Mês anterior
                    </span>
                  </div>
                </div>
              </div>
              {evolucaoDiaria.length > 0 ? (
                <div className="flex-1 min-h-[220px] sm:min-h-[280px] px-2 pb-5 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolucaoDiaria} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="dia" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={52}
                        tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}k` : String(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="mesAnterior" name="Mês Anterior" stroke="rgba(100,116,139,0.45)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "rgba(100,116,139,0.6)" }} />
                      <Line type="monotone" dataKey="mesAtual"    name="Mês Atual"    stroke="url(#lineGradient)"     strokeWidth={2.5} dot={{ r: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#0e7490", fill: "#22d3ee" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-1 min-h-[200px] sm:min-h-[280px] items-center justify-center">
                  <div className="text-center space-y-2">
                    <Sparkles className="h-8 w-8 text-slate-700 mx-auto" />
                    <p className="text-sm [color:var(--sgt-text-muted)]">Sem dados no período</p>
                  </div>
                </div>
              )}
            </div>

            {/* Composição */}
            <div className="overflow-hidden rounded-[16px] sm:rounded-[20px] border border-white/[0.07] bg-[var(--sgt-bg-card)] shadow-[0_2px_24px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-white/[0.11] p-3 sm:p-4 md:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] dark:text-slate-500 text-slate-600">Composição</p>
                  <p className="mt-0.5 text-sm font-medium [color:var(--sgt-text-secondary)]">Por fornecedor</p>
                </div>
                {composicaoAll.length > 0 && (
                  <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                    {composicaoAll.length} itens
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-3">
                {composicaoPag.length === 0 ? (
                  <div className="flex h-full items-center justify-center py-12">
                    <p className="text-sm [color:var(--sgt-text-muted)]">Sem dados no período</p>
                  </div>
                ) : composicaoPag.map((item, idx) => (
                  <div key={item.nome} className="group/row rounded-xl border border-transparent px-3 py-2.5 transition-all duration-200 hover:[background:var(--sgt-row-hover)] hover:border-[var(--sgt-border-subtle)]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-slate-600 w-4 shrink-0">
                        {String((paginaComp - 1) * PAGE_SIZE_COMP + idx + 1).padStart(2, "0")}
                      </span>
                      <p className="text-[11px] font-medium text-slate-300 flex-1 min-w-0 truncate">{item.nome}</p>
                    </div>
                    <div className="flex items-center gap-3 pl-6">
                      <div className="flex-1 h-[3px] overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(item.pct, 100)}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-white whitespace-nowrap shrink-0">{formatCurrency(item.valor)}</span>
                      <span className="text-[11px] font-semibold text-cyan-400 w-11 text-right shrink-0 whitespace-nowrap">{item.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {totalPaginasComp > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-[var(--sgt-border-subtle)] pt-4">
                  <p className="text-[11px] [color:var(--sgt-text-muted)]">{composicaoAll.length} fornecedores</p>
                  <Paginacao atual={paginaComp} total={totalPaginasComp} set={setPaginaComp} />
                </div>
              )}
            </div>
          </div>

          {/* ── Insights ── */}
          {insights.length > 0 && (
            <div className="animate-[fadeSlideIn_0.4s_ease-out]">
              <InsightsBlock insights={insights} />
            </div>
          )}

          {/* ── Documentos Detalhados ── */}
          <div className="overflow-hidden rounded-[16px] sm:rounded-[20px] border" style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}>
            {/* Header da tabela */}
            <div className="flex flex-wrap items-center justify-between border-b border-[var(--sgt-border-subtle)] px-3 py-3 sm:px-6 sm:py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] dark:text-slate-500 text-slate-600">Documentos Detalhados</p>
                <p className="mt-0.5 text-sm font-medium [color:var(--sgt-text-secondary)]">
                  {rowsFiltrados.length > 0 ? `${rowsFiltrados.length} documento(s) encontrado(s)` : "Nenhum documento"}
                </p>
              </div>
              {rowsFiltrados.length > 0 && (
                <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[11px] font-medium text-slate-400">
                  {(paginaDocs - 1) * PAGE_SIZE_DOCS + 1}–{Math.min(paginaDocs * PAGE_SIZE_DOCS, rowsFiltrados.length)} de {rowsFiltrados.length}
                </span>
              )}
            </div>

            {!isProcessed || rowsFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <Sparkles className="h-10 w-10 text-slate-700" />
                <p className="text-sm font-medium text-slate-500">
                  {isProcessed ? "Nenhum documento encontrado no período" : "Atualize os dados para visualizar"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-[var(--sgt-border-subtle)]">
                      {[
                        { label: "Dt. Emissão",  w: "w-[90px]",  align: "" },
                        { label: "Dt. Venc.",    w: "w-[90px]",  align: "" },
                        { label: "Dt. Pag.",     w: "w-[90px]",  align: "" },
                        { label: "Documento",    w: "w-[110px]", align: "" },
                        { label: "Parcela",      w: "w-[60px]",  align: "text-center" },
                        { label: "Fornecedor",   w: "",          align: "" },
                        { label: "C. Custo",     w: "w-[100px]", align: "" },
                        { label: "Valor",        w: "w-[115px]", align: "text-right" },
                        { label: "Vl. Pago",     w: "w-[115px]", align: "text-right" },
                        { label: "Sit.",         w: "w-[56px]",  align: "text-center" },
                      ].map((h) => (
                        <TableHead key={h.label} className={`${h.w} ${h.align} py-3 text-[9px] font-bold uppercase tracking-[0.22em] dark:text-slate-600 text-slate-500`}>{h.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docsPaginados.map((r, i) => (
                      <TableRow key={i} className="group/tr transition-colors duration-150 hover:[background:var(--sgt-row-hover)]">
                        <TableCell className="py-2.5 text-[12px] text-slate-400 whitespace-nowrap font-mono">{fmt(r.DATA_EMISSAO)}</TableCell>
                        <TableCell className="py-2.5 text-[12px] text-slate-400 whitespace-nowrap font-mono">{fmt(r.DATA_VENCIMENTO)}</TableCell>
                        <TableCell className="py-2.5 whitespace-nowrap font-mono text-[12px]">
                          {r.DATA_PAGAMENTO ? <span className="text-amber-400">{fmt(r.DATA_PAGAMENTO)}</span> : <span className="text-slate-700">—</span>}
                        </TableCell>
                        <TableCell className="py-2.5 text-[12px] font-semibold text-slate-200 whitespace-nowrap">{r.DOCUMENTO ?? "—"}</TableCell>
                        <TableCell className="py-2.5 text-center text-[12px] text-slate-500">{r.PARCELA ?? "—"}</TableCell>
                        <TableCell className="py-2.5 text-[12px] text-slate-300 max-w-[200px] truncate">{r.NOME_PARCEIRO ?? "—"}</TableCell>
                        <TableCell className="py-2.5 text-[12px] text-slate-600 truncate max-w-[100px]">{r.CENTRO_CUSTO ?? r.CODCUS ?? "—"}</TableCell>
                        <TableCell className="py-2.5 text-right text-[12px] font-bold text-white whitespace-nowrap">{formatCurrency(r.VLR_PARCELA ?? 0)}</TableCell>
                        <TableCell className="py-2.5 text-right text-[12px] whitespace-nowrap">
                          {(r.VLR_PAGO ?? 0) > 0 ? <span className="font-semibold text-amber-300">{formatCurrency(r.VLR_PAGO ?? 0)}</span> : <span className="text-slate-700">—</span>}
                        </TableCell>
                        <TableCell className="py-2.5 text-center">
                          <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase border ${
                            r.SITUACAO === "L" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" :
                            r.SITUACAO === "P" ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400" :
                            "border-amber-500/20 bg-amber-500/10 text-amber-400"
                          }`}>{r.SITUACAO ?? "—"}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPaginasDocs > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--sgt-border-subtle)] px-3 py-3 sm:px-6 sm:py-4">
                <p className="text-[11px] [color:var(--sgt-text-muted)]">{rowsFiltrados.length} documento(s)</p>
                <Paginacao atual={paginaDocs} total={totalPaginasDocs} set={setPaginaDocs} />
              </div>
            )}
            {totalPaginasDocs <= 1 && rowsFiltrados.length > 0 && (
              <div className="border-t border-[var(--sgt-border-subtle)] px-3 py-3 sm:px-6">
                <p className="text-[11px] [color:var(--sgt-text-muted)]">{rowsFiltrados.length} documento(s)</p>
              </div>
            )}
          </div>

      </div>
    </div>
  );
}
