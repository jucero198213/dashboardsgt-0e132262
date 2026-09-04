import type { LucideIcon } from "lucide-react";
import { AnimatedCard } from "./AnimatedCard";

/**
 * KpiCard — componente ÚNICO e padronizado de KPI do SGT.
 *
 * Fonte única de verdade pra todos os cards de KPI do sistema. Altura FIXA de
 * 120px (`h-[120px]`) — não é `min-h`, então a altura é idêntica em todas as
 * telas independentemente do conteúdo. Acento semântico na lateral esquerda,
 * fundo neutro (padrão Contas a Receber), label + ícone no topo e valor
 * alinhado à base (`mt-auto`).
 *
 * Tons (stripe / iconBg / iconTxt / glow) seguem o padrão das telas financeiras.
 * Use o helper KPI_TONES abaixo pra não repetir as classes.
 */
export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  /** classes do gradiente do acento, ex: "from-cyan-400/60 to-cyan-700/20" */
  stripe?: string;
  /** classes do quadrinho do ícone, ex: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]" */
  iconBg?: string;
  /** cor do ícone, ex: "text-cyan-300" */
  iconTxt?: string;
  /** sombra no hover, ex: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]" */
  glow?: string;
  /** classe de cor do subtexto (default: text-slate-500) */
  subClassName?: string;
  /** torna o card clicável (cursor + onClick) */
  onClick?: () => void;
  /** delay da animação de entrada */
  delay?: number;
  /** aplica pulse no valor enquanto carrega */
  loading?: boolean;
  className?: string;
}

const TONE_FALLBACK = "from-slate-400/50 to-slate-600/15";

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  stripe = TONE_FALLBACK,
  iconBg = "bg-white/[0.05] border border-white/[0.08]",
  iconTxt = "text-slate-300",
  glow = "",
  subClassName = "text-slate-500",
  onClick,
  delay = 0,
  loading = false,
  className = "",
}: KpiCardProps) {
  const clickable = !!onClick;
  return (
    <AnimatedCard delay={delay} className={className}>
      <div
        onClick={onClick}
        className={`group relative flex min-h-[120px] flex-col overflow-hidden rounded-[14px] sm:rounded-[16px] border border-white/[0.07] bg-[var(--sgt-bg-card)] p-4 transition-all duration-300 hover:-translate-y-[3px] ${glow} shadow-[0_2px_20px_rgba(0,0,0,0.4)] ${clickable ? "cursor-pointer" : ""}`}
      >
        {/* Acento semântico — lateral esquerda */}
        <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${stripe}`} />

        <div className="relative flex flex-col h-full">
          {/* Topo: label + ícone */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 leading-tight line-clamp-2">{label}</p>
            {Icon && (
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconTxt} transition-transform duration-300 group-hover:scale-110`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          {/* Valor — alinhado à base */}
          <p className={`mt-auto pt-2.5 font-black leading-none tracking-[-0.05em] text-white text-[clamp(1.1rem,3.5vw,1.85rem)] overflow-hidden text-ellipsis whitespace-nowrap sgt-count-up ${loading ? "animate-pulse" : ""}`}>
            {value}
          </p>

          {/* Subtexto */}
          {sub != null && (
            <p className={`mt-2 text-[10px] font-medium tracking-[0.1em] truncate ${subClassName}`}>{sub}</p>
          )}
        </div>
      </div>
    </AnimatedCard>
  );
}

/** Tons prontos pra reuso — evita repetir as classes em cada tela. */
export const KPI_TONES = {
  cyan:    { stripe: "from-cyan-400/60 to-cyan-700/20",       iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]",    iconTxt: "text-cyan-300",    glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]" },
  emerald: { stripe: "from-emerald-400/60 to-emerald-700/20", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]", iconTxt: "text-emerald-300", glow: "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]" },
  amber:   { stripe: "from-amber-400/60 to-amber-700/20",     iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]",   iconTxt: "text-amber-300",   glow: "hover:shadow-[0_4px_40px_rgba(251,191,36,0.18)]" },
  rose:    { stripe: "from-rose-400/60 to-rose-700/20",       iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]",    iconTxt: "text-rose-300",    glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]" },
  violet:  { stripe: "from-violet-400/60 to-violet-700/20",   iconBg: "bg-violet-400/[0.08] border border-violet-400/[0.15]", iconTxt: "text-violet-300",  glow: "hover:shadow-[0_4px_40px_rgba(139,92,246,0.18)]" },
  orange:  { stripe: "from-orange-400/60 to-orange-700/20",   iconBg: "bg-orange-400/[0.08] border border-orange-400/[0.15]", iconTxt: "text-orange-300",  glow: "hover:shadow-[0_4px_40px_rgba(249,115,22,0.18)]" },
} as const;

export type KpiTone = keyof typeof KPI_TONES;
