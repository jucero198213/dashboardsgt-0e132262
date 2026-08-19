import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <Card className="rounded-xl overflow-hidden flex flex-col flex-1">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Por fornecedor
        </span>
        <Badge variant="secondary" className="ml-auto text-[9px] font-bold tracking-wider">
          TOP {items.length}
        </Badge>
      </div>
      <div className="flex flex-col divide-y divide-border/40">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="h-2.5 w-4 rounded bg-muted animate-pulse" />
                <div className="h-2.5 flex-1 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-12 rounded bg-muted animate-pulse" />
              </div>
            ))
          : items.map((item, i) => (
              <div key={item.fornecedor} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-[10px] font-bold text-muted-foreground/40 w-4 text-right shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-[11px] text-foreground/80 truncate" title={item.fornecedor}>
                    {item.fornecedor}
                  </span>
                  <div className="h-[3px] rounded-full bg-muted overflow-hidden">
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
    </Card>
  );
}
