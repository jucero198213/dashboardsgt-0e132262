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
  emerald: "border-emerald-500/20 text-emerald-300 bg-emerald-500/10",
  amber: "border-amber-500/20 text-amber-300 bg-amber-500/10",
  cyan: "border-cyan-500/20 text-cyan-300 bg-cyan-500/10",
  violet: "border-violet-500/20 text-violet-300 bg-violet-500/10",
  rose: "border-rose-500/20 text-rose-300 bg-rose-500/10",
};

export function KpiCard({ label, value, rawValue, subtitle, icon: Icon, tone }: KpiCardProps) {
  const isCurrency = value.startsWith("R$");
  const isPercent  = value.endsWith("%");

  return (
    <div className="group relative flex h-full min-h-[130px] flex-col overflow-hidden rounded-[16px] sm:rounded-[20px] md:rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)] p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
      {/* Label + ícone */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
          {label}
        </p>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-105 ${toneMap[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {/* Valor — alinhado ao meio */}
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-xl font-bold leading-none tracking-tight text-white sm:text-2xl md:text-[30px]">
          {rawValue !== undefined && isCurrency ? (
            <CountUp value={rawValue} format="currency" />
          ) : rawValue !== undefined && isPercent ? (
            <CountUp value={rawValue} format="percent" />
          ) : (
            value
          )}
        </p>
        {subtitle && (
          <p className="mt-2 text-[12px] text-slate-400 leading-snug">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
