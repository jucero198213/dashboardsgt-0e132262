// ─────────────────────────────────────────────────────────────────────────────
//  Executivo.tsx  –  Painel de comando consolidado de todas as áreas SGT
//  Carrega 8 APIs em paralelo e exibe KPIs, alertas e atalhos de módulos.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Wrench,
  Truck,
  Users,
  Fuel,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  DollarSign,
  Activity,
  Package,
  Navigation,
} from "lucide-react";

import {
  fetchDwData,
  fetchFaturamentoResumo,
  fetchCompras,
  fetchManutencao,
  fetchFrota,
  fetchRh,
  fetchOperacional,
  fetchAbastecimento,
} from "@/lib/dwApi";
import { UserMenu } from "@/components/auth/UserMenu";

// ─── Utilitários ──────────────────────────────────────────────────────────────

const today      = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const DATA_INICIO = iso(firstOfMonth);
const DATA_FIM    = iso(today);

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtN(n: number) {
  return n.toLocaleString("pt-BR");
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type Tone = "amber" | "cyan" | "emerald" | "violet" | "rose" | "orange";

const PALETTE: Record<Tone, { border: string; iconBg: string; iconTxt: string; glow: string; sub: string }> = {
  amber:   { border: "border-amber-400/20",   iconBg: "bg-amber-400/10 border-amber-400/25",   iconTxt: "text-amber-300",   glow: "rgba(245,158,11,0.10)",   sub: "text-amber-400/70"   },
  cyan:    { border: "border-cyan-400/20",    iconBg: "bg-cyan-400/10 border-cyan-400/25",    iconTxt: "text-cyan-300",    glow: "rgba(6,182,212,0.10)",    sub: "text-cyan-400/70"    },
  emerald: { border: "border-emerald-400/20", iconBg: "bg-emerald-400/10 border-emerald-400/25", iconTxt: "text-emerald-300", glow: "rgba(16,185,129,0.10)", sub: "text-emerald-400/70" },
  violet:  { border: "border-violet-400/20",  iconBg: "bg-violet-400/10 border-violet-400/25",  iconTxt: "text-violet-300",  glow: "rgba(139,92,246,0.10)",  sub: "text-violet-400/70"  },
  rose:    { border: "border-rose-400/20",    iconBg: "bg-rose-400/10 border-rose-400/25",    iconTxt: "text-rose-300",    glow: "rgba(244,63,94,0.10)",    sub: "text-rose-400/70"    },
  orange:  { border: "border-orange-400/20",  iconBg: "bg-orange-400/10 border-orange-400/25",  iconTxt: "text-orange-300",  glow: "rgba(251,146,60,0.10)",  sub: "text-orange-400/70"  },
};

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  loading,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tone: Tone;
  loading?: boolean;
  onClick?: () => void;
}) {
  const p = PALETTE[tone];
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border ${p.border} p-5 flex flex-col gap-3 transition-all duration-200 ${onClick ? "cursor-pointer hover:brightness-110 hover:-translate-y-0.5" : ""}`}
      style={{ background: "var(--sgt-bg-card)", boxShadow: `0 0 20px ${p.glow}` }}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${p.iconBg} ${p.iconTxt}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">{label}</p>
        {loading
          ? <div className="mt-2 h-6 w-28 animate-pulse rounded-lg bg-white/5" />
          : <p className="mt-1 text-[20px] font-black tracking-tight sgt-text leading-tight">{value}</p>
        }
        {sub && !loading && <p className={`mt-0.5 text-[11px] ${p.sub}`}>{sub}</p>}
      </div>
      {onClick && (
        <ArrowRight className={`absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-20 transition-opacity group-hover:opacity-60 ${p.iconTxt}`} />
      )}
    </div>
  );
}

// ─── Alerta item ──────────────────────────────────────────────────────────────

function AlertItem({
  level,
  label,
  value,
  onClick,
}: {
  level: "critical" | "warning" | "ok";
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const cfg = {
    critical: { dot: "bg-rose-400", txt: "text-rose-300", bg: "bg-rose-400/5 border-rose-400/15" },
    warning:  { dot: "bg-amber-400", txt: "text-amber-300", bg: "bg-amber-400/5 border-amber-400/15" },
    ok:       { dot: "bg-emerald-400", txt: "text-emerald-300", bg: "bg-emerald-400/5 border-emerald-400/15" },
  }[level];

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:brightness-110 ${cfg.bg}`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
        <span className="text-[12px] text-[var(--sgt-text-primary)]">{label}</span>
      </div>
      <span className={`text-[11px] font-bold tabular-nums ${cfg.txt}`}>{value}</span>
    </button>
  );
}

