import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BarChart3, TrendingUp, TrendingDown, DollarSign, RefreshCw, Package, Fuel, Users, Receipt, Navigation, Briefcase, Wrench, Circle } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { AnimatedCard } from "@/components/shared/AnimatedCard";

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
  const { indicadores, isFetchingDw, isProcessed } = useFinancialData();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isFetchingDw) {
      if (progress > 0) {
        setProgress(100);
        const t = window.setTimeout(() => setProgress(0), 800);
        return () => window.clearTimeout(t);
      }
      return;
    }
    setProgress(0);
    let current = 0;
    const interval = window.setInterval(() => {
      const speed = current < 30 ? 3 + Math.random() * 4
        : current < 60 ? 2 + Math.random() * 3
        : current < 85 ? 1 + Math.random() * 2
        : 0.3 + Math.random() * 0.5;
      current = Math.min(current + speed, 95);
      setProgress(Math.floor(current));
    }, 300);
    return () => window.clearInterval(interval);
  }, [isFetchingDw]);

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
          <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 overflow-hidden mx-auto w-full" style={{ maxWidth: DASHBOARD_MAX_W }}>

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

              <div className="flex-1" />
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
                    : indicadores.map((ind, idx) => {
                        const abaixoDaMeta = ind.percentualReal < ind.percentualEsperado;
                        const progress = Math.min((ind.percentualReal / Math.max(ind.percentualEsperado, 1)) * 100, 100);
                        const identity = INDICATOR_IDENTITY[ind.nome] ?? {
                          icon: BarChart3,
                          color: "#94a3b8",
                          colorRgb: "148,163,184",
                          bgColor: "rgba(148,163,184,0.10)",
                          label: "",
                        };
                        const Icon = identity.icon;
                        // Status: verde/vermelho para OK/Alto
                        const statusColor = abaixoDaMeta ? "#34d399" : "#f87171";
                        const statusRgb = abaixoDaMeta ? "52,211,153" : "248,113,113";

                        return (
                          <AnimatedCard key={ind.id} delay={idx * 60} className="h-full">
                            <Link
                              to={`/indicadores/${ind.id}`}
                              className="group relative flex flex-col rounded-[14px] sm:rounded-[16px] border p-4 xl:p-5 transition-all duration-300 cursor-pointer h-full hover:-translate-y-1"
                              style={{
                                background: "var(--sgt-bg-card)",
                                borderColor: `rgba(${identity.colorRgb},0.2)`,
                              }}
                              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${identity.colorRgb},0.45)`; el.style.boxShadow = `0 24px 48px rgba(0,0,0,0.4), 0 0 40px rgba(${identity.colorRgb},0.10)`; }}
                              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${identity.colorRgb},0.2)`; el.style.boxShadow = "none"; }}
                            >
                              {/* Glow de identidade no canto */}
                              <div className="pointer-events-none absolute inset-0 rounded-[14px]"
                                style={{ background: `radial-gradient(ellipse at 15% 15%, rgba(${identity.colorRgb},0.07), transparent 55%)` }} />
                              <div className="pointer-events-none absolute inset-0 rounded-[14px]"
                                style={{ background: "radial-gradient(ellipse at 85% 85%, rgba(255,255,255,0.015), transparent 50%)" }} />

                              {/* TOPO: ícone de identidade + nome + badge status */}
                              <div className="relative flex items-center gap-4">
                                <div className="relative shrink-0 h-16 w-16">
                                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90" style={{ overflow: 'visible' }}>
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.8" />
                                    {/* Track colorido da identidade */}
                                    <circle cx="18" cy="18" r="14" fill="none"
                                      stroke={`rgba(${identity.colorRgb},0.12)`}
                                      strokeWidth="2.8" strokeDasharray="87.9 0" />
                                    {/* Progresso na cor de identidade */}
                                    <circle cx="18" cy="18" r="14" fill="none"
                                      stroke={identity.color}
                                      strokeWidth="2.8" strokeLinecap="round"
                                      strokeDasharray={`${progress * 0.879} 87.9`}
                                      className="transition-all duration-700"
                                      style={{ filter: `drop-shadow(0 0 3px ${identity.color}) drop-shadow(0 0 6px rgba(${identity.colorRgb},0.5))` }}
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="font-extrabold leading-none tabular-nums"
                                      style={{ color: identity.color, fontSize: ind.percentualReal >= 100 ? "10px" : ind.percentualReal >= 10 ? "11px" : "13px" }}>
                                      {ind.percentualReal > 999 ? "999+" : `${ind.percentualReal}%`}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-1 min-w-0 flex-col gap-1.5">
                                  <div className="flex items-start justify-between gap-1.5">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.15em] dark:text-white text-slate-700 group-hover:dark:text-white transition-colors leading-tight">
                                      {ind.nome}
                                    </p>
                                    {/* Badge status: sempre verde/vermelho */}
                                    <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold border ${abaixoDaMeta
                                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                      : "bg-red-500/15 text-red-400 border-red-500/30"}`}>
                                      {abaixoDaMeta ? "OK" : "Alto"}
                                    </span>
                                  </div>
                                  {/* Label de identidade + meta */}
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: identity.bgColor }}>
                                      <Icon className="h-3 w-3" style={{ color: identity.color }} />
                                    </div>
                                    <span className="text-[10px] font-semibold" style={{ color: `rgba(${identity.colorRgb},0.7)` }}>
                                      {identity.label}
                                    </span>
                                    <span className="text-[10px] dark:text-slate-600 text-slate-400">· Meta {ind.percentualEsperado}%</span>
                                  </div>
                                </div>
                              </div>

                              {/* DIVISOR com cor de identidade */}
                              <div className="relative h-px my-2" style={{ background: `rgba(${identity.colorRgb},0.12)` }} />

                              {/* CENTRO: métricas + status */}
                              <div className="relative flex flex-1 flex-col justify-center gap-3.5">
                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                    { label: "Real", value: `${ind.percentualReal}%`, sub: "realizado", color: identity.color, bg: `rgba(${identity.colorRgb},0.06)`, border: `rgba(${identity.colorRgb},0.15)` },
                                    { label: "Meta", value: `${ind.percentualEsperado}%`, sub: "esperado", color: undefined, bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.06)" },
                                    { label: "Dif.", value: `${abaixoDaMeta ? "-" : "+"}${Math.abs(ind.percentualReal - ind.percentualEsperado).toFixed(1)}%`, sub: abaixoDaMeta ? "a atingir" : "acima", color: statusColor, bg: `rgba(${statusRgb},0.06)`, border: `rgba(${statusRgb},0.15)` },
                                  ].map(({ label, value, sub, color, bg, border }) => (
                                    <div key={label} className="flex flex-col items-center gap-1 rounded-[10px] py-2.5 px-1 border"
                                      style={{ background: bg, borderColor: border }}>
                                      <span className="text-[9px] font-bold uppercase tracking-[0.18em] dark:text-slate-500 text-slate-400">{label}</span>
                                      <span className="text-[15px] font-extrabold leading-none tabular-nums dark:text-slate-200 text-slate-600"
                                        style={{ color: color ?? undefined }}>
                                        {value}
                                      </span>
                                      <span className="text-[8px] dark:text-slate-600 text-slate-400 font-medium">{sub}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Status + tendência */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 animate-pulse ${
                                      !abaixoDaMeta ? "bg-red-400"
                                      : (ind.percentualEsperado - ind.percentualReal) <= 2 ? "bg-cyan-400"
                                      : ind.percentualReal >= ind.percentualEsperado * 0.8 ? "bg-emerald-400"
                                      : "bg-amber-400"
                                    }`} />
                                    <span className={`text-[10px] font-semibold ${
                                      !abaixoDaMeta ? "text-red-400"
                                      : (ind.percentualEsperado - ind.percentualReal) <= 2 ? "text-cyan-400"
                                      : ind.percentualReal >= ind.percentualEsperado * 0.8 ? "text-emerald-400"
                                      : "text-amber-400"
                                    }`}>
                                      {!abaixoDaMeta ? "Acima — verificar"
                                        : (ind.percentualEsperado - ind.percentualReal) <= 2 ? "Quase atingida"
                                        : ind.percentualReal >= ind.percentualEsperado * 0.8 ? "No ritmo"
                                        : "Abaixo do plano"}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold tabular-nums" style={{ color: `rgba(${statusRgb},0.7)` }}>
                                    {abaixoDaMeta
                                      ? `−${(ind.percentualEsperado - ind.percentualReal).toFixed(1)}% p/ meta`
                                      : `+${(ind.percentualReal - ind.percentualEsperado).toFixed(1)}% acima`}
                                  </span>
                                </div>
                              </div>

                              {/* DIVISOR */}
                              <div className="h-px mt-2" style={{ background: `rgba(${identity.colorRgb},0.08)` }} />

                              {/* RODAPÉ: barra de progresso na cor de identidade */}
                              <div className="relative flex flex-col gap-1.5 pt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-semibold uppercase tracking-[0.15em] dark:text-slate-500 text-slate-400">Progresso</span>
                                  <span className="text-[9px] font-bold tabular-nums" style={{ color: identity.color }}>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                                  <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                      width: `${Math.min(progress, 100)}%`,
                                      background: identity.color,
                                      boxShadow: `0 0 6px rgba(${identity.colorRgb},0.6)`
                                    }}
                                  />
                                </div>
                                <div className="flex items-center justify-end">
                                  <span className="flex items-center gap-1 text-[10px] font-semibold transition-all duration-300 opacity-50 group-hover:opacity-100"
                                    style={{ color: identity.color }}>
                                    Ver detalhe
                                    <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" />
                                  </span>
                                </div>
                              </div>
                            </Link>
                          </AnimatedCard>
                        );
                      })
                  )}
                </div>
              </div>

              {/* COLUNA DIREITA — Faturamento */}
              <div
                className="w-[280px] xl:w-[320px] shrink-0 rounded-[20px] border flex flex-col p-4 gap-4"
                style={{ borderColor: "var(--sgt-border-subtle)", background: "var(--sgt-bg-card)" }}
              >
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.28em] dark:text-slate-500 text-slate-500 mb-1">
                    Visão geral
                  </p>
                  <p className="text-[20px] font-extrabold tracking-[-0.04em] dark:bg-gradient-to-r dark:from-white dark:from-40% dark:via-slate-200 dark:via-70% dark:to-slate-500 dark:bg-clip-text dark:text-transparent text-slate-800">
                    Faturamento
                  </p>
                </div>

                <div className="h-px" style={{ background: "var(--sgt-divider)" }} />

                {[
                  { label: "Faturamento Bruto",   icon: DollarSign,  color: "emerald" },
                  { label: "Faturamento Líquido",  icon: TrendingUp,  color: "cyan"    },
                  { label: "Deduções",             icon: TrendingDown, color: "amber"  },
                  { label: "Margem",               icon: BarChart3,   color: "violet"  },
                ].map(({ label, icon: Icon, color }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-2 rounded-[12px] border p-3"
                    style={{ borderColor: "var(--sgt-border-subtle)", background: "var(--sgt-bg-section)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] dark:text-slate-400 text-slate-500">
                        {label}
                      </span>
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "var(--sgt-input-bg)" }}>
                        <Icon className="h-3 w-3 dark:text-slate-400 text-slate-500" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="h-6 w-3/4 rounded-md animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
                      <div className="h-3 w-1/2 rounded-md animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full w-fit px-2 py-0.5 border" style={{ borderColor: "var(--sgt-border-subtle)", background: "var(--sgt-input-bg)" }}>
                      <RefreshCw className="h-2.5 w-2.5 text-slate-500" />
                      <span className="text-[9px] text-slate-500 font-medium">Em breve</span>
                    </div>
                  </div>
                ))}

                {/* Gráfico placeholder */}
                <div className="flex-1 rounded-[12px] border flex flex-col items-center justify-center gap-2 min-h-[100px]"
                  style={{ borderColor: "var(--sgt-border-subtle)", background: "var(--sgt-bg-section)", borderStyle: "dashed" }}>
                  <BarChart3 className="h-6 w-6 text-slate-600" />
                  <p className="text-[10px] text-slate-600 font-medium text-center px-4">
                    Gráfico de faturamento<br />disponível em breve
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
