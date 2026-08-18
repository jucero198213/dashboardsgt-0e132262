import { useEffect, useRef, useState } from "react";
import { RefreshCw, Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const CROSSFADE = { type: "spring", stiffness: 260, damping: 34, mass: 0.8 } as const;
const INSTANT = { duration: 0 } as const;

interface UpdateButtonProps {
  onClick: () => void | Promise<void>;
  isFetching: boolean;
  loadingPhase?: string;
  progress?: number;
  compact?: boolean;
  cooldownOverride?: { canFetch: boolean; remaining: number; countdown: string };
}

type Phase = "idle" | "fetching" | "done";

export function UpdateButton({
  onClick,
  isFetching,
  loadingPhase = "",
  progress = 0,
  compact = false,
}: UpdateButtonProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const prevFetching = useRef(false);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isFetching && !prevFetching.current) {
      if (doneTimer.current) clearTimeout(doneTimer.current);
      setPhase("fetching");
    }
    if (!isFetching && prevFetching.current) {
      setPhase("done");
      doneTimer.current = setTimeout(() => setPhase("idle"), 1400);
    }
    prevFetching.current = isFetching;
    return () => { if (doneTimer.current) clearTimeout(doneTimer.current); };
  }, [isFetching]);

  const pct = Math.min(Math.max(progress, 0), 100);
  const phaseText = loadingPhase || "Carregando...";
  const fade = reduced ? INSTANT : CROSSFADE;

  const faces: { key: Phase; content: React.ReactNode }[] = [
    {
      key: "idle",
      content: (
        <span className="flex items-center gap-1.5">
          <RefreshCw className={compact ? "h-3 w-3" : "h-3.5 w-3.5 shrink-0"} />
          Atualizar
        </span>
      ),
    },
    {
      key: "fetching",
      content: compact ? (
        <span className="flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3 animate-spin" />
          {`${pct}%`}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
          <span className="flex items-center gap-1.5">
            <span className="truncate max-w-[110px]">{phaseText}</span>
            <span className="rounded px-1.5 py-px text-[9px] font-bold bg-amber-400/10 text-amber-400/70 tabular-nums">
              {pct}%
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "done",
      content: (
        <span className="flex items-center gap-1.5 text-emerald-400">
          <Check className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Atualizado
        </span>
      ),
    },
  ];

  const baseCls = compact
    ? "relative inline-flex h-8 items-center gap-1.5 overflow-hidden rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 text-[11px] font-semibold text-amber-300 transition-all hover:border-amber-400/35 hover:bg-amber-400/[0.10] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
    : "relative inline-flex h-8 items-center gap-2 overflow-hidden rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3.5 text-[11px] font-semibold text-amber-300 transition-all hover:border-amber-400/35 hover:bg-amber-400/[0.10] hover:-translate-y-px active:scale-95 disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isFetching}
      title="Atualizar dados"
      whileTap={isFetching || reduced ? undefined : { scale: 0.96 }}
      className={baseCls}
    >
      {phase === "fetching" && (
        <span
          className="absolute inset-y-0 left-0 bg-amber-400/[0.12] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      )}

      <span className="relative grid place-items-center">
        {faces.map((face) => (
          <motion.span
            key={face.key}
            initial={false}
            animate={
              face.key === phase
                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, y: 4, filter: "blur(3px)" }
            }
            transition={fade}
            className="col-start-1 row-start-1 flex items-center justify-center whitespace-nowrap"
          >
            {face.content}
          </motion.span>
        ))}
      </span>
    </motion.button>
  );
}
