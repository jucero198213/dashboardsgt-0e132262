import { AlertTriangle, TrendingUp, TrendingDown, Info } from "lucide-react";

interface Insight {
  type: "alert" | "positive" | "negative" | "info";
  text: string;
}

interface InsightsBlockProps {
  insights: Insight[];
}

const iconMap = {
  alert: AlertTriangle,
  positive: TrendingUp,
  negative: TrendingDown,
  info: Info,
};

const styleMap = {
  alert: "border-amber-500/20 bg-amber-500/5 text-amber-300",
  positive: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
  negative: "border-rose-500/20 bg-rose-500/5 text-rose-300",
  info: "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
};

export function InsightsBlock({ insights }: InsightsBlockProps) {
  if (!insights.length) return null;

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)] p-6">
      <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Insights Automáticos</p>
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const Icon = iconMap[insight.type];
          return (
            <div key={i} className={`flex items-start gap-3 rounded-2xl border p-4 ${styleMap[insight.type]}`}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm leading-relaxed">{insight.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