// ─── Módulo shortcut card ─────────────────────────────────────────────────────

function ModuleShortcut({
  icon: Icon,
  label,
  stat,
  tone,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  stat: string;
  tone: Tone;
  onClick: () => void;
}) {
  const p = PALETTE[tone];
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-xl border ${p.border} px-4 py-3 text-left transition-all hover:brightness-110 hover:-translate-y-0.5`}
      style={{ background: "var(--sgt-bg-card)" }}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${p.iconBg} ${p.iconTxt}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sgt-text-muted)]">{label}</p>
        <p className="text-[12px] font-semibold sgt-text truncate">{stat}</p>
      </div>
      <ArrowRight className={`h-3.5 w-3.5 shrink-0 opacity-30 transition-all group-hover:opacity-80 group-hover:translate-x-0.5 ${p.iconTxt}`} />
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Executivo() {
  const navigate = useNavigate();

  // ── Queries paralelas — todas disparam ao mesmo tempo ──
  const results = useQueries({
    queries: [
      {
        queryKey: ["exec-financeiro", DATA_INICIO, DATA_FIM],
        queryFn: () => fetchDwData({ dataInicio: DATA_INICIO, dataFim: DATA_FIM }),
        staleTime: 5 * 60_000,
      },
      {
        queryKey: ["exec-fat-resumo"],
        queryFn: fetchFaturamentoResumo,
        staleTime: 5 * 60_000,
      },
      {
        queryKey: ["exec-compras", DATA_INICIO, DATA_FIM],
        queryFn: () => fetchCompras({ dataInicio: DATA_INICIO, dataFim: DATA_FIM }),
        staleTime: 5 * 60_000,
      },
      {
        queryKey: ["exec-manutencao", DATA_INICIO, DATA_FIM],
        queryFn: () => fetchManutencao({ dataInicio: DATA_INICIO, dataFim: DATA_FIM }),
        staleTime: 5 * 60_000,
      },
      {
        queryKey: ["exec-frota"],
        queryFn: fetchFrota,
        staleTime: 10 * 60_000,
      },
      {
        queryKey: ["exec-rh"],
        queryFn: fetchRh,
        staleTime: 10 * 60_000,
      },
      {
        queryKey: ["exec-operacional"],
        queryFn: fetchOperacional,
        staleTime: 2 * 60_000,
      },
      {
        queryKey: ["exec-abastecimento", DATA_INICIO, DATA_FIM],
        queryFn: () => fetchAbastecimento({ dataInicio: DATA_INICIO, dataFim: DATA_FIM }),
        staleTime: 5 * 60_000,
      },
    ],
  });

  const [qFin, qFat, qCompras, qManut, qFrota, qRh, qOper, qAbast] = results;

  const anyLoading = results.some((r) => r.isLoading);

  // ── Derivações: FINANCEIRO ──
  const finKpis = useMemo(() => {
    const rows = qFin.data?.data ?? [];
    const today_ = new Date();
    today_.setHours(0, 0, 0, 0);

    const crRows = rows.filter((r) => r.ORIGEM === "CR");
    const cpRows = rows.filter((r) => r.ORIGEM === "CP");

    const totalCR  = crRows.reduce((s, r) => s + (r.VLR_PAR_RAW ?? 0), 0);
    const totalCP  = cpRows.reduce((s, r) => s + (r.VLR_PAR_RAW ?? 0), 0);
    const saldo    = totalCR - totalCP;

    const cpVencidas = cpRows.filter((r) => {
      if (!r.DATA_VENCIMENTO) return false;
      return new Date(r.DATA_VENCIMENTO) < today_ && r.SITUACAO === "A";
    });
    const cpVencidasValor = cpVencidas.reduce((s, r) => s + (r.VLR_PAR_RAW ?? 0), 0);

    const crVenc7 = crRows.filter((r) => {
      if (!r.DATA_VENCIMENTO) return false;
      const venc = new Date(r.DATA_VENCIMENTO);
      const diff = (venc.getTime() - today_.getTime()) / 86400000;
      return diff >= 0 && diff <= 7 && r.SITUACAO === "A";
    });
    const crVenc7Valor = crVenc7.reduce((s, r) => s + (r.VLR_PAR_RAW ?? 0), 0);

    return { totalCR, totalCP, saldo, cpVencidas: cpVencidas.length, cpVencidasValor, crVenc7: crVenc7.length, crVenc7Valor };
  }, [qFin.data]);

  // ── Derivações: FATURAMENTO ──
  const fatMes   = qFat.data?.monthly_revenue?.revenue_value ?? null;
  const fatDia   = qFat.data?.daily_revenue?.revenue_value ?? null;

  // ── Derivações: COMPRAS ──
  const comprasTotal = useMemo(() => {
    const rows = qCompras.data?.data ?? [];
    return rows.reduce((s, r) => s + (r.quantidade ?? 0) * (r.valor_un ?? 0), 0);
  }, [qCompras.data]);

  // ── Derivações: MANUTENÇÃO ──
  const manutKpis = useMemo(() => {
    const rows = qManut.data?.data ?? [];
    const custo = rows.reduce((s, r) => s + (r.custo ?? 0) * (r.qtd ?? 0) + (r.valormo ?? 0) + (r.valorpc ?? 0), 0);
    const emAndamento = new Set(rows.filter((r) => r.situacao === "ANDAMENTO").map((r) => String(r.ordem))).size;
    return { custo, emAndamento };
  }, [qManut.data]);

  // ── Derivações: FROTA ──
  const frotaKpis = useMemo(() => {
    const rows = qFrota.data?.data ?? [];
    const total   = rows.length;
    const ativos  = rows.filter((r) => r.situacao === "ATIVO").length;
    const baixados = rows.filter((r) => r.situacao === "BAIXADO").length;
    const pct     = total > 0 ? Math.round((ativos / total) * 100) : 0;
    return { total, ativos, baixados, pct };
  }, [qFrota.data]);

  // ── Derivações: RH ──
  const rhKpis = useMemo(() => {
    const rows = qRh.data?.data ?? [];
    const ativos   = rows.filter((r) => r.situacao === "A").length;
    const inativos = rows.filter((r) => r.situacao !== "A").length;
    return { total: rows.length, ativos, inativos };
  }, [qRh.data]);

  // ── Derivações: OPERACIONAL ──
  const operKpis = useMemo(() => {
    const rows = qOper.data?.data ?? [];
    const emViagem    = rows.filter((r) => r.situacao_viagem !== null && r.situacao_viagem !== "").length;
    const emManut     = rows.filter((r) => r.em_manutencao && r.em_manutencao !== 0 && r.em_manutencao !== "0").length;
    const pctMedio    = rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + (r.percentual_completo ?? 0), 0) / rows.length)
      : 0;
    return { emViagem, emManut, pctMedio, total: rows.length };
  }, [qOper.data]);

  // ── Derivações: ABASTECIMENTO ──
  const abastKpis = useMemo(() => {
    const rows = qAbast.data?.data ?? [];
    const custoTotal = rows.reduce((s, r) => s + (r.vlrtot ?? 0), 0);
    const litros     = rows.reduce((s, r) => s + (r.quanti ?? 0), 0);
    const mediaGeral = litros > 0
      ? rows.reduce((s, r) => s + (r.media ?? 0) * (r.quanti ?? 0), 0) / litros
      : 0;
    return { custoTotal, litros, mediaGeral };
  }, [qAbast.data]);

  // ── Mês formatado para o cabeçalho ──
  const mesAtual = today.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col min-h-[100dvh] px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* Atmosfera */}
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_75%_50%_at_50%_-8%,rgba(180,110,4,0.20),transparent_58%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_55%_50%_at_85%_110%,rgba(139,92,246,0.07),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_50%_45%_at_15%_110%,rgba(6,182,212,0.05),transparent_60%)]" />

      <section
        className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto"
        style={{
          background: "var(--sgt-bg-section)",
          borderColor: "var(--sgt-border-subtle)",
          boxShadow: "var(--sgt-section-shadow)",
        }}
      >
        <div className="relative flex flex-col flex-1 min-h-0 gap-5 p-3 sm:p-4 lg:p-6 w-full">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--sgt-text-muted)] hover:text-amber-300 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
              <div className="h-4 w-px bg-[var(--sgt-border)]" />
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h1 className="text-[16px] font-black tracking-tight sgt-text leading-tight">Painel Executivo</h1>
                  <p className="text-[11px] text-[var(--sgt-text-muted)] capitalize">{mesAtual}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {anyLoading && (
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--sgt-text-muted)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                  Carregando dados…
                </div>
              )}
              <UserMenu />
            </div>
          </div>

          {/* ── Bloco 1: KPIs Financeiros ── */}
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-400/70">
              Financeiro — {mesAtual}
            </p>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={TrendingUp}
                label="Faturamento do mês"
                value={fmt(fatMes)}
                sub={fatDia != null ? `Hoje: ${fmt(fatDia)}` : undefined}
                tone="amber"
                loading={qFat.isLoading}
                onClick={() => navigate("/faturamento")}
              />
              <KpiCard
                icon={DollarSign}
                label="A Receber (CR)"
                value={fmt(finKpis.totalCR)}
                sub="títulos no período"
                tone="emerald"
                loading={qFin.isLoading}
                onClick={() => navigate("/contas-a-receber")}
              />
              <KpiCard
                icon={DollarSign}
                label="A Pagar (CP)"
                value={fmt(finKpis.totalCP)}
                sub="títulos no período"
                tone="rose"
                loading={qFin.isLoading}
                onClick={() => navigate("/contas-a-pagar")}
              />
              <KpiCard
                icon={finKpis.saldo >= 0 ? TrendingUp : TrendingDown}
                label="Saldo líquido"
                value={fmt(finKpis.saldo)}
                sub="CR − CP"
                tone={finKpis.saldo >= 0 ? "cyan" : "rose"}
                loading={qFin.isLoading}
              />
            </div>
          </div>

          {/* ── Bloco 2: KPIs Operacionais ── */}
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400/70">
              Operacional — snapshot atual
            </p>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={Truck}
                label="Frota ativa"
                value={`${frotaKpis.pct}%`}
                sub={`${frotaKpis.ativos} de ${frotaKpis.total} veículos`}
                tone="emerald"
                loading={qFrota.isLoading}
                onClick={() => navigate("/frota")}
              />
              <KpiCard
                icon={Navigation}
                label="Viagens em andamento"
                value={fmtN(operKpis.emViagem)}
                sub={`${operKpis.pctMedio}% concluído (média)`}
                tone="cyan"
                loading={qOper.isLoading}
                onClick={() => navigate("/em-desenvolvimento/operacional")}
              />
              <KpiCard
                icon={Wrench}
                label="Custo manutenção"
                value={fmt(manutKpis.custo)}
                sub={`${manutKpis.emAndamento} ordens em andamento`}
                tone="orange"
                loading={qManut.isLoading}
                onClick={() => navigate("/manutencao")}
              />
              <KpiCard
                icon={Fuel}
                label="Custo abastecimento"
                value={fmt(abastKpis.custoTotal)}
                sub={`${abastKpis.litros.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} L · média ${abastKpis.mediaGeral.toFixed(2)} km/L`}
                tone="amber"
                loading={qAbast.isLoading}
                onClick={() => navigate("/em-desenvolvimento/abastecimento")}
              />
            </div>
          </div>

          {/* ── Bloco 3: Alertas + RH + Compras ── */}
          <div className="grid gap-4 lg:grid-cols-3">

            {/* Alertas e exceções */}
            <div
              className="rounded-2xl border border-[var(--sgt-border)] p-4 flex flex-col gap-3"
              style={{ background: "var(--sgt-bg-card)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-400/80">Alertas e exceções</p>
              </div>

              <AlertItem
                level={finKpis.cpVencidas > 0 ? "critical" : "ok"}
                label="CP vencidas sem pagamento"
                value={finKpis.cpVencidas > 0 ? `${finKpis.cpVencidas} títulos · ${fmt(finKpis.cpVencidasValor)}` : "Nenhuma"}
                onClick={() => navigate("/contas-a-pagar")}
              />
              <AlertItem
                level={finKpis.crVenc7 > 0 ? "warning" : "ok"}
                label="CR vencendo em 7 dias"
                value={finKpis.crVenc7 > 0 ? `${finKpis.crVenc7} títulos · ${fmt(finKpis.crVenc7Valor)}` : "Nenhum"}
                onClick={() => navigate("/contas-a-receber")}
              />
              <AlertItem
                level={frotaKpis.baixados > 0 ? "warning" : "ok"}
                label="Veículos baixados / inativos"
                value={frotaKpis.baixados > 0 ? `${frotaKpis.baixados} veículos` : "Todos ativos"}
                onClick={() => navigate("/frota")}
              />
              <AlertItem
                level={manutKpis.emAndamento > 5 ? "warning" : manutKpis.emAndamento > 0 ? "warning" : "ok"}
                label="Ordens de manutenção em aberto"
                value={manutKpis.emAndamento > 0 ? `${manutKpis.emAndamento} ordens` : "Nenhuma"}
                onClick={() => navigate("/manutencao")}
              />
              <AlertItem
                level={operKpis.emManut > 0 ? "warning" : "ok"}
                label="Veículos em manutenção (operacional)"
                value={operKpis.emManut > 0 ? `${operKpis.emManut} veículos` : "Nenhum"}
                onClick={() => navigate("/em-desenvolvimento/operacional")}
              />
            </div>

            {/* RH resumo */}
            <div
              className="rounded-2xl border border-[var(--sgt-border)] p-4 flex flex-col gap-3"
              style={{ background: "var(--sgt-bg-card)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-3.5 w-3.5 text-violet-400" />
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-violet-400/80">Recursos humanos</p>
              </div>

              {qRh.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-white/5" />)}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-xl border border-violet-400/15 bg-violet-400/5 px-4 py-3">
                    <span className="text-[12px] text-[var(--sgt-text-primary)]">Total de funcionários</span>
                    <span className="text-[14px] font-black text-violet-300">{fmtN(rhKpis.total)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3">
                    <span className="text-[12px] text-[var(--sgt-text-primary)]">Ativos</span>
                    <span className="text-[14px] font-black text-emerald-300">{fmtN(rhKpis.ativos)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-rose-400/15 bg-rose-400/5 px-4 py-3">
                    <span className="text-[12px] text-[var(--sgt-text-primary)]">Inativos / demitidos</span>
                    <span className="text-[14px] font-black text-rose-300">{fmtN(rhKpis.inativos)}</span>
                  </div>
                  {/* Barra de aproveitamento */}
                  <div className="mt-1 space-y-1">
                    <div className="flex justify-between text-[10px] text-[var(--sgt-text-muted)]">
                      <span>% ativos</span>
                      <span>{rhKpis.total > 0 ? Math.round((rhKpis.ativos / rhKpis.total) * 100) : 0}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--sgt-border)]">
                      <div
                        className="h-1.5 rounded-full bg-violet-400/60"
                        style={{ width: `${rhKpis.total > 0 ? Math.round((rhKpis.ativos / rhKpis.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Compras resumo */}
            <div
              className="rounded-2xl border border-[var(--sgt-border)] p-4 flex flex-col gap-3"
              style={{ background: "var(--sgt-bg-card)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-400/80">Compras — {mesAtual}</p>
              </div>

              {qCompras.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-white/5" />)}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-3">
                    <span className="text-[12px] text-[var(--sgt-text-primary)]">Total comprado</span>
                    <span className="text-[14px] font-black text-amber-300">{fmt(comprasTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3">
                    <span className="text-[12px] text-[var(--sgt-text-primary)]">NFs de entrada</span>
                    <span className="text-[14px] font-black text-cyan-300">
                      {fmtN(new Set((qCompras.data?.data ?? []).map((r) => String(r.nota_fiscal))).size)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3">
                    <span className="text-[12px] text-[var(--sgt-text-primary)]">Fornecedores ativos</span>
                    <span className="text-[14px] font-black text-emerald-300">
                      {fmtN(new Set((qCompras.data?.data ?? []).map((r) => r.fornecedor ?? "")).size)}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate("/compras")}
                    className="mt-auto flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-400/5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300 hover:bg-amber-400/10 transition-colors"
                  >
                    Ver detalhes <ArrowRight className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Bloco 4: Atalhos de módulos ── */}
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--sgt-text-muted)]">
              Acesso rápido aos módulos
            </p>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              <ModuleShortcut
                icon={BarChart3}
                label="Dashboard"
                stat="Fluxo de caixa"
                tone="amber"
                onClick={() => navigate("/dashboard")}
              />
              <ModuleShortcut
                icon={TrendingUp}
                label="Indicadores"
                stat="KPIs e metas"
                tone="violet"
                onClick={() => navigate("/indicadores")}
              />
              <ModuleShortcut
                icon={DollarSign}
                label="Contas a Receber"
                stat={fmt(finKpis.totalCR)}
                tone="emerald"
                onClick={() => navigate("/contas-a-receber")}
              />
              <ModuleShortcut
                icon={DollarSign}
                label="Contas a Pagar"
                stat={fmt(finKpis.totalCP)}
                tone="rose"
                onClick={() => navigate("/contas-a-pagar")}
              />
              <ModuleShortcut
                icon={Package}
                label="Faturamento"
                stat={fmt(fatMes)}
                tone="amber"
                onClick={() => navigate("/faturamento")}
              />
              <ModuleShortcut
                icon={ShoppingCart}
                label="Compras"
                stat={fmt(comprasTotal)}
                tone="amber"
                onClick={() => navigate("/compras")}
              />
              <ModuleShortcut
                icon={Wrench}
                label="Manutenção"
                stat={`${manutKpis.emAndamento} em andamento`}
                tone="orange"
                onClick={() => navigate("/manutencao")}
              />
              <ModuleShortcut
                icon={Truck}
                label="Frota"
                stat={`${frotaKpis.ativos} ativos / ${frotaKpis.total}`}
                tone="cyan"
                onClick={() => navigate("/frota")}
              />
              <ModuleShortcut
                icon={Fuel}
                label="Abastecimento"
                stat={fmt(abastKpis.custoTotal)}
                tone="orange"
                onClick={() => navigate("/em-desenvolvimento/abastecimento")}
              />
              <ModuleShortcut
                icon={Activity}
                label="Operacional"
                stat={`${operKpis.emViagem} viagens`}
                tone="cyan"
                onClick={() => navigate("/em-desenvolvimento/operacional")}
              />
              <ModuleShortcut
                icon={Users}
                label="RH"
                stat={`${rhKpis.ativos} ativos`}
                tone="violet"
                onClick={() => navigate("/em-desenvolvimento/rh")}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--sgt-border-subtle)]">
            <p className="text-[10px] tracking-[0.18em] text-[var(--sgt-text-faint)]">
              SGT Log · Painel Executivo · dados do mês corrente
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--sgt-text-faint)]">
              <CheckCircle2 className="h-3 w-3 text-emerald-400/60" />
              {results.filter((r) => r.isSuccess).length} / {results.length} fontes carregadas
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
