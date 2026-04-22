import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Presentation,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
/*  MiniLineChart — gráfico compacto premium para cards KPI            */
/*  Mesmo design system de ComparativeLineChart: hierarquia clara,     */
/*  area gradient, hover dot, sem pontos fixos                         */
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
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Cores semânticas (entrada = verde, saída = âmbar) — sem efeito neon
  const primaryColor = tone === "emerald" ? "#34d399" : "#fbbf24";
  const primaryRgb   = tone === "emerald" ? "52,211,153" : "251,191,36";
  const secondaryColor = "rgba(148,163,184,0.55)";

  const lastDataIdx = [...realizadoMonthly].reverse().findIndex(v => v > 0);
  const activeMonths = lastDataIdx === -1 ? 0 : 12 - lastDataIdx;
  const real = realizadoMonthly.slice(0, activeMonths || 12);
  const prev = previstoMonthly.slice(0, activeMonths || 12);
  const n = real.length;

  const isEmpty = real.every(v => v === 0) && prev.every(v => v === 0);

  const allValues = [...real, ...prev].filter(v => v > 0);
  const maxVal = allValues.length ? Math.max(...allValues) * 1.15 : 1;

  const svgW = 480; const svgH = 220;
  const padL = 56; const padR = 12; const padTop = 16; const padBot = 22;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padTop - padBot;

  const toX = (i: number) => padL + (i / Math.max(n - 1, 1)) * chartW;
  const toY = (v: number) => padTop + chartH - (v / maxVal) * chartH;

  // Suavização controlada — profissional, sem curvas elásticas
  const buildSmooth = (pts: number[]) => {
    if (pts.length < 2) return "";
    let d = `M${toX(0).toFixed(1)},${toY(pts[0]).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const x0 = toX(i-1), y0 = toY(pts[i-1]);
      const x1 = toX(i),   y1 = toY(pts[i]);
      const t = 0.28;
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
      const t = 0.28;
      d += ` C${(x0+(x1-x0)*t).toFixed(1)},${y0.toFixed(1)} ${(x1-(x1-x0)*t).toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
    }
    const __last = pts.length - 1;
    d += ` L${toX(__last).toFixed(1)},${base} L${toX(0).toFixed(1)},${base} Z`;
    return d;
  };

  const formatY = (v: number) => {
    if (v >= 1_000_000) return `R$ ${(v/1_000_000).toFixed(1).replace(".",",")}M`;
    if (v >= 1_000)     return `R$ ${(v/1_000).toFixed(0)}k`;
    return `R$ ${v.toFixed(0)}`;
  };
  const formatFull = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Detecta a maior queda (>25%) — apenas a mais relevante para não poluir
  let biggestDropIdx = -1;
  let biggestDropPct = 0;
  for (let i = 1; i < n; i++) {
    if (real[i-1] > 0 && real[i] > 0) {
      const pct = (real[i-1] - real[i]) / real[i-1];
      if (pct > 0.25 && pct > biggestDropPct) {
        biggestDropPct = pct;
        biggestDropIdx = i;
      }
    }
  }

  // Detecta período flat (3+ meses com baixa variação)
  const flatRanges: {start: number; end: number}[] = [];
  let fs = -1;
  for (let i = 1; i < n; i++) {
    if (real[i-1] > 0 && real[i] > 0) {
      const pct = Math.abs(real[i] - real[i-1]) / real[i-1];
      if (pct < 0.08) { if (fs === -1) fs = i - 1; }
      else { if (fs !== -1 && i - 1 - fs >= 2) flatRanges.push({ start: fs, end: i - 1 }); fs = -1; }
    } else {
      if (fs !== -1 && i - 1 - fs >= 2) flatRanges.push({ start: fs, end: i - 1 });
      fs = -1;
    }
  }
  if (fs !== -1 && n - 1 - fs >= 2) flatRanges.push({ start: fs, end: n - 1 });

  const gradId = `mini-area-${tone}`;
  const shadowId = `mini-shadow-${tone}`;
  // Apenas 3 linhas de grid — leitura limpa
  const gridFracs = [0, 0.5, 1];
  const getTooltipX = (i: number) => toX(i) + 152 > svgW ? toX(i) - 154 : toX(i) + 10;

  if (isEmpty) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1.5 rounded-[12px] border border-[var(--sgt-border-subtle)]"
        style={{ background: "linear-gradient(180deg, rgba(8,11,22,0.5) 0%, rgba(5,7,16,0.7) 100%)" }}>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-500/20 bg-slate-500/8">
          <svg className="h-3.5 w-3.5 text-slate-500/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <p className="text-[10px] text-slate-500">Sem dados no período</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-[12px] border border-[var(--sgt-border-subtle)] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(8,11,22,0.55) 0%, rgba(5,7,16,0.75) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.025)",
      }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none"
        className="h-full w-full" onMouseLeave={() => setHoverIndex(null)}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={primaryColor} stopOpacity="0.15"/>
            <stop offset="60%"  stopColor={primaryColor} stopOpacity="0.04"/>
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id={shadowId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.18)"/>
            <stop offset="25%" stopColor="rgba(0,0,0,0)"/>
          </linearGradient>
          <clipPath id={`mini-clip-${tone}`}>
            <rect x={padL} y={padTop} width={chartW} height={chartH}/>
          </clipPath>
        </defs>

        {/* Inner shadow no topo do plot */}
        <rect x={padL} y={padTop} width={chartW} height={chartH}
          fill={`url(#${shadowId})`} rx="4"/>

        {/* Grid horizontal — apenas 3 linhas, sólidas e sutis (sem dash genérico) */}
        {gridFracs.map(frac => {
          const y = padTop + chartH * (1 - frac);
          const val = maxVal * frac;
          return (
            <g key={frac}>
              <line x1={padL} y1={y} x2={svgW - padR} y2={y}
                stroke={frac === 0 ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)"}
                strokeWidth={frac === 0 ? 0.8 : 0.5}/>
              {frac > 0 && (
                <text x={padL - 6} y={y + 3} textAnchor="end"
                  fill="rgba(203,213,225,0.65)" fontSize={9} fontWeight={500} fontFamily="system-ui,sans-serif">
                  {formatY(val)}
                </text>
              )}
            </g>
          );
        })}

        {/* Períodos flat — fade suave */}
        {flatRanges.map((r, ri) => (
          <rect key={`flat-${ri}`}
            x={toX(r.start)} y={padTop}
            width={toX(r.end) - toX(r.start)} height={chartH}
            fill="rgba(148,163,184,0.025)"
            clipPath={`url(#mini-clip-${tone})`}/>
        ))}

        {/* Área sob a linha realizada — gradient sofisticado */}
        <path d={buildArea(real)} fill={`url(#${gradId})`} clipPath={`url(#mini-clip-${tone})`}/>

        {/* Linha previsto — secundária, fina, dessaturada (sem dash) */}
        <path d={buildSmooth(prev)} fill="none"
          stroke={secondaryColor} strokeWidth={1.4}
          strokeLinecap="round" strokeLinejoin="round"
          clipPath={`url(#mini-clip-${tone})`}/>

        {/* Linha realizado — principal, espessa, vibrante */}
        <path d={buildSmooth(real)} fill="none"
          stroke={primaryColor} strokeWidth={2.4}
          strokeLinecap="round" strokeLinejoin="round"
          clipPath={`url(#mini-clip-${tone})`}/>

        {/* Marker contextual: maior queda */}
        {biggestDropIdx > 0 && (
          <g>
            <line
              x1={toX(biggestDropIdx)} y1={padTop+2}
              x2={toX(biggestDropIdx)} y2={padTop+chartH}
              stroke="rgba(251,191,36,0.22)" strokeWidth={1}/>
            <circle cx={toX(biggestDropIdx)} cy={toY(real[biggestDropIdx])}
              r={2.8} fill="#0b1023" stroke="rgba(251,191,36,0.85)" strokeWidth={1.4}/>
          </g>
        )}

        {/* Linha vertical hover */}
        {hoverIndex !== null && hoverIndex < n && (
          <line x1={toX(hoverIndex)} y1={padTop} x2={toX(hoverIndex)} y2={padTop+chartH}
            stroke="rgba(255,255,255,0.14)" strokeWidth={1} strokeDasharray="3,3"/>
        )}

        {/* Pontos no hover — sem glow, mais discretos */}
        {hoverIndex !== null && hoverIndex < n && (
          <>
            <circle cx={toX(hoverIndex)} cy={toY(real[hoverIndex])}
              r={3} fill={primaryColor} stroke="#0b1023" strokeWidth={1.4}/>
            {prev[hoverIndex] > 0 && (
              <circle cx={toX(hoverIndex)} cy={toY(prev[hoverIndex])}
                r={2.5} fill={secondaryColor} stroke="#0b1023" strokeWidth={1}/>
            )}
          </>
        )}

        {/* Tooltip */}
        {hoverIndex !== null && hoverIndex < n && (() => {
          const r = real[hoverIndex] ?? 0;
          const p = prev[hoverIndex] ?? 0;
          const diff = p > 0 ? ((r - p) / p) * 100 : null;
          const tx = getTooltipX(hoverIndex);
          const ty = padTop + 2;
          return (
            <g>
              <rect x={tx} y={ty} width={150} height={64} rx={6}
                fill="rgba(5,7,16,0.97)" stroke="rgba(255,255,255,0.09)" strokeWidth={1}/>
              <text x={tx+8} y={ty+13} fill="rgba(226,232,240,0.92)"
                fontSize={9.5} fontWeight={700} fontFamily="system-ui,sans-serif">
                {months[hoverIndex]}{ano ? ` ${ano}` : ""}
              </text>
              <rect x={tx+8} y={ty+19} width={2.5} height={9} rx={1} fill={primaryColor}/>
              <text x={tx+15} y={ty+27} fill={primaryColor} fontSize={8.5} fontWeight={600} fontFamily="system-ui,sans-serif">
                Realizado: {formatFull(r)}
              </text>
              <rect x={tx+8} y={ty+33} width={2.5} height={9} rx={1} fill={secondaryColor}/>
              <text x={tx+15} y={ty+41} fill="rgba(148,163,184,0.78)" fontSize={8.5} fontWeight={600} fontFamily="system-ui,sans-serif">
                Previsto: {formatFull(p)}
              </text>
              {diff !== null && (
                <text x={tx+8} y={ty+55} fill={diff >= 0 ? "#34d399" : "#f87171"}
                  fontSize={8.5} fontWeight={700} fontFamily="system-ui,sans-serif">
                  {diff >= 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(1)}% vs previsto
                </text>
              )}
            </g>
          );
        })()}

        {/* Labels X — sempre 12 meses (ano anterior é o período completo de referência) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const showLabel = i === 0 || i === 11 || i % 2 === 0;
          if (!showLabel && hoverIndex !== i) return null;
          return (
            <text key={`mx-${i}`} x={toX(i)} y={svgH - 6} textAnchor="middle"
              fill={hoverIndex === i ? "rgba(226,232,240,0.95)" : "rgba(148,163,184,0.72)"}
              fontSize={9} fontWeight={hoverIndex === i ? 700 : 500}
              fontFamily="system-ui,sans-serif" className="transition-all duration-150">
              {months[i]}
            </text>
          );
        })}

        {/* Zonas de hover — sempre 12 meses (pra permitir hover no período onde só tem dado do ano anterior) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const zx = i === 0 ? padL : toX(i) - (toX(i)-toX(i-1))/2;
          const zw = i === 0 ? (toX(1)-toX(0))/2
                   : i === 11 ? (toX(11)-toX(10))/2
                   : toX(i+1)-toX(i);
          return (
            <rect key={`mhz-${i}`} x={zx} y={padTop} width={zw} height={chartH+padBot}
              fill="transparent" onMouseEnter={() => setHoverIndex(i)}
              style={{ cursor: "crosshair" }}/>
          );
        })}
      </svg>
    </div>
  );
};


/* ------------------------------------------------------------------ */
/*  YearComparisonChart — CR/CP atual vs anterior                       */
/*  Premium: prioriza 2 linhas atuais; histórico fica fantasma e        */
/*  acende no hover; toggle para fixar comparação ano vs ano.           */
/* ------------------------------------------------------------------ */
const YearComparisonChart = ({
  crAtual, crAnterior, cpAtual, cpAnterior, anoAtual, anoAnterior,
}: {
  crAtual: number[]; crAnterior: number[];
  cpAtual: number[]; cpAnterior: number[];
  anoAtual: string;  anoAnterior: string;
}) => {
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const isEmpty = [...crAtual, ...crAnterior, ...cpAtual, ...cpAnterior].every(v => v === 0);

  // Limite = mês atual se anoAtual é o ano corrente; senão 12.
  // Ano anterior sempre renderiza completo (referência histórica).
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11
  const isAnoCorrente = !anoAtual || parseInt(anoAtual, 10) === currentYear;
  const n = isAnoCorrente ? currentMonth + 1 : 12;

  const cr  = crAtual.slice(0, n);
  const crP = crAnterior; // ano anterior sempre com 12 meses completos
  const cp  = cpAtual.slice(0, n);
  const cpP = cpAnterior; // ano anterior sempre com 12 meses completos

  // maxVal sempre considera o histórico para escala correta
  const visibleVals = [...cr, ...crP, ...cp, ...cpP].filter(v => v > 0);
  const maxVal = visibleVals.length ? Math.max(...visibleVals) * 1.15 : 1;

  const svgW = 560; const svgH = 300;
  const padL = 64; const padR = 18; const padTop = 26; const padBot = 30;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padTop - padBot;

  const toX = (i: number) => padL + (i / 11) * chartW; // sempre 12 meses
  const toY = (v: number) => padTop + chartH - (v / maxVal) * chartH;

  // Suavização controlada (t=0.28)
  const buildSmooth = (pts: number[]) => {
    if (pts.length < 2) return "";
    let d = `M${toX(0).toFixed(1)},${toY(pts[0]).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const x0 = toX(i-1), y0 = toY(pts[i-1]);
      const x1 = toX(i),   y1 = toY(pts[i]);
      const t = 0.28;
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
      const t = 0.28;
      d += ` C${(x0+(x1-x0)*t).toFixed(1)},${y0.toFixed(1)} ${(x1-(x1-x0)*t).toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
    }
    const __last = pts.length - 1;
    d += ` L${toX(__last).toFixed(1)},${base} L${toX(0).toFixed(1)},${base} Z`;
    return d;
  };

  const formatY = (v: number) => {
    if (v >= 1_000_000) return `R$ ${(v/1_000_000).toFixed(1).replace(".",",")}M`;
    if (v >= 1_000)     return `R$ ${(v/1_000).toFixed(0)}k`;
    return `R$ ${v.toFixed(0)}`;
  };
  const formatFull = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Grid limpo: 4 linhas
  const gridFracs = [0, 0.33, 0.66, 1];
  const getTooltipX = (i: number) => toX(i) + 188 > svgW ? toX(i) - 194 : toX(i) + 12;

  // Linhas do ano anterior sempre visíveis com boa opacidade
  const histOpacity = 0.55;

  return (
    <div className="flex h-full flex-col p-3 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(8,11,22,0.55) 0%, rgba(5,7,16,0.75) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.025)",
      }}>

      {/* Header + legenda com os dois anos */}
      <div className="mb-2 flex items-center gap-3 shrink-0 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 mr-auto">
          {anoAtual} vs {anoAnterior || "ano anterior"}
        </span>

        {/* CR atual */}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-4 rounded-full" style={{ background: "#2dd4bf" }}/>
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: "#2dd4bf" }}>CR {anoAtual}</span>
        </div>
        {/* CR anterior */}
        <div className="flex items-center gap-1.5">
          <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" opacity="0.6"/></svg>
          <span className="text-[10px] font-medium tracking-wide" style={{ color: "#2dd4bf", opacity: 0.6 }}>CR {anoAnterior}</span>
        </div>
        {/* CP atual */}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-4 rounded-full" style={{ background: "rgba(248,113,113,0.85)" }}/>
          <span className="text-[10px] font-medium tracking-wide" style={{ color: "rgba(248,113,113,0.85)" }}>CP {anoAtual}</span>
        </div>
        {/* CP anterior */}
        <div className="flex items-center gap-1.5">
          <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" opacity="0.5"/></svg>
          <span className="text-[10px] font-medium tracking-wide" style={{ color: "#f87171", opacity: 0.5 }}>CP {anoAnterior}</span>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-500/20 bg-slate-500/8">
              <svg className="h-5 w-5 text-slate-500/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500">Sem dados para comparação</p>
            <p className="text-[10px] text-slate-600">Atualize para carregar os anos</p>
          </div>
        ) : (
          <svg viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none"
            className="h-full w-full" onMouseLeave={() => setHoverIndex(null)}>
            <defs>
              <linearGradient id="yc-area-cr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#2dd4bf" stopOpacity="0.13"/>
                <stop offset="55%"  stopColor="#2dd4bf" stopOpacity="0.04"/>
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="yc-bg-shadow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(0,0,0,0.18)"/>
                <stop offset="20%" stopColor="rgba(0,0,0,0)"/>
              </linearGradient>
              <clipPath id="yc-clip">
                <rect x={padL} y={padTop} width={chartW} height={chartH}/>
              </clipPath>
            </defs>

            {/* Fundo + inner shadow */}
            <rect x={padL} y={padTop} width={chartW} height={chartH}
              fill="rgba(0,0,0,0.18)" rx="4"/>
            <rect x={padL} y={padTop} width={chartW} height={chartH}
              fill="url(#yc-bg-shadow)" rx="4"/>

            {/* Grid limpo — 4 linhas sólidas sutis */}
            {gridFracs.map(frac => {
              const y = padTop + chartH * (1 - frac);
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={svgW - padR} y2={y}
                    stroke={frac === 0 ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)"}
                    strokeWidth={frac === 0 ? 1 : 0.6}/>
                  {frac > 0 && (
                    <text x={padL - 8} y={y + 3.5} textAnchor="end"
                      fill="rgba(203,213,225,0.7)" fontSize={9.5} fontWeight={500} fontFamily="system-ui,sans-serif">
                      {formatY(maxVal * frac)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Linhas histórico (ano anterior) — fantasma; acendem com toggle/hover */}
            <path d={buildSmooth(cpP)} fill="none" stroke="#f87171"
              strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"
              opacity={histOpacity * 0.85}
              style={{ transition: "opacity 220ms ease" }}
              clipPath="url(#yc-clip)"/>
            <path d={buildSmooth(crP)} fill="none" stroke="#2dd4bf"
              strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"
              opacity={histOpacity}
              style={{ transition: "opacity 220ms ease" }}
              clipPath="url(#yc-clip)"/>

            {/* Área CR atual — gradient suave */}
            <path d={buildArea(cr)} fill="url(#yc-area-cr)" clipPath="url(#yc-clip)"/>

            {/* Linhas ano atual — destaque */}
            <path d={buildSmooth(cp)} fill="none" stroke="rgba(248,113,113,0.85)"
              strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
              clipPath="url(#yc-clip)"/>
            <path d={buildSmooth(cr)} fill="none" stroke="#2dd4bf"
              strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
              clipPath="url(#yc-clip)"/>

            {/* Linha de hover */}
            {hoverIndex !== null && hoverIndex < n && (
              <line x1={toX(hoverIndex)} y1={padTop} x2={toX(hoverIndex)} y2={padTop+chartH}
                stroke="rgba(255,255,255,0.14)" strokeWidth={1} strokeDasharray="3,3"/>
            )}

            {/* Pontos no hover — apenas atuais com força; histórico discreto */}
            {hoverIndex !== null && hoverIndex < n && (
              <>
                <circle cx={toX(hoverIndex)} cy={toY(cr[hoverIndex])}
                  r={3.5} fill="#2dd4bf" stroke="#0b1023" strokeWidth={1.5}/>
                <circle cx={toX(hoverIndex)} cy={toY(cp[hoverIndex])}
                  r={3} fill="rgba(248,113,113,0.85)" stroke="#0b1023" strokeWidth={1.5}/>
                {(showHistory || hoverIndex !== null) && crP[hoverIndex] > 0 && (
                  <circle cx={toX(hoverIndex)} cy={toY(crP[hoverIndex])}
                    r={2.5} fill="rgba(45,212,191,0.6)" stroke="#0b1023" strokeWidth={1}/>
                )}
                {(showHistory || hoverIndex !== null) && cpP[hoverIndex] > 0 && (
                  <circle cx={toX(hoverIndex)} cy={toY(cpP[hoverIndex])}
                    r={2.5} fill="rgba(248,113,113,0.5)" stroke="#0b1023" strokeWidth={1}/>
                )}
              </>
            )}

            {/* Tooltip */}
            {hoverIndex !== null && hoverIndex < n && (() => {
              const crA = cr[hoverIndex]  ?? 0;
              const crB = crP[hoverIndex] ?? 0;
              const cpA = cp[hoverIndex]  ?? 0;
              const cpB = cpP[hoverIndex] ?? 0;
              const crDiff = crB > 0 ? ((crA - crB) / crB) * 100 : null;
              const cpDiff = cpB > 0 ? ((cpA - cpB) / cpB) * 100 : null;
              const tx = getTooltipX(hoverIndex);
              const ty = padTop + 4;
              return (
                <g>
                  <rect x={tx} y={ty} width={188} height={104} rx={8}
                    fill="rgba(5,7,16,0.97)" stroke="rgba(255,255,255,0.09)" strokeWidth={1}/>
                  <text x={tx+10} y={ty+16} fill="rgba(226,232,240,0.92)"
                    fontSize={10.5} fontWeight={700} fontFamily="system-ui,sans-serif">
                    {months[hoverIndex]}
                  </text>
                  {/* CR */}
                  <rect x={tx+10} y={ty+24} width={3} height={10} rx={1.5} fill="#2dd4bf"/>
                  <text x={tx+18} y={ty+33} fill="#2dd4bf" fontSize={9.5} fontWeight={600} fontFamily="system-ui,sans-serif">
                    CR {anoAtual}: {formatFull(crA)}
                  </text>
                  <text x={tx+18} y={ty+45} fill="rgba(45,212,191,0.55)" fontSize={9} fontFamily="system-ui,sans-serif">
                    {anoAnterior}: {formatFull(crB)}{crDiff !== null ? `  (${crDiff >= 0 ? "+" : ""}${crDiff.toFixed(1)}%)` : ""}
                  </text>
                  {/* CP */}
                  <rect x={tx+10} y={ty+56} width={3} height={10} rx={1.5} fill="rgba(248,113,113,0.8)"/>
                  <text x={tx+18} y={ty+65} fill="rgba(248,113,113,0.88)" fontSize={9.5} fontWeight={600} fontFamily="system-ui,sans-serif">
                    CP {anoAtual}: {formatFull(cpA)}
                  </text>
                  <text x={tx+18} y={ty+77} fill="rgba(248,113,113,0.5)" fontSize={9} fontFamily="system-ui,sans-serif">
                    {anoAnterior}: {formatFull(cpB)}{cpDiff !== null ? `  (${cpDiff >= 0 ? "+" : ""}${cpDiff.toFixed(1)}%)` : ""}
                  </text>
                  <line x1={tx+10} y1={ty+86} x2={tx+178} y2={ty+86} stroke="rgba(255,255,255,0.07)" strokeWidth={0.5}/>
                  <text x={tx+10} y={ty+98} fill="rgba(148,163,184,0.6)" fontSize={8.5} fontFamily="system-ui,sans-serif">
                    variação vs mesmo mês
                  </text>
                </g>
              );
            })()}

            {/* Labels X — sempre 12 meses */}
            {months.map((m, i) => (
              <text key={`m-${i}`} x={toX(i)} y={svgH - 8} textAnchor="middle"
                fill={hoverIndex === i ? "rgba(226,232,240,0.95)" : "rgba(148,163,184,0.75)"}
                fontSize={9.5} fontWeight={hoverIndex === i ? 700 : 500}
                fontFamily="system-ui,sans-serif" className="transition-all duration-150">
                {m}
              </text>
            ))}

            {/* Zonas hover — sempre 12 meses */}
            {months.map((_, i) => {
              const zx = i === 0    ? padL : toX(i) - (toX(i)-toX(i-1))/2;
              const zw = i === 0    ? (toX(1)-toX(0))/2
                       : i === 11   ? (toX(11)-toX(10))/2
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
/*  ComparativeLineChart — CR vs CP no mesmo período                   */
/*  Premium: hierarquia clara, area gradient, marker contextual,       */
/*  grid limpo (4 linhas), suavização controlada, pontos só no hover.  */
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

  // Limite = mês atual se o ano do gráfico é o ano corrente; senão plota 12 meses.
  // Isso evita que lixo residual (centavos, provisões futuras) estenda a linha até Dez.
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth(); // 0-11
  const isAnoCorrente = !ano || parseInt(ano, 10) === anoAtual;
  const limiteMes = isAnoCorrente ? mesAtual + 1 : 12; // inclui o mês corrente

  const cr = crRealizado.slice(0, limiteMes);
  const cp = cpRealizado.slice(0, limiteMes);
  const n = cr.length;

  const allValues = [...cr, ...cp].filter(v => v > 0);
  const maxVal = allValues.length ? Math.max(...allValues) * 1.15 : 1;
  const minVal = 0;

  // Mesmas dimensões do YearComparisonChart para harmonia visual e fontes consistentes
  const svgW = 560; const svgH = 300;
  const padL = 64; const padR = 18; const padTop = 26; const padBot = 30;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padTop - padBot;

  const toX = (i: number) => padL + (i / Math.max(n - 1, 1)) * chartW;
  const toY = (v: number) => padTop + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  // Suavização controlada (t=0.28 — mais profissional, menos "elástica")
  const buildSmooth = (pts: number[]) => {
    if (pts.length < 2) return "";
    let d = `M${toX(0).toFixed(1)},${toY(pts[0]).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const x0 = toX(i-1), y0 = toY(pts[i-1]);
      const x1 = toX(i),   y1 = toY(pts[i]);
      const t = 0.28;
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
      const t = 0.28;
      d += ` C${(x0+(x1-x0)*t).toFixed(1)},${y0.toFixed(1)} ${(x1-(x1-x0)*t).toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
    }
    const __last = pts.length - 1;
    d += ` L${toX(__last).toFixed(1)},${base} L${toX(0).toFixed(1)},${base} Z`;
    return d;
  };

  const formatY = (v: number) => {
    if (v >= 1_000_000) return `R$ ${(v/1_000_000).toFixed(1).replace(".",",")}M`;
    if (v >= 1_000)     return `R$ ${(v/1_000).toFixed(0)}k`;
    return `R$ ${v.toFixed(0)}`;
  };
  const formatFull = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Detecta período flat (3+ meses com baixa variação) na linha CR
  const flatRanges: {start: number; end: number}[] = [];
  let fs = -1;
  for (let i = 1; i < n; i++) {
    if (cr[i-1] > 0 && cr[i] > 0) {
      const pct = Math.abs(cr[i] - cr[i-1]) / cr[i-1];
      if (pct < 0.08) {
        if (fs === -1) fs = i - 1;
      } else {
        if (fs !== -1 && i - 1 - fs >= 2) flatRanges.push({ start: fs, end: i - 1 });
        fs = -1;
      }
    } else {
      if (fs !== -1 && i - 1 - fs >= 2) flatRanges.push({ start: fs, end: i - 1 });
      fs = -1;
    }
  }
  if (fs !== -1 && n - 1 - fs >= 2) flatRanges.push({ start: fs, end: n - 1 });

  // Grid limpo: apenas 4 linhas (0, 33%, 66%, 100%)
  const gridFracs = [0, 0.33, 0.66, 1];
  const getTooltipX = (i: number) => toX(i) + 178 > svgW ? toX(i) - 184 : toX(i) + 12;

  return (
    <div className="flex h-full flex-col p-3 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(8,11,22,0.55) 0%, rgba(5,7,16,0.75) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.025), inset 0 0 0 1px rgba(255,255,255,0.008)",
      }}>

      {/* Header + legenda */}
      <div className="mb-2 flex items-center gap-4 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 mr-auto">
          Evolução{ano ? ` · ${ano}` : ""}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-4 rounded-full" style={{ background: "#2dd4bf", boxShadow: "0 0 6px rgba(45,212,191,0.4)" }}/>
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: "#2dd4bf" }}>Receber</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-4 rounded-full" style={{ background: "rgba(248,113,113,0.55)" }}/>
          <span className="text-[10px] font-medium tracking-wide" style={{ color: "rgba(248,113,113,0.7)" }}>Pagar</span>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        {isEmpty || n === 0 || (cr.every(v => v === 0) && cp.every(v => v === 0)) ? (
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
          <svg viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none"
            className="h-full w-full" onMouseLeave={() => setHoverIndex(null)}>
            <defs>
              {/* Área CR — gradient sutil (12% → 0%) */}
              <linearGradient id="cl-area-cr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#2dd4bf" stopOpacity="0.13"/>
                <stop offset="55%"  stopColor="#2dd4bf" stopOpacity="0.04"/>
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0"/>
              </linearGradient>
              {/* Inner shadow no fundo */}
              <linearGradient id="cl-bg-shadow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(0,0,0,0.18)"/>
                <stop offset="20%" stopColor="rgba(0,0,0,0)"/>
              </linearGradient>
              <clipPath id="cl-clip">
                <rect x={padL} y={padTop} width={chartW} height={chartH}/>
              </clipPath>
            </defs>

            {/* Fundo do plot — levemente mais escuro com inner shadow no topo */}
            <rect x={padL} y={padTop} width={chartW} height={chartH}
              fill="rgba(0,0,0,0.18)" rx="4"/>
            <rect x={padL} y={padTop} width={chartW} height={chartH}
              fill="url(#cl-bg-shadow)" rx="4"/>

            {/* Grid horizontal — 4 linhas, sutis */}
            {gridFracs.map(frac => {
              const y = padTop + chartH * (1 - frac);
              const val = minVal + (maxVal - minVal) * frac;
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={svgW - padR} y2={y}
                    stroke={frac === 0 ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)"}
                    strokeWidth={frac === 0 ? 1 : 0.6}/>
                  {frac > 0 && (
                    <text x={padL - 8} y={y + 3.5} textAnchor="end"
                      fill="rgba(203,213,225,0.7)" fontSize={9.5} fontWeight={500} fontFamily="system-ui,sans-serif">
                      {formatY(val)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Períodos flat — fade leve para indicar baixa movimentação */}
            {flatRanges.map((r, ri) => (
              <g key={`flat-${ri}`}>
                <rect
                  x={toX(r.start)} y={padTop}
                  width={toX(r.end) - toX(r.start)} height={chartH}
                  fill="rgba(148,163,184,0.025)"
                  clipPath="url(#cl-clip)"/>
                {/* Anotação discreta no centro do range, se largo o suficiente */}
                {r.end - r.start >= 3 && (
                  <text
                    x={(toX(r.start) + toX(r.end)) / 2}
                    y={padTop + 12}
                    textAnchor="middle"
                    fill="rgba(148,163,184,0.42)"
                    fontSize={8} fontStyle="italic"
                    fontFamily="system-ui,sans-serif">
                    sem movimentação relevante
                  </text>
                )}
              </g>
            ))}

            {/* Área CR (principal) — gradient suave */}
            <path d={buildArea(cr)} fill="url(#cl-area-cr)" clipPath="url(#cl-clip)"/>

            {/* Linha CP (secundária) — fina, dessaturada, sólida (sem dash genérico) */}
            <path d={buildSmooth(cp)} fill="none"
              stroke="rgba(248,113,113,0.55)" strokeWidth={1.5}
              strokeLinecap="round" strokeLinejoin="round"
              clipPath="url(#cl-clip)"/>

            {/* Linha CR (principal) — espessa, vibrante */}
            <path d={buildSmooth(cr)} fill="none"
              stroke="#2dd4bf" strokeWidth={2.6}
              strokeLinecap="round" strokeLinejoin="round"
              clipPath="url(#cl-clip)"/>


            {/* Linha vertical hover */}
            {hoverIndex !== null && hoverIndex < n && (
              <line x1={toX(hoverIndex)} y1={padTop} x2={toX(hoverIndex)} y2={padTop+chartH}
                stroke="rgba(255,255,255,0.14)" strokeWidth={1} strokeDasharray="3,3"/>
            )}

            {/* Pontos apenas no hover — sem glow */}
            {hoverIndex !== null && hoverIndex < n && (
              <>
                <circle cx={toX(hoverIndex)} cy={toY(cr[hoverIndex])}
                  r={3.5} fill="#2dd4bf" stroke="#0b1023" strokeWidth={1.5}/>
                <circle cx={toX(hoverIndex)} cy={toY(cp[hoverIndex])}
                  r={3} fill="rgba(248,113,113,0.85)" stroke="#0b1023" strokeWidth={1.5}/>
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
                  <rect x={tx} y={ty} width={178} height={82} rx={8}
                    fill="rgba(5,7,16,0.97)" stroke="rgba(255,255,255,0.09)" strokeWidth={1}/>
                  <text x={tx+10} y={ty+16} fill="rgba(226,232,240,0.92)"
                    fontSize={10.5} fontWeight={700} fontFamily="system-ui,sans-serif">
                    {months[hoverIndex]}{ano ? ` ${ano}` : ""}
                  </text>
                  <rect x={tx+10} y={ty+24} width={3} height={10} rx={1.5} fill="#2dd4bf"/>
                  <text x={tx+18} y={ty+33} fill="#2dd4bf"
                    fontSize={9.5} fontWeight={600} fontFamily="system-ui,sans-serif">
                    Receber: {formatFull(crV)}
                  </text>
                  <rect x={tx+10} y={ty+40} width={3} height={10} rx={1.5} fill="rgba(248,113,113,0.7)"/>
                  <text x={tx+18} y={ty+49} fill="rgba(248,113,113,0.85)"
                    fontSize={9.5} fontWeight={600} fontFamily="system-ui,sans-serif">
                    Pagar: {formatFull(cpV)}
                  </text>
                  <line x1={tx+10} y1={ty+58} x2={tx+168} y2={ty+58}
                    stroke="rgba(255,255,255,0.07)" strokeWidth={0.5}/>
                  <text x={tx+10} y={ty+72}
                    fill={diff >= 0 ? "rgba(45,212,191,0.85)" : "rgba(248,113,113,0.85)"}
                    fontSize={9.5} fontWeight={600} fontFamily="system-ui,sans-serif">
                    Saldo: {diff >= 0 ? "+" : ""}{formatFull(diff)}
                  </text>
                </g>
              );
            })()}

            {/* Labels eixo X — espaçamento melhor */}
            {Array.from({ length: n }).map((_, i) => {
              const showLabel = n <= 8 || i === 0 || i === n - 1 || i % Math.ceil(n / 6) === 0;
              if (!showLabel && hoverIndex !== i) return null;
              return (
                <text key={`m-${i}`} x={toX(i)} y={svgH - 8} textAnchor="middle"
                  fill={hoverIndex === i ? "rgba(226,232,240,0.95)" : "rgba(148,163,184,0.75)"}
                  fontSize={9.5} fontWeight={hoverIndex === i ? 700 : 500}
                  fontFamily="system-ui,sans-serif" className="transition-all duration-150">
                  {months[i]}
                </text>
              );
            })}

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
    isFetchingCharts,
    dwError,
    dwFilter,
    setDwFilter,
    filiais,
    empresas,
    isProcessed,
    chartPagar,
    chartReceber,
    chartPagarAnterior,
    chartReceberAnterior,
    kpiExtra,
  } = useFinancialData();

  const navigate = useNavigate();

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

  // Insights derivados dos arrays mensais — usados nos cards RECEBIDO e PAGO
  const cardInsights = useMemo(() => {
    const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const fmtM = (v: number) => v >= 1_000_000
      ? `R$ ${(v/1_000_000).toFixed(1).replace(".",",")}M`
      : v >= 1_000 ? `R$ ${(v/1_000).toFixed(0)}k`
      : `R$ ${v.toFixed(0)}`;

    // Melhor mês de recebimento (maior valor no realizado do CR)
    const crReal = chartReceber.realizado || [];
    const cpReal = chartPagar.realizado || [];
    const crBestIdx = crReal.reduce((best, v, i) => v > (crReal[best] ?? 0) ? i : best, 0);
    const cpWorstIdx = cpReal.reduce((worst, v, i) => v > (cpReal[worst] ?? 0) ? i : worst, 0);
    const melhorMes = (crReal[crBestIdx] ?? 0) > 0
      ? `${months[crBestIdx]} · ${fmtM(crReal[crBestIdx])}`
      : "—";
    const maiorDespesa = (cpReal[cpWorstIdx] ?? 0) > 0
      ? `${months[cpWorstIdx]} · ${fmtM(cpReal[cpWorstIdx])}`
      : "—";

    // Tendência: média dos últimos 3 meses com dado - média dos 3 anteriores
    const activeCr = crReal.filter(v => v > 0);
    let tendencia: { label: string; positive: boolean } = { label: "—", positive: true };
    if (activeCr.length >= 2) {
      const half = Math.ceil(activeCr.length / 2);
      const recent = activeCr.slice(-half);
      const older = activeCr.slice(0, activeCr.length - half);
      if (older.length > 0) {
        const avgRecent = recent.reduce((a,b) => a+b, 0) / recent.length;
        const avgOlder = older.reduce((a,b) => a+b, 0) / older.length;
        const diff = avgRecent - avgOlder;
        tendencia = {
          label: `${diff >= 0 ? "↑" : "↓"} ${fmtM(Math.abs(diff))}`,
          positive: diff >= 0,
        };
      }
    }

    // Variação de pagamentos: último mês completo vs mês anterior ao completo.
    // "Completo" = último mês com índice < mês corrente. Em abril, compara Mar vs Fev.
    // Usa só meses com dado (> 0) pra evitar divisão por zero em meses sem operação.
    const nowMonth = new Date().getMonth(); // 0-11
    // Último índice anterior ao mês atual com dado realizado (mês "completo" mais recente)
    let lastFullIdx = -1;
    for (let i = Math.min(nowMonth - 1, cpReal.length - 1); i >= 0; i--) {
      if (cpReal[i] > 0) { lastFullIdx = i; break; }
    }
    // Índice do mês anterior ao "último completo", com dado
    let prevFullIdx = -1;
    for (let i = lastFullIdx - 1; i >= 0; i--) {
      if (cpReal[i] > 0) { prevFullIdx = i; break; }
    }
    let variacaoLabel = "—";
    let variacaoPositive = false;
    let variacaoSub = "";
    if (lastFullIdx >= 0 && prevFullIdx >= 0) {
      const atual = cpReal[lastFullIdx];
      const anterior = cpReal[prevFullIdx];
      const pct = ((atual - anterior) / anterior) * 100;
      variacaoLabel = `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct).toFixed(0)}%`;
      // No contexto de PAGO: aumento = ruim (gastou mais), redução = bom
      variacaoPositive = pct <= 0;
      variacaoSub = `${months[lastFullIdx]} vs ${months[prevFullIdx]}`;
    } else if (lastFullIdx >= 0) {
      variacaoSub = `${months[lastFullIdx]} · sem base`;
    }

    const totalCR = crReal.reduce((a,b) => a+b, 0);
    const totalCP = cpReal.reduce((a,b) => a+b, 0);
    const coberturaCP = totalCP > 0 ? (totalCR / totalCP * 100) : 0;

    return {
      melhorMes,
      maiorDespesa,
      tendencia,
      variacaoLabel,
      variacaoPositive,
      variacaoSub,
      coberturaCP,
      realizacaoCR: kpiExtra.realizacaoCR,
      realizacaoCP: kpiExtra.realizacaoCP,
    };
  }, [chartReceber.realizado, chartPagar.realizado, kpiExtra.realizacaoCR, kpiExtra.realizacaoCP]);

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
                <button onClick={() => void handleUpdate()} disabled={isFetchingDw || isFetchingCharts}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3.5 text-[12px] font-semibold transition-all ${isFetchingDw ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.15)]" : "border-cyan-400/50 bg-cyan-500/20 text-cyan-100 font-bold hover:border-cyan-300/70 hover:bg-cyan-400/30 hover:shadow-[0_0_24px_rgba(34,211,238,0.3)] hover:-translate-y-0.5 active:scale-95"} disabled:cursor-not-allowed`}>
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
                <button onClick={() => void handleUpdate()} disabled={isFetchingDw || isFetchingCharts}
                  className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-bold transition-all ${isFetchingDw ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.15)]" : "border-cyan-400/50 bg-cyan-500/20 text-cyan-100 hover:border-cyan-300/70 hover:bg-cyan-400/30 active:scale-95"} disabled:cursor-not-allowed`}>
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

                {/* Top: 2 colunas — RECEBIDO | PAGO com insights integrados */}
                {isFetchingDw && !isProcessed ? (
                  <div className="grid grid-cols-2 gap-2.5 xl:col-span-2 items-stretch">
                    {[0, 1].map((i) => (<CardSkeleton key={i} />))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 xl:col-span-2 items-stretch">
                    {/* RECEBIDO */}
                    <div className="group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border border-emerald-500/[0.18] [background:var(--sgt-bg-card)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/30 hover:shadow-[0_20px_45px_rgba(0,0,0,0.5)]">
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_55%)]" />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-400/70 to-emerald-700/20" />
                      <div className="relative flex h-full">

                        {/* Esquerda — valor principal */}
                        <div className="flex flex-col justify-between p-5 xl:p-6 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-emerald-400">RECEBIDO</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[8px] font-bold text-emerald-300">
                              <TrendingUp className="h-2.5 w-2.5" /> Realizado
                            </span>
                          </div>
                          <div>
                            <h2 className="font-black leading-none tracking-[-0.05em] text-white mt-3"
                              style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)" }}>
                              <CountUp value={contasReceber.valorRecebido} />
                            </h2>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-500/80 font-semibold mt-2">Entrada consolidada</p>
                          </div>
                        </div>

                        {/* Divisor vertical */}
                        <div className="w-px shrink-0 my-4" style={{ background: "rgba(16,185,129,0.12)" }} />

                        {/* Direita — insights empilhados */}
                        <div className="flex flex-col justify-around p-4 xl:p-5 w-[185px] shrink-0 gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Melhor mês</span>
                            <span className="text-[15px] font-bold text-slate-100 leading-tight">{cardInsights.melhorMes}</span>
                          </div>
                          <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Tendência</span>
                            <span className={`text-[15px] font-bold leading-tight ${cardInsights.tendencia.positive ? "text-emerald-300" : "text-rose-300"}`}>
                              {cardInsights.tendencia.label}
                            </span>
                          </div>
                          <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">vs Previsto</span>
                            <span className="text-[15px] font-bold text-slate-100 leading-tight">{cardInsights.realizacaoCR.toFixed(0)}%</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* PAGO */}
                    <div className="group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border border-rose-500/[0.18] [background:var(--sgt-bg-card)] transition-all duration-300 hover:-translate-y-1 hover:border-rose-400/30 hover:shadow-[0_20px_45px_rgba(0,0,0,0.5)]">
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.10),transparent_55%)]" />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-rose-400/70 to-rose-700/20" />
                      <div className="relative flex h-full">

                        {/* Esquerda — valor principal */}
                        <div className="flex flex-col justify-between p-5 xl:p-6 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-rose-400">PAGO</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 text-[8px] font-bold text-rose-300">
                              <TrendingDown className="h-2.5 w-2.5" /> Realizado
                            </span>
                          </div>
                          <div>
                            <h2 className="font-black leading-none tracking-[-0.05em] text-white mt-3"
                              style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)" }}>
                              <CountUp value={contasPagar.valorPago} />
                            </h2>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-rose-500/80 font-semibold mt-2">Saída consolidada</p>
                          </div>
                        </div>

                        {/* Divisor vertical */}
                        <div className="w-px shrink-0 my-4" style={{ background: "rgba(248,113,113,0.12)" }} />

                        {/* Direita — insights empilhados */}
                        <div className="flex flex-col justify-around p-4 xl:p-5 w-[185px] shrink-0 gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Maior despesa</span>
                            <span className="text-[15px] font-bold text-slate-100 leading-tight">{cardInsights.maiorDespesa}</span>
                          </div>
                          <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Variação MoM</span>
                            <span className={`text-[15px] font-bold leading-tight ${cardInsights.variacaoLabel === "—" ? "text-slate-400" : cardInsights.variacaoPositive ? "text-emerald-300" : "text-rose-300"}`}>
                              {cardInsights.variacaoLabel}
                            </span>
                          </div>
                          <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Cobertura CR</span>
                            <span className={`text-[15px] font-bold leading-tight ${cardInsights.coberturaCP >= 100 ? "text-emerald-300" : "text-rose-300"}`}>
                              {cardInsights.coberturaCP.toFixed(0)}%
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {/* Gráficos lado a lado */}
                {isFetchingDw && !isProcessed ? (
                  <div className="xl:col-span-2 grid xl:grid-cols-2 gap-2.5">
                    <LargeCardSkeleton />
                    <LargeCardSkeleton />
                  </div>
                ) : (
                  <div className="xl:col-span-2 grid xl:grid-cols-2 gap-2.5 min-h-0">

                    {/* Gráfico 1 — CR vs CP (mesmo ano) */}
                    <AnimatedCard delay={320} className="flex min-h-0 h-full">
                      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden rounded-[14px] sm:rounded-[16px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)]">
                        <ComparativeLineChart
                          crRealizado={chartReceber.realizado}
                          cpRealizado={chartPagar.realizado}
                          ano={chartReceber.ano || chartPagar.ano}
                          isEmpty={[...chartReceber.realizado, ...chartPagar.realizado].every(v => v === 0)}
                        />

                        {isFetchingCharts && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-[2px] rounded-[14px]">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full animate-pulse bg-teal-400" />
                              <div className="h-2 w-2 rounded-full animate-pulse [animation-delay:150ms] bg-teal-400/60" />
                              <div className="h-2 w-2 rounded-full animate-pulse [animation-delay:300ms] bg-teal-400/30" />
                            </div>
                            <span className="text-[10px] font-medium text-slate-400">Atualizando gráficos...</span>
                          </div>
                        )}
                      </div>
                    </AnimatedCard>

                    {/* Gráfico 2 — ano atual vs ano anterior */}
                    <AnimatedCard delay={400} className="flex min-h-0 h-full">
                      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden rounded-[14px] sm:rounded-[16px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)]">
                        <YearComparisonChart
                          crAtual={chartReceber.realizado}
                          crAnterior={chartReceberAnterior.realizado}
                          cpAtual={chartPagar.realizado}
                          cpAnterior={chartPagarAnterior.realizado}
                          anoAtual={chartReceber.ano || chartPagar.ano}
                          anoAnterior={chartReceberAnterior.ano || chartPagarAnterior.ano}
                        />
                        {isFetchingCharts && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-[2px] rounded-[14px]">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full animate-pulse bg-violet-400" />
                              <div className="h-2 w-2 rounded-full animate-pulse [animation-delay:150ms] bg-violet-400/60" />
                              <div className="h-2 w-2 rounded-full animate-pulse [animation-delay:300ms] bg-violet-400/30" />
                            </div>
                            <span className="text-[10px] font-medium text-slate-400">Atualizando gráficos...</span>
                          </div>
                        )}
                      </div>
                    </AnimatedCard>

                  </div>
                )}

                {/* KPIs Extras — 4 cards: Saldo (destaque) | Inadimplência | %CP | %CR */}
                {isProcessed && (() => {
                  // Cor dinâmica baseada em quão longe está da meta de 100%
                  const toneFor = (pct: number) => {
                    if (pct >= 80) return { text: "text-emerald-300", bar: "bg-emerald-400", border: "border-emerald-400/[0.15]", hoverBorder: "hover:border-emerald-400/30", chipBg: "bg-emerald-500/15", chipBorder: "border-emerald-500/25", glow: "rgba(52,211,153,0.12)" };
                    if (pct >= 50) return { text: "text-amber-300", bar: "bg-amber-400", border: "border-amber-400/[0.15]", hoverBorder: "hover:border-amber-400/30", chipBg: "bg-amber-500/15", chipBorder: "border-amber-500/25", glow: "rgba(251,191,36,0.12)" };
                    return { text: "text-red-300", bar: "bg-red-400", border: "border-red-400/[0.15]", hoverBorder: "hover:border-red-400/30", chipBg: "bg-red-500/15", chipBorder: "border-red-500/25", glow: "rgba(248,113,113,0.12)" };
                  };
                  const cpTone = toneFor(kpiExtra.realizacaoCP);
                  const crTone = toneFor(kpiExtra.realizacaoCR ?? 0);
                  const saldoPositivo = kpiExtra.saldoLiquido >= 0;
                  const docsVencidos = kpiExtra.inadimplenciaDocs;
                  const inadimplenciaValor = kpiExtra.inadimplencia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

                  return (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 xl:col-span-2 items-stretch h-full">

                    {/* SALDO LÍQUIDO — destaque cyan */}
                    <div className="group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border-[1.5px] border-cyan-400/35 [background:linear-gradient(135deg,rgba(34,211,238,0.06),var(--sgt-bg-card))] p-3 xl:p-4 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/55 hover:shadow-[0_20px_45px_rgba(34,211,238,0.15)]">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-400 to-cyan-300/40" />
                      <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36" style={{ background: "radial-gradient(circle at 100% 100%, rgba(34,211,238,0.18), transparent 65%)" }} />
                      <div className="relative flex h-full flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-cyan-300">Saldo Líquido</span>
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-400/30 transition-transform duration-300 group-hover:scale-110">
                            {saldoPositivo ? <TrendingUp className="h-3 w-3 text-cyan-300" /> : <TrendingDown className="h-3 w-3 text-red-300" />}
                          </div>
                        </div>
                        <div className="font-black tracking-[-0.04em] text-white leading-none whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{ fontSize: kpiFontSize(kpiExtra.saldoLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })) }}>
                          {kpiExtra.saldoLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.12em] font-medium">
                          Recebido − Pago no período
                        </p>
                        <div className="mt-auto flex flex-col gap-2 pt-1">
                          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                            <div className="h-full rounded-full bg-cyan-400 transition-all duration-1000 ease-out" style={{ width: saldoPositivo ? "100%" : "20%" }} />
                          </div>
                          <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${saldoPositivo ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-200" : "bg-red-500/15 border border-red-400/25 text-red-300"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${saldoPositivo ? "bg-cyan-400" : "bg-red-400"}`} />
                            {saldoPositivo ? "Fluxo positivo" : "Fluxo negativo"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* INADIMPLÊNCIA — % em destaque, valor absoluto e docs como subtítulo */}
                    <div className="group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border border-red-400/[0.18] [background:var(--sgt-bg-card)] p-3 xl:p-4 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-red-400/35 hover:shadow-[0_20px_45px_rgba(0,0,0,0.5)]">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-red-400/60 to-red-700/20" />
                      <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36" style={{ background: "radial-gradient(circle at 100% 100%, rgba(248,113,113,0.12), transparent 65%)" }} />
                      <div className="relative flex h-full flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-red-300/85">Inadimplência</span>
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15 border border-red-500/20 transition-transform duration-300 group-hover:scale-110">
                            <AlertCircle className="h-3 w-3 text-red-400" />
                          </div>
                        </div>
                        <div className="font-black tracking-[-0.04em] text-red-300 leading-none"
                          style={{ fontSize: kpiFontSize(`${kpiExtra.inadimplenciaPerc.toFixed(1)}%`) }}>
                          {kpiExtra.inadimplenciaPerc.toFixed(1)}%
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.12em] font-medium">
                          {inadimplenciaValor}
                        </p>
                        <div className="mt-auto flex flex-col gap-2 pt-1">
                          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                            <div className="h-full rounded-full bg-red-400 transition-all duration-1000 ease-out" style={{ width: `${Math.min(kpiExtra.inadimplenciaPerc, 100)}%` }} />
                          </div>
                          <span className="inline-flex w-fit rounded-full bg-red-500/15 border border-red-500/25 px-2.5 py-0.5 text-[10px] font-bold text-red-300">
                            {docsVencidos.toLocaleString("pt-BR")} docs vencidos
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* % REALIZAÇÃO CP — cor dinâmica */}
                    <div className={`group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border ${cpTone.border} [background:var(--sgt-bg-card)] p-3 xl:p-4 flex flex-col transition-all duration-300 hover:-translate-y-1 ${cpTone.hoverBorder} hover:shadow-[0_20px_45px_rgba(0,0,0,0.5)]`}>
                      <div className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-current to-transparent ${cpTone.text} opacity-50`} />
                      <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36" style={{ background: `radial-gradient(circle at 100% 100%, ${cpTone.glow}, transparent 65%)` }} />
                      <div className="relative flex h-full flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-bold uppercase tracking-[0.28em] ${cpTone.text} opacity-90`}>% Realização CP</span>
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${cpTone.chipBg} border ${cpTone.chipBorder} transition-transform duration-300 group-hover:scale-110`}>
                            <TrendingDown className={`h-3 w-3 ${cpTone.text}`} />
                          </div>
                        </div>
                        <div className="font-black tracking-[-0.04em] text-white leading-none"
                          style={{ fontSize: kpiFontSize(`${kpiExtra.realizacaoCP.toFixed(0)}%`) }}>
                          {kpiExtra.realizacaoCP.toFixed(0)}%
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.12em] font-medium">
                          Pago ÷ Previsto
                        </p>
                        <div className="mt-auto flex flex-col gap-2 pt-1">
                          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                            <div className={`h-full rounded-full ${cpTone.bar} transition-all duration-1000 ease-out`} style={{ width: `${Math.min(kpiExtra.realizacaoCP, 100)}%` }} />
                          </div>
                          <span className={`inline-flex w-fit rounded-full ${cpTone.chipBg} border ${cpTone.chipBorder} px-2.5 py-0.5 text-[10px] font-bold ${cpTone.text}`}>
                            Meta: 100%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* % REALIZAÇÃO CR — cor dinâmica */}
                    <div className={`group relative overflow-hidden rounded-[14px] sm:rounded-[16px] border ${crTone.border} [background:var(--sgt-bg-card)] p-3 xl:p-4 flex flex-col transition-all duration-300 hover:-translate-y-1 ${crTone.hoverBorder} hover:shadow-[0_20px_45px_rgba(0,0,0,0.5)]`}>
                      <div className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-current to-transparent ${crTone.text} opacity-50`} />
                      <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36" style={{ background: `radial-gradient(circle at 100% 100%, ${crTone.glow}, transparent 65%)` }} />
                      <div className="relative flex h-full flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-bold uppercase tracking-[0.28em] ${crTone.text} opacity-90`}>% Realização CR</span>
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${crTone.chipBg} border ${crTone.chipBorder} transition-transform duration-300 group-hover:scale-110`}>
                            <TrendingUp className={`h-3 w-3 ${crTone.text}`} />
                          </div>
                        </div>
                        <div className="font-black tracking-[-0.04em] text-white leading-none"
                          style={{ fontSize: kpiFontSize(`${(kpiExtra.realizacaoCR ?? 0).toFixed(0)}%`) }}>
                          {(kpiExtra.realizacaoCR ?? 0).toFixed(0)}%
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.12em] font-medium">
                          Recebido ÷ Previsto
                        </p>
                        <div className="mt-auto flex flex-col gap-2 pt-1">
                          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                            <div className={`h-full rounded-full ${crTone.bar} transition-all duration-1000 ease-out`} style={{ width: `${Math.min(kpiExtra.realizacaoCR ?? 0, 100)}%` }} />
                          </div>
                          <span className={`inline-flex w-fit rounded-full ${crTone.chipBg} border ${crTone.chipBorder} px-2.5 py-0.5 text-[10px] font-bold ${crTone.text}`}>
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
