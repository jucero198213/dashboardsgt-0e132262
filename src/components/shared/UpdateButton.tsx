import { RefreshCw } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";

interface UpdateButtonProps {
  onClick: () => void | Promise<void>;
  isFetching: boolean;
  loadingPhase?: string;
  progress?: number;
  compact?: boolean;
  // Override do cooldown do contexto global (para telas com fetch próprio)
  cooldownOverride?: { canFetch: boolean; remaining: number; countdown: string };
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function UpdateButton({
  onClick,
  isFetching,
  loadingPhase = "",
  progress = 0,
  compact = false,
  cooldownOverride,
}: UpdateButtonProps) {
  const { cooldownRemaining, isAdmin } = useFinancialData();

  // Se veio override (tela com fetch independente), usa ele; senão usa o global
  const inCooldown = cooldownOverride
    ? !cooldownOverride.canFetch
    : (!isAdmin && cooldownRemaining > 0);
  const countdown = cooldownOverride
    ? cooldownOverride.countdown
    : countdown;

  const disabled = isFetching || inCooldown;

  if (compact) {
    return (
      <button
        onClick={() => !disabled && void onClick()}
        disabled={disabled}
        title={inCooldown ? `Disponível em ${countdown}` : "Atualizar dados"}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition-all
          ${isFetching
            ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200"
            : inCooldown
            ? "border-slate-600/40 bg-slate-700/20 text-slate-500 cursor-not-allowed"
            : "border-cyan-400/50 bg-cyan-500/20 text-cyan-100 hover:border-cyan-300/70 hover:bg-cyan-400/30 active:scale-95"
          } disabled:cursor-not-allowed`}
      >
        <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
        {isFetching ? `${progress}%` : inCooldown ? countdown : "Atualizar"}
      </button>
    );
  }

  return (
    <button
      onClick={() => !disabled && void onClick()}
      disabled={disabled}
      title={inCooldown ? `Disponível em ${countdown}` : "Atualizar dados"}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3.5 text-[12px] font-bold transition-all
        ${isFetching
          ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.15)]"
          : inCooldown
          ? "border-slate-600/40 bg-slate-700/20 text-slate-500 cursor-not-allowed"
          : "border-cyan-400/50 bg-cyan-500/20 text-cyan-100 hover:border-cyan-300/70 hover:bg-cyan-400/30 hover:-translate-y-0.5 active:scale-95"
        } disabled:cursor-not-allowed`}
    >
      <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
      {isFetching
        ? <span className="flex items-center gap-1">
            <span>{loadingPhase || "Carregando..."}</span>
            <span className="rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">{progress}%</span>
          </span>
        : inCooldown
        ? <span className="flex items-center gap-1.5">
            <span className="text-[10px]">Disponível em</span>
            <span className="font-mono text-[11px] font-bold text-slate-300">{countdown}</span>
          </span>
        : "Atualizar"
      }
    </button>
  );
}
