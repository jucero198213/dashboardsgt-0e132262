import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
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

export function KpiCard({ label, value, subtitle, icon: Icon, tone }: KpiCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
          {label}
        </p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-105 ${toneMap[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-[32px] font-bold leading-none tracking-tight text-white">{value}</p>
      {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}
