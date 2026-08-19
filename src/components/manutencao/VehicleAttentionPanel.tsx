import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VehicleSignal } from "@/lib/manutencaoUtils";

interface Props {
  vehicles: VehicleSignal[];
  onSelectVeiculo: (veiculo: string) => void;
  loading?: boolean;
}

const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")}M`
  : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(1).replace(".", ",")}k`
  : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function VehicleAttentionPanel({ vehicles, onSelectVeiculo, loading }: Props) {
  return (
    <Card className="rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Veículos que precisam de atenção
        </span>
        <Badge variant="secondary" className="ml-auto text-[9px] font-bold tracking-wider">
          {vehicles.length} veículos
        </Badge>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-[24px_1fr_auto] gap-3 px-4 py-1.5 border-b border-border/50">
        <span />
        <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/60">
          Veículo · sinais
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/60 text-right">
          Custo · OS
        </span>
      </div>

      {/* List */}
      <div className="flex flex-col divide-y divide-border/40 overflow-y-auto">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[24px_1fr_auto] gap-3 px-4 py-3 items-center">
                <div className="h-3 w-4 rounded bg-muted animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </div>
            ))
          : vehicles.map((v, i) => (
              <button
                key={v.veiculo}
                type="button"
                onClick={() => onSelectVeiculo(v.veiculo)}
                className={cn(
                  "grid grid-cols-[24px_1fr_auto] gap-3 px-4 py-3 items-start text-left",
                  "transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40",
                  i >= 5 && "opacity-60"
                )}
              >
                {/* Rank */}
                <span className="text-[11px] font-bold text-muted-foreground/40 text-right pt-0.5">
                  {i + 1}
                </span>

                {/* Vehicle + signals */}
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground/90 mb-1.5 truncate">
                    {v.veiculo}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {v.signals.stuck && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        ⏱ OS parada {v.signals.stuckDias}d
                      </span>
                    )}
                    {v.signals.revisional && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        🔧 Revisional em aberto
                      </span>
                    )}
                    {v.signals.cost && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        💰 Custo alto
                      </span>
                    )}
                    {v.signals.repeat && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        🔄 {v.signals.repeatCount} reincidências
                      </span>
                    )}
                    {v.signals.frequency && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        📋 Alta frequência
                      </span>
                    )}
                  </div>
                </div>

                {/* Cost + OS count */}
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-black text-foreground tracking-tight">
                    {fmtK(v.totalCusto)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {v.totalOrdens} OS
                  </p>
                </div>
              </button>
            ))}

        {!loading && vehicles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
            <span className="text-2xl mb-2">✅</span>
            <p className="text-xs font-medium">Nenhum veículo com sinal ativo</p>
          </div>
        )}
      </div>
    </Card>
  );
}
