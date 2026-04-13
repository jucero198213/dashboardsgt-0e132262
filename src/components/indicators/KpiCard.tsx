import { LucideIcon } from "lucide-react";
import { CountUp } from "@/components/shared/CountUp";

interface KpiCardProps {
  label: string;
  value: string;
  rawValue?: number;
  subtitle?: string;
  icon: LucideIcon;
  tone: "emerald" | "amber" | "cyan" | "violet" | "rose";
}

const toneMap = {
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
};

export function KpiCard({ label, value, rawValue, subtitle, icon: Icon, tone }: KpiCardProps) {
  const t = toneMap[tone];
  const isCurrency = value.startsWith("R$");
  const isPercent  = value.endsWith("%");

  return (
    <div className={`group relative flex min-h-[130px] sm:min-h-[150px] flex-col overflow-hidden rounded-[16px] sm:rounded-[20px] border ${t.border} [background:var(--sgt-bg-card)] shadow-[var(--sgt-section-shadow)] transition-all duration-300 hover:-translate-y-[3px] ${t.glow}`}>

      {/* Stripe de cor no topo */}
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${t.stripe}`} />

      {/* Spot glow no canto inferior direito */}
      <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36"
        style={{ background: `radial-gradient(circle at 100% 100%, ${t.spot}, transparent 65%)` }} />

      <div className="relative flex h-full flex-col p-3 sm:p-5">
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
        <p className="mt-auto pt-3 sm:pt-4 text-[20px] sm:text-[28px] font-black leading-none tracking-[-0.05em] [color:var(--sgt-text-primary)] md:text-[30px]">
          {rawValue !== undefined && isCurrency ? (
            <CountUp value={rawValue} format="currency" />
          ) : rawValue !== undefined && isPercent ? (
            <CountUp value={rawValue} format="percent" />
          ) : (
            value
          )}
        </p>

        {/* Subtítulo */}
        {subtitle && (
          <p className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.15em] ${t.sub}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
