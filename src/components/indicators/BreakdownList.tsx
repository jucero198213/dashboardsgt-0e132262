import { formatCurrency } from "@/data/mockData";

interface BreakdownItem {
  name: string;
  value: number;
  percentage: number;
}

interface BreakdownListProps {
  items: BreakdownItem[];
  title?: string;
}

export function BreakdownList({ items, title = "Composição" }: BreakdownListProps) {
  const maxPct = Math.max(...items.map((i) => i.percentage), 1);

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)] p-6">
      <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{title}</p>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.name} className="group">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-300 transition-colors group-hover:text-white">{item.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white">{formatCurrency(item.value)}</span>
                <span className="text-xs font-semibold text-slate-400">{item.percentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                style={{ width: `${(item.percentage / maxPct) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
