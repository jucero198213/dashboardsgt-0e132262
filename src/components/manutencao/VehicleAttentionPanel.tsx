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
    <div className="rounded-[14px] border overflow-hidden flex flex-col"
      style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
          Veículos que precisam de atenção
        </span>
        <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "var(--sgt-accent-soft)", color: "var(--sgt-accent-text)" }}>
          {loading ? "…" : vehicles.length} veículos
        </span>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-[24px_1fr_auto] gap-3 px-3 py-1.5 shrink-0"
        style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}>
        <span />
        <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
          Veículo · sinais
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500 text-right">
          Custo · OS
        </span>
      </div>

      {/* List */}
      <div className="flex flex-col">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[24px_1fr_auto] gap-3 px-3 py-3 items-center"
                style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}>
                <div className="h-3 w-4 rounded animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
                <div className="space-y-1.5">
                  <div className="h-3 w-32 rounded animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
                  <div className="h-3 w-24 rounded animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
                </div>
                <div className="h-3 w-16 rounded animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
              </div>
            ))
          : vehicles.map((v, i) => (
              <button
                key={v.veiculo}
                type="button"
                onClick={() => onSelectVeiculo(v.veiculo)}
                className={cn(
                  "grid grid-cols-[24px_1fr_auto] gap-3 px-3 py-3 items-start text-left transition-colors",
                  i >= 5 && "opacity-60"
                )}
                style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--sgt-row-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                {/* Rank */}
                <span className="text-[11px] font-bold text-slate-500 text-right pt-0.5">
                  {i + 1}
                </span>

                {/* Vehicle + signals */}
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold mb-1.5 truncate dark:text-white text-slate-800">
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
                  <p className="text-[12px] font-black tracking-tight dark:text-white text-slate-800">
                    {fmtK(v.totalCusto)}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    {v.totalOrdens} OS
                  </p>
                </div>
              </button>
            ))}

        {!loading && vehicles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <span className="text-2xl mb-2">✅</span>
            <p className="text-xs font-medium">Nenhum veículo com sinal ativo</p>
          </div>
        )}
      </div>
    </div>
  );
}
