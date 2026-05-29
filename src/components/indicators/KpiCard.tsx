import React from "react";
import { CountUp } from "@/components/shared/CountUp";

export type KpiTone = "emerald" | "amber" | "cyan" | "violet" | "rose" | "orange" | "blue";

interface KpiCardProps {
  label: string;
  value: string;
  rawValue?: number;
  subtitle?: string;
  icon: React.ElementType;
  tone: KpiTone;
  loading?: boolean;
  onClick?: () => void;
}

const toneMap: Record<KpiTone, {
  stripe: string; border: string; glow: string; iconBg: string; sub: string; spot: string;
}> = {
  emerald: {
    stripe:  "from-emerald-400/60 to-emerald-700/20",
    border:  "border-emerald-400/[0.12]",
    glow:    "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]",
    iconBg:  "bg-emerald-400/[0.08] border border-emerald-400/[0.15] text-emerald-300",
    sub:     "text-emerald-500/80",
    spot:    "rgba(16,185,129,0.10)",
  },
  amber: {
    stripe:  "from-amber-400/60 to-amber-700/20",
    border:  "border-amber-400/[0.12]",
    glow:    "hover:shadow-[0_4px_40px_rgba(245,158,11,0.18)]",
    iconBg:  "bg-amber-400/[0.08] border border-amber-400/[0.15] text-amber-300",
    sub:     "text-amber-500/80",
    spot:    "rgba(245,158,11,0.10)",
  },
  cyan: {
    stripe:  "from-cyan-400/60 to-cyan-700/20",
    border:  "border-cyan-400/[0.12]",
    glow:    "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]",
    iconBg:  "bg-cyan-400/[0.08] border border-cyan-400/[0.15] text-cyan-300",
    sub:     "text-cyan-500/80",
    spot:    "rgba(6,182,212,0.10)",
  },
  violet: {
    stripe:  "from-violet-400/60 to-violet-700/20",
    border:  "border-violet-400/[0.12]",
    glow:    "hover:shadow-[0_4px_40px_rgba(139,92,246,0.18)]",
    iconBg:  "bg-violet-400/[0.08] border border-violet-400/[0.15] text-violet-300",
    sub:     "text-violet-500/80",
    spot:    "rgba(139,92,246,0.10)",
  },
  rose: {
    stripe:  "from-rose-400/60 to-rose-700/20",
    border:  "border-rose-400/[0.12]",
    glow:    "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]",
    iconBg:  "bg-rose-400/[0.08] border border-rose-400/[0.15] text-rose-300",
    sub:     "text-rose-500/80",
    spot:    "rgba(244,63,94,0.10)",
  },
  orange: {
    stripe:  "from-orange-400/60 to-orange-700/20",
    border:  "border-orange-400/[0.12]",
    glow:    "hover:shadow-[0_4px_40px_rgba(249,115,22,0.18)]",
    iconBg:  "bg-orange-400/[0.08] border border-orange-400/[0.15] text-orange-300",
    sub:     "text-orange-500/80",
    spot:    "rgba(249,115,22,0.10)",
  },
  blue: {
    stripe:  "from-blue-400/60 to-blue-700/20",
    border:  "border-blue-400/[0.12]",
    glow:    "hover:shadow-[0_4px_40px_rgba(59,130,246,0.18)]",
    iconBg:  "bg-blue-400/[0.08] border border-blue-400/[0.15] text-blue-300",
    sub:     "text-blue-500/80",
    spot:    "rgba(59,130,246,0.10)",
  },
};

export function KpiCard({
  label, value, rawValue, subtitle, icon: Icon, tone, loading, onClick,
}: KpiCardProps) {
  const t = toneMap[tone];
  const isCurrency = value.startsWith("R$");
  const isPercent  = value.endsWith("%");

  return (
    <div
      onClick={onClick}
      className={`group relative flex h-full min-h-[120px] flex-col overflow-hidden rounded-[14px] sm:rounded-[16px] border ${t.border} [background:var(--sgt-bg-card)] shadow-[var(--sgt-section-shadow)] transition-all duration-300 hover:-translate-y-[3px] ${t.glow}${onClick ? " cursor-pointer" : ""}`}
    >
      {/* LEFT stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${t.stripe}`} />

      {/* Spot glow */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-36 w-36"
        style={{ background: `radial-gradient(circle at 100% 100%, ${t.spot}, transparent 65%)` }}
      />

      <div className="relative flex h-full flex-col p-3 sm:p-4">
        {/* Label + ícone */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.35em] dark:text-slate-600 text-slate-500 leading-tight">
            {label}
          </p>
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${t.iconBg}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Valor — protagonista */}
        <p className={`mt-auto pt-2 text-[clamp(1.1rem,2vw,1.5rem)] font-black leading-[1.15] tracking-[-0.05em] [color:var(--sgt-text-primary)]${loading ? " animate-pulse" : ""}`}>
          {rawValue !== undefined && isCurrency ? (
            <CountUp value={rawValue} format="brl" />
          ) : rawValue !== undefined && isPercent ? (
            <CountUp value={rawValue} format="pct" />
          ) : (
            value
          )}
        </p>

        {/* Subtítulo */}
        {subtitle && (
          <p className={`mt-1.5 text-[10px] font-medium ${t.sub}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
