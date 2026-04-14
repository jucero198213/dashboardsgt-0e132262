import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Presentation,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { formatCurrency, formatDate } from "@/data/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/*  CountUp — animação de número subindo                               */
/* ------------------------------------------------------------------ */
const CountUp = ({
  value,
  duration = 1200,
  prefix = "",
}: {
  value: number;
  duration?: number;
  prefix?: string;
}) => {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const diff = value - start;
    if (Math.abs(diff) < 0.01) {
      setDisplay(value);
      return;
    }

    const startTime = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = start + diff * ease;
      setDisplay(current);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else prevValue.current = value;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <>
      {prefix}
      {display.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  MAX-WIDTH constante — nunca muda entre breakpoints                 */
/* ------------------------------------------------------------------ */
const DASHBOARD_MAX_W = "1860px";

/* ------------------------------------------------------------------ */
/*  Fluid font size — otimizado para densidade em 1920x1080            */
/* ------------------------------------------------------------------ */
function kpiFontSize(text: string): string {
  const len = text.length;
  if (len <= 6)  return "clamp(1rem, 1.8vw, 1.5rem)";
  if (len <= 10) return "clamp(0.95rem, 1.5vw, 1.3rem)";
  if (len <= 13) return "clamp(0.85rem, 1.3vw, 1.15rem)";
  if (len <= 16) return "clamp(0.8rem, 1.1vw, 1.05rem)";
  return "clamp(0.75rem, 1vw, 0.95rem)";
}

function kpiValueFontSize(value: number, isPercent = false): string {
  const text = isPercent
    ? `${value.toFixed(0)}%`
    : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return kpiFontSize(text);
}


/* ------------------------------------------------------------------ */
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl ${className}`} style={{ background: "var(--sgt-skeleton-bg)" }} />
);

const CardSkeleton = () => (
  <div className="rounded-[20px] border border-[var(--sgt-border-subtle)] [background:var(--sgt-bg-card)] p-3.5">
    <Skeleton className="mb-3 h-3 w-20" />
    <Skeleton className="mb-2 h-6 w-32" />
    <Skeleton className="h-3 w-24" />
  </div>
);

const LargeCardSkeleton = () => (
  <div className="rounded-[22px] border border-[var(--sgt-border-subtle)] [background:var(--sgt-bg-card)] p-3.5">
    <Skeleton className="mb-2 h-3 w-28" />
    <Skeleton className="mb-1 h-7 w-40" />
    <Skeleton className="mb-3 h-3 w-32" />
    <div className="mb-3 grid grid-cols-2 gap-2">
      <Skeleton className="h-14 rounded-[12px]" />
      <Skeleton className="h-14 rounded-[12px]" />
    </div>
    <Skeleton className="h-[140px] rounded-[22px]" />
  </div>
);

const IndicatorSkeleton = () => (
  <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] [background:var(--sgt-bg-card)] overflow-hidden">
    <div className="h-[3px] w-full" style={{ background: "var(--sgt-skeleton-bg)" }} />
    <div className="flex items-center gap-4 px-4 py-3.5">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-2 w-14" />
      </div>
      <Skeleton className="h-4 w-8 rounded-full" />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  AnimatedCard — fade+slide com stagger                              */
/* ------------------------------------------------------------------ */
const AnimatedCard = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`transition-all duration-500 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        } ${className}`}
    >
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Mini line-chart (SVG) — Evolução mensal Previsto vs Realizado      */
/* ------------------------------------------------------------------ */
const MiniLineChart = ({
  previstoMonthly,
  realizadoMonthly,
  tone,
  ano,
}: {
  previstoMonthly: number[];
  realizadoMonthly: number[];
  tone: "emerald" | "amber";
  ano?: string;
}) => {
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const previstoPoints = previstoMonthly;
  const realizadoPoints = realizadoMonthly;

  const allValues = [...previstoPoints, ...realizadoPoints];
  const maxVal = Math.max(...allValues, 1);
  const isEmpty = allValues.every((v) => v === 0);

  const svgW = 520;
  const svgH = 200;
  const padL = 12;
  const padR = 12;
  const padTop = 12;
  const padBot = 22;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padTop - padBot;

  const toX = (i: number) => padL + (i / (months.length - 1)) * chartW;
  const toY = (v: number) => padTop + chartH - (v / maxVal) * chartH;

  const buildPath = (pts: number[]) =>
    pts
      .map(
        (v, i) =>
          `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`
      )
      .join(" ");

  const buildAreaPath = (pts: number[]) => {
    const linePath = pts
      .map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
      .join(" L");
    return `M${linePath} L${toX(11).toFixed(1)},${(
      padTop + chartH
    ).toFixed(1)} L${toX(0).toFixed(1)},${(padTop + chartH).toFixed(1)} Z`;
  };

  const colors =
    tone === "emerald"
      ? {
        prevStroke: "rgba(16,185,129,0.35)",
        realStroke: "#34d399",
        gradFrom: "#34d399",
        dot: "#34d399",
        dotGlow: "rgba(16,185,129,0.4)",
        legendPrev: "rgba(16,185,129,0.4)",
        legendReal: "#34d399",
        tooltipBg: "rgba(6,78,59,0.92)",
        tooltipBorder: "rgba(52,211,153,0.3)",
      }
      : {
        prevStroke: "rgba(245,158,11,0.35)",
        realStroke: "#fbbf24",
        gradFrom: "#fbbf24",
        dot: "#fbbf24",
        dotGlow: "rgba(245,158,11,0.4)",
        legendPrev: "rgba(245,158,11,0.4)",
        legendReal: "#fbbf24",
        tooltipBg: "rgba(78,53,6,0.92)",
        tooltipBorder: "rgba(251,191,36,0.3)",
      };

  const gradId = `line-grad-${tone}`;
  const realizadoLabel = tone === "emerald" ? "Recebido" : "Pago";

  const formatCompact = (v: number) =>
    v >= 1_000_000
      ? `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`
      : v >= 1_000
        ? `R$ ${(v / 1_000).toFixed(0)}mil`
        : formatCurrency(v);

  const getTooltipX = (i: number) => {
    const x = toX(i);
    if (i <= 1) return x;
    if (i >= 10) return x - 130;
    return x - 65;
  };

  return (
    <div className="flex h-full flex-col rounded-[18px] border border-[var(--sgt-border-subtle)] bg-white/[0.025] p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Evolução mensal{ano ? ` · ${ano}` : ""}
        </span>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-[3px] w-3 rounded-full"
              style={{ background: colors.legendPrev, opacity: 0.7 }}
            />
            <span className="text-[9px] text-slate-500">Previsto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-[3px] w-3 rounded-full"
              style={{ background: colors.legendReal }}
            />
            <span className="text-[9px] text-slate-500">{realizadoLabel}</span>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tone === "emerald" ? "border-emerald-500/20 bg-emerald-500/8" : "border-amber-500/20 bg-amber-500/8"}`}>
              <svg className={`h-5 w-5 ${tone === "emerald" ? "text-emerald-400/50" : "text-amber-400/50"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500">Sem dados para o período</p>
            <p className="text-[10px] text-slate-600">Selecione um intervalo de datas e atualize</p>
          </div>
        ) : (
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={colors.gradFrom}
                stopOpacity={0.25}
              />
              <stop
                offset="60%"
                stopColor={colors.gradFrom}
                stopOpacity={0.08}
              />
              <stop offset="100%" stopColor={colors.gradFrom} stopOpacity={0} />
            </linearGradient>
            <filter id={`glow-${tone}`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
            <line
              key={frac}
              x1={padL}
              y1={padTop + chartH * (1 - frac)}
              x2={svgW - padR}
              y2={padTop + chartH * (1 - frac)}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={0.5}
            />
          ))}

          <path d={buildAreaPath(realizadoPoints)} fill={`url(#${gradId})`} />

          <path
            d={buildPath(previstoPoints)}
            fill="none"
            stroke={colors.prevStroke}
            strokeWidth={1.8}
            strokeDasharray="6,4"
            strokeLinecap="round"
          />

          <path
            d={buildPath(realizadoPoints)}
            fill="none"
            stroke={colors.realStroke}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow-${tone})`}
          />

          {realizadoPoints.map((v, i) => (
            <circle
              key={`dot-${i}`}
              cx={toX(i)}
              cy={toY(v)}
              r={hoverIndex === i ? 4.5 : 3}
              fill={colors.dot}
              stroke={hoverIndex === i ? colors.dotGlow : "transparent"}
              strokeWidth={hoverIndex === i ? 6 : 0}
              className="transition-all duration-150"
            />
          ))}

          {hoverIndex !== null && (
            <line
              x1={toX(hoverIndex)}
              y1={padTop}
              x2={toX(hoverIndex)}
              y2={padTop + chartH}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          )}

          {hoverIndex !== null && (
            <g>
              {(() => {
                const prevVal = previstoPoints[hoverIndex];
                const realVal = realizadoPoints[hoverIndex];
                const hasData = prevVal > 0 || realVal > 0;
                const tooltipH = hasData ? 56 : 36;
                const tooltipY = Math.max(
                  toY(Math.max(prevVal, realVal)) - tooltipH - 8,
                  2
                );

                return (
                  <>
                    <rect
                      x={getTooltipX(hoverIndex)}
                      y={tooltipY}
                      width={hasData ? 150 : 110}
                      height={tooltipH}
                      rx={10}
                      fill={colors.tooltipBg}
                      stroke={colors.tooltipBorder}
                      strokeWidth={1}
                    />
                    <text
                      x={getTooltipX(hoverIndex) + 10}
                      y={tooltipY + 18}
                      fill="var(--sgt-text-muted)"
                      fontSize={10}
                      fontWeight={600}
                      fontFamily="system-ui, sans-serif"
                    >
                      {months[hoverIndex]}
                    </text>
                    {hasData ? (
                      <>
                        <text
                          x={getTooltipX(hoverIndex) + 10}
                          y={tooltipY + 33}
                          fill={colors.realStroke}
                          fontSize={11}
                          fontWeight={700}
                          fontFamily="system-ui, sans-serif"
                        >
                          {realizadoLabel}: {formatCompact(realVal)}
                        </text>
                        <text
                          x={getTooltipX(hoverIndex) + 10}
                          y={tooltipY + 48}
                          fill="var(--sgt-text-muted)"
                          fontSize={10}
                          fontWeight={500}
                          fontFamily="system-ui, sans-serif"
                        >
                          Previsto: {formatCompact(prevVal)}
                        </text>
                      </>
                    ) : (
                      <text
                        x={getTooltipX(hoverIndex) + 10}
                        y={tooltipY + 30}
                        fill="var(--sgt-text-faint)"
                        fontSize={10}
                        fontFamily="system-ui, sans-serif"
                      >
                        Sem dados no período
                      </text>
                    )}
                  </>
                );
              })()}
            </g>
          )}

          {months.map((m, i) => (
            <text
              key={m}
              x={toX(i)}
              y={svgH - 4}
              textAnchor="middle"
              fill={
                hoverIndex === i
                  ? "var(--sgt-text-primary)"
                  : "var(--sgt-text-muted)"
              }
              fontSize={9.5}
              fontWeight={hoverIndex === i ? 600 : 400}
              fontFamily="system-ui, sans-serif"
              className="transition-all duration-150"
            >
              {m}
            </text>
          ))}

          {months.map((_, i) => (
            <rect
              key={`hover-${i}`}
              x={toX(i) - chartW / months.length / 2}
              y={padTop}
              width={chartW / months.length}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              style={{ cursor: "crosshair" }}
            />
          ))}
        </svg>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */
const Index = () => {
  const {
    resumo,
    indicadores,
    fetchFromDW,
    isFetchingDw,
    dwError,
    dwFilter,
    setDwFilter,
    filiais,
    empresas,
    isProcessed,
    chartPagar,
    chartReceber,
    kpiExtra,
  } = useFinancialData();

  const { contasReceber, contasPagar } = resumo;

  const [presentationMode, setPresentationMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const filiaisFiltradas = useMemo(
    () =>
      dwFilter.empresa
        ? filiais.filter((f) => f.empresa === dwFilter.empresa)
        : filiais,
    [filiais, dwFilter.empresa]
  );

  const handleUpdate = useCallback(async () => {
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
      // Avança mais devagar conforme sobe, nunca trava
      const speed = current < 30 ? 3 + Math.random() * 4
        : current < 60 ? 2 + Math.random() * 3
          : current < 85 ? 1 + Math.random() * 2
            : 0.3 + Math.random() * 0.5;

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
      setLastUpdated(new Date());
    } catch (error) {
      window.clearInterval(interval);
      setLoadingPhase("");
      console.error("Erro ao atualizar dados:", error);
    } finally {
      window.setTimeout(() => {
        setProgress(0);
        setLoadingPhase("");
      }, 800);
    }
  }, [fetchFromDW]);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Erro ao entrar em fullscreen:", error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Erro ao sair do fullscreen:", error);
    }
  }, []);

  const enablePresentationMode = useCallback(async () => {
    setPresentationMode(true);
    await enterFullscreen();
  }, [enterFullscreen]);

  const disablePresentationMode = useCallback(async () => {
    setPresentationMode(false);
    await exitFullscreen();
  }, [exitFullscreen]);

  const togglePresentationMode = useCallback(async () => {
    if (presentationMode) {
      await disablePresentationMode();
    } else {
      await enablePresentationMode();
    }
  }, [presentationMode, enablePresentationMode, disablePresentationMode]);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      const isTyping =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable;

      if (isTyping) return;

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        await togglePresentationMode();
      }

      if (event.key === "Escape" && presentationMode) {
        event.preventDefault();
        await disablePresentationMode();
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setPresentationMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [presentationMode, togglePresentationMode, disablePresentationMode]);

  const topMetrics = useMemo(
    () => [
      {
        label: "A RECEBER",
        value: contasReceber.valorAReceber,
        helper: "Valor à receber",
        icon: TrendingUp,
        tone: "emerald",
      },
      {
        label: "RECEBIDO",
        value: contasReceber.valorRecebido,
        helper: "Entrada consolidada",
        icon: TrendingUp,
        tone: "cyan",
      },
      {
        label: "A PAGAR",
        value: contasPagar.valorAPagar,
        helper: "Valor à pagar",
        icon: TrendingDown,
        tone: "amber",
      },
      {
        label: "PAGO",
        value: contasPagar.valorPago,
        helper: "Saída consolidada",
        icon: TrendingDown,
        tone: "violet",
      },
    ],
    [
      contasReceber.valorAReceber,
      contasReceber.valorRecebido,
      contasPagar.valorAPagar,
      contasPagar.valorPago,
    ]
  );

  const toneStyles: Record<string, string> = {
    emerald:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.05)]",
    amber:
      "border-amber-500/20 bg-amber-500/10 text-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.05)]",
    cyan:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.05)]",
    violet:
      "border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-[0_0_0_1px_rgba(167,139,250,0.05)]",
  };

  const renderLargeCard = ({
    title,
    tone,
    total,
    subtitle,
    primaryLabel,
    primaryValue,
    secondaryLabel,
    secondaryValue,
    monthlyPrevisto,
    monthlyRealizado,
    chartAno,
    to,
    icon: Icon,
  }: {
    title: string;
    tone: "emerald" | "amber";
    total: number;
    subtitle: string;
    primaryLabel: string;
    primaryValue: number;
    secondaryLabel: string;
    secondaryValue: number;
    monthlyPrevisto: number[];
    monthlyRealizado: number[];
    chartAno?: string;
    to: string;
    icon: typeof TrendingUp;
  }) => {
    const isPositive = tone === "emerald";

    return (
      <div
        className={`group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(0,0,0,0.4)] h-full ${isPositive
            ? "border-emerald-500/[0.14] [background:var(--sgt-bg-card)] hover:border-emerald-400/25"
            : "border-amber-500/[0.14] [background:var(--sgt-bg-card)] hover:border-amber-400/25"
          } flex flex-col p-2.5 xl:p-3`}
      >
        <div
          className={`absolute inset-0 ${isPositive
              ? "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.11),transparent_34%)]"
              : "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.11),transparent_34%)]"
            }`}
        />
        <div
          className={`absolute inset-x-0 bottom-0 h-24 ${isPositive
              ? "bg-[linear-gradient(180deg,transparent_0%,rgba(16,185,129,0.03)_100%)]"
              : "bg-[linear-gradient(180deg,transparent_0%,rgba(245,158,11,0.03)_100%)]"
            }`}
        />

        <div className="relative flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={`text-[10px] leading-[14px] font-semibold uppercase tracking-[0.3em] ${isPositive ? "text-emerald-300" : "text-amber-300"
                  }`}
              >
                {title}
              </p>
              <h2 className="mt-1 min-w-0 overflow-hidden whitespace-nowrap font-bold leading-[1] tracking-[-0.03em] [color:var(--sgt-text-primary)]" style={{ fontSize: kpiValueFontSize(total) }}>
                <CountUp value={total} />
              </h2>
              <p className="mt-0.5 text-[11px] leading-[16px] dark:text-slate-400 text-slate-600">{subtitle}</p>
            </div>

            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105 ${isPositive
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 group-hover:border-emerald-400/30 group-hover:bg-emerald-400/15"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-300 group-hover:border-amber-400/30 group-hover:bg-amber-400/15"
                }`}
            >
              <Icon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" />
            </div>
          </div>

                  <div className="relative flex-1 min-h-0">
            <MiniLineChart
              previstoMonthly={monthlyPrevisto}
              realizadoMonthly={monthlyRealizado}
              tone={tone}
              ano={chartAno}
            />
            {isFetchingDw && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[20px] bg-black/40 backdrop-blur-[2px]">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full animate-pulse ${isPositive ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <div className={`h-2 w-2 rounded-full animate-pulse [animation-delay:150ms] ${isPositive ? "bg-emerald-400/60" : "bg-amber-400/60"}`} />
                  <div className={`h-2 w-2 rounded-full animate-pulse [animation-delay:300ms] ${isPositive ? "bg-emerald-400/30" : "bg-amber-400/30"}`} />
                </div>
                <span className="text-[10px] font-medium text-slate-400">{loadingPhase || "Carregando..."}</span>
              </div>
            )}
          </div>

          <div
            className={`flex items-center justify-between gap-3 rounded-[12px] border px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${isPositive
                ? "border-emerald-400/14 bg-[linear-gradient(180deg,rgba(16,185,129,0.09)_0%,rgba(16,185,129,0.03)_100%)]"
                : "border-amber-400/14 bg-[linear-gradient(180deg,rgba(245,158,11,0.09)_0%,rgba(245,158,11,0.03)_100%)]"
              }`}
          >
            <div className="min-w-0">
              <p
                className={`text-[9px] font-semibold uppercase tracking-[0.22em] ${isPositive ? "text-emerald-600 dark:text-emerald-200/75" : "text-amber-600 dark:text-amber-200/75"
                  }`}
              >
                Ação rápida
              </p>
              <p className="mt-0.5 text-[11px] dark:text-slate-300 text-slate-600">
                Abrir detalhamento completo
              </p>
            </div>

            <Link
              to={to}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-300 hover:-translate-y-0.5 ${isPositive
                  ? "border-emerald-400/22 bg-emerald-400/12 text-emerald-300 hover:bg-emerald-400/18 hover:shadow-[0_10px_24px_rgba(16,185,129,0.12)]"
                  : "border-amber-400/22 bg-amber-400/12 text-amber-300 hover:bg-amber-400/18 hover:shadow-[0_10px_24px_rgba(245,158,11,0.12)]"
                }`}
            >
              Ver detalhamento
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col transition-all duration-300 ${presentationMode
          ? "h-[100dvh] overflow-hidden p-0"
          : "h-[100dvh] overflow-hidden px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
        }`}
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* Atmosfera dark */}
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(160,100,4,0.22),transparent_60%)] light:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(6,182,212,0.08),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_50%_40%_at_100%_105%,rgba(6,182,212,0.07),transparent_60%)] light:bg-[radial-gradient(ellipse_50%_40%_at_100%_105%,rgba(6,182,212,0.04),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:opacity-100 light:opacity-40" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.68) 100%)" }} />

      <div
        className={`relative flex flex-col flex-1 min-h-0 overflow-hidden ${presentationMode
            ? "w-full max-w-none"
            : "w-full"
          }`}
      >
        <section
          className={`relative flex-1 min-h-0 flex flex-col border transition-all duration-300 ${presentationMode
              ? "w-full overflow-hidden rounded-none"
              : "rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-hidden"
            }`}
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

          <div className="relative flex flex-col flex-1 min-h-0 gap-1.5 sm:gap-2 p-2 sm:p-2.5 lg:p-3 overflow-hidden mx-auto w-full" style={{ maxWidth: DASHBOARD_MAX_W }}>

            {/* ── NAVBAR: logo + filtros + user numa única linha ── */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3">

              {/* Logo */}
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10">
                  <svg className="h-3.5 w-3.5 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <span className="hidden sm:block text-[15px] font-extrabold tracking-[-0.03em] dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-slate-400 dark:bg-clip-text dark:text-transparent text-slate-800">
                  SGT Dashboard
                </span>
              </div>

              {/* Badge tempo real */}
              <div className="flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-2.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  Tempo real
                </span>
              </div>

              <div className="hidden h-5 w-px shrink-0 sm:block" style={{ background: "var(--sgt-divider)" }} />

              {/* Filtros */}
              <div className="flex flex-1 flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
                <DatePickerInput
                  value={dwFilter.dataInicio}
                  onChange={(v) => setDwFilter("dataInicio", v)}
                  placeholder="Data início"
                />
                <DatePickerInput
                  value={dwFilter.dataFim}
                  onChange={(v) => setDwFilter("dataFim", v)}
                  placeholder="Data fim"
                />
                <div className="hidden h-4 w-px shrink-0 sm:block" style={{ background: "var(--sgt-divider)" }} />
                <Select value={dwFilter.empresa ?? "__all__"} onValueChange={(v) => setDwFilter("empresa", v === "__all__" ? null : v)}>
                  <SelectTrigger className="h-7 w-full min-w-[80px] max-w-[130px] rounded-lg text-[11px] transition-all">
                    <SelectValue placeholder="Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {empresas.map((e) => (<SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={dwFilter.filial ?? "__all__"} onValueChange={(v) => setDwFilter("filial", v === "__all__" ? null : v)}>
                  <SelectTrigger className="h-7 w-full min-w-[80px] max-w-[140px] rounded-lg text-[11px] transition-all">
                    <SelectValue placeholder="Filial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {filiaisFiltradas.map((f) => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => void handleUpdate()}
                  disabled={isFetchingDw}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-semibold transition-all ${isFetchingDw
                    ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.15)]"
                    : "border-cyan-400/35 bg-cyan-500/15 text-cyan-200 hover:border-cyan-300/50 hover:bg-cyan-400/25 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:-translate-y-0.5"
                  } disabled:cursor-not-allowed`}
                >
                  <RefreshCw className={`h-3 w-3 ${isFetchingDw ? "animate-spin" : ""}`} />
                  {isFetchingDw ? (
                    <span className="flex items-center gap-1.5">
                      <span className="hidden sm:inline">{loadingPhase}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">{progress}%</span>
                    </span>
                  ) : ("Atualizar")}
                </button>
              </div>

              {/* User — canto direito */}
              <UserMenu />
            </div>

            <div className="h-px" style={{ background: "var(--sgt-divider)" }} />
            {dwError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {dwError}
              </div>
            )}

            {/* 2-column grid: cards+charts left, indicators right */}
            <div className={`grid gap-1.5 flex-1 min-h-0 h-0 xl:grid-cols-[1fr_320px] items-stretch`}>
              {/* Left column — cards, charts, KPIs */}
              <div className="grid gap-1.5 min-h-0 xl:grid-cols-2 xl:grid-rows-[auto_1fr_auto]">

                {/* Top 4 metric cards */}
                {isFetchingDw && !isProcessed ? (
                  <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-4 xl:col-span-2 items-stretch">
                    {[0, 1, 2, 3].map((i) => (
                      <CardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-4 xl:col-span-2 items-stretch">
                    {(() => {
                      const topSharedFont = kpiFontSize(
                        topMetrics.map(m => m.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))
                          .reduce((a, b) => a.length >= b.length ? a : b)
                      );
                      return topMetrics.map((item, idx) => {
                      const Icon = item.icon;

                      return (
                        <AnimatedCard key={item.label} delay={idx * 80}>
                          <div
                            className={`group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border border-[var(--sgt-border-subtle)] [background:var(--sgt-bg-card)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--sgt-border-medium)] hover:shadow-[0_20px_42px_rgba(0,0,0,0.35)] p-2.5 xl:p-3`}
                          >
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.025),transparent_45%)]" />

                            <div className="relative flex h-full flex-col">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[11px] leading-[16px] font-semibold uppercase tracking-[0.28em] dark:text-slate-400 text-slate-500 transition-colors duration-300 dark:group-hover:text-slate-300 group-hover:text-slate-700">
                                  {item.label}
                                </p>

                                <div
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105 ${toneStyles[item.tone]
                                    }`}
                                >
                                  <Icon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" />
                                </div>
                              </div>

                              <div className="mt-auto pt-3">
                                <p className="min-w-0 overflow-hidden whitespace-nowrap font-bold leading-[1] tracking-[-0.03em] [color:var(--sgt-text-primary)]" style={{ fontSize: topSharedFont }}>
                                  <CountUp value={item.value} />
                                </p>
                                <p className="mt-1.5 text-[11px] leading-[16px] dark:text-slate-400 text-slate-600">
                                  {item.helper}
                                </p>
                              </div>
                            </div>
                          </div>
                        </AnimatedCard>
                      );
                    })})()}
                  </div>
                )}

                {/* Large cards with charts */}
                {isFetchingDw && !isProcessed ? (
                  <div className="contents">
                    <LargeCardSkeleton />
                    <LargeCardSkeleton />
                  </div>
                ) : (
                  <div className="contents">
                    <AnimatedCard delay={320} className="flex min-h-0 h-full">
                      <div className="flex-1 flex flex-col min-h-0">
                      {renderLargeCard({
                        title: "Saldo a receber",
                        tone: "emerald",
                        total: contasReceber.saldoAReceber,
                        subtitle: "Saldo pendente a receber",
                        primaryLabel: "Previsto",
                        primaryValue: contasReceber.saldoAReceber,
                        secondaryLabel: "Recebido",
                        secondaryValue: contasReceber.valorRecebido,
                        monthlyPrevisto: chartReceber.previsto,
                        monthlyRealizado: chartReceber.realizado,
                        chartAno: chartReceber.ano,
                        to: "/contas-a-receber",
                        icon: TrendingUp,
                      })}
                      </div>
                    </AnimatedCard>

                    <AnimatedCard delay={400} className="flex min-h-0 h-full">
                      <div className="flex-1 flex flex-col min-h-0">
                      {renderLargeCard({
                        title: "Saldo a pagar",
                        tone: "amber",
                        total: contasPagar.saldoAPagar,
                        subtitle: "Saldo pendente a pagar",
                        primaryLabel: "Previsto",
                        primaryValue: contasPagar.saldoAPagar,
                        secondaryLabel: "Pago",
                        secondaryValue: contasPagar.valorPago,
                        monthlyPrevisto: chartPagar.previsto,
                        monthlyRealizado: chartPagar.realizado,
                        chartAno: chartPagar.ano,
                        to: "/contas-a-pagar",
                        icon: TrendingDown,
                      })}
                      </div>
                    </AnimatedCard>
                  </div>
                )}

                {/* KPIs Extras — dentro da coluna esquerda */}
                {isProcessed && (() => {
                  const kpiTexts = [
                    kpiExtra.saldoLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                    kpiExtra.inadimplencia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                    `${kpiExtra.realizacaoCP.toFixed(0)}%`,
                    `${(kpiExtra.realizacaoCR ?? 0).toFixed(0)}%`,
                  ];
                  const sharedFontSize = kpiFontSize(kpiTexts.reduce((a, b) => a.length >= b.length ? a : b));
                  return (
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4 xl:col-span-2 items-stretch">
                    {/* SALDO LÍQUIDO */}
                    <div
                      className={`group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border p-2.5 xl:p-3 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.4)] ${kpiExtra.saldoLiquido >= 0
                          ? "border-emerald-400/[0.12] [background:var(--sgt-bg-card)]"
                          : "border-rose-400/[0.12] [background:var(--sgt-bg-card)]"
                        }`}
                    >
                      <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-32"
                        style={{ background: kpiExtra.saldoLiquido >= 0 ? "radial-gradient(circle at 100% 100%, rgba(16,185,129,0.09), transparent 65%)" : "radial-gradient(circle at 100% 100%, rgba(244,63,94,0.09), transparent 65%)" }} />
                      <div className="relative flex flex-col h-full">
                        <div className="mb-2 flex items-center justify-between">
                          <span
                            className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${kpiExtra.saldoLiquido >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                              }`}
                          >
                            SALDO LÍQUIDO
                          </span>
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpiExtra.saldoLiquido >= 0
                                ? "bg-emerald-500/15"
                                : "bg-red-500/15"
                              }`}
                          >
                            {kpiExtra.saldoLiquido >= 0 ? (
                              <TrendingUp className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                        </div>
                        <div className="font-extrabold tracking-[-0.04em] [color:var(--sgt-text-primary)] leading-none whitespace-nowrap overflow-hidden" style={{ fontSize: sharedFontSize }}>
                          <CountUp value={kpiExtra.saldoLiquido} />
                        </div>
                        <p className="mt-2 text-sm dark:text-slate-400 text-slate-600">
                          Recebido − Pago no período
                        </p>
                        <div className="mt-auto flex flex-col gap-2 pt-2">
                        <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                          {contasReceber.valorAReceber > 0 && contasPagar.valorPago > 0 ? (
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${kpiExtra.saldoLiquido >= 0 ? "bg-emerald-400" : "bg-red-400"}`}
                              style={{ width: `${Math.min(Math.abs(kpiExtra.saldoLiquido) / Math.max(contasReceber.valorRecebido, contasPagar.valorPago, 1) * 100, 100)}%` }}
                            />
                          ) : (
                            <div className="h-full w-full rounded-full bg-white/5" />
                          )}
                        </div>
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[12px] font-semibold ${kpiExtra.saldoLiquido >= 0
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-red-500/15 text-red-300"
                            }`}
                        >
                          {kpiExtra.saldoLiquido >= 0
                            ? "Fluxo positivo"
                            : "Fluxo negativo"}
                        </span>
                        </div>
                      </div>
                    </div>

                    {/* INADIMPLÊNCIA */}
                    <div className="group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border border-rose-400/[0.12] [background:var(--sgt-bg-card)] p-2.5 xl:p-3 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
                      <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-32" style={{ background: "radial-gradient(circle at 100% 100%, rgba(244,63,94,0.09), transparent 65%)" }} />
                      <div className="relative flex h-full flex-col">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-400">
                            INADIMPLÊNCIA
                          </span>
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15">
                            <AlertCircle className="h-4 w-4 text-red-400" />
                          </div>
                        </div>
                        <div className="font-extrabold tracking-[-0.04em] [color:var(--sgt-text-primary)] leading-none whitespace-nowrap overflow-hidden" style={{ fontSize: sharedFontSize }}>
                          <CountUp value={kpiExtra.inadimplencia} />
                        </div>
                        <p className="mt-2 text-sm font-medium text-red-400">
                          {(kpiExtra.inadimplenciaPerc ?? 0).toFixed(1)}% do A Receber
                        </p>
                        <div className="mt-auto flex flex-col gap-2 pt-2">
                        <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                          {contasReceber.valorAReceber > 0 ? (
                            <div
                              className="h-full rounded-full bg-red-400 transition-all duration-700"
                              style={{ width: `${Math.min((kpiExtra.inadimplencia / Math.max(contasReceber.valorAReceber, 1)) * 100, 100)}%` }}
                            />
                          ) : (
                            <div className="h-full w-full rounded-full bg-white/5" />
                          )}
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-red-500/15 px-2.5 py-1 text-[12px] font-semibold text-red-300">
                          {kpiExtra.inadimplenciaDocs} docs vencidos
                        </span>
                        </div>
                      </div>
                    </div>

                    {/* % REALIZAÇÃO CP */}
                    <div className="group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border border-violet-400/[0.12] [background:var(--sgt-bg-card)] p-2.5 xl:p-3 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
                      <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-32" style={{ background: "radial-gradient(circle at 100% 100%, rgba(139,92,246,0.09), transparent 65%)" }} />
                      <div className="relative flex h-full flex-col">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-400">
                            % REALIZAÇÃO CP
                          </span>
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15">
                            <TrendingDown className="h-4 w-4 text-violet-400" />
                          </div>
                        </div>
                        <div className="font-extrabold tracking-[-0.04em] [color:var(--sgt-text-primary)] leading-none whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: sharedFontSize }}>
                          {kpiExtra.realizacaoCP.toFixed(0)}%
                        </div>
                        <p className="mt-2 text-sm dark:text-slate-400 text-slate-600">
                          Pago ÷ Previsto no período
                        </p>
                        <div className="mt-auto flex flex-col gap-2 pt-2">
                        <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                          <div
                            className="h-full rounded-full bg-violet-400 transition-all duration-700"
                            style={{ width: `${Math.min(kpiExtra.realizacaoCP, 100)}%` }}
                          />
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-violet-500/15 px-2.5 py-1 text-[12px] font-semibold dark:text-violet-200 text-violet-700">
                          Meta: 100%
                        </span>
                        </div>
                      </div>
                    </div>

                    {/* % REALIZAÇÃO CR */}
                    <div className="group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border border-cyan-400/[0.12] [background:var(--sgt-bg-card)] p-2.5 xl:p-3 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
                      <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-32" style={{ background: "radial-gradient(circle at 100% 100%, rgba(6,182,212,0.09), transparent 65%)" }} />
                      <div className="relative flex h-full flex-col">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-400">
                            % REALIZAÇÃO CR
                          </span>
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15">
                            <TrendingUp className="h-4 w-4 text-cyan-400" />
                          </div>
                        </div>
                        <div className="font-extrabold tracking-[-0.04em] [color:var(--sgt-text-primary)] leading-none whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: sharedFontSize }}>
                          {(kpiExtra.realizacaoCR ?? 0).toFixed(0)}%
                        </div>
                        <p className="mt-2 text-sm dark:text-slate-400 text-slate-600">
                          Recebido ÷ Previsto no período
                        </p>
                        <div className="mt-auto flex flex-col gap-2 pt-2">
                        <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                          <div
                            className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                            style={{ width: `${Math.min(kpiExtra.realizacaoCR ?? 0, 100)}%` }}
                          />
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-cyan-500/15 px-2.5 py-1 text-[12px] font-semibold dark:text-cyan-200 text-cyan-700">
                          Meta: 100%
                        </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })()
                }

              </div>
              {/* end left column */}

              <aside
                className={`rounded-[14px] sm:rounded-[16px] border [background:var(--sgt-bg-card)] min-h-0 overflow-hidden ${presentationMode
                    ? "h-full overflow-y-auto p-3"
                    : "xl:col-start-2 xl:row-start-1 xl:row-span-3 flex flex-col p-2.5 sm:p-3"
                  }`}
                style={{ borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3 shrink-0">
                  <div>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.28em] dark:text-slate-600 text-slate-500 mb-1">
                      Distribuição de custos do período
                    </p>
                    <p
                      className={`font-extrabold tracking-[-0.04em] leading-none dark:bg-gradient-to-r dark:from-white dark:from-40% dark:via-slate-200 dark:via-70% dark:to-slate-500 dark:bg-clip-text dark:text-transparent text-slate-800 ${presentationMode ? "text-lg" : "text-xl"}`}
                    >
                       Indicadores
                    </p>
                  </div>
                  {!presentationMode && (
                    <button
                      onClick={togglePresentationMode}
                      className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-all border-[var(--sgt-border-subtle)] [background:var(--sgt-input-bg)] text-[color:var(--sgt-text-muted)] hover:border-[var(--sgt-border-medium)] hover:[background:var(--sgt-input-hover)] hover:text-[color:var(--sgt-text-primary)]"
                      title="Modo apresentação"
                      aria-label="Ativar modo apresentação"
                    >
                      <Presentation className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Lista — flex-1 para ocupar o espaço restante */}
                <div className={`flex flex-col flex-1 gap-1 min-h-0 overflow-hidden justify-between transition-opacity duration-300 ${isFetchingDw && isProcessed ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
                  {isFetchingDw && !isProcessed ? (
                    <>
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <IndicatorSkeleton key={i} />
                      ))}
                    </>
                  ) : (
                    indicadores.map((ind, idx) => {
                      const abaixoDaMeta = ind.percentualReal < ind.percentualEsperado;
                      const progress = Math.min(
                        (ind.percentualReal / Math.max(ind.percentualEsperado, 1)) * 100,
                        100
                      );
                      const metaMark = Math.min(
                        (ind.percentualEsperado / Math.max(ind.percentualEsperado, ind.percentualReal, 1)) * 100,
                        100
                      );

                      return (
                        <AnimatedCard key={ind.id} delay={480 + idx * 45} className="flex-1 min-h-0">
                          <Link
                            to={`/indicadores/${ind.id}`}
                            className="group relative flex flex-col justify-center h-full rounded-[10px] border overflow-hidden transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                            style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
                            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--sgt-border-medium)"; el.style.boxShadow = "0 10px 32px rgba(0,0,0,0.22)"; }}
                            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--sgt-border-subtle)"; el.style.boxShadow = "none"; }}
                          >
                            {/* Accent bar top */}
                            <div
                              className={`h-[1px] w-full transition-all duration-700 opacity-50 ${abaixoDaMeta
                                ? "bg-gradient-to-r from-emerald-500 to-emerald-300"
                                : "bg-gradient-to-r from-red-600 to-red-400"}`}
                            />

                            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                              {/* Percentage ring */}
                              <div className="relative shrink-0 h-8 w-8">
                                <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
                                  <circle cx="18" cy="18" r="14" fill="none"
                                    stroke="var(--sgt-progress-track)" strokeWidth="3" />
                                  <circle cx="18" cy="18" r="14" fill="none"
                                    stroke={abaixoDaMeta ? "#34d399" : "#f87171"}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeDasharray={`${progress * 0.879} 87.9`}
                                    className="transition-all duration-700"
                                  />
                                </svg>
                                <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums ${abaixoDaMeta ? "text-emerald-400" : "text-red-400"}`}>
                                  {ind.percentualReal > 999 ? "999+" : `${ind.percentualReal}%`}
                                </span>
                              </div>

                              {/* Name + meta */}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.10em] dark:text-slate-300 text-slate-700 transition-colors group-hover:dark:text-white group-hover:text-slate-900">
                                  {ind.nome}
                                </p>
                                <p className="mt-0.5 text-[10px] font-medium dark:text-slate-400 text-slate-500">
                                  Meta: {ind.percentualEsperado}%
                                </p>
                              </div>

                              {/* Status badge + arrow */}
                              <div className="flex shrink-0 items-center gap-1.5">
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${abaixoDaMeta
                                  ? "bg-emerald-500/10 text-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300"
                                  : "bg-red-500/10 text-red-500 dark:bg-red-500/15 dark:text-red-400"}`}>
                                  {abaixoDaMeta ? "OK" : "Alto"}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 dark:text-slate-600 text-slate-400 transition-all duration-300 group-hover:translate-x-1.5 dark:group-hover:text-slate-300 group-hover:text-slate-600" />
                              </div>
                            </div>
                          </Link>
                        </AnimatedCard>
                      );
                    })
                  )}
                </div>
              </aside>
            </div>
            {/* end 2-column grid */}

            {/* ── NEWS TICKER ── */}
            <div
              className="relative flex h-8 shrink-0 items-center overflow-hidden rounded-[10px] border"
              style={{ borderColor: "var(--sgt-border-subtle)", background: "var(--sgt-bg-card)" }}
            >
              {/* Label */}
              <div className="flex h-full shrink-0 items-center gap-1.5 border-r px-3" style={{ borderColor: "var(--sgt-border-subtle)" }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-300">Tiker</span>
              </div>

              {/* Scrolling content */}
              <div className="relative flex-1 overflow-hidden">
                <div
                  className="flex items-center gap-16 whitespace-nowrap text-[11px] font-medium dark:text-slate-400 text-slate-500"
                  style={{
                    animation: "sgt-ticker 40s linear infinite",
                  }}
                >
                  {[
                    "📦 Contas a pagar do período: R$ 3.358.717,19",
                    "✅ Total pago: R$ 177.572,13",
                    "📥 A receber: R$ 4.752.942,99",
                    "💰 Saldo líquido positivo no período",
                    "⚠️ Inadimplência: 74.7% do A Receber",
                    "📊 Realização CP: 5% · Realização CR: 25%",
                    "🔧 Manutenção acima da meta — verifique detalhamento",
                    "📦 Contas a pagar do período: R$ 3.358.717,19",
                    "✅ Total pago: R$ 177.572,13",
                    "📥 A receber: R$ 4.752.942,99",
                    "💰 Saldo líquido positivo no período",
                    "⚠️ Inadimplência: 74.7% do A Receber",
                    "📊 Realização CP: 5% · Realização CR: 25%",
                    "🔧 Manutenção acima da meta — verifique detalhamento",
                  ].map((item, i) => (
                    <span key={i} className="shrink-0">
                      {item}
                      <span className="mx-8 opacity-30">◆</span>
                    </span>
                  ))}
                </div>
              </div>

              <style>{`
                @keyframes sgt-ticker {
                  0%   { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
              `}</style>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;