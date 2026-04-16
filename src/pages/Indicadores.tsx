import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BarChart3, TrendingUp, DollarSign, Package, Fuel, Users, Receipt, Navigation, Briefcase, Wrench, Circle, RefreshCw } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DASHBOARD_MAX_W = "1800px";

// Identidade visual por indicador
const INDICATOR_IDENTITY: Record<string, {
  icon: React.ElementType;
  color: string;       // cor do ring e elementos de identidade
  colorRgb: string;    // rgb para gradientes/glows
  bgColor: string;     // fundo do ícone
  label: string;       // descrição curta
}> = {
  "Compra de Ativo": {
    icon: Package,
    color: "#60a5fa",
    colorRgb: "96,165,250",
    bgColor: "rgba(96,165,250,0.12)",
    label: "Investimentos",
  },
  "Óleo Diesel": {
    icon: Fuel,
    color: "#fbbf24",
    colorRgb: "251,191,36",
    bgColor: "rgba(251,191,36,0.12)",
    label: "Combustível",
  },
  "Folha": {
    icon: Users,
    color: "#a78bfa",
    colorRgb: "167,139,250",
    bgColor: "rgba(167,139,250,0.12)",
    label: "Pessoal",
  },
  "Imposto": {
    icon: Receipt,
    color: "#f472b6",
    colorRgb: "244,114,182",
    bgColor: "rgba(244,114,182,0.12)",
    label: "Fiscal",
  },
  "Pedágio": {
    icon: Navigation,
    color: "#22d3ee",
    colorRgb: "34,211,238",
    bgColor: "rgba(34,211,238,0.12)",
    label: "Rotas",
  },
  "Administrativo": {
    icon: Briefcase,
    color: "#94a3b8",
    colorRgb: "148,163,184",
    bgColor: "rgba(148,163,184,0.10)",
    label: "Gestão",
  },
  "Manutenção": {
    icon: Wrench,
    color: "#fb923c",
    colorRgb: "251,146,60",
    bgColor: "rgba(251,146,60,0.12)",
    label: "Frota",
  },
  "Pneu": {
    icon: Circle,
    color: "#34d399",
    colorRgb: "52,211,153",
    bgColor: "rgba(52,211,153,0.10)",
    label: "Borracharia",
  },
};

