import { useCallback, useEffect, useMemo, useState } from "react";
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
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Usa os dados mensais reais (não acumulados)
  const previstoPoints = previstoMonthly;
  const realizadoPoints = realizadoMonthly;

  const allValues = [...previstoPoints, ...realizadoPoints];
  const maxVal = Math.max(...allValues, 1);

  const svgW = 520;
  const svgH = 220;
  const padL = 12;
  const padR = 12;
  const padTop = 16;
  const padBot = 28;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padTop - padBot;

  const toX = (i: number) => padL + (i / (months.length - 1)) * chartW;
  const toY = (v: number) => padTop + chartH - (v / maxVal) * chartH;

  const buildPath = (pts: number[]) =>
    pts.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  const buildAreaPath = (pts: number[]) => {
    const linePath = pts.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" L");
    return `M${linePath} L${toX(11).toFixed(1)},${(padTop + chartH).toFixed(1)} L${toX(0).toFixed(1)},${(padTop + chartH).toFixed(1)} Z`;
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

  // Calcula a posição do tooltip para não sair da tela
  const getTooltipX = (i: number) => {
    const x = toX(i);
    if (i <= 1) return x;
    if (i >= 10) return x - 130;
    return x - 65;
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col rounded-[22px] border border-white/8 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Evolução mensal{ano ? ` · ${ano}` : ""}
        </span>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-3 rounded-full" style={{ background: colors.legendPrev, opacity: 0.7 }} />
            <span className="text-[9px] text-slate-500">Previsto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-3 rounded-full" style={{ background: colors.legendReal }} />
            <span className="text-[9px] text-slate-500">{realizadoLabel}</span>
          </div>
        </div>
      </div>

      {/* SVG chart */}
      <div className="flex-1 min-h-0 relative">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.gradFrom} stopOpacity={0.25} />
              <stop offset="60%" stopColor={colors.gradFrom} stopOpacity={0.08} />
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

          {/* Horizontal grid lines */}
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

          {/* Area fill */}
          <path d={buildAreaPath(realizadoPoints)} fill={`url(#${gradId})`} />

          {/* Previsto line (dashed) */}
          <path
            d={buildPath(previstoPoints)}
            fill="none"
            stroke={colors.prevStroke}
            strokeWidth={1.8}
            strokeDasharray="6,4"
            strokeLinecap="round"
          />

          {/* Realizado line (solid, with glow) */}
          <path
            d={buildPath(realizadoPoints)}
            fill="none"
            stroke={colors.realStroke}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow-${tone})`}
          />

          {/* Dots on every month */}
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

          {/* Hover vertical line */}
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

          {/* Tooltip */}
          {hoverIndex !== null && (
            <g>
              {(() => {
                const prevVal = previstoPoints[hoverIndex];
                const realVal = realizadoPoints[hoverIndex];
                const hasData = prevVal > 0 || realVal > 0;
                const tooltipH = hasData ? 56 : 36;
                const tooltipY = Math.max(toY(Math.max(prevVal, realVal)) - tooltipH - 8, 2);

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

          {/* Month labels — ALL 12 months */}
          {months.map((m, i) => (
            <text
              key={m}
              x={toX(i)}
              y={svgH - 4}
              textAnchor="middle"
              fill={hoverIndex === i ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)"}
              fontSize={9.5}
              fontWeight={hoverIndex === i ? 600 : 400}
              fontFamily="system-ui, sans-serif"
              className="transition-all duration-150"
            >
              {m}
            </text>
          ))}

          {/* Invisible hover zones per month */}
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
  } = useFinancialData();

  const { contasReceber, contasPagar } = resumo;

  const [presentationMode, setPresentationMode] = useState(false);

  const filiaisFiltradas = useMemo(
    () =>
      dwFilter.empresa
        ? filiais.filter((f) => f.empresa === dwFilter.empresa)
        : filiais,
    [filiais, dwFilter.empresa]
  );

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
        label: "A PAGAR",
        value: contasPagar.saldoAPagar,
        helper: "Saldo pendente",
        icon: TrendingDown,
        tone: "amber",
      },
      {
        label: "RECEBIDO",
        value: contasReceber.valorRecebido,
        helper: "Entrada consolidada",
        icon: TrendingUp,
        tone: "cyan",
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
      contasPagar.saldoAPagar,
      contasReceber.valorRecebido,
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
          } ${presentationMode ? "flex flex-col p-3.5" : "flex flex-col p-3.5 xl:p-4"}`}
      >
        {/* Glow overlays */}
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

        {/* Content */}
        <div className="relative flex flex-1 min-h-0 flex-col gap-2">
          {/* Header: title + value + icon */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.3em] ${isPositive ? "text-emerald-300" : "text-amber-300"
                  }`}
              >
                {title}
              </p>
              <h2 className="mt-1 text-[22px] font-bold leading-none tracking-[-0.03em] text-white truncate min-w-0 xl:text-[24px]">
                {formatCurrency(total)}
              </h2>
              <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
            </div>

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105 ${isPositive
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 group-hover:border-emerald-400/30 group-hover:bg-emerald-400/15"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-300 group-hover:border-amber-400/30 group-hover:bg-amber-400/15"
                }`}
            >
              <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
            </div>
          </div>

          {/* Sub-cards side by side */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[16px] border border-white/8 bg-white/[0.04] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 group-hover:border-white/12 group-hover:bg-white/[0.055]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                {primaryLabel}
              </p>
              <p className="mt-1.5 text-[15px] font-bold leading-none tracking-[-0.03em] text-white truncate min-w-0">
                {formatCurrency(primaryValue)}
              </p>
            </div>

            <div className="rounded-[16px] border border-white/8 bg-white/[0.04] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 group-hover:border-white/12 group-hover:bg-white/[0.055]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                {secondaryLabel}
              </p>
              <p className="mt-1.5 text-[15px] font-bold leading-none tracking-[-0.03em] text-white truncate min-w-0">
                {formatCurrency(secondaryValue)}
              </p>
            </div>
          </div>

          {/* Line chart */}
          <MiniLineChart
            previstoMonthly={monthlyPrevisto}
            realizadoMonthly={monthlyRealizado}
            tone={tone}
            ano={chartAno}
          />

          {/* Action bar */}
          <div
            className={`rounded-[16px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${isPositive
                ? "border-emerald-400/14 bg-[linear-gradient(180deg,rgba(16,185,129,0.09)_0%,rgba(16,185,129,0.03)_100%)]"
                : "border-amber-400/14 bg-[linear-gradient(180deg,rgba(245,158,11,0.09)_0%,rgba(245,158,11,0.03)_100%)]"
              } px-3 py-2 flex items-center justify-between gap-3`}
          >
            <div className="min-w-0">
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${isPositive ? "text-emerald-200/75" : "text-amber-200/75"
                  }`}
              >
                Ação rápida
              </p>
              <p className="mt-0.5 text-xs text-slate-300">
                Abrir detalhamento completo
              </p>
            </div>

            <Link
              to={to}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 ${isPositive
                  ? "border-emerald-400/22 bg-emerald-400/12 text-emerald-300 hover:bg-emerald-400/18 hover:shadow-[0_10px_24px_rgba(16,185,129,0.12)]"
                  : "border-amber-400/22 bg-amber-400/12 text-amber-300 hover:bg-amber-400/18 hover:shadow-[0_10px_24px_rgba(245,158,11,0.12)]"
                }`}
            >
              Ver detalhamento
              <ArrowRight className="h-3.5 w-3.5" />
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
          : "overflow-y-auto px-1.5 py-1.5 sm:px-2 sm:py-2 xl:overflow-hidden"
        }`}
    >
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:88px_88px]" />

      <div
        className={`relative flex flex-col ${presentationMode ? "h-full w-full max-w-none" : "w-full min-h-[calc(100vh-12px)] xl:h-[calc(100vh-16px)]"
          }`}
      >
        {/* No header — content goes directly */}
        <section
          className={`relative flex-1 min-h-0 border border-white/10 bg-[linear-gradient(135deg,rgba(22,32,78,0.94)_0%,rgba(7,14,38,0.985)_54%,rgba(2,8,23,1)_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.48)] ${presentationMode ? "h-full w-full rounded-none overflow-hidden" : "rounded-[24px] overflow-y-auto xl:overflow-hidden"
            }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(99,102,241,0.22),transparent_18%),radial-gradient(circle_at_84%_12%,rgba(14,165,233,0.10),transparent_18%),radial-gradient(circle_at_48%_100%,rgba(16,185,129,0.05),transparent_20%)]" />

          <div
            className={`relative xl:h-full ${presentationMode
                ? "grid gap-3 p-3.5 lg:p-4 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,0.75fr)] xl:grid-rows-[1fr] h-full"
                : "flex flex-col gap-4 p-3.5 lg:p-4 xl:grid xl:grid-cols-[minmax(0,2.1fr)_minmax(0,0.75fr)] xl:grid-rows-[1fr] xl:gap-3"
              }`}
          >
            {/* Left column */}
            <div className="flex xl:h-full min-h-0 flex-col gap-2.5">
              {/* Filters */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div className="flex items-end gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      De
                    </span>
                    <input
                      type="date"
                      value={dwFilter.dataInicio}
                      onChange={(e) =>
                        setDwFilter("dataInicio", e.target.value)
                      }
                      className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-slate-300 outline-none transition-all hover:border-white/20 hover:bg-white/10 focus:border-cyan-400/40 focus:bg-white/10 [color-scheme:dark]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Até
                    </span>
                    <input
                      type="date"
                      value={dwFilter.dataFim}
                      onChange={(e) => setDwFilter("dataFim", e.target.value)}
                      className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-slate-300 outline-none transition-all hover:border-white/20 hover:bg-white/10 focus:border-cyan-400/40 focus:bg-white/10 [color-scheme:dark]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Empresa
                    </span>
                    <Select
                      value={dwFilter.empresa ?? "__all__"}
                      onValueChange={(v) =>
                        setDwFilter("empresa", v === "__all__" ? null : v)
                      }
                    >
                      <SelectTrigger className="h-8 w-[130px] rounded-xl border-white/10 bg-white/5 text-xs text-slate-300 transition-all hover:border-white/20 hover:bg-white/10">
                        <SelectValue placeholder="Todas" />
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
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Filial
                    </span>
                    <Select
                      value={dwFilter.filial ?? "__all__"}
                      onValueChange={(v) =>
                        setDwFilter("filial", v === "__all__" ? null : v)
                      }
                    >
                      <SelectTrigger className="h-8 w-[140px] rounded-xl border-white/10 bg-white/5 text-xs text-slate-300 transition-all hover:border-white/20 hover:bg-white/10">
                        <SelectValue placeholder="Todas" />
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
                  </div>

                  <button
                    onClick={() => void fetchFromDW()}
                    disabled={isFetchingDw}
                    className="inline-flex h-8 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3.5 text-xs font-semibold text-cyan-300 transition-all hover:border-cyan-300/30 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isFetchingDw ? "animate-spin" : ""
                        }`}
                    />
                    {isFetchingDw ? "Buscando..." : "Atualizar"}
                  </button>
                  </div>

                  <UserMenu />
                </div>

                {dwError && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {dwError}
                  </div>
                )}

                <div className="max-w-4xl">
                  <h1
                    className={`font-semibold tracking-tight text-white ${presentationMode
                        ? "text-[44px] leading-[0.95] 2xl:text-[52px]"
                        : "text-3xl md:text-4xl xl:text-[36px] xl:leading-[1]"
                      }`}
                  >
                    Análise Consolidada
                  </h1>

                  {presentationMode && (
                    <p className="mt-1.5 max-w-2xl text-[13px] text-slate-400">
                      Panorama executivo do período, com leitura rápida das
                      entradas, saídas e distribuição dos principais
                      indicadores.
                    </p>
                  )}

                  {!presentationMode && isProcessed && (
                    <p className="mt-1 text-sm text-slate-400">
                      Dados atualizados ·{" "}
                      <span className="font-medium text-slate-200">
                        {dwFilter.dataInicio} → {dwFilter.dataFim}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Top 4 metric cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                {topMetrics.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
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
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105 ${toneStyles[item.tone]}`}
                          >
                            <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                          </div>
                        </div>

                        <div className="mt-2.5">
                          <p className="text-[19px] font-bold leading-none tracking-[-0.03em] text-white truncate min-w-0 xl:text-[20px]">
                            {formatCurrency(item.value)}
                          </p>
                          <p className="mt-1.5 text-xs text-slate-400">
                            {item.helper}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Large cards with charts */}
              <div className="grid sm:grid-cols-2 gap-2 xl:flex-1 xl:min-h-0">
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
              </div>
            </div>

            {/* Right sidebar — Indicadores */}
            <aside
              className={`rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,22,43,0.94)_0%,rgba(10,16,34,0.88)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl ${presentationMode
                  ? "h-full overflow-y-auto p-3.5"
                  : "xl:h-full p-3.5 lg:p-4 overflow-y-auto max-h-[400px] xl:max-h-none"
                }`}
            >
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={`font-semibold tracking-tight text-white ${presentationMode ? "text-xl" : "text-2xl"
                        }`}
                    >
                      Indicadores
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
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

                <div className="mt-3 grid min-h-0 gap-1.5 flex-1" style={{ gridTemplateRows: `repeat(${indicadores.length || 1}, minmax(0, 1fr))` }}>
                  {indicadores.map((ind) => {
                    const abaixoDaMeta =
                      ind.percentualReal < ind.percentualEsperado;
                    const progress = Math.min(
                      (ind.percentualReal /
                        Math.max(ind.percentualEsperado, 1)) *
                      100,
                      100
                    );

                    return (
                      <Link
                        key={ind.id}
                        to={`/indicadores/${ind.id}`}
                        className={`group relative overflow-hidden rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.88)_0%,rgba(9,14,33,0.98)_100%)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(24,34,84,0.95)_0%,rgba(12,18,40,1)_100%)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.32)] ${presentationMode ? "p-2.5" : "p-3"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
                            {ind.nome}
                          </p>

                          <div className="flex items-center gap-2">
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

                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${abaixoDaMeta ? "bg-emerald-400" : "bg-red-500"
                              }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </Link>
                    );
                  })}
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