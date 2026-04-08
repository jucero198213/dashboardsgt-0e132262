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
        prevStroke: "rgba(16,185,129,0.32)",
        realStroke: "#34d399",
        gradFrom: "#34d399",
        dot: "#34d399",
        dotGlow: "rgba(16,185,129,0.35)",
        legendPrev: "rgba(16,185,129,0.4)",
        legendReal: "#34d399",
        tooltipBg: "rgba(6,78,59,0.92)",
        tooltipBorder: "rgba(52,211,153,0.28)",
      }
      : {
        prevStroke: "rgba(245,158,11,0.32)",
        realStroke: "#fbbf24",
        gradFrom: "#fbbf24",
        dot: "#fbbf24",
        dotGlow: "rgba(245,158,11,0.35)",
        legendPrev: "rgba(245,158,11,0.4)",
        legendReal: "#fbbf24",
        tooltipBg: "rgba(78,53,6,0.92)",
        tooltipBorder: "rgba(251,191,36,0.28)",
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
    <div className="flex flex-1 min-h-0 flex-col rounded-[20px] border border-white/7 bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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

      <div className="relative flex-1 min-h-0">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.gradFrom} stopOpacity={0.22} />
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

          {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
            <line
              key={frac}
              x1={padL}
              y1={padTop + chartH * (1 - frac)}
              x2={svgW - padR}
              y2={padTop + chartH * (1 - frac)}
              stroke="rgba(255,255,255,0.045)"
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
            strokeWidth={2.6}
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

          {months.map((m, i) => (
            <text
              key={m}
              x={toX(i)}
              y={svgH - 4}
              textAnchor="middle"
              fill={hoverIndex === i ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.26)"}
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
  } = useFinancialData();

  const { contasReceber, contasPagar } = resumo;

  const [presentationMode, setPresentationMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressInterval, setProgressInterval] = useState<number | null>(null);

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
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.04)]",
    amber:
      "border-amber-500/20 bg-amber-500/10 text-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.04)]",
    cyan:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.04)]",
    violet:
      "border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-[0_0_0_1px_rgba(167,139,250,0.04)]",
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
        className={`group relative overflow-hidden rounded-[22px] border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(0,0,0,0.24)] ${isPositive
          ? "border-emerald-500/12 bg-[linear-gradient(180deg,rgba(11,18,38,0.86)_0%,rgba(6,11,28,0.98)_100%)] hover:border-emerald-400/22"
          : "border-amber-500/12 bg-[linear-gradient(180deg,rgba(11,18,38,0.86)_0%,rgba(6,11,28,0.98)_100%)] hover:border-amber-400/22"
          } ${presentationMode ? "flex flex-col p-3.5" : "flex flex-col p-3.5 xl:p-4"}`}
      >
        <div
          className={`absolute inset-0 ${isPositive
            ? "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_34%)]"
            : "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.08),transparent_34%)]"
            }`}
        />

        <div className="relative flex min-h-0 flex-1 flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isPositive ? "text-emerald-300" : "text-amber-300"
                  }`}
              >
                {title}
              </p>
              <h2 className="mt-1 min-w-0 truncate text-[22px] font-bold leading-none tracking-[-0.03em] text-white xl:text-[24px]">
                {formatCurrency(total)}
              </h2>
              <p className="mt-1 text-xs text-slate-300/85">{subtitle}</p>
            </div>

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105 ${isPositive
                ? "border-emerald-500/18 bg-emerald-500/8 text-emerald-300 group-hover:border-emerald-400/24 group-hover:bg-emerald-400/12"
                : "border-amber-500/18 bg-amber-500/8 text-amber-300 group-hover:border-amber-400/24 group-hover:bg-amber-400/12"
                }`}
            >
              <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[15px] border border-white/7 bg-white/[0.03] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300 group-hover:border-white/10 group-hover:bg-white/[0.045]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {primaryLabel}
              </p>
              <p className="mt-1.5 min-w-0 truncate text-[15px] font-bold leading-none tracking-[-0.03em] text-white">
                {formatCurrency(primaryValue)}
              </p>
            </div>

            <div className="rounded-[15px] border border-white/7 bg-white/[0.03] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300 group-hover:border-white/10 group-hover:bg-white/[0.045]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {secondaryLabel}
              </p>
              <p className="mt-1.5 min-w-0 truncate text-[15px] font-bold leading-none tracking-[-0.03em] text-white">
                {formatCurrency(secondaryValue)}
              </p>
            </div>
          </div>

          <MiniLineChart
            previstoMonthly={monthlyPrevisto}
            realizadoMonthly={monthlyRealizado}
            tone={tone}
            ano={chartAno}
          />

          <div
            className={`flex items-center justify-between gap-3 rounded-[15px] border px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${isPositive
              ? "border-emerald-400/10 bg-[linear-gradient(180deg,rgba(16,185,129,0.06)_0%,rgba(16,185,129,0.02)_100%)]"
              : "border-amber-400/10 bg-[linear-gradient(180deg,rgba(245,158,11,0.06)_0%,rgba(245,158,11,0.02)_100%)]"
              }`}
          >
            <div className="min-w-0">
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isPositive ? "text-emerald-200/80" : "text-amber-200/80"
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
                ? "border-emerald-400/18 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/14 hover:shadow-[0_8px_20px_rgba(16,185,129,0.10)]"
                : "border-amber-400/18 bg-amber-400/10 text-amber-300 hover:bg-amber-400/14 hover:shadow-[0_8px_20px_rgba(245,158,11,0.10)]"
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
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.06),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:88px_88px]" />

      <div
        className={`relative flex flex-col ${presentationMode ? "h-full w-full max-w-none" : "w-full min-h-[calc(100vh-12px)] xl:h-[calc(100vh-16px)]"
          }`}
      >
        <section
          className={`relative flex-1 min-h-0 border border-white/8 bg-[linear-gradient(135deg,rgba(22,32,78,0.94)_0%,rgba(7,14,38,0.985)_54%,rgba(2,8,23,1)_100%)] shadow-[0_26px_70px_rgba(0,0,0,0.42)] ${presentationMode ? "h-full w-full overflow-hidden rounded-none" : "overflow-y-auto rounded-[24px] xl:overflow-hidden"
            }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(99,102,241,0.18),transparent_18%),radial-gradient(circle_at_84%_12%,rgba(14,165,233,0.08),transparent_18%),radial-gradient(circle_at_48%_100%,rgba(16,185,129,0.04),transparent_20%)]" />

          <div
            className={`relative xl:h-full ${presentationMode
              ? "grid h-full gap-3 p-3.5 lg:p-4 xl:grid-cols-[minmax(0,2.15fr)_minmax(320px,0.78fr)] xl:grid-rows-[1fr]"
              : "flex flex-col gap-4 p-3.5 lg:p-4 xl:grid xl:grid-cols-[minmax(0,2.15fr)_minmax(320px,0.78fr)] xl:grid-rows-[1fr] xl:gap-3"
              }`}
          >
            <div className="flex min-h-0 flex-col gap-2.5 xl:h-full">
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div className="scrollbar-none flex items-end gap-2 overflow-x-auto pb-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        De
                      </span>
                      <input
                        type="date"
                        value={dwFilter.dataInicio}
                        onChange={(e) =>
                          setDwFilter("dataInicio", e.target.value)
                        }
                        className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-slate-300 outline-none transition-all hover:border-white/18 hover:bg-white/8 focus:border-cyan-400/40 focus:bg-white/10 [color-scheme:dark]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Até
                      </span>
                      <input
                        type="date"
                        value={dwFilter.dataFim}
                        onChange={(e) => setDwFilter("dataFim", e.target.value)}
                        className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-slate-300 outline-none transition-all hover:border-white/18 hover:bg-white/8 focus:border-cyan-400/40 focus:bg-white/10 [color-scheme:dark]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Empresa
                      </span>
                      <Select
                        value={dwFilter.empresa ?? "__all__"}
                        onValueChange={(v) =>
                          setDwFilter("empresa", v === "__all__" ? null : v)
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px] rounded-xl border-white/10 bg-white/5 text-xs text-slate-300 transition-all hover:border-white/18 hover:bg-white/8">
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
                      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Filial
                      </span>
                      <Select
                        value={dwFilter.filial ?? "__all__"}
                        onValueChange={(v) =>
                          setDwFilter("filial", v === "__all__" ? null : v)
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px] rounded-xl border-white/10 bg-white/5 text-xs text-slate-300 transition-all hover:border-white/18 hover:bg-white/8">
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
                      onClick={() => void handleUpdate()}
                      disabled={isFetchingDw}
                      className="inline-flex h-8 items-center gap-2 rounded-xl border border-cyan-400/18 bg-cyan-500/8 px-3.5 text-xs font-semibold text-cyan-300 transition-all hover:border-cyan-300/28 hover:bg-cyan-400/14 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${isFetchingDw ? "animate-spin" : ""}`}
                      />
                      {isFetchingDw ? (
                        <span className="flex items-center gap-2">
                          Buscando...
                          <span className="font-bold text-cyan-200">
                            {progress}%
                          </span>
                        </span>
                      ) : (
                        "Atualizar"
                      )}
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
                    <p className="mt-1.5 max-w-2xl text-[13px] text-slate-300/90">
                      Panorama executivo do período, com leitura rápida das
                      entradas, saídas e distribuição dos principais
                      indicadores.
                    </p>
                  )}

                  {!presentationMode && isProcessed && (
                    <p className="mt-1 text-sm text-slate-300/85">
                      Dados atualizados ·{" "}
                      <span className="font-medium text-slate-100">
                        {dwFilter.dataInicio} → {dwFilter.dataFim}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                {topMetrics.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className={`group relative overflow-hidden rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,26,53,0.78)_0%,rgba(10,16,36,0.96)_100%)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/16 hover:shadow-[0_14px_28px_rgba(0,0,0,0.22)] ${presentationMode ? "p-3" : "p-3 xl:p-3.5"
                        }`}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_30%)]" />

                      <div className="relative flex h-full flex-col justify-between">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
                            {item.label}
                          </p>

                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105 ${toneStyles[item.tone]}`}
                          >
                            <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                          </div>
                        </div>

                        <div className="mt-2">
                          <p className="min-w-0 truncate text-[19px] font-bold leading-none tracking-[-0.03em] text-white xl:text-[20px]">
                            {formatCurrency(item.value)}
                          </p>
                          <p className="mt-1.5 text-xs text-slate-300/80">
                            {item.helper}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:min-h-0 xl:flex-1">
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

            <aside
              className={`rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(13,22,43,0.92)_0%,rgba(10,16,34,0.86)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl ${presentationMode
                ? "h-full overflow-y-auto p-3.5"
                : "max-h-[500px] overflow-y-auto p-3.5 lg:p-4 xl:h-full xl:max-h-none"
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
                    <p className="mt-1 text-xs leading-5 text-slate-300/80">
                      Resumo lateral no padrão da referência.
                    </p>
                  </div>

                  {!presentationMode && (
                    <button
                      onClick={togglePresentationMode}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/18 hover:bg-white/8 hover:text-white"
                      title="Modo apresentação"
                      aria-label="Ativar modo apresentação"
                    >
                      <Presentation className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mt-3 grid min-h-0 flex-1 content-start gap-1.5">
                  {indicadores.map((ind) => {
                    const atingiuMeta =
                      ind.percentualReal >= ind.percentualEsperado;
                    const progress = Math.min(
                      (ind.percentualReal /
                        Math.max(ind.percentualEsperado, 1)) *
                      100,
                      100
                    );
                    const metaMarker = Math.min(ind.percentualEsperado, 100);

                    return (
                      <Link
                        key={ind.id}
                        to={`/indicadores/${ind.id}`}
                        className={`group relative overflow-hidden rounded-[16px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,26,53,0.78)_0%,rgba(9,14,33,0.96)_100%)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/16 hover:shadow-[0_14px_28px_rgba(0,0,0,0.28)] ${presentationMode ? "p-3" : "p-3"
                          }`}
                      >
                        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_left,rgba(255,255,255,0.06),transparent_60%)]" />

                        <div className="relative flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate pr-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300 transition-colors duration-300 group-hover:text-white">
                              {ind.nome}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-500">
                              Performance atual vs meta definida
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <div
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${atingiuMeta
                                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                                : "border-red-400/20 bg-red-400/10 text-red-300"
                                }`}
                            >
                              {atingiuMeta ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {atingiuMeta ? "Meta" : "Abaixo"}
                            </div>

                            <ArrowRight className="h-3.5 w-3.5 text-slate-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" />
                          </div>
                        </div>

                        <div className="relative mt-3 overflow-hidden rounded-[12px] border border-white/8 bg-white/[0.03] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Resultado
                              </p>
                              <div className="mt-1 flex items-end gap-2">
                                <span
                                  className={`text-[18px] font-bold leading-none tracking-[-0.03em] ${atingiuMeta
                                    ? "text-emerald-300"
                                    : "text-red-400"
                                    }`}
                                >
                                  {ind.percentualReal}%
                                </span>
                                <span className="pb-0.5 text-[10px] text-slate-500">
                                  meta {ind.percentualEsperado}%
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Status
                              </p>
                              <p className={`mt-1 text-[11px] font-semibold ${atingiuMeta ? "text-emerald-300" : "text-red-300"}`}>
                                {atingiuMeta ? "Dentro do esperado" : "Atenção ao indicador"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center gap-2">
                            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10 ring-1 ring-inset ring-white/5">
                              <div
                                className={`relative h-full rounded-full transition-all duration-500 ${atingiuMeta
                                  ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-300"
                                  : "bg-gradient-to-r from-red-500 via-red-400 to-orange-300"
                                  }`}
                                style={{ width: `${progress}%` }}
                              >
                                <div className="absolute inset-0 opacity-40 blur-[6px] bg-white/20" />
                              </div>

                              <div
                                className="absolute top-0 bottom-0 z-10 w-[2px] rounded-full bg-white/45 shadow-[0_0_12px_rgba(255,255,255,0.35)]"
                                style={{ left: `${metaMarker}%` }}
                              />
                            </div>

                            <span className="shrink-0 text-[10px] text-slate-500">
                              alvo
                            </span>
                          </div>
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
