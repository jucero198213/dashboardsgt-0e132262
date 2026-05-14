import { RefreshCw } from "lucide-react";

interface UpdateButtonProps {
  onClick: () => void | Promise<void>;
  isFetching: boolean;
  loadingPhase?: string;
  progress?: number;
  compact?: boolean;
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
  const pct = Math.min(Math.max(progress, 0), 100);
  const phase = loadingPhase || "Carregando...";

  if (compact) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title="Atualizar dados"
        className="relative inline-flex h-8 items-center gap-1.5 overflow-hidden rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 text-[11px] font-semibold text-amber-300 transition-all hover:border-amber-400/35 hover:bg-amber-400/[0.10] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {/* progress bar fill */}
        {isFetching && (
          <span
            className="absolute inset-y-0 left-0 bg-amber-400/[0.12] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        )}
        <span className="relative flex items-center gap-1.5">
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? `${pct}%` : "Atualizar"}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title="Atualizar dados"
      className="relative inline-flex h-8 items-center gap-2 overflow-hidden rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3.5 text-[11px] font-semibold text-amber-300 transition-all hover:border-amber-400/35 hover:bg-amber-400/[0.10] hover:-translate-y-px active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {/* progress bar fill */}
      {isFetching && (
        <span
          className="absolute inset-y-0 left-0 bg-amber-400/[0.12] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      )}
      <span className="relative flex items-center gap-2">
        <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isFetching ? "animate-spin" : ""}`} />
        {isFetching ? (
          <span className="flex items-center gap-1.5">
            <span className="truncate max-w-[110px]">{phase}</span>
            <span className="rounded px-1.5 py-px text-[9px] font-bold bg-amber-400/10 text-amber-400/70 tabular-nums">
              {pct}%
            </span>
          </span>
        ) : (
          "Atualizar"
        )}
      </span>
    </button>
  );
}
