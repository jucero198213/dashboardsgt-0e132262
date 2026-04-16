import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

type TooltipPayloadItem = {
  dataKey?: string | number;
  color?: string;
  name?: string;
  value?: number;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
};

interface ChartDataPoint {
  name: string;
  real: number;
  esperado: number;
}

interface IndicatorChartProps {
  data: ChartDataPoint[];
  title?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 shadow-xl">
      <p className="mb-2 text-xs font-semibold text-slate-400">{label}</p>
      {payload.map((p, idx) => (
        <p key={p.dataKey ?? idx} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: R$ {(typeof p.value === "number" ? p.value : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
};

export function IndicatorChart({ data, title = "Evolução Real vs Esperado" }: IndicatorChartProps) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)] p-6">
      <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{title}</p>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
            <Bar dataKey="real" name="Real" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            <Bar dataKey="esperado" name="Esperado" fill="rgba(148,163,184,0.3)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
