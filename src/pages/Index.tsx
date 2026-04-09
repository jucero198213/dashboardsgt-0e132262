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
import { formatCurrency } from "@/data/mockData";
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
/*  Skeleton shimmer para loading                                      */
/* ------------------------------------------------------------------ */
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />
);

const CardSkeleton = () => (
  <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.82)_0%,rgba(10,16,36,0.98)_100%)] p-3.5">
    <Skeleton className="mb-3 h-3 w-20" />
    <Skeleton className="mb-2 h-6 w-32" />
    <Skeleton className="h-3 w-24" />
  </div>
);

const LargeCardSkeleton = () => (
  <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,38,0.82)_0%,rgba(6,11,28,0.99)_100%)] p-3.5">
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
  <div className="rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.88)_0%,rgba(9,14,33,0.98)_100%)] p-3">
    <div className="mb-2 flex justify-between">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-10" />
    </div>
    <Skeleton className="h-1.5 w-full rounded-full" />
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

  const svgW = 520;
  const svgH = 155;
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
    <div className="flex min-h-0 flex-1 flex-col rounded-[22px] border border-white/8 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
                      fill="rgba(255,255,255,0.5)"
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
                          fill="rgba(255,255,255,0.45)"
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
                        fill="rgba(255,255,255,0.3)"
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
                  ? "rgba(255,255,255,0.8)"
                  : "rgba(255,255,255,0.25)"
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

  const filiaisFiltradas = useMemo(
    () =>
      dwFilter.empresa
        ? filiais.filter((f) => f.empresa === dwFilter.empresa)
        : filiais,
    [filiais, dwFilter.empresa]
  );

  const handleUpdate = useCallback(async () => {
    setProgress(0);

    let current = 0;

    const interval = window.setInterval(() => {
      current += Math.random() * 8;

      if (current >= 90) {
        current = 90;
        window.clearInterval(interval);
      }

      setProgress(Math.floor(current));
    }, 250);

    try {
      await fetchFromDW();
      window.clearInterval(interval);
      setProgress(100);
    } catch (error) {
      window.clearInterval(interval);
      console.error("Erro ao atualizar dados:", error);
    } finally {
      window.setTimeout(() => {
        setProgress(0);
      }, 600);
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
        value: contasReceber.saldoAReceber,
        helper: "Saldo pendente",
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
        value: contasPagar.saldoAPagar,
        helper: "Saldo pendente",
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
      contasReceber.saldoAReceber,
      contasReceber.valorRecebido,
      contasPagar.saldoAPagar,
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
        className={`group relative overflow-hidden rounded-[22px] border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(0,0,0,0.32)] ${isPositive
          ? "border-emerald-500/16 bg-[linear-gradient(180deg,rgba(11,18,38,0.82)_0%,rgba(6,11,28,0.99)_100%)] hover:border-emerald-400/30 hover:bg-[linear-gradient(180deg,rgba(14,24,46,0.92)_0%,rgba(8,14,32,1)_100%)]"
          : "border-amber-500/16 bg-[linear-gradient(180deg,rgba(11,18,38,0.82)_0%,rgba(6,11,28,0.99)_100%)] hover:border-amber-400/30 hover:bg-[linear-gradient(180deg,rgba(14,24,46,0.92)_0%,rgba(8,14,32,1)_100%)]"
          } ${presentationMode ? "flex flex-col p-2.5" : "flex flex-col p-2.5 xl:p-3"}`}
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
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isPositive ? "text-emerald-300" : "text-amber-300"
                  }`}
              >
                {title}
              </p>
              <h2 className="mt-0.5 min-w-0 truncate text-[18px] font-bold leading-none tracking-[-0.03em] text-white xl:text-[20px]">
                <CountUp value={total} />
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>
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

          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-[12px] border border-white/8 bg-white/[0.04] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 group-hover:border-white/12 group-hover:bg-white/[0.055]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {primaryLabel}
              </p>
              <p className="mt-1 min-w-0 truncate text-[13px] font-bold leading-none tracking-[-0.03em] text-white">
                <CountUp value={primaryValue} />
              </p>
            </div>

            <div className="rounded-[12px] border border-white/8 bg-white/[0.04] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 group-hover:border-white/12 group-hover:bg-white/[0.055]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {secondaryLabel}
              </p>
              <p className="mt-1 min-w-0 truncate text-[13px] font-bold leading-none tracking-[-0.03em] text-white">
                <CountUp value={secondaryValue} />
              </p>
            </div>
          </div>

          <div className="relative">
            <MiniLineChart
              previstoMonthly={monthlyPrevisto}
              realizadoMonthly={monthlyRealizado}
              tone={tone}
              ano={chartAno}
            />
            {isFetchingDw && (
              <div className="absolute inset-0 flex items-center justify-center rounded-[22px] bg-black/30 backdrop-blur-[1px]">
                <div
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold ${isPositive
                    ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-300"
                    : "border-amber-400/30 bg-amber-500/20 text-amber-300"
                    }`}
                >
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Atualizando...
                </div>
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
                className={`text-[9px] font-semibold uppercase tracking-[0.22em] ${isPositive ? "text-emerald-200/75" : "text-amber-200/75"
                  }`}
              >
                Ação rápida
              </p>
              <p className="mt-0.5 text-[11px] text-slate-300">
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
      className={`min-h-screen bg-[#020617] text-white transition-all duration-300 ${presentationMode
        ? "h-screen w-screen overflow-hidden p-0"
        : "overflow-y-auto px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2"
        }`}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:88px_88px]" />

      <div
        className={`relative flex flex-col ${presentationMode
          ? "h-full w-full max-w-none"
          : "w-full min-h-[calc(100vh-8px)] sm:min-h-[calc(100vh-12px)]"
          }`}
      >
        <section
          className={`relative flex-1 min-h-0 border border-white/10 bg-[linear-gradient(135deg,rgba(22,32,78,0.94)_0%,rgba(7,14,38,0.985)_54%,rgba(2,8,23,1)_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.48)] ${presentationMode
            ? "h-full w-full overflow-hidden rounded-none"
            : "rounded-[16px] sm:rounded-[20px] md:rounded-[24px]"
            }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(99,102,241,0.22),transparent_18%),radial-gradient(circle_at_84%_12%,rgba(14,165,233,0.10),transparent_18%),radial-gradient(circle_at_48%_100%,rgba(16,185,129,0.05),transparent_20%)]" />

          <div
            className={`relative ${presentationMode
              ? "grid h-full gap-3 p-3 sm:p-3.5 lg:p-4 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,0.75fr)] xl:grid-rows-[1fr]"
              : "flex flex-col gap-3 p-3 sm:gap-4 sm:p-3.5 lg:p-4 xl:grid xl:grid-cols-[minmax(0,2.1fr)_minmax(0,0.75fr)] xl:grid-rows-[1fr] xl:gap-3"
              }`}
          >
            <div className="flex min-h-0 flex-col gap-2.5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2.5">
                    <div className="flex h-7 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/8 px-2.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      </span>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                        Tempo real
                      </span>
                    </div>
                    {isProcessed && (
                      <span className="text-[10px] font-medium text-slate-600">
                        {dwFilter.dataInicio} → {dwFilter.dataFim}
                      </span>
                    )}
                  </div>

                  <h1
                    className={`bg-gradient-to-r from-white from-40% via-slate-200 via-70% to-slate-500 bg-clip-text font-extrabold tracking-[-0.04em] text-transparent drop-shadow-[0_0_40px_rgba(255,255,255,0.08)] ${presentationMode
                      ? "text-[48px] leading-[0.92] 2xl:text-[56px]"
                      : "text-2xl sm:text-3xl md:text-[38px] xl:text-[44px] xl:leading-[0.95]"
                      }`}
                  >
                    Análise Consolidada
                  </h1>
                </div>

                <UserMenu />
              </div>

              <div className="h-px bg-white/6" />

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <input
                  type="date"
                  value={dwFilter.dataInicio}
                  onChange={(e) => setDwFilter("dataInicio", e.target.value)}
                  className="h-8 w-[120px] rounded-xl border border-white/10 bg-white/5 px-2 text-[11px] text-slate-300 outline-none transition-all hover:border-white/20 hover:bg-white/10 focus:border-cyan-400/40 focus:bg-white/10 [color-scheme:dark] sm:w-auto sm:px-3 sm:text-xs"
                />

                <input
                  type="date"
                  value={dwFilter.dataFim}
                  onChange={(e) => setDwFilter("dataFim", e.target.value)}
                  className="h-8 w-[120px] rounded-xl border border-white/10 bg-white/5 px-2 text-[11px] text-slate-300 outline-none transition-all hover:border-white/20 hover:bg-white/10 focus:border-cyan-400/40 focus:bg-white/10 [color-scheme:dark] sm:w-auto sm:px-3 sm:text-xs"
                />

                <div className="hidden h-5 w-px shrink-0 bg-white/10 sm:block" />

                <Select
                  value={dwFilter.empresa ?? "__all__"}
                  onValueChange={(v) =>
                    setDwFilter("empresa", v === "__all__" ? null : v)
                  }
                >
                  <SelectTrigger className="h-8 w-[100px] rounded-xl border-white/10 bg-white/5 text-[11px] text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 sm:w-[130px] sm:text-xs">
                    <SelectValue placeholder="Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={dwFilter.filial ?? "__all__"}
                  onValueChange={(v) =>
                    setDwFilter("filial", v === "__all__" ? null : v)
                  }
                >
                  <SelectTrigger className="h-8 w-[100px] rounded-xl border-white/10 bg-white/5 text-[11px] text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 sm:w-[140px] sm:text-xs">
                    <SelectValue placeholder="Filial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {filiaisFiltradas.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  onClick={() => void handleUpdate()}
                  disabled={isFetchingDw}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-2.5 text-[11px] font-semibold text-cyan-300 transition-all hover:border-cyan-300/30 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-3.5 sm:text-xs"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isFetchingDw ? "animate-spin" : ""
                      }`}
                  />
                  {isFetchingDw ? (
                    <span className="flex items-center gap-1.5">
                      <span className="hidden sm:inline">Buscando...</span>
                      <span className="font-bold text-cyan-200">
                        {progress}%
                      </span>
                    </span>
                  ) : (
                    "Atualizar"
                  )}
                </button>
              </div>

              {dwError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {dwError}
                </div>
              )}

              {/* Top 4 metric cards */}
              {isFetchingDw && !isProcessed ? (
                <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                  {topMetrics.map((item, idx) => {
                    const Icon = item.icon;

                    return (
                      <AnimatedCard key={item.label} delay={idx * 80}>
                        <div
                          className={`group relative overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.82)_0%,rgba(10,16,36,0.98)_100%)] transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(25,36,86,0.88)_0%,rgba(12,18,40,1)_100%)] hover:shadow-[0_20px_42px_rgba(0,0,0,0.30)] ${presentationMode ? "p-3" : "p-3 xl:p-3.5"
                            }`}
                        >
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_30%)]" />

                          <div className="relative flex h-full flex-col justify-between">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
                                {item.label}
                              </p>

                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105 ${toneStyles[item.tone]
                                  }`}
                              >
                                <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                              </div>
                            </div>

                            <div className="mt-2.5">
                              <p className="min-w-0 truncate text-[19px] font-bold leading-none tracking-[-0.03em] text-white xl:text-[20px]">
                                <CountUp value={item.value} />
                              </p>
                              <p className="mt-1.5 text-xs text-slate-400">
                                {item.helper}
                              </p>
                            </div>
                          </div>
                        </div>
                      </AnimatedCard>
                    );
                  })}
                </div>
              )}

              {/* Large cards with charts */}
              {isFetchingDw && !isProcessed ? (
                <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                  <LargeCardSkeleton />
                  <LargeCardSkeleton />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                  <AnimatedCard delay={320}>
                    {renderLargeCard({
                      title: "Contas a receber",
                      tone: "emerald",
                      total: contasReceber.valorAReceber,
                      subtitle: "Saldo pendente a receber",
                      primaryLabel: "Previsto",
                      primaryValue: contasReceber.valorAReceber,
                      secondaryLabel: "Recebido",
                      secondaryValue: contasReceber.valorRecebido,
                      monthlyPrevisto: chartReceber.previsto,
                      monthlyRealizado: chartReceber.realizado,
                      chartAno: chartReceber.ano,
                      to: "/contas-a-receber",
                      icon: TrendingUp,
                    })}
                  </AnimatedCard>

                  <AnimatedCard delay={400}>
                    {renderLargeCard({
                      title: "Contas a pagar",
                      tone: "amber",
                      total: contasPagar.valorAPagar,
                      subtitle: "Saldo pendente a pagar",
                      primaryLabel: "Previsto",
                      primaryValue: contasPagar.valorAPagar,
                      secondaryLabel: "Pago",
                      secondaryValue: contasPagar.valorPago,
                      monthlyPrevisto: chartPagar.previsto,
                      monthlyRealizado: chartPagar.realizado,
                      chartAno: chartPagar.ano,
                      to: "/contas-a-pagar",
                      icon: TrendingDown,
                    })}
                  </AnimatedCard>
                </div>
              )}

              {/* KPIs Extras */}
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {/* SALDO LÍQUIDO */}
                <div
                  className={`group relative overflow-hidden rounded-[22px] border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35)] ${kpiExtra.saldoLiquido >= 0
                    ? "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5"
                    : "border-red-500/25 bg-gradient-to-br from-red-500/10 to-red-500/5"
                    }`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_30%)]" />

                  <div className="relative flex h-full flex-col">
                    <div className="mb-4 flex items-start justify-between">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${kpiExtra.saldoLiquido >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                          }`}
                      >
                        SALDO LÍQUIDO
                      </span>

                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${kpiExtra.saldoLiquido >= 0
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

                    <div className="text-[clamp(1.9rem,2.5vw,2.5rem)] font-extrabold tracking-[-0.05em] text-white">
                      <CountUp value={kpiExtra.saldoLiquido} />
                    </div>

                    <p className="mt-2 text-sm text-slate-400">
                      Recebido − Pago no período
                    </p>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full ${kpiExtra.saldoLiquido >= 0
                          ? "bg-emerald-400"
                          : "bg-red-400"
                          }`}
                        style={{ width: "70%" }}
                      />
                    </div>

                    <span
                      className={`mt-4 inline-flex w-fit rounded-full px-2.5 py-1 text-[13px] font-semibold ${kpiExtra.saldoLiquido >= 0
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

                {/* INADIMPLÊNCIA */}
                <div className="group relative overflow-hidden rounded-[22px] border border-red-500/25 bg-gradient-to-br from-red-500/10 to-red-500/5 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_30%)]" />

                  <div className="relative flex h-full flex-col">
                    <div className="mb-4 flex items-start justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-400">
                        INADIMPLÊNCIA
                      </span>

                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      </div>
                    </div>

                    <div className="text-[clamp(1.9rem,2.5vw,2.5rem)] font-extrabold tracking-[-0.05em] text-white">
                      <CountUp value={kpiExtra.inadimplencia} />
                    </div>

                    <p className="mt-2 text-sm text-slate-400">
                      CR vencido sem recebimento
                    </p>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-red-400" style={{ width: "60%" }} />
                    </div>

                    <span className="mt-4 inline-flex w-fit rounded-full bg-red-500/15 px-2.5 py-1 text-[13px] font-semibold text-red-300">
                      {kpiExtra.inadimplenciaDocs} docs vencidos
                    </span>
                  </div>
                </div>

                {/* REALIZAÇÃO */}
                <div className="group relative overflow-hidden rounded-[22px] border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_30%)]" />

                  <div className="relative flex h-full flex-col">
                    <div className="mb-4 flex items-start justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-400">
                        % REALIZAÇÃO CP
                      </span>

                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15">
                        <TrendingDown className="h-4 w-4 text-violet-400" />
                      </div>
                    </div>

                    <div className="text-[clamp(1.9rem,2.5vw,2.5rem)] font-extrabold tracking-[-0.05em] text-white">
                      {kpiExtra.realizacaoCP.toFixed(0)}%
                    </div>

                    <p className="mt-2 text-sm text-slate-400">
                      Pago ÷ Previsto no período
                    </p>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-violet-400"
                        style={{
                          width: `${Math.min(kpiExtra.realizacaoCP, 100)}%`,
                        }}
                      />
                    </div>

                    <span className="mt-4 inline-flex w-fit rounded-full bg-violet-500/15 px-2.5 py-1 text-[13px] font-semibold text-violet-200">
                      Meta: 100%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <aside
              className={`rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,22,43,0.94)_0%,rgba(10,16,34,0.88)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl ${presentationMode
                ? "h-full overflow-y-auto p-3.5"
                : "self-start p-3 lg:p-3.5 xl:mt-[143px] xl:h-[calc(100%-143px)]"
                }`}
            >
              <div className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`font-semibold tracking-tight text-white ${presentationMode ? "text-xl" : "text-[28px]"
                        }`}
                    >
                      Indicadores
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-400">
                      Resumo lateral no padrão da referência.
                    </p>
                  </div>

                  {!presentationMode && (
                    <button
                      onClick={togglePresentationMode}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                      title="Modo apresentação"
                      aria-label="Ativar modo apresentação"
                    >
                      <Presentation className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  {isFetchingDw && !isProcessed ? (
                    <>
                      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <IndicatorSkeleton key={i} />
                      ))}
                    </>
                  ) : (
                    indicadores.map((ind, idx) => {
                      const abaixoDaMeta =
                        ind.percentualReal < ind.percentualEsperado;

                      const progress = Math.min(
                        (ind.percentualReal /
                          Math.max(ind.percentualEsperado, 1)) *
                        100,
                        100
                      );

                      return (
                        <AnimatedCard key={ind.id} delay={480 + idx * 45}>
                          <Link
                            to={`/indicadores/${ind.id}`}
                            className={`group relative block overflow-hidden rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.88)_0%,rgba(9,14,33,0.98)_100%)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(24,34,84,0.95)_0%,rgba(12,18,40,1)_100%)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.32)] ${presentationMode ? "px-2.5 py-2.5" : "px-3 py-2"
                              }`}
                          >
                            <div className="flex items-center justify-between gap-2.5">
                              <p className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
                                {ind.nome}
                              </p>

                              <div className="flex shrink-0 min-w-[58px] items-center justify-end gap-1.5">
                                <span
                                  className={`text-xs font-semibold ${abaixoDaMeta
                                    ? "text-emerald-300"
                                    : "text-red-400"
                                    }`}
                                >
                                  {ind.percentualReal}%
                                </span>

                                <ArrowRight className="h-4 w-4 text-slate-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" />
                              </div>
                            </div>

                            <div className="relative mt-2">
                              <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ease-out ${abaixoDaMeta
                                    ? "bg-emerald-400"
                                    : "bg-red-500"
                                    }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>

                              <div
                                className="absolute top-0 h-[3px] w-[2px] rounded-full bg-white/40"
                                style={{
                                  left: `${Math.min(
                                    (ind.percentualEsperado /
                                      Math.max(
                                        ind.percentualEsperado,
                                        ind.percentualReal,
                                        1
                                      )) *
                                    100,
                                    100
                                  )}%`,
                                }}
                                title={`Meta: ${ind.percentualEsperado}%`}
                              />
                            </div>
                          </Link>
                        </AnimatedCard>
                      );
                    })
                  )}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;