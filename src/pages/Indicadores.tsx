import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BarChart3, TrendingUp, TrendingDown, DollarSign, RefreshCw } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { AnimatedCard } from "@/components/shared/AnimatedCard";

const DASHBOARD_MAX_W = "1800px";

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

                        return (
                          <AnimatedCard key={ind.id} delay={idx * 60} className="h-full">
                            <Link
                              to={`/indicadores/${ind.id}`}
                              className="group relative flex flex-col gap-3 rounded-[14px] sm:rounded-[16px] border p-3.5 xl:p-4 transition-all duration-300 cursor-pointer h-full hover:-translate-y-1"
                              style={{
                                background: "var(--sgt-bg-card)",
                                borderColor: abaixoDaMeta ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                              }}
                              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = abaixoDaMeta ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)"; el.style.boxShadow = abaixoDaMeta ? "0 24px 48px rgba(0,0,0,0.4), 0 0 32px rgba(52,211,153,0.07)" : "0 24px 48px rgba(0,0,0,0.4), 0 0 32px rgba(248,113,113,0.07)"; }}
                              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = abaixoDaMeta ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"; el.style.boxShadow = "none"; }}
                            >
                              {/* Glow radial de fundo */}
                              <div className="pointer-events-none absolute inset-0 rounded-[14px]"
                                style={{ background: abaixoDaMeta ? "radial-gradient(ellipse at 20% 50%, rgba(52,211,153,0.06), transparent 60%)" : "radial-gradient(ellipse at 20% 50%, rgba(248,113,113,0.06), transparent 60%)" }} />

                              {/* LINHA PRINCIPAL: ring + info */}
                              <div className="relative flex items-center gap-3.5">
                                {/* Ring compacto */}
                                <div className="relative shrink-0 h-14 w-14">
                                  <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90" style={{ overflow: 'visible' }}>
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                                    <circle cx="18" cy="18" r="14" fill="none"
                                      stroke={abaixoDaMeta ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)"}
                                      strokeWidth="3"
                                      strokeDasharray="87.9 0"
                                    />
                                    <circle cx="18" cy="18" r="14" fill="none"
                                      stroke={abaixoDaMeta ? "#34d399" : "#f87171"}
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeDasharray={`${progress * 0.879} 87.9`}
                                      className="transition-all duration-700"
                                      style={{ filter: abaixoDaMeta ? "drop-shadow(0 0 2.5px #34d399) drop-shadow(0 0 5px rgba(52,211,153,0.55))" : "drop-shadow(0 0 2.5px #f87171) drop-shadow(0 0 5px rgba(248,113,113,0.55))" }}
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className={`font-extrabold leading-none tabular-nums ${abaixoDaMeta ? "text-emerald-300" : "text-red-300"}`}
                                      style={{ fontSize: ind.percentualReal >= 100 ? "9px" : ind.percentualReal >= 10 ? "10px" : "12px" }}>
                                      {ind.percentualReal > 999 ? "999+" : `${ind.percentualReal}%`}
                                    </span>
                                  </div>
                                </div>

                                {/* Info: nome + meta + badge */}
                                <div className="flex flex-1 min-w-0 flex-col gap-1">
                                  <div className="flex items-start justify-between gap-1.5">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] dark:text-slate-200 text-slate-600 group-hover:dark:text-white transition-colors duration-300 leading-tight">
                                      {ind.nome}
                                    </p>
                                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border ${abaixoDaMeta
                                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                                      : "bg-red-500/15 text-red-400 border-red-500/25"}`}>
                                      {abaixoDaMeta ? "OK" : "Alto"}
                                    </span>
                                  </div>
                                  <p className={`text-[10px] font-semibold ${abaixoDaMeta ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                                    Meta: {ind.percentualEsperado}%
                                  </p>
                                </div>
                              </div>

                              {/* BARRA + rodapé */}
                              <div className="relative flex flex-col gap-1.5 mt-auto">
                                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${abaixoDaMeta ? "bg-emerald-400" : "bg-red-400"}`}
                                    style={{
                                      width: `${Math.min(progress, 100)}%`,
                                      boxShadow: abaixoDaMeta ? "0 0 5px rgba(52,211,153,0.55)" : "0 0 5px rgba(248,113,113,0.55)"
                                    }}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] dark:text-slate-500 text-slate-400">Real: {ind.percentualReal}%</span>
                                  <span className={`flex items-center gap-1 text-[10px] font-semibold transition-all duration-300 ${abaixoDaMeta ? "text-emerald-500/60 group-hover:text-emerald-400" : "text-red-500/60 group-hover:text-red-400"}`}>
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
