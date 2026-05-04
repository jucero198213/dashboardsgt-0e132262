import { RefreshCw } from "lucide-react";

interface UpdateButtonProps {
  onClick: () => void | Promise<void>;
  isFetching: boolean;
  loadingPhase?: string;
  progress?: number;
  compact?: boolean;
  // Override do cooldown do contexto global (para telas com fetch próprio)
  cooldownOverride?: { canFetch: boolean; remaining: number; countdown: string };
}

export function UpdateButton({
  onClick,
  isFetching,
  loadingPhase = "",
  progress = 0,
  compact = false,
  cooldownOverride,
}: UpdateButtonProps) {
  const disabled = isFetching;

  if (compact) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title="Atualizar dados"
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition-all
          ${isFetching
            ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200"
            : "border-cyan-400/50 bg-cyan-500/20 text-cyan-100 hover:border-cyan-300/70 hover:bg-cyan-400/30 active:scale-95"
          } disabled:cursor-not-allowed`}
      >
        <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
        {isFetching ? `${progress}%` : "Atualizar"}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title="Atualizar dados"
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3.5 text-[12px] font-bold transition-all
        ${isFetching
          ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.15)]"
          : "border-cyan-400/50 bg-cyan-500/20 text-cyan-100 hover:border-cyan-300/70 hover:bg-cyan-400/30 hover:-translate-y-0.5 active:scale-95"
        } disabled:cursor-not-allowed`}
    >
      <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
      {isFetching
        ? <span className="flex items-center gap-1">
            <span>{loadingPhase || "Carregando..."}</span>
            <span className="rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">{progress}%</span>
          </span>
        : "Atualizar"
      }
    </button>
  );
}