export default function Indicadores() {
  const navigate = useNavigate();
  const { indicadores, isFetchingDw, isProcessed, faturamento, dwFilter, setDwFilter, fetchFromDW, filiais, empresas } = useFinancialData();
  const [progress, setProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState("");

  const filiaisFiltradas = filiais.filter(f => !dwFilter.empresa || f.empresa === dwFilter.empresa);

  const handleUpdate = async () => {
    setProgress(0);
    setLoadingPhase("Conectando ao DW...");
    let current = 0;
    const phases = [
      { at: 15, label: "Consultando dados..." },
      { at: 35, label: "Processando contas a pagar..." },
      { at: 55, label: "Processando contas a receber..." },
      { at: 70, label: "Calculando indicadores..." },
      { at: 85, label: "Gerando gráficos..." },
    ];
    const interval = window.setInterval(() => {
      const speed = current < 30 ? 3 + Math.random() * 4 : current < 60 ? 2 + Math.random() * 3 : current < 85 ? 1 + Math.random() * 2 : 0.3 + Math.random() * 0.5;
      current = Math.min(current + speed, 95);
      setProgress(Math.floor(current));
      const phase = [...phases].reverse().find(p => current >= p.at);
      if (phase) setLoadingPhase(phase.label);
    }, 300);
    try {
      await fetchFromDW();
      window.clearInterval(interval);
      setLoadingPhase("Concluído!");
      setProgress(100);
    } catch {
      window.clearInterval(interval);
      setLoadingPhase("");
    } finally {
      window.setTimeout(() => { setProgress(0); setLoadingPhase(""); }, 800);
    }
  };


  return (
    <div
      className="flex flex-col transition-all duration-300 min-h-[100dvh] xl:h-[100dvh] overflow-auto xl:overflow-hidden px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* Atmosfera dark */}
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(160,100,4,0.22),transparent_60%)] light:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(6,182,212,0.08),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_50%_40%_at_100%_105%,rgba(6,182,212,0.07),transparent_60%)] light:bg-[radial-gradient(ellipse_50%_40%_at_100%_105%,rgba(6,182,212,0.04),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:opacity-100 light:opacity-40" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.68) 100%)" }} />

      <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto xl:overflow-hidden"
          style={{
            background: "var(--sgt-bg-section)",
            borderColor: "var(--sgt-border-subtle)",
            boxShadow: "var(--sgt-section-shadow)",
          }}
        >
          {/* Progress bar */}
          {isFetchingDw && (
            <div className="absolute inset-x-0 top-0 z-50">
              <div className="h-[3px] w-full overflow-hidden rounded-t-[24px] bg-transparent">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400 shadow-[0_0_12px_rgba(251,191,36,0.5)] transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 overflow-hidden w-full">

            {/* NAVBAR — idêntica ao dashboard */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              {/* Logo */}
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10">
                  <svg className="h-4.5 w-4.5 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <span className="text-[17px] font-extrabold tracking-[-0.03em] dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-slate-400 dark:bg-clip-text dark:text-transparent text-slate-800">
                  SGT Dashboard
                </span>
              </div>

              {/* Badge tempo real */}
              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Tempo real</span>
              </div>

              <div className="h-6 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

              {/* Label da tela + botão voltar */}
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-[12px] font-semibold text-violet-300 uppercase tracking-[0.18em]">Indicadores</span>
                <div className="h-4 w-px mx-1" style={{ background: "var(--sgt-divider)" }} />
                <button
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3.5 text-[12px] font-semibold transition-all border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400 hover:border-[var(--sgt-border-medium)] hover:bg-[var(--sgt-input-hover)] hover:text-white hover:-translate-y-0.5"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Voltar
                </button>
              </div>

              <div className="h-6 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

              {/* Filtros + Atualizar */}
              <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
                <DatePickerInput value={dwFilter.dataInicio} onChange={(v) => setDwFilter("dataInicio", v)} placeholder="Data início" />
                <DatePickerInput value={dwFilter.dataFim} onChange={(v) => setDwFilter("dataFim", v)} placeholder="Data fim" />
                <div className="h-4 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />
                <Select value={dwFilter.empresa ?? "__all__"} onValueChange={(v) => setDwFilter("empresa", v === "__all__" ? null : v)}>
                  <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[130px] rounded-lg text-[12px] transition-all"><SelectValue placeholder="Empresa" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Todas</SelectItem>{empresas.map((e) => (<SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>))}</SelectContent>
                </Select>
                <Select value={dwFilter.filial ?? "__all__"} onValueChange={(v) => setDwFilter("filial", v === "__all__" ? null : v)}>
                  <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[140px] rounded-lg text-[12px] transition-all"><SelectValue placeholder="Filial" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Todas</SelectItem>{filiaisFiltradas.map((f) => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}</SelectContent>
                </Select>
                <button onClick={() => void handleUpdate()} disabled={isFetchingDw}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3.5 text-[12px] font-semibold transition-all ${isFetchingDw ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.15)]" : "border-cyan-400/35 bg-cyan-500/15 text-cyan-200 hover:border-cyan-300/50 hover:bg-cyan-400/25 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:-translate-y-0.5"} disabled:cursor-not-allowed`}>
                  <RefreshCw className={`h-3 w-3 ${isFetchingDw ? "animate-spin" : ""}`} />
                  {isFetchingDw ? (<span className="flex items-center gap-1.5"><span className="inline">{loadingPhase}</span><span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">{progress}%</span></span>) : ("Atualizar")}
                </button>
              </div>
              <UserMenu />
            </div>

            <div className="h-px" style={{ background: "var(--sgt-divider)" }} />

            {/* CONTEÚDO */}
            <div className="flex flex-1 min-h-0 gap-3">

              {/* COLUNA ESQUERDA — grid 4x2 */}
              <div className="flex flex-col flex-1 min-w-0 min-h-0">
                <div className="grid grid-cols-2 lg:grid-cols-4 grid-rows-2 gap-3 flex-1 min-h-0 h-full">
                  {(isFetchingDw && !isProcessed
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="rounded-[14px] border animate-pulse h-40" style={{ background: "var(--sgt-skeleton-bg)", borderColor: "var(--sgt-border-subtle)" }} />
                      ))
                    : (() => {
                        // totalFat calculado uma vez fora do map
                        const totalFatInd = faturamento.reduce((s, r) => s + (r.FRETE_TOTAL ?? 0), 0);
                        return indicadores.map((ind, idx) => {
                        // NOVA FÓRMULA: valor do indicador / faturamento do mês
                        const percFat = totalFatInd > 0
                          ? Math.round((ind.valorAbsoluto / totalFatInd) * 1000) / 10
                          : ind.percentualReal;
                        const abaixoDaMeta = percFat < ind.percentualEsperado;
                        // Ring: cheio quando percFat = percentualEsperado; cap em 100%
                        const progress = Math.min((percFat / Math.max(ind.percentualEsperado, 0.1)) * 100, 100);
                        const identity = INDICATOR_IDENTITY[ind.nome] ?? {
                          icon: BarChart3,
                          color: "#94a3b8",
                          colorRgb: "148,163,184",
                          bgColor: "rgba(148,163,184,0.10)",
                          label: "",
                        };
                        const Icon = identity.icon;
                        const statusColor = abaixoDaMeta ? "#34d399" : "#f87171";
                        const statusRgb = abaixoDaMeta ? "52,211,153" : "248,113,113";

                        return (
                          <AnimatedCard key={ind.id} delay={idx * 60} className="h-full">
                            <Link
                              to={`/indicadores/${ind.id}`}
                              className="group relative flex flex-col rounded-[14px] sm:rounded-[16px] border transition-all duration-300 cursor-pointer h-full hover:-translate-y-1 overflow-hidden"
                              style={{
                                background: "var(--sgt-bg-card)",
                                borderColor: abaixoDaMeta ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)",
                              }}
                              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = abaixoDaMeta ? "rgba(52,211,153,0.45)" : "rgba(248,113,113,0.45)"; el.style.boxShadow = abaixoDaMeta ? "0 24px 48px rgba(0,0,0,0.4), 0 0 40px rgba(52,211,153,0.08)" : "0 24px 48px rgba(0,0,0,0.4), 0 0 40px rgba(248,113,113,0.08)"; }}
                              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = abaixoDaMeta ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"; el.style.boxShadow = "none"; }}
                            >
                              {/* Linha de acento no topo — cor de identidade */}
                              <div className="h-[2px] w-full shrink-0"
                                style={{ background: `linear-gradient(90deg, ${identity.color}, rgba(${identity.colorRgb},0.2))` }} />

                              {/* Glow de fundo — status verde/vermelho */}
                              <div className="pointer-events-none absolute inset-0"
                                style={{ background: abaixoDaMeta
                                  ? "radial-gradient(ellipse at 50% 30%, rgba(52,211,153,0.05), transparent 60%)"
                                  : "radial-gradient(ellipse at 50% 30%, rgba(248,113,113,0.05), transparent 60%)" }} />

                              <div className="relative flex flex-col flex-1 p-4 xl:p-5">

                                {/* TOPO: nome + ícone + badge */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110"
                                      style={{ background: identity.bgColor }}>
                                      <Icon className="h-3.5 w-3.5" style={{ color: identity.color }} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] dark:text-slate-300 text-slate-600 truncate">
                                        {ind.nome}
                                      </p>
                                      <p className="text-[10px] font-medium mt-0.5" style={{ color: `rgba(${identity.colorRgb},0.6)` }}>
                                        {identity.label}
                                      </p>
                                    </div>
                                  </div>
                                  <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold border ${abaixoDaMeta
                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                    : "bg-red-500/15 text-red-400 border-red-500/30"}`}>
                                    {abaixoDaMeta ? "OK" : "Alto"}
                                  </span>
                                </div>

                                {/* CENTRO: ring grande + percentual dominante */}
                                <div className="flex flex-1 items-center justify-center py-3">
                                  <div className="relative h-36 w-36">
                                    <svg viewBox="0 0 36 36" className="h-36 w-36 -rotate-90" style={{ overflow: "visible" }}>
                                      <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
                                      <circle cx="18" cy="18" r="14" fill="none"
                                        stroke={`rgba(${identity.colorRgb},0.10)`}
                                        strokeWidth="2.5" strokeDasharray="87.9 0" />
                                      <circle cx="18" cy="18" r="14" fill="none"
                                        stroke={identity.color}
                                        strokeWidth="2.5" strokeLinecap="round"
                                        strokeDasharray={`${progress * 0.879} 87.9`}
                                        className="transition-all duration-700"
                                        style={{ filter: `drop-shadow(0 0 2px ${identity.color}) drop-shadow(0 0 3px rgba(${identity.colorRgb},0.3))` }}
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                                      <span className="font-extrabold leading-none tabular-nums tracking-[-0.03em]"
                                        style={{
                                          color: identity.color,
                                          fontSize: percFat >= 100 ? "1.4rem" : "1.7rem",
                                        }}>
                                        {percFat > 999 ? "999+" : `${percFat.toFixed(1)}%`}
                                      </span>
                                      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] dark:text-slate-500 text-slate-400">
                                        do fat.
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* RODAPÉ: meta + barra + link */}
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold dark:text-slate-500 text-slate-400">
                                      Meta: <span className="dark:text-slate-300 text-slate-600">{ind.percentualEsperado}%</span>
                                    </span>
                                    <span className="text-[10px] font-bold tabular-nums" style={{ color: statusColor }}>
                                      {abaixoDaMeta
                                        ? `−${(ind.percentualEsperado - percFat).toFixed(1)}% p/ meta`
                                        : `+${(percFat - ind.percentualEsperado).toFixed(1)}% acima`}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                                    <div className="h-full rounded-full transition-all duration-700"
                                      style={{
                                        width: `${Math.min(progress, 100)}%`,
                                        background: identity.color,
                                        boxShadow: `0 0 6px rgba(${identity.colorRgb},0.5)`,
                                      }} />
                                  </div>
                                  <div className="flex justify-end">
                                    <span className="flex items-center gap-1 text-[10px] font-semibold opacity-40 group-hover:opacity-100 transition-opacity duration-300"
                                      style={{ color: identity.color }}>
                                      Ver detalhe
                                      <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </AnimatedCard>
                        );
                      });
                      })()
                  )}
                </div>
              </div>

              {/* COLUNA DIREITA — Faturamento */}
              {(() => {
                const totalFat = faturamento.reduce((s, r) => s + (r.FRETE_TOTAL ?? 0), 0);
                const formatBRL = (v: number) =>
                  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
                const maxFrete = Math.max(...faturamento.map((r) => r.FRETE_TOTAL ?? 0), 1);
                const BAR_COLORS = [
                  "#f59e0b", "#22d3ee", "#a78bfa", "#34d399",
                  "#fb923c", "#f472b6", "#60a5fa", "#94a3b8",
                ];

                return (
                  <div
                    className="w-[360px] xl:w-[420px] shrink-0 rounded-[20px] border flex flex-col p-5 gap-3"
                    style={{ borderColor: "var(--sgt-border-subtle)", background: "var(--sgt-bg-card)" }}
                  >
                    {/* Cabeçalho */}
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] dark:text-slate-500 text-slate-500 mb-1">
                        Visão geral
                      </p>
                      <p className="text-[24px] font-extrabold tracking-[-0.04em] dark:bg-gradient-to-r dark:from-white dark:from-40% dark:via-slate-200 dark:via-70% dark:to-slate-500 dark:bg-clip-text dark:text-transparent text-slate-800">
                        Faturamento
                      </p>
                    </div>

                    <div className="h-px" style={{ background: "var(--sgt-divider)" }} />

                    {/* Card Faturamento do Mês */}
                    <div
                      className="flex flex-col gap-2 rounded-[12px] border p-4"
                      style={{ borderColor: "rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.05)" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
                          Faturamento do Mês
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                          style={{ background: "rgba(251,191,36,0.12)" }}>
                          <DollarSign className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                      </div>
                      {isFetchingDw && faturamento.length === 0 ? (
                        <div className="h-8 w-4/5 rounded-md animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
                      ) : (
                        <p className="text-[22px] font-extrabold tracking-[-0.03em] text-amber-300 tabular-nums leading-none">
                          {formatBRL(totalFat)}
                        </p>
                      )}
                    </div>

                    <div className="h-px" style={{ background: "var(--sgt-divider)" }} />

                    {/* Gráfico barras horizontais por grupo */}
                    <div className="flex flex-col gap-1 flex-1 min-h-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] dark:text-slate-500 text-slate-500 mb-2 shrink-0">
                        Por grupo de cliente
                      </p>

                      {isFetchingDw && faturamento.length === 0 ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex flex-col gap-1">
                            <div className="h-3 w-2/3 rounded-sm animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
                            <div className="h-2 w-full rounded-full animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
                          </div>
                        ))
                      ) : faturamento.length === 0 ? (
                        <p className="text-[12px] dark:text-slate-600 text-slate-400 italic">Sem dados no período</p>
                      ) : (
                        <div className="flex flex-col justify-between flex-1 min-h-0">
                          {faturamento.map((row, idx) => {
                            const barW = Math.max((row.FRETE_TOTAL / maxFrete) * 100, 2);
                            const color = BAR_COLORS[idx % BAR_COLORS.length];
                            return (
                              <div key={idx} className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className="text-[12px] font-semibold truncate dark:text-slate-300 text-slate-600"
                                    style={{ maxWidth: "62%" }}
                                    title={row.DESCRI ?? "Sem grupo"}
                                  >
                                    {row.DESCRI ?? "Sem grupo"}
                                  </span>
                                  <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color }}>
                                    {(row.PERCENTUAL ?? 0).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="h-[6px] w-full rounded-full overflow-hidden"
                                  style={{ background: "var(--sgt-progress-track)" }}>
                                  <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                      width: `${barW}%`,
                                      background: color,
                                      boxShadow: `0 0 6px ${color}55`,
                                    }}
                                  />
                                </div>
                                <span className="text-[11px] tabular-nums dark:text-slate-500 text-slate-400">
                                  {formatBRL(row.FRETE_TOTAL)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
