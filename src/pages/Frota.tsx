import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck, RefreshCw, Search, AlertTriangle, TrendingUp, Wrench,
  Calendar, MapPin, ChevronUp, ChevronDown,
  CheckCircle2, AlertCircle, DollarSign, Hash, X,
  ChevronLeft, ChevronRight
} from "lucide-react";
import sgtLogo from "@/assets/sgt-logo.png";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { InsightsSection } from "@/components/shared/InsightsSection";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { UpdateButton } from "@/components/shared/UpdateButton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { type FrotaRow, type ManutencaoRow } from "@/lib/dwApi";
import { RAW } from "@/lib/theme";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")}M`
  : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}k`
  : fmtBRL(v);

const fmtNum = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const fmtData = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
};

// ─── Cores por Marca (alinhadas ao theme.ts) ─────────────────────────────────
const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

const MARCA_COLORS: Record<string, { color: string; rgb: string }> = {
  SCANIA:          { color: RAW.accent.cyan,    rgb: hexToRgb(RAW.accent.cyan) },
  VOLVO:           { color: RAW.accent.violet,  rgb: hexToRgb(RAW.accent.violet) },
  MERCEDES:        { color: "#94a3b8",          rgb: "148,163,184" },
  "MERCEDES-BENZ": { color: "#94a3b8",          rgb: "148,163,184" },
  VOLKSWAGEN:      { color: RAW.accent.emerald, rgb: hexToRgb(RAW.accent.emerald) },
  VW:              { color: RAW.accent.emerald, rgb: hexToRgb(RAW.accent.emerald) },
  FORD:            { color: RAW.accent.rose,    rgb: hexToRgb(RAW.accent.rose) },
  IVECO:           { color: RAW.accent.red,     rgb: hexToRgb(RAW.accent.red) },
  DAF:             { color: RAW.accent.amber,   rgb: hexToRgb(RAW.accent.amber) },
  MAN:             { color: "#fb923c",          rgb: "251,146,60" },
};

function getMarcaColor(marca: string | null) {
  if (!marca) return { color: "#94a3b8", rgb: "148,163,184" };
  const key = Object.keys(MARCA_COLORS).find(k => marca.toUpperCase().includes(k));
  return key ? MARCA_COLORS[key] : { color: "#94a3b8", rgb: "148,163,184" };
}

// ─── Paleta determinística usando tokens do theme ─────────────────────────────
const PALETTE = [
  RAW.accent.cyan,
  RAW.accent.violet,
  RAW.accent.amber,
  RAW.accent.emerald,
  RAW.accent.rose,
  RAW.accent.red,
];
const colorFor = (_key: string, i: number) => PALETTE[i % PALETTE.length];

// Cor por faixa de idade (verde → vermelho — semântica de envelhecimento)
const IDADE_COLORS: Record<string, string> = {
  "0-3":   RAW.accent.emerald,
  "4-7":   RAW.accent.cyan,
  "8-11":  RAW.accent.amber,
  "12-15": "#fb923c",
  "16+":   RAW.accent.red,
};

// ─── Cores por Situação ───────────────────────────────────────────────────────
const SITUACAO_STYLE: Record<string, { bg: string; text: string; ring: string }> = {
  ATIVO:    { bg: "bg-emerald-500/10", text: "text-emerald-300", ring: "ring-emerald-500/30" },
  BAIXADO:  { bg: "bg-rose-500/10",    text: "text-rose-300",    ring: "ring-rose-500/30" },
  INATIVO:  { bg: "bg-slate-500/10",   text: "text-slate-300",   ring: "ring-slate-500/30" },
};

// ─── Tipo agregado: veículo + métricas de manutenção ──────────────────────────
interface VeiculoEnriquecido extends FrotaRow {
  custoManut: number;
  qtdOrdens: number;
  ordensAbertas: number;
  ultimaManut: string | null;
  diasDesdeUltima: number | null;
  idade: number | null;
}

// ─── Tooltip dark customizado para recharts ───────────────────────────────────
const DarkTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-amber-400/30 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[12px] font-semibold text-white">
          {formatter ? formatter(p.value, p.name) : `${p.name}: ${p.value}`}
        </p>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  GRÁFICOS PREMIUM - PADRÃO INDEX
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Top 10 Barras Horizontais Premium ────────────────────────────────────────
const Top10Chart = ({ data }: { data: any[] }) => {
  const [hover, setHover] = useState<number | null>(null);
  const isEmpty = data.length === 0;
  
  const svgW = 560; const svgH = 320;
  const padL = 150; const padR = 70; const padTop = 20; const padBot = 20;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padTop - padBot;
  
  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-500/20 bg-slate-500/8">
            <svg className="h-5 w-5 text-slate-500/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
            </svg>
          </div>
          <p className="text-[11px] text-slate-500">Sem dados de manutenção</p>
        </div>
      </div>
    );
  }
  
  const maxVal = Math.max(...data.map(d => d.custo)) * 1.08;
  const barH = (chartH - (data.length - 1) * 7) / data.length;
  const fmt = (v: number) => v >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v/1e3).toFixed(0)}k` : `R$ ${v}`;
  const fmtFull = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  
  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-full w-full" onMouseLeave={() => setHover(null)}>
      <defs>
        {data.map((d, i) => (
          <linearGradient key={i} id={`bar-g-${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={d.fill} stopOpacity="0.92" />
            <stop offset="100%" stopColor={d.fill} stopOpacity="0.7" />
          </linearGradient>
        ))}
      </defs>
      
      {/* Grid */}
      {[0.33, 0.66, 1].map(frac => {
        const x = padL + chartW * frac;
        return (
          <g key={frac}>
            <line x1={x} y1={padTop} x2={x} y2={svgH - padBot} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={x} y={svgH - padBot + 12} fill="#64748b" fontSize="9" fontWeight="500" textAnchor="middle">
              {fmt(maxVal * frac)}
            </text>
          </g>
        );
      })}
      
      {/* Barras */}
      {data.map((d, i) => {
        const y = padTop + i * (barH + 7);
        const w = (d.custo / maxVal) * chartW;
        const isHover = hover === i;
        
        return (
          <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: "pointer" }}>
            <text x={padL - 8} y={y + barH / 2 + 3} fill="#cbd5e1" fontSize="10" fontWeight="500" textAnchor="end">
              {d.nome.length > 25 ? d.nome.substring(0, 24) + "..." : d.nome}
            </text>
            
            <rect x={padL} y={y} width={w} height={barH} rx="3" fill={`url(#bar-g-${i})`} opacity={isHover ? 1 : 0.88} />
            
            <text x={padL + w + 6} y={y + barH / 2 + 3} fill={d.fill} fontSize="10" fontWeight="600">
              {fmt(d.custo)}
            </text>
            
            {isHover && (
              <g>
                <rect x={padL + w / 2 - 75} y={y - 26} width="150" height="22" rx="4" fill="rgba(2,6,23,0.96)" stroke="rgba(251,191,36,0.4)" strokeWidth="1" />
                <text x={padL + w / 2} y={y - 11} fill="#fbbf24" fontSize="9" fontWeight="600" textAnchor="middle">
                  {fmtFull(d.custo)} • {d.ordens} ordens
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─── Donut Premium com Legenda ────────────────────────────────────────────────
const BrandDistributionChart = ({ data }: { data: any[] }) => {
  const [hover, setHover] = useState<number | null>(null);
  const isEmpty = data.length === 0;
  
  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-500/20 bg-slate-500/8">
            <svg className="h-5 w-5 text-slate-500/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 0 20" />
            </svg>
          </div>
          <p className="text-[11px] text-slate-500">Sem dados</p>
        </div>
      </div>
    );
  }
  
  const total = data.reduce((s, d) => s + d.qtd, 0);
  let acc = 0;
  const slices = data.map(d => {
    const pct = d.qtd / total;
    const start = acc;
    acc += pct;
    return { ...d, start, pct };
  });
  
  const cx = 130, cy = 130, r = 85, rInner = 52;
  
  const getPath = (start: number, pct: number) => {
    const a1 = start * 2 * Math.PI - Math.PI / 2;
    const a2 = (start + pct) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(a1); const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2); const y2 = cy + r * Math.sin(a2);
    const x3 = cx + rInner * Math.cos(a2); const y3 = cy + rInner * Math.sin(a2);
    const x4 = cx + rInner * Math.cos(a1); const y4 = cy + rInner * Math.sin(a1);
    const large = pct > 0.5 ? 1 : 0;
    return `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${x3},${y3} A${rInner},${rInner} 0 ${large},0 ${x4},${y4} Z`;
  };
  
  return (
    <div className="grid grid-cols-[260px_1fr] gap-3 h-full items-center">
      <svg viewBox="0 0 260 260" className="w-full" onMouseLeave={() => setHover(null)}>
        {slices.map((s, i) => {
          const isHover = hover === i;
          const midAngle = (s.start + s.pct / 2) * 2 * Math.PI - Math.PI / 2;
          const offset = isHover ? 5 : 0;
          const tx = offset * Math.cos(midAngle); const ty = offset * Math.sin(midAngle);
          
          return (
            <g key={i} transform={`translate(${tx},${ty})`} onMouseEnter={() => setHover(i)} style={{ cursor: "pointer" }}>
              <path d={getPath(s.start, s.pct)} fill={s.color} opacity={isHover ? 1 : 0.88}
                stroke="rgba(2,6,23,0.8)" strokeWidth="2" style={{ transition: "all 0.2s" }} />
              {isHover && (
                <g>
                  <text x={cx} y={cy - 3} fill="white" fontSize="18" fontWeight="700" textAnchor="middle">{s.qtd}</text>
                  <text x={cx} y={cy + 10} fill="#94a3b8" fontSize="9" fontWeight="500" textAnchor="middle">{s.nome}</text>
                </g>
              )}
            </g>
          );
        })}
        {hover === null && (
          <g>
            <text x={cx} y={cy - 3} fill="white" fontSize="20" fontWeight="800" textAnchor="middle">{total}</text>
            <text x={cx} y={cy + 10} fill="#64748b" fontSize="9" fontWeight="500" textAnchor="middle">VEÍCULOS</text>
          </g>
        )}
      </svg>
      
      <div className="flex flex-col gap-1 max-h-[260px] overflow-auto pr-2">
        {data.slice(0, 10).map((m, i) => (
          <div key={m.nome} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            className="flex items-center justify-between gap-2 px-1.5 py-0.5 rounded transition-colors hover:bg-white/5 cursor-pointer">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: m.color }} />
              <span className={`text-[10px] truncate ${hover === i ? "text-white font-semibold" : "text-slate-300"}`}>{m.nome}</span>
            </div>
            <span className={`text-[10px] font-semibold ${hover === i ? "text-white" : "text-slate-200"}`}>{m.qtd}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Linha Mensal Premium ─────────────────────────────────────────────────────
const MonthlyMaintenanceChart = ({ data }: { data: any[] }) => {
  const [hover, setHover] = useState<number | null>(null);
  const isEmpty = data.length === 0;
  
  const svgW = 520; const svgH = 230;
  const padL = 55; const padR = 20; const padTop = 20; const padBot = 30;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padTop - padBot;
  
  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-500/20 bg-slate-500/8">
            <svg className="h-5 w-5 text-slate-500/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <p className="text-[11px] text-slate-500">Sem dados</p>
        </div>
      </div>
    );
  }
  
  const maxVal = Math.max(...data.map(d => d.custo)) * 1.12;
  const fmt = (v: number) => v >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v/1e3).toFixed(0)}k` : `R$ ${v.toFixed(0)}`;
  const fmtFull = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  
  const toX = (i: number) => padL + (i / Math.max(data.length - 1, 1)) * chartW;
  const toY = (v: number) => padTop + chartH - (v / maxVal) * chartH;
  
  const buildPath = () => {
    if (data.length < 2) return "";
    let d = `M${toX(0)},${toY(data[0].custo)}`;
    for (let i = 1; i < data.length; i++) {
      const x0 = toX(i - 1), y0 = toY(data[i - 1].custo);
      const x1 = toX(i), y1 = toY(data[i].custo);
      const t = 0.28;
      d += ` C${(x0 + (x1 - x0) * t).toFixed(1)},${y0.toFixed(1)} ${(x1 - (x1 - x0) * t).toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
    }
    return d;
  };
  
  const buildArea = () => {
    if (data.length < 2) return "";
    const base = padTop + chartH;
    let d = `M${toX(0)},${toY(data[0].custo)}`;
    for (let i = 1; i < data.length; i++) {
      const x0 = toX(i - 1), y0 = toY(data[i - 1].custo);
      const x1 = toX(i), y1 = toY(data[i].custo);
      const t = 0.28;
      d += ` C${(x0 + (x1 - x0) * t).toFixed(1)},${y0.toFixed(1)} ${(x1 - (x1 - x0) * t).toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
    }
    d += ` L${toX(data.length - 1)},${base} L${toX(0)},${base} Z`;
    return d;
  };
  
  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-full w-full" onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="monthly-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {[0, 0.33, 0.66, 1].map(frac => {
        const y = padTop + chartH * (1 - frac);
        return (
          <g key={frac}>
            <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            {frac > 0 && <text x={padL - 6} y={y + 3} fill="#64748b" fontSize="9" fontWeight="500" textAnchor="end">{fmt(maxVal * frac)}</text>}
          </g>
        );
      })}
      
      <path d={buildArea()} fill="url(#monthly-area)" />
      <path d={buildPath()} stroke="#fbbf24" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      
      {data.map((d, i) => {
        const x = toX(i), y = toY(d.custo);
        const isHover = hover === i;
        return (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <circle cx={x} cy={y} r="12" fill="transparent" style={{ cursor: "pointer" }} />
            <text x={x} y={svgH - padBot + 18} fill="#94a3b8" fontSize="9" fontWeight="500" textAnchor="middle">{d.mes}</text>
            {isHover && (
              <>
                <circle cx={x} cy={y} r="4" fill="#fbbf24" stroke="rgba(2,6,23,0.8)" strokeWidth="2" />
                <circle cx={x} cy={y} r="8" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.3" />
                <rect x={x - 60} y={y - 36} width="120" height="26" rx="4" fill="rgba(2,6,23,0.96)" stroke="rgba(251,191,36,0.35)" strokeWidth="1" />
                <text x={x} y={y - 22} fill="#fbbf24" fontSize="8" fontWeight="500" textAnchor="middle">{d.mes}</text>
                <text x={x} y={y - 13} fill="white" fontSize="10" fontWeight="700" textAnchor="middle">{fmtFull(d.custo)}</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─── Barras Verticais Premium ─────────────────────────────────────────────────
const AgeCostChart = ({ data }: { data: any[] }) => {
  const [hover, setHover] = useState<number | null>(null);
  const isEmpty = data.length === 0;
  
  const svgW = 520; const svgH = 230;
  const padL = 55; const padR = 20; const padTop = 20; const padBot = 30;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padTop - padBot;
  
  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-500/20 bg-slate-500/8">
            <svg className="h-5 w-5 text-slate-500/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="7" /><rect x="14" y="5" width="3" height="12" />
            </svg>
          </div>
          <p className="text-[11px] text-slate-500">Sem dados</p>
        </div>
      </div>
    );
  }
  
  const maxVal = Math.max(...data.map(d => d.medio)) * 1.12;
  const barW = (chartW - (data.length - 1) * 14) / data.length;
  const fmt = (v: number) => v >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v/1e3).toFixed(0)}k` : `R$ ${v.toFixed(0)}`;
  const fmtFull = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  
  const colors: Record<string, string> = {
    "0-3": "#10b981", "4-7": "#06b6d4", "8-11": "#fbbf24", "12-15": "#fb923c", "16+": "#f43f5e",
  };
  
  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-full w-full" onMouseLeave={() => setHover(null)}>
      <defs>
        {data.map((d, i) => (
          <linearGradient key={i} id={`age-g-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors[d.faixa] || "#a78bfa"} stopOpacity="0.92" />
            <stop offset="100%" stopColor={colors[d.faixa] || "#a78bfa"} stopOpacity="0.7" />
          </linearGradient>
        ))}
      </defs>
      
      {[0, 0.33, 0.66, 1].map(frac => {
        const y = padTop + chartH * (1 - frac);
        return (
          <g key={frac}>
            <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            {frac > 0 && <text x={padL - 6} y={y + 3} fill="#64748b" fontSize="9" fontWeight="500" textAnchor="end">{fmt(maxVal * frac)}</text>}
          </g>
        );
      })}
      
      {data.map((d, i) => {
        const x = padL + i * (barW + 14);
        const h = (d.medio / maxVal) * chartH;
        const y = padTop + chartH - h;
        const isHover = hover === i;
        
        return (
          <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: "pointer" }}>
            <rect x={x} y={y} width={barW} height={h} rx="4" fill={`url(#age-g-${i})`}
              opacity={isHover ? 1 : 0.88} stroke={isHover ? colors[d.faixa] : "none"}
              strokeWidth="2" style={{ transition: "all 0.2s" }} />
            <text x={x + barW / 2} y={svgH - padBot + 18} fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="middle">{d.faixa}</text>
            {isHover && (
              <>
                <rect x={x + barW / 2 - 60} y={y - 36} width="120" height="26" rx="4" fill="rgba(2,6,23,0.96)" stroke={`${colors[d.faixa]}60`} strokeWidth="1" />
                <text x={x + barW / 2} y={y - 22} fill={colors[d.faixa]} fontSize="8" fontWeight="500" textAnchor="middle">{d.faixa} anos</text>
                <text x={x + barW / 2} y={y - 13} fill="white" fontSize="10" fontWeight="700" textAnchor="middle">{fmtFull(d.medio)}</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function Frota() {
  const navigate = useNavigate();
  const { dwFilter, setDwFilter, filiais, empresas, frota, manutencao, isFetchingDw, fetchFromDW } = useFinancialData();
  const filiaisFiltradas = filiais.filter(f => !dwFilter.empresa || f.empresa === dwFilter.empresa);

  // ── Estado local (UI apenas) ─────────────────────────────────────────────
  const [progress, setProgress]       = useState(0);
  const [loadingPhase, setLoadingPhase] = useState("");

  const [filtroSituacao, setFiltroSituacao] = useState<"TODOS" | "ATIVO" | "BAIXADO" | "INATIVO">("ATIVO");
  const [filtroMarca, setFiltroMarca] = useState<string>("Todas");
  const [filtroFrota, setFiltroFrota] = useState<string>("Todas");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<keyof VeiculoEnriquecido>("custoManut");
  const [sortAsc, setSortAsc] = useState(false);

  // Paginação tabela
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);

  // ── Carregamento ────────────────────────────────────────────────────────────
  const carregarDados = useCallback(async () => {
    setProgress(0);
    setLoadingPhase("Conectando ao DW...");
    let cur = 0;
    const phases = [
      { at: 25, label: "Buscando cadastro da frota..." },
      { at: 60, label: "Buscando ordens de manutenção..." },
      { at: 85, label: "Cruzando dados e gerando análises..." },
    ];
    const iv = window.setInterval(() => {
      const spd = cur < 30 ? 4 + Math.random() * 3 : cur < 70 ? 2 + Math.random() * 2 : 0.5 + Math.random() * 0.8;
      cur = Math.min(cur + spd, 95);
      const p = [...phases].reverse().find(ph => cur >= ph.at);
      if (p) setLoadingPhase(p.label);
      setProgress(Math.round(cur));
    }, 120);
    try {
      await fetchFromDW();
    } finally {
      clearInterval(iv);
      setProgress(100);
      setLoadingPhase("");
    }
  }, [fetchFromDW]);

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset página ao mudar filtros/busca
  useEffect(() => { setPage(1); }, [filtroSituacao, filtroMarca, filtroFrota, search]);

  // ── Index manutenção por veículo ────────────────────────────────────────────
  const manutencaoPorVeiculo = useMemo(() => {
    const map = new Map<string, { custo: number; qtd: number; abertas: number; ultima: string | null }>();
    for (const m of manutencao) {
      const key = String(m.veiculo ?? "");
      if (!key) continue;
      const cur = map.get(key) ?? { custo: 0, qtd: 0, abertas: 0, ultima: null };
      cur.custo += (m.custo ?? 0) * (m.qtd ?? 0);
      cur.qtd += 1;
      if (m.situacao === "ANDAMENTO" || m.situacao === "INCONSISTENTE") cur.abertas += 1;
      if (m.dataordem && (!cur.ultima || m.dataordem > cur.ultima)) cur.ultima = m.dataordem;
      map.set(key, cur);
    }
    return map;
  }, [manutencao]);

  // ── Frota enriquecida ──────────────────────────────────────────────────────
  const frotaEnriquecida: VeiculoEnriquecido[] = useMemo(() => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    return frota.map(v => {
      const m = manutencaoPorVeiculo.get(String(v.codvei));
      let diasDesdeUltima: number | null = null;
      if (m?.ultima) {
        const dUlt = new Date(m.ultima);
        if (!isNaN(dUlt.getTime())) {
          diasDesdeUltima = Math.floor((hoje.getTime() - dUlt.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
      const idade = v.anofab ? anoAtual - v.anofab : null;
      return {
        ...v,
        custoManut: m?.custo ?? 0,
        qtdOrdens: m?.qtd ?? 0,
        ordensAbertas: m?.abertas ?? 0,
        ultimaManut: m?.ultima ?? null,
        diasDesdeUltima,
        idade,
      };
    });
  }, [frota, manutencaoPorVeiculo]);

  // ── Listas de filtros ──────────────────────────────────────────────────────
  const marcas = useMemo(() => {
    const set = new Set<string>();
    frota.forEach(v => v.marca && set.add(v.marca));
    return ["Todas", ...Array.from(set).sort()];
  }, [frota]);

  const frotasGrupos = useMemo(() => {
    const set = new Set<string>();
    frota.forEach(v => v.frota && set.add(v.frota));
    return ["Todas", ...Array.from(set).sort()];
  }, [frota]);

  // ── Frota filtrada ─────────────────────────────────────────────────────────
  const frotaFiltrada = useMemo(() => {
    return frotaEnriquecida.filter(v => {
      const matchSit = filtroSituacao === "TODOS" || v.situacao === filtroSituacao;
      const matchMarca = filtroMarca === "Todas" || v.marca === filtroMarca;
      const matchFrota = filtroFrota === "Todas" || v.frota === filtroFrota;
      const q = search.toLowerCase();
      const matchSearch = !q || [
        v.codvei, v.chassi, v.frota, v.marca, v.modelo, v.municipio, v.classificacao
      ].some(x => String(x ?? "").toLowerCase().includes(q));
      return matchSit && matchMarca && matchFrota && matchSearch;
    });
  }, [frotaEnriquecida, filtroSituacao, filtroMarca, filtroFrota, search]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const ativos = frotaFiltrada.filter(v => v.situacao === "ATIVO");
    const idades = ativos.map(v => v.idade).filter((x): x is number => x !== null);
    const idadeMedia = idades.length > 0 ? idades.reduce((s, x) => s + x, 0) / idades.length : 0;
    const custoTotal = frotaFiltrada.reduce((s, v) => s + v.custoManut, 0);
    const custoMedio = ativos.length > 0 ? custoTotal / ativos.length : 0;
    const totalOrdens = frotaFiltrada.reduce((s, v) => s + v.qtdOrdens, 0);
    const ordensAbertas = frotaFiltrada.reduce((s, v) => s + v.ordensAbertas, 0);
    return {
      total: frotaFiltrada.length,
      ativos: ativos.length,
      idadeMedia,
      custoTotal,
      custoMedio,
      totalOrdens,
      ordensAbertas,
    };
  }, [frotaFiltrada]);

  // ── Top 10 custo ───────────────────────────────────────────────────────────
  const top10Custo = useMemo(() => {
    return [...frotaEnriquecida]
      .filter(v => v.custoManut > 0)
      .sort((a, b) => b.custoManut - a.custoManut)
      .slice(0, 10)
      .map(v => ({
        nome: `${v.codvei} • ${(v.modelo ?? "").slice(0, 18)}`,
        custo: v.custoManut,
        ordens: v.qtdOrdens,
        marca: v.marca ?? "—",
        fill: getMarcaColor(v.marca).color,
      }));
  }, [frotaEnriquecida]);

  // ── Distribuição por marca ─────────────────────────────────────────────────
  const distMarca = useMemo(() => {
    const map = new Map<string, number>();
    frotaFiltrada.forEach(v => {
      const k = v.marca ?? "Sem marca";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nome, qtd]) => ({ nome, qtd, color: getMarcaColor(nome).color }))
      .sort((a, b) => b.qtd - a.qtd);
  }, [frotaFiltrada]);

  // ── Distribuição por classificação ─────────────────────────────────────────
  const distClassif = useMemo(() => {
    const map = new Map<string, number>();
    frotaFiltrada.forEach(v => {
      const k = v.classificacao ?? "Sem classificação";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 8)
      .map((d, i) => ({ ...d, color: colorFor(d.nome, i) }));
  }, [frotaFiltrada]);

  // ── Custo por mês ──────────────────────────────────────────────────────────
  const custoPorMes = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of manutencao) {
      if (!m.dataordem || m.situacao === "CANCELADO") continue;
      const d = new Date(m.dataordem);
      if (isNaN(d.getTime())) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const v = (m.custo ?? 0) * (m.qtd ?? 0);
      map.set(k, (map.get(k) ?? 0) + v);
    }
    return Array.from(map.entries())
      .map(([mes, custo]) => ({ mes: mes.slice(2).replace("-", "/"), custo }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12);
  }, [manutencao]);

  // ── Custo médio por idade ──────────────────────────────────────────────────
  const custoPorIdade = useMemo(() => {
    const faixas: Record<string, { soma: number; qtd: number }> = {
      "0-3":   { soma: 0, qtd: 0 },
      "4-7":   { soma: 0, qtd: 0 },
      "8-11":  { soma: 0, qtd: 0 },
      "12-15": { soma: 0, qtd: 0 },
      "16+":   { soma: 0, qtd: 0 },
    };
    frotaEnriquecida.forEach(v => {
      if (v.idade === null || v.situacao !== "ATIVO") return;
      const f = v.idade <= 3 ? "0-3"
        : v.idade <= 7 ? "4-7"
        : v.idade <= 11 ? "8-11"
        : v.idade <= 15 ? "12-15"
        : "16+";
      faixas[f].soma += v.custoManut;
      faixas[f].qtd += 1;
    });
    return Object.entries(faixas).map(([faixa, { soma, qtd }]) => ({
      faixa, medio: qtd > 0 ? soma / qtd : 0, qtd,
    }));
  }, [frotaEnriquecida]);

  // ── Sort tabela ────────────────────────────────────────────────────────────
  const handleSort = (col: keyof VeiculoEnriquecido) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const tabelaOrdenada = useMemo(() => {
    return [...frotaFiltrada].sort((a, b) => {
      const va = a[sortCol]; const vb = b[sortCol];
      if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
      return sortAsc
        ? String(va ?? "").localeCompare(String(vb ?? ""))
        : String(vb ?? "").localeCompare(String(va ?? ""));
    });
  }, [frotaFiltrada, sortCol, sortAsc]);

  const COLS = [
    { key: "codvei",       label: "Código",        align: "left",   numeric: false, responsive: "" },
    { key: "frota",        label: "Frota",         align: "left",   numeric: false, responsive: "" },
    { key: "marca",        label: "Marca",         align: "left",   numeric: false, responsive: "" },
    { key: "modelo",       label: "Modelo",        align: "left",   numeric: false, responsive: "hidden md:table-cell" },
    { key: "anofab",       label: "Ano",           align: "center", numeric: true,  responsive: "hidden sm:table-cell" },
    { key: "idade",        label: "Idade",         align: "center", numeric: true,  responsive: "" },
    { key: "municipio",    label: "Município",     align: "left",   numeric: false, responsive: "hidden lg:table-cell" },
    { key: "situacao",     label: "Situação",      align: "center", numeric: false, responsive: "" },
    { key: "qtdOrdens",    label: "Ordens",        align: "center", numeric: true,  responsive: "hidden sm:table-cell" },
    { key: "custoManut",   label: "Custo Manut.",  align: "right",  numeric: true,  responsive: "" },
    { key: "ultimaManut",  label: "Última Manut.", align: "center", numeric: false, responsive: "hidden sm:table-cell" },
  ] as const;

  // ═════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="flex flex-col transition-all duration-300 min-h-[100dvh] overflow-auto px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* Gradientes de fundo no padrão SGT */}
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(160,100,4,0.22),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_50%_40%_at_100%_105%,rgba(6,182,212,0.07),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:opacity-100" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.68) 100%)" }} />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-hidden"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          {/* Barra de progresso */}
          <div className="h-[3px] w-full shrink-0 overflow-hidden rounded-t-[24px] bg-transparent">
            <div className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400 shadow-[0_0_12px_rgba(251,191,36,0.5)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, opacity: isFetchingDw ? 1 : 0 }} />
          </div>

          <div className="relative flex flex-col flex-1 min-h-0 gap-3 p-2 sm:p-3 lg:p-4 w-full">

            {/* ════════ NAVBAR ════════ */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              <div className="flex items-center gap-3">
                <img src={sgtLogo} alt="SGT" className="block h-8 w-auto shrink-0 object-contain" />
                <div className="h-6 w-px" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
                  <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">Gestão de Frota</span>
                </div>
              </div>

              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Tempo real</span>
              </div>

              <div className="h-6 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

              {/* Filtros padronizados (idênticos a Faturamento) */}
              <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
                <DatePickerInput value={dwFilter.dataInicio} onChange={v => setDwFilter("dataInicio", v)} placeholder="Data início" />
                <DatePickerInput value={dwFilter.dataFim}    onChange={v => setDwFilter("dataFim", v)}    placeholder="Data fim" />
                <div className="h-4 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />
                <Select value={dwFilter.empresa ?? "__all__"} onValueChange={v => setDwFilter("empresa", v === "__all__" ? null : v)}>
                  <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[130px] rounded-lg text-[12px] transition-all"><SelectValue placeholder="Empresa" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Todas</SelectItem>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={dwFilter.filial ?? "__all__"} onValueChange={v => setDwFilter("filial", v === "__all__" ? null : v)}>
                  <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[140px] rounded-lg text-[12px] transition-all"><SelectValue placeholder="Filial" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">Todas</SelectItem>{filiaisFiltradas.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                </Select>
                <UpdateButton onClick={carregarDados} isFetching={isFetchingDw} loadingPhase={loadingPhase} progress={progress} />
              </div>

              <HomeButton />
            </div>

            {/* Mobile nav */}
            <div className="flex sm:hidden items-center justify-between gap-2 py-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={sgtLogo} alt="SGT" className="block h-7 w-auto shrink-0 object-contain" />
                <div className="h-5 w-px shrink-0" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">Workspace</span>
                  <span className="text-[15px] font-black tracking-[-0.03em] dark:text-white text-slate-800 truncate">Gestão de Frota</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <UpdateButton onClick={carregarDados} isFetching={isFetchingDw} loadingPhase={loadingPhase} progress={progress} compact />
                <HomeButton />
                <MobileNav />
              </div>
            </div>

            <div className="h-px shrink-0" style={{ background: "var(--sgt-divider)" }} />



            {/* ════════ LOADING PHASE ════════ */}
            {isFetchingDw && loadingPhase && (
              <div className="flex items-center gap-2 text-[11px] text-amber-300/80">
                <div className="h-1 w-32 overflow-hidden rounded-full bg-amber-400/10">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span>{loadingPhase}</span>
              </div>
            )}

            {/* ════════ KPI ROW (4 cards) ════════ */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 shrink-0">
              {[
                {
                  label: "Frota Ativa", value: isFetchingDw ? "—" : fmtNum(kpis.ativos),
                  sub: `${fmtNum(kpis.total)} no recorte`,
                  icon: Truck, color: "cyan", rgb: "6,182,212",
                  stripe: "from-cyan-400/60 to-cyan-700/20",
                  border: "border-cyan-400/[0.12]",
                  glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]",
                  iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]",
                  iconTxt: "text-cyan-300",
                  sub2: "text-cyan-500/80",
                },
                {
                  label: "Idade Média", value: isFetchingDw ? "—" : `${kpis.idadeMedia.toFixed(1)} anos`,
                  sub: "veículos ativos",
                  icon: Calendar, color: "violet", rgb: "139,92,246",
                  stripe: "from-violet-400/60 to-violet-700/20",
                  border: "border-violet-400/[0.12]",
                  glow: "hover:shadow-[0_4px_40px_rgba(139,92,246,0.18)]",
                  iconBg: "bg-violet-400/[0.08] border border-violet-400/[0.15]",
                  iconTxt: "text-violet-300",
                  sub2: "text-violet-500/80",
                },
                {
                  label: "Custo de Manutenção", value: isFetchingDw ? "—" : fmtK(kpis.custoTotal),
                  sub: `${fmtNum(kpis.totalOrdens)} ordens`,
                  icon: Wrench, color: "rose", rgb: "244,63,94",
                  stripe: "from-rose-400/60 to-rose-700/20",
                  border: "border-rose-400/[0.12]",
                  glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]",
                  iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]",
                  iconTxt: "text-rose-300",
                  sub2: "text-rose-500/80",
                },
                {
                  label: "Custo Médio / Veículo", value: isFetchingDw ? "—" : fmtK(kpis.custoMedio),
                  sub: `${fmtNum(kpis.ordensAbertas)} ordens abertas`,
                  icon: DollarSign, color: "amber", rgb: "245,158,11",
                  stripe: "from-amber-400/60 to-amber-700/20",
                  border: "border-amber-400/[0.12]",
                  glow: "hover:shadow-[0_4px_40px_rgba(245,158,11,0.18)]",
                  iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]",
                  iconTxt: "text-amber-300",
                  sub2: "text-amber-500/80",
                },
              ].map((k, i) => (
                <AnimatedCard key={k.label} delay={i * 60}>
                  <div className={`group relative flex min-h-[100px] flex-col overflow-hidden rounded-[14px] sm:rounded-[16px] border ${k.border} bg-[var(--sgt-bg-card)] transition-all duration-300 hover:-translate-y-[3px] ${k.glow} shadow-[0_2px_20px_rgba(0,0,0,0.4)] p-3 xl:p-4`}>
                    <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${k.stripe}`} />
                    <div className="pointer-events-none absolute bottom-0 right-0 h-28 w-28"
                      style={{ background: `radial-gradient(circle at 100% 100%, rgba(${k.rgb},0.10), transparent 65%)` }} />
                    <div className="relative flex h-full flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-600 leading-tight">{k.label}</p>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${k.iconBg} ${k.iconTxt} transition-transform duration-300 group-hover:scale-110`}>
                          <k.icon className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <p className="mt-auto pt-2 font-black leading-none tracking-[-0.05em] text-white text-[clamp(1rem,2vw,1.6rem)] overflow-hidden text-ellipsis whitespace-nowrap">{k.value}</p>
                      <p className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${k.sub2}`}>{k.sub}</p>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>

            {/* ════════ GRÁFICOS - LINHA 1 ════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[340px]">
              {/* Top 10 custo */}
              <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] h-full">
                <div className="flex h-full flex-col p-3">
                  <div className="mb-1.5 flex items-center shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Top 10 · Custo de Manutenção
                    </span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <Top10Chart data={top10Custo} />
                  </div>
                </div>
              </div>

              {/* Distribuição por marca */}
              <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] h-full">
                <div className="flex h-full flex-col p-3">
                  <div className="mb-1.5 flex items-center shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Distribuição por Marca
                    </span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <BrandDistributionChart data={distMarca} />
                  </div>
                </div>
              </div>
            </div>

            {/* ════════ GRÁFICOS - LINHA 2 ════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[250px]">
              {/* Custo por mês */}
              <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] h-full">
                <div className="flex h-full flex-col p-3">
                  <div className="mb-1.5 flex items-center shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Custo de Manutenção · Mensal
                    </span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <MonthlyMaintenanceChart data={custoPorMes} />
                  </div>
                </div>
              </div>

              {/* Custo médio por idade */}
              <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] h-full">
                <div className="flex h-full flex-col p-3">
                  <div className="mb-1.5 flex items-center shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Custo Médio · Faixa de Idade
                    </span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <AgeCostChart data={custoPorIdade} />
                  </div>
                </div>
              </div>
            </div>

            {/* ════════ SESSÃO 2 — INSIGHTS POR IA ════════ */}
            <SectionDivider
              numero={2}
              titulo="Insights por IA"
              subtitulo="Análise inteligente da frota — recomendações acionáveis geradas por IA"
              color="violet"
            />
            <InsightsSection
              setor="frota"
              dados={{
                totalVeiculos: kpis.total,
                veiculosAtivos: kpis.ativos,
                idadeMediaAnos: parseFloat(kpis.idadeMedia.toFixed(1)),
                custoTotalManutencao: Math.round(kpis.custoTotal),
                custoMedioPorVeiculo: Math.round(kpis.custoMedio),
                totalOrdens: kpis.totalOrdens,
                ordensAbertas: kpis.ordensAbertas,
                top5MaioresGastos: top10Custo.slice(0, 5).map(v => ({ nome: v.nome, custo: Math.round(v.custo), ordens: v.ordens })),
              }}
              periodo={`${dwFilter.dataInicio} a ${dwFilter.dataFim}`}
            />

            {/* ════════ SESSÃO 3 — DETALHAMENTO ════════ */}
            <SectionDivider
              numero={3}
              titulo="Detalhamento"
              subtitulo="Veículos e ordens que compõem os dados do período"
              color="blue"
            />

            {/* ════════ FILTROS DA TABELA ════════ */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por código, chassi, modelo, município..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-[12px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/40"
                />
              </div>

              <Select value={filtroSituacao} onValueChange={(v) => setFiltroSituacao(v as any)}>
                <SelectTrigger className="h-9 w-[120px] text-[11px] border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVO">Ativos</SelectItem>
                  <SelectItem value="BAIXADO">Baixados</SelectItem>
                  <SelectItem value="INATIVO">Inativos</SelectItem>
                  <SelectItem value="TODOS">Todos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroMarca} onValueChange={setFiltroMarca}>
                <SelectTrigger className="h-9 w-[140px] text-[11px] border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]">
                  <SelectValue placeholder="Marca" />
                </SelectTrigger>
                <SelectContent>
                  {marcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filtroFrota} onValueChange={setFiltroFrota}>
                <SelectTrigger className="h-9 w-[160px] text-[11px] border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]">
                  <SelectValue placeholder="Frota" />
                </SelectTrigger>
                <SelectContent>
                  {frotasGrupos.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>

              <span className="text-[11px] text-slate-500">
                {fmtNum(tabelaOrdenada.length)} de {fmtNum(frotaEnriquecida.length)} veículos
              </span>
            </div>

            {/* ════════ TABELA ════════ */}
            <div className="flex-1 min-h-[400px] overflow-auto rounded-lg border border-[var(--sgt-border-subtle)]">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 z-10" style={{ background: "var(--sgt-bg-base)" }}>
                  <tr>
                    {COLS.map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key as keyof VeiculoEnriquecido)}
                        className={`px-3 py-2.5 font-semibold text-slate-400 cursor-pointer select-none hover:text-amber-300 transition ${
                          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                        } ${col.responsive}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortCol === col.key && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isFetchingDw ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-t border-[var(--sgt-border-subtle)]">
                        {COLS.map((c, j) => (
                          <td key={j} className={`px-3 py-2.5 ${c.responsive}`}><div className="h-3 w-full animate-pulse rounded bg-[var(--sgt-border-subtle)]" /></td>
                        ))}
                      </tr>
                    ))
                  ) : tabelaOrdenada.length === 0 ? (
                    <tr>
                      <td colSpan={COLS.length} className="px-4 py-12 text-center text-slate-500">
                        <Truck className="mx-auto h-8 w-8 mb-2 opacity-40" />
                        <p>Nenhum veículo encontrado com os filtros aplicados</p>
                      </td>
                    </tr>
                  ) : (
                    tabelaOrdenada.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((v) => {
                      const sit = SITUACAO_STYLE[v.situacao] ?? SITUACAO_STYLE.INATIVO;
                      const marcaCor = getMarcaColor(v.marca);
                      return (
                        <tr key={v.codvei} className="border-t border-[var(--sgt-border-subtle)] hover:bg-amber-400/[0.03] transition-colors">
                          <td className="px-3 py-2 font-mono font-semibold text-white">{v.codvei}</td>
                          <td className="px-3 py-2 text-slate-300">{v.frota ?? "—"}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: marcaCor.color }} />
                              <span className="text-slate-200">{v.marca ?? "—"}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-300 max-w-[200px] truncate hidden md:table-cell" title={v.modelo ?? ""}>{v.modelo ?? "—"}</td>
                          <td className="px-3 py-2 text-center text-slate-400 hidden sm:table-cell">{v.anofab ?? "—"}</td>
                          <td className="px-3 py-2 text-center">
                            {v.idade !== null
                              ? <span className={v.idade > 15 ? "text-rose-300 font-semibold" : "text-slate-300"}>{v.idade}</span>
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-400 max-w-[140px] truncate hidden lg:table-cell" title={v.municipio ?? ""}>{v.municipio ?? "—"}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ${sit.bg} ${sit.text} ${sit.ring}`}>
                              {v.situacao}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-slate-300 hidden sm:table-cell">
                            {v.qtdOrdens > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                {fmtNum(v.qtdOrdens)}
                                {v.ordensAbertas > 0 && (
                                  <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-200 font-bold">{v.ordensAbertas} ab.</span>
                                )}
                              </span>
                            ) : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-rose-200">
                            {v.custoManut > 0 ? fmtBRL(v.custoManut) : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-400 text-[11px] hidden sm:table-cell">{fmtData(v.ultimaManut)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {!isFetchingDw && tabelaOrdenada.length > 0 && (() => {
                const totalPages = Math.max(1, Math.ceil(tabelaOrdenada.length / PAGE_SIZE));
                const curPage = Math.min(page, totalPages);
                const from = (curPage - 1) * PAGE_SIZE + 1;
                const to = Math.min(curPage * PAGE_SIZE, tabelaOrdenada.length);
                return (
                  <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-base)] text-[11px]">
                    <span className="text-slate-500">
                      Mostrando <span className="text-slate-300 font-semibold">{fmtNum(from)}–{fmtNum(to)}</span> de <span className="text-slate-300 font-semibold">{fmtNum(tabelaOrdenada.length)}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={curPage <= 1}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--sgt-border-subtle)] text-slate-300 hover:bg-amber-400/10 hover:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-2 text-slate-400 tabular-nums">
                        Página <span className="text-slate-200 font-semibold">{curPage}</span> / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={curPage >= totalPages}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--sgt-border-subtle)] text-slate-300 hover:bg-amber-400/10 hover:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
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
