import type { FornecedorItem } from "@/lib/manutencaoUtils";

interface Props {
  items: FornecedorItem[];
  loading?: boolean;
}

const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")}M`
  : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(1).replace(".", ",")}k`
  : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FornecedorRanking({ items, loading }: Props) {
  return (
    <div className="rounded-[14px] border overflow-hidden flex flex-col"
      style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}>
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
          Por fornecedor
        </span>
        <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(74,110,184,0.15)", color: "#A8C0E8" }}>
          TOP {loading ? "…" : items.length}
        </span>
      </div>
      <div className="flex flex-col">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5"
                style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}>
                <div className="h-2.5 w-4 rounded animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
                <div className="h-2.5 flex-1 rounded animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
                <div className="h-2.5 w-12 rounded animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
              </div>
            ))
          : items.map((item, i) => (
              <div key={item.fornecedor} className="flex items-center gap-3 px-3 py-2.5"
                style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}>
                <span className="text-[10px] font-bold text-slate-500 w-4 text-right shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-[11px] dark:text-white/80 text-slate-700 truncate" title={item.fornecedor}>
                    {item.fornecedor}
                  </span>
                  <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--sgt-border-medium)" }}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500"
                      style={{ width: `${Math.round(item.share * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-400 shrink-0 min-w-[52px] text-right">
                  {fmtK(item.totalCusto)}
                </span>
              </div>
            ))}
      </div>
    </div>
  );
}
