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
import { HomeButton } from "@/components/shared/HomeButton";
import sgtLogo from "@/assets/sgt-logo.png";
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
  if (len <= 6)  return "clamp(1.2rem, 2.1vw, 1.9rem)";
  if (len <= 10) return "clamp(1.1rem, 1.8vw, 1.6rem)";
  if (len <= 13) return "clamp(1rem, 1.55vw, 1.4rem)";
  if (len <= 16) return "clamp(0.95rem, 1.35vw, 1.2rem)";
  return "clamp(0.85rem, 1.15vw, 1.05rem)";
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
/*  Gráfico comparativo anual — CR Realizado vs CP Realizado           */
/* Design tokens:                                                       */
/*   CR (principal):  #2dd4bf  stroke 2.6  area 0.10                  */
/*   CP (secundária): #f87171  stroke 1.8  dashed  opacity 0.65       */
/*   Grid: rgba(255,255,255,0.07) dashed 4,4                          */
/*   Dots: hover-only  Y-labels: "R$ 4,8M"                            */
/* ------------------------------------------------------------------ */
const ComparativeLineChart = ({
  crRealizado,
  cpRealizado,
  ano,
  isEmpty,
}: {
  crRealizado: number[];
  cpRealizado: number[];
  ano?: string;
  isEmpty: boolean;
}) => {
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const lastDataIdx = Math.max(
    [...crRealizado].reverse().findIndex(v => v > 0),
    [...cpRealizado].reverse().findIndex(v => v > 0)
  );
  const activeMonths = lastDataIdx === -1 ? 0 : 12 - lastDataIdx;
  const cr = crRealizado.slice(0, activeMonths || 12);
  const cp = cpRealizado.slice(0, activeMonths || 12);
  const n = cr.length;

  const allValues = [...cr, ...cp].filter(v => v > 0);
  const maxVal = allValues.length ? Math.max(...allValues) * 1.18 : 1;
  const minVal = 0;

  const svgW = 520; const svgH = 200;
  const padL = 80; const padR = 18; const padTop = 22; const padBot = 32;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padTop - padBot;

  const toX = (i: number) => padL + (i / Math.max(n - 1, 1)) * chartW;
  const toY = (v: number) => padTop + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  const buildSmooth = (pts: number[]) => {
    if (pts.length < 2) return "";
    let d = `M${toX(0).toFixed(1)},${toY(pts[0]).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const x0 = toX(i-1), y0 = toY(pts[i-1]);
      const x1 = toX(i),   y1 = toY(pts[i]);
      const t = 0.35;
      d += ` C${(x0+(x1-x0)*t).toFixed(1)},${y0.toFixed(1)} ${(x1-(x1-x0)*t).toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
    }
    return d;
  };

  const buildArea = (pts: number[]) => {
    if (pts.length < 2) return "";
    const base = padTop + chartH;
    let d = `M${toX(0).toFixed(1)},${toY(pts[0]).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const x0 = toX(i-1), y0 = toY(pts[i-1]);
      const x1 = toX(i),   y1 = toY(pts[i]);
      const t = 0.35;
      d += ` C${(x0+(x1-x0)*t).toFixed(1)},${y0.toFixed(1)} ${(x1-(x1-x0)*t).toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
    }
    d += ` L${toX(n-1).toFixed(1)},${base} L${toX(0).toFixed(1)},${base} Z`;
    return d;
  };

  const formatY = (v: number) => {
    if (v >= 1_000_000) return `R$ ${(v/1_000_000).toFixed(1).replace(".",",")}M`;
    if (v >= 1_000)     return `R$ ${(v/1_000).toFixed(0)}k`;
    return `R$ ${v}`;
  };
  const formatFull = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Detecta quedas bruscas (>30%) na linha CR
  const sharpDrops: number[] = [];
  for (let i = 1; i < n; i++) {
    if (cr[i-1] > 0 && cr[i] > 0 && (cr[i-1] - cr[i]) / cr[i-1] > 0.30) sharpDrops.push(i);
  }

  // Detecta períodos estáveis (baixa variação por 3+ meses)
  const stableRanges: {start: number; end: number}[] = [];
  let ss = -1;
  for (let i = 1; i < n - 1; i++) {
    const win = cr.slice(Math.max(0, i-1), i+2).filter(v => v > 0);
    if (win.length >= 2) {
      const mean = win.reduce((a,b)=>a+b,0) / win.length;
      const cv = mean > 0 ? Math.sqrt(win.reduce((a,b)=>a+(b-mean)**2,0)/win.length) / mean : 1;
      if (cv < 0.15) { if (ss === -1) ss = i-1; }
      else { if (ss !== -1 && i-ss >= 2) stableRanges.push({start:ss, end:i-1}); ss = -1; }
    }
  }
  if (ss !== -1 && n-1-ss >= 2) stableRanges.push({start:ss, end:n-1});

  const gridFracs = [0, 0.25, 0.5, 0.75, 1];
  const getTooltipX = (i: number) => toX(i) + 175 > svgW ? toX(i) - 178 : toX(i) + 12;

  return (
    <div className="flex h-full flex-col rounded-[16px] border border-[var(--sgt-border-subtle)] p-3 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.014)" }}>

      {/* Header + legenda integrada */}
      <div className="mb-2 flex items-center gap-4 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 mr-auto">
          Evolução anual{ano ? ` · ${ano}` : ""}
        </span>
        <div className="flex items-center gap-1.5">
          <svg width="22" height="10">
            <line x1="0" y1="5" x2="22" y2="5" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span className="text-[10px] font-semibold" style={{ color: "#2dd4bf" }}>CR Realizado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="22" height="10">
            <line x1="0" y1="5" x2="22" y2="5" stroke="#f87171" strokeWidth="1.8"
              strokeDasharray="5,3" strokeLinecap="round" opacity="0.75"/>
          </svg>
          <span className="text-[10px] font-semibold" style={{ color: "#f87171", opacity: 0.75 }}>CP Realizado</span>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        {isEmpty || activeMonths === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-500/20 bg-slate-500/8">
              <svg className="h-5 w-5 text-slate-500/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500">Sem dados para o período</p>
            <p className="text-[10px] text-slate-600">Selecione um intervalo de datas e atualize</p>
          </div>
        ) : (
          <svg viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet"
            className="h-full w-full" onMouseLeave={() => setHoverIndex(null)}>
            <defs>
              <linearGradient id="area-cr-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#2dd4bf" stopOpacity="0.10"/>
                <stop offset="75%"  stopColor="#2dd4bf" stopOpacity="0.02"/>
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0"/>
              </linearGradient>
              <clipPath id="chart-area-clip">
                <rect x={padL} y={padTop} width={chartW} height={chartH}/>
              </clipPath>
            </defs>

            {/* Fundo neutro da área */}
            <rect x={padL} y={padTop} width={chartW} height={chartH}
              fill="rgba(255,255,255,0.012)" rx="3"/>

            {/* Grid horizontal tracejado */}
            {gridFracs.map(frac => {
              const y = padTop + chartH * (1 - frac);
              const val = minVal + (maxVal - minVal) * frac;
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={svgW - padR} y2={y}
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth={frac === 0 ? 1 : 0.6}
                    strokeDasharray={frac === 0 ? "" : "4,4"}/>
                  {frac > 0 && (
                    <text x={padL - 8} y={y + 3.5} textAnchor="end"
                      fill="rgba(203,213,225,0.65)" fontSize={9} fontFamily="system-ui,sans-serif">
                      {formatY(val)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Períodos estáveis — faixa suave */}
            {stableRanges.map((r, ri) => (
              <rect key={`stable-${ri}`}
                x={toX(r.start)} y={padTop}
                width={toX(r.end) - toX(r.start)} height={chartH}
                fill="rgba(255,255,255,0.022)" rx="2"
                clipPath="url(#chart-area-clip)"/>
            ))}

            {/* Área CR */}
            <path d={buildArea(cr)} fill="url(#area-cr-grad)" clipPath="url(#chart-area-clip)"/>

            {/* Linha CP — secundária */}
            <path d={buildSmooth(cp)} fill="none"
              stroke="#f87171" strokeWidth={1.8}
              strokeDasharray="6,3" strokeLinecap="round" strokeLinejoin="round"
              opacity={0.65} clipPath="url(#chart-area-clip)"/>

            {/* Linha CR — principal */}
            <path d={buildSmooth(cr)} fill="none"
              stroke="#2dd4bf" strokeWidth={2.6}
              strokeLinecap="round" strokeLinejoin="round"
              clipPath="url(#chart-area-clip)"/>

            {/* Marcadores de quedas bruscas */}
            {sharpDrops.map(i => (
              <g key={`drop-${i}`}>
                <line x1={toX(i)} y1={padTop+2} x2={toX(i)} y2={padTop+chartH}
                  stroke="rgba(251,191,36,0.18)" strokeWidth={1} strokeDasharray="3,3"/>
                <polygon
                  points={`${toX(i)},${padTop+10} ${toX(i)-4},${padTop+2} ${toX(i)+4},${padTop+2}`}
                  fill="rgba(251,191,36,0.5)"/>
              </g>
            ))}

            {/* Linha vertical de hover */}
            {hoverIndex !== null && hoverIndex < n && (
              <line x1={toX(hoverIndex)} y1={padTop} x2={toX(hoverIndex)} y2={padTop+chartH}
                stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="3,3"/>
            )}

            {/* Pontos apenas no hover */}
            {hoverIndex !== null && hoverIndex < n && (
              <>
                <circle cx={toX(hoverIndex)} cy={toY(cr[hoverIndex])}
                  r={4} fill="#2dd4bf" stroke="rgba(45,212,191,0.22)" strokeWidth={7}/>
                <circle cx={toX(hoverIndex)} cy={toY(cp[hoverIndex])}
                  r={3.5} fill="#f87171" stroke="rgba(248,113,113,0.18)" strokeWidth={6}/>
              </>
            )}

            {/* Tooltip */}
            {hoverIndex !== null && hoverIndex < n && (() => {
              const crV = cr[hoverIndex] ?? 0;
              const cpV = cp[hoverIndex] ?? 0;
              const diff = crV - cpV;
              const tx = getTooltipX(hoverIndex);
              const ty = padTop + 4;
              return (
                <g>
                  <rect x={tx} y={ty} width={172} height={80} rx={8}
                    fill="rgba(5,7,16,0.96)" stroke="rgba(255,255,255,0.08)" strokeWidth={1}/>
                  <text x={tx+10} y={ty+16} fill="rgba(226,232,240,0.9)"
                    fontSize={10.5} fontWeight={700} fontFamily="system-ui,sans-serif">
                    {months[hoverIndex]}
                  </text>
                  <rect x={tx+10} y={ty+24} width={3} height={10} rx={1} fill="#2dd4bf"/>
                  <text x={tx+18} y={ty+33} fill="#2dd4bf"
                    fontSize={9.5} fontWeight={600} fontFamily="system-ui,sans-serif">
                    CR: {formatFull(crV)}
                  </text>
                  <rect x={tx+10} y={ty+40} width={3} height={10} rx={1} fill="#f87171" opacity="0.8"/>
                  <text x={tx+18} y={ty+49} fill="rgba(248,113,113,0.82)"
                    fontSize={9.5} fontWeight={600} fontFamily="system-ui,sans-serif">
                    CP: {formatFull(cpV)}
                  </text>
                  <line x1={tx+10} y1={ty+58} x2={tx+162} y2={ty+58}
                    stroke="rgba(255,255,255,0.06)" strokeWidth={0.5}/>
                  <text x={tx+10} y={ty+70}
                    fill={diff >= 0 ? "rgba(45,212,191,0.75)" : "rgba(248,113,113,0.75)"}
                    fontSize={9} fontWeight={500} fontFamily="system-ui,sans-serif">
                    Saldo: {diff >= 0 ? "+" : ""}{formatFull(diff)}
                  </text>
                </g>
              );
            })()}

            {/* Labels eixo X */}
            {Array.from({ length: n }).map((_, i) => (
              <text key={`m-${i}`} x={toX(i)} y={svgH - 9} textAnchor="middle"
                fill={hoverIndex === i ? "rgba(226,232,240,0.95)" : "rgba(148,163,184,0.75)"}
                fontSize={9.5} fontWeight={hoverIndex === i ? 700 : 400}
                fontFamily="system-ui,sans-serif" className="transition-all duration-150">
                {months[i]}
              </text>
            ))}

            {/* Zonas de hover */}
            {Array.from({ length: n }).map((_, i) => {
              const zx = i === 0   ? padL : toX(i) - (toX(i)-toX(i-1))/2;
              const zw = i === 0   ? (toX(1)-toX(0))/2
                       : i === n-1 ? (toX(n-1)-toX(n-2))/2
                       : toX(i+1)-toX(i);
              return (
                <rect key={`hz-${i}`} x={zx} y={padTop} width={zw} height={chartH+padBot}
                  fill="transparent" onMouseEnter={() => setHoverIndex(i)}
                  style={{ cursor: "crosshair" }}/>
              );
            })}
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
        label: "RECEBIDO (REALIZADO)",
        value: contasReceber.valorRecebido,
        helper: "Entrada consolidada",
        icon: TrendingUp,
        tone: "emerald",
      },
      {
        label: "PAGO (REALIZADO)",
        value: contasPagar.valorPago,
        helper: "Saída consolidada",
        icon: TrendingDown,
        tone: "violet",
      },
    ],
    [
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
        className={`group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(0,0,0,0.4)] h-full ${isPositive
            ? "border-emerald-500/[0.18] [background:var(--sgt-bg-card)] hover:border-emerald-400/30"
            : "border-amber-500/[0.18] [background:var(--sgt-bg-card)] hover:border-amber-400/30"
          } flex flex-col p-3 xl:p-4`}
      >
        <div
          className={`absolute inset-0 ${isPositive
              ? "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_40%)]"
              : "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_40%)]"
            }`}
        />
        <div
          className={`absolute inset-x-0 bottom-0 h-24 ${isPositive
              ? "bg-[linear-gradient(180deg,transparent_0%,rgba(16,185,129,0.03)_100%)]"
              : "bg-[linear-gradient(180deg,transparent_0%,rgba(245,158,11,0.03)_100%)]"
            }`}
        />

        <div className="relative flex flex-col gap-2 h-full">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={`text-[11px] leading-[14px] font-bold uppercase tracking-[0.3em] ${isPositive ? "text-emerald-300" : "text-amber-300"
                  }`}
              >
                {title}
              </p>
              <h2 className="mt-1.5 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis font-extrabold leading-[1] tracking-[-0.04em] [color:var(--sgt-text-primary)]" style={{ fontSize: kpiValueFontSize(total) }}>
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
          : "min-h-[100dvh] xl:h-[100dvh] overflow-auto xl:overflow-hidden px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
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
              : "rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto xl:overflow-hidden"
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

          <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 overflow-hidden w-full">

            {/* ── NAVBAR ── */}
            {/* Desktop: tudo em uma linha */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              <div className="flex shrink-0 items-center gap-2">
                <span className="flex items-center gap-2 text-[17px] font-extrabold tracking-[-0.03em] dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-slate-400 dark:bg-clip-text dark:text-transparent text-slate-800 leading-none">
                  <span>Dashboard</span>
                  <img src={sgtLogo} alt="SGT" className="block h-6 w-auto shrink-0 object-contain" />
                </span>
              </div>
              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Tempo real</span>
              </div>
              <div className="h-6 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />
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
              <HomeButton />
            </div>

            {/* Mobile: layout empilhado bonito */}
            <div className="flex sm:hidden flex-col gap-2 py-1.5">
              {/* Linha 1: ícone + título com logo SGT + Home */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-[-0.03em] dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-slate-400 dark:bg-clip-text dark:text-transparent text-slate-800 leading-none min-w-0">
                    <span className="truncate">Dashboard</span>
                    <img src={sgtLogo} alt="SGT" className="block h-5 w-auto shrink-0 object-contain" />
                  </span>
                </div>
                <HomeButton />
              </div>

              {/* Linha 2: badge tempo real */}
              <div className="flex items-center">
                <div className="flex h-6 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-2.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-cyan-300">Tempo real</span>
                </div>
              </div>

              {/* Linha 2: datas */}
              <div className="flex items-center gap-2">
                <DatePickerInput value={dwFilter.dataInicio} onChange={(v) => setDwFilter("dataInicio", v)} placeholder="Data início" />
                <DatePickerInput value={dwFilter.dataFim} onChange={(v) => setDwFilter("dataFim", v)} placeholder="Data fim" />
              </div>

              {/* Linha 3: selects + botão */}
              <div className="flex items-center gap-2">
                <Select value={dwFilter.empresa ?? "__all__"} onValueChange={(v) => setDwFilter("empresa", v === "__all__" ? null : v)}>
                  <SelectTrigger className="h-8 flex-1 rounded-lg text-[12px]"><SelectValue placeholder="Empresa" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Todas</SelectItem>{empresas.map((e) => (<SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>))}</SelectContent>
                </Select>
                <Select value={dwFilter.filial ?? "__all__"} onValueChange={(v) => setDwFilter("filial", v === "__all__" ? null : v)}>
                  <SelectTrigger className="h-8 flex-1 rounded-lg text-[12px]"><SelectValue placeholder="Filial" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Todas</SelectItem>{filiaisFiltradas.map((f) => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}</SelectContent>
                </Select>
              </div>

              {/* Linha 4: botão atualizar */}
              <div className="flex items-center gap-2">
                <button onClick={() => void handleUpdate()} disabled={isFetchingDw}
                  className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-semibold transition-all ${isFetchingDw ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.15)]" : "border-cyan-400/35 bg-cyan-500/15 text-cyan-200 hover:border-cyan-300/50 hover:bg-cyan-400/25"} disabled:cursor-not-allowed`}>
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetchingDw ? "animate-spin" : ""}`} />
                  {isFetchingDw ? (<span className="flex items-center gap-1.5"><span>{loadingPhase}</span><span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">{progress}%</span></span>) : ("Atualizar")}
                </button>
              </div>
            </div>

            <div className="h-px" style={{ background: "var(--sgt-divider)" }} />
            {dwError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {dwError}
              </div>
            )}

            {/* Grid principal */}
            <div className={`grid gap-2.5 flex-1 min-h-0 xl:h-0`}>
              {/* Left column — cards, charts, KPIs */}
              <div className="grid gap-2.5 min-h-0 sm:grid-cols-2 xl:grid-cols-2 xl:grid-rows-[auto_1fr_auto] xl:items-stretch overflow-auto xl:overflow-hidden">

                {/* Top 4 metric cards */}
                {isFetchingDw && !isProcessed ? (
                  <div className="grid grid-cols-2 gap-2.5 xl:col-span-2 items-stretch">
                    {[0, 1].map((i) => (
                      <CardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 xl:col-span-2 items-stretch">
                    {(() => {
                      const TONE_MAP: Record<string, {
                        stripe: string; border: string; glow: string;
                        iconBg: string; iconTxt: string; sub: string; spot: string;
                      }> = {
                        emerald: { stripe: "from-emerald-400/60 to-emerald-700/20", border: "border-emerald-400/[0.12]", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", sub: "text-emerald-500/80", spot: "rgba(16,185,129,0.10)" },
                        cyan:    { stripe: "from-cyan-400/60 to-cyan-700/20",    border: "border-cyan-400/[0.12]",    glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]",    iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]",    iconTxt: "text-cyan-300",    sub: "text-cyan-500/80",    spot: "rgba(6,182,212,0.10)" },
                        amber:   { stripe: "from-amber-400/60 to-amber-700/20",   border: "border-amber-400/[0.12]",   glow: "hover:shadow-[0_4px_40px_rgba(245,158,11,0.18)]",   iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]",   iconTxt: "text-amber-300",   sub: "text-amber-500/80",   spot: "rgba(245,158,11,0.10)" },
                        violet:  { stripe: "from-violet-400/60 to-violet-700/20", border: "border-violet-400/[0.12]",  glow: "hover:shadow-[0_4px_40px_rgba(139,92,246,0.18)]",  iconBg: "bg-violet-400/[0.08] border border-violet-400/[0.15]",  iconTxt: "text-violet-300",  sub: "text-violet-500/80",  spot: "rgba(139,92,246,0.10)" },
                      };
                      const topSharedFont = kpiFontSize(
                        topMetrics.map(m => m.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))
                          .reduce((a, b) => a.length >= b.length ? a : b)
                      );
                      return topMetrics.map((item, idx) => {
                        const Icon = item.icon;
                        const t = TONE_MAP[item.tone] ?? TONE_MAP.cyan;
                        const baseLabel = item.label.replace(" (REALIZADO)", "");

                        return (
                          <AnimatedCard key={item.label} delay={idx * 80}>
                            <div className={`group relative flex min-h-[110px] flex-col overflow-hidden rounded-[14px] sm:rounded-[16px] border ${t.border} bg-[var(--sgt-bg-card)] transition-all duration-300 hover:-translate-y-[3px] ${t.glow} shadow-[0_2px_20px_rgba(0,0,0,0.4)] p-3 xl:p-4`}>

                              {/* Stripe topo */}
                              <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${t.stripe}`} />

                              {/* Spot glow canto inferior direito */}
                              <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36"
                                style={{ background: `radial-gradient(circle at 100% 100%, ${t.spot}, transparent 65%)` }} />

                              <div className="relative flex h-full flex-col">
                                {/* Label + badge + ícone */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-600 leading-tight">
                                      {baseLabel}
                                    </p>
                                    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[8px] font-extrabold tracking-[0.18em] uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                                      realizado
                                    </span>
                                  </div>
                                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${t.iconBg} ${t.iconTxt} transition-transform duration-300 group-hover:scale-110`}>
                                    <Icon className="h-3.5 w-3.5" />
                                  </div>
                                </div>

                                {/* Valor protagonista */}
                                <p className="mt-auto pt-2 sm:pt-3 font-black leading-none tracking-[-0.05em] text-white break-words overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: `clamp(1.1rem, 2.2vw, 2rem)` }}>
                                  <CountUp value={item.value} />
                                </p>

                                {/* Helper em tom */}
                                <p className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${t.sub}`}>
                                  {item.helper}
                                </p>
                              </div>
                            </div>
                          </AnimatedCard>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* Gráfico comparativo anual CR vs CP */}
                {isFetchingDw && !isProcessed ? (
                  <div className="xl:col-span-2">
                    <LargeCardSkeleton />
                  </div>
                ) : (
                  <AnimatedCard delay={320} className="xl:col-span-2 flex min-h-0 h-full">
                    <div className="flex-1 flex flex-col min-h-0 group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-3 xl:p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">
                            Comparativo Anual
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-300">
                              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                              CR: <span className="tabular-nums">{contasReceber.valorRecebido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="flex items-center gap-1.5 text-[12px] font-bold text-rose-300">
                              <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
                              CP: <span className="tabular-nums">{contasPagar.valorPago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => navigate("/contas-a-receber")}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/8 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-400/15 transition-colors">
                            <TrendingUp className="h-3 w-3" /> CR
                          </button>
                          <button onClick={() => navigate("/contas-a-pagar")}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-400/20 bg-rose-400/8 px-2.5 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-400/15 transition-colors">
                            <TrendingDown className="h-3 w-3" /> CP
                          </button>
                        </div>
                      </div>

                      {/* Chart */}
                      <div className="relative flex-1 min-h-0">
                        <ComparativeLineChart
                          crRealizado={chartReceber.realizado}
                          cpRealizado={chartPagar.realizado}
                          ano={chartReceber.ano || chartPagar.ano}
                          isEmpty={[...chartReceber.realizado, ...chartPagar.realizado].every(v => v === 0)}
                        />
                        {isFetchingDw && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[18px] bg-black/40 backdrop-blur-[2px]">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full animate-pulse bg-emerald-400" />
                              <div className="h-2 w-2 rounded-full animate-pulse [animation-delay:150ms] bg-emerald-400/60" />
                              <div className="h-2 w-2 rounded-full animate-pulse [animation-delay:300ms] bg-emerald-400/30" />
                            </div>
                            <span className="text-[10px] font-medium text-slate-400">{loadingPhase || "Carregando..."}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </AnimatedCard>
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
                  <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4 xl:col-span-2 items-stretch h-full">
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
                        <div className="font-extrabold tracking-[-0.04em] [color:var(--sgt-text-primary)] leading-none whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: sharedFontSize }}>
                          <CountUp value={kpiExtra.saldoLiquido} />
                        </div>
                        <p className="mt-2 text-[12px] dark:text-slate-400 text-slate-600">
                          Recebido − Pago no período
                        </p>
                        <div className="mt-auto flex flex-col gap-2 pt-2">
                        <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
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
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-[12px] font-bold ${kpiExtra.saldoLiquido >= 0
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                              : "bg-red-500/20 text-red-300 border border-red-500/20"
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
                        <div className="font-extrabold tracking-[-0.04em] [color:var(--sgt-text-primary)] leading-none whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: sharedFontSize }}>
                          <CountUp value={kpiExtra.inadimplencia} />
                        </div>
                        <p className="mt-2 text-[12px] font-semibold text-red-400">
                          {(kpiExtra.inadimplenciaPerc ?? 0).toFixed(1)}% do A Receber
                        </p>
                        <div className="mt-auto flex flex-col gap-2 pt-2">
                        <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                          {contasReceber.valorAReceber > 0 ? (
                            <div
                              className="h-full rounded-full bg-red-400 transition-all duration-700"
                              style={{ width: `${Math.min((kpiExtra.inadimplencia / Math.max(contasReceber.valorAReceber, 1)) * 100, 100)}%` }}
                            />
                          ) : (
                            <div className="h-full w-full rounded-full bg-white/5" />
                          )}
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-red-500/20 border border-red-500/20 px-3 py-1 text-[12px] font-bold text-red-300">
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
                        <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                          <div
                            className="h-full rounded-full bg-violet-400 transition-all duration-700"
                            style={{ width: `${Math.min(kpiExtra.realizacaoCP, 100)}%` }}
                          />
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-violet-500/20 border border-violet-500/20 px-3 py-1 text-[12px] font-bold dark:text-violet-200 text-violet-700">
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
                        <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                          <div
                            className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                            style={{ width: `${Math.min(kpiExtra.realizacaoCR ?? 0, 100)}%` }}
                          />
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-cyan-500/20 border border-cyan-500/20 px-3 py-1 text-[12px] font-bold dark:text-cyan-200 text-cyan-700">
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

            </div>
            {/* end grid */}

          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;