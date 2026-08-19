import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";
import type { DailyCost } from "@/lib/manutencaoUtils";

interface Props {
  data: DailyCost[];
  totalCusto: number;
  loading?: boolean;
}

const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")}M`
  : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(1).replace(".", ",")}k`
  : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border px-2.5 py-1.5 shadow-xl text-[11px]"
      style={{ background: "var(--sgt-bg-overlay)", borderColor: "rgba(123,110,245,0.3)" }}>
      <p className="font-bold text-slate-400 mb-0.5">{label}</p>
      <p className="font-black text-violet-400">{fmtK(payload[0].value)}</p>
    </div>
  );
};

export function CustoMiniChart({ data, totalCusto, loading }: Props) {
  return (
    <div className="rounded-[14px] border p-3 flex flex-col gap-3"
      style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
            Custo no período
          </p>
          <p className={`text-xl font-black tracking-tight dark:text-white text-slate-800 mt-0.5${loading ? " animate-pulse" : ""}`}>
            {loading ? "—" : fmtK(totalCusto)}
          </p>
        </div>
      </div>
      {loading ? (
        <div className="h-[72px] rounded-lg animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
      ) : (
        <div className="h-[72px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="20%">
              <Bar dataKey="custo" fill="rgba(123,110,245,0.6)" radius={[2, 2, 0, 0]} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(123,110,245,0.08)" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
