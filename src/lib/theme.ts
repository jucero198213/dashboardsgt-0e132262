/**
 * ─── SGT Dashboard — Design Tokens Centralizados ────────────────────────────
 *
 * Fonte única de verdade para cores, superfícies e identidade visual.
 * Todas as páginas e componentes devem importar daqui.
 *
 * IMPORTANTE: classes Tailwind precisam estar literais no código (não interpoladas).
 * Use RAW para inline styles e TW/TONE para className strings.
 */

// ─── Valores brutos — use em inline style={{ }} ───────────────────────────────
export const RAW = {
  // Backgrounds
  pageBg:          "#060912",   // base da página — quase preto com toque frio
  surfacePrimary:  "#0b0e1a",   // cards principais
  surfaceSecondary:"#0c0f1c",   // cards dentro da section card
  surfaceElevated: "#0e1120",   // selects, inputs, surfaces elevadas
  surfaceInset:    "#090c14",   // within cards, table headers

  // Borders
  borderDefault:   "rgba(255,255,255,0.07)",
  borderHover:     "rgba(255,255,255,0.11)",
  borderStrong:    "rgba(255,255,255,0.15)",

  // Ambient atmosphere
  bgAmber:   "radial-gradient(ellipse 75% 45% at 50% -10%, rgba(180,110,4,0.28), transparent 58%)",
  bgCyan:    "radial-gradient(ellipse 55% 40% at 100% 110%, rgba(6,182,212,0.08), transparent 60%)",
  vignette:  "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 12%, rgba(2,3,12,0.72) 100%)",

  // Index page — section card
  bgAmberLight: "radial-gradient(ellipse 80% 50% at 50% -8%, rgba(160,100,4,0.20), transparent 58%)",
  vignetteLight:"radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.60) 100%)",

  // Spot glows by tone (radial at bottom-right of card)
  spot: {
    cyan:    "radial-gradient(circle at 100% 100%, rgba(6,182,212,0.10),    transparent 65%)",
    emerald: "radial-gradient(circle at 100% 100%, rgba(16,185,129,0.10),   transparent 65%)",
    amber:   "radial-gradient(circle at 100% 100%, rgba(245,158,11,0.10),   transparent 65%)",
    violet:  "radial-gradient(circle at 100% 100%, rgba(139,92,246,0.10),   transparent 65%)",
    rose:    "radial-gradient(circle at 100% 100%, rgba(244,63,94,0.10),    transparent 65%)",
    red:     "radial-gradient(circle at 100% 100%, rgba(239,68,68,0.10),    transparent 65%)",
  },

  // Accent hex values (para stroke SVG, JS logic, etc.)
  accent: {
    cyan:    "#22d3ee",
    emerald: "#34d399",
    amber:   "#fbbf24",
    violet:  "#a78bfa",
    rose:    "#fb7185",
    red:     "#f87171",
    white:   "#ffffff",
  },
} as const;

// ─── Sistema de tons — KPI cards, badges, ícones ─────────────────────────────
export type ToneKey = "cyan" | "emerald" | "amber" | "violet" | "rose";

export const TONE: Record<ToneKey, {
  /** Gradiente da stripe no topo do card */
  stripe:  string;
  /** Classe de borda do card */
  border:  string;
  /** Shadow de hover do card */
  glow:    string;
  /** Background + borda do ícone */
  iconBg:  string;
  /** Cor do ícone */
  iconTxt: string;
  /** Cor do subtítulo / label secundário */
  sub:     string;
  /** Spot glow raw (inline style background) */
  spot:    string;
  /** Hex do acento principal */
  accent:  string;
  /** Cor da linha decorativa no topo do card */
  lineTop: string;
  /** Cor do badge/pill */
  badgeBg: string;
  /** Texto do badge/pill */
  badgeTxt:string;
}> = {
  cyan: {
    stripe:   "from-cyan-400/60 to-cyan-700/20",
    border:   "border-cyan-400/[0.12]",
    glow:     "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]",
    iconBg:   "bg-cyan-400/[0.08] border border-cyan-400/[0.15]",
    iconTxt:  "text-cyan-300",
    sub:      "text-cyan-500/80",
    spot:     RAW.spot.cyan,
    accent:   RAW.accent.cyan,
    lineTop:  "rgba(6,182,212,0.25)",
    badgeBg:  "bg-cyan-400/10 border-cyan-400/20",
    badgeTxt: "text-cyan-300",
  },
  emerald: {
    stripe:   "from-emerald-400/60 to-emerald-700/20",
    border:   "border-emerald-400/[0.12]",
    glow:     "hover:shadow-[0_4px_40px_rgba(16,185,129,0.18)]",
    iconBg:   "bg-emerald-400/[0.08] border border-emerald-400/[0.15]",
    iconTxt:  "text-emerald-300",
    sub:      "text-emerald-500/80",
    spot:     RAW.spot.emerald,
    accent:   RAW.accent.emerald,
    lineTop:  "rgba(16,185,129,0.25)",
    badgeBg:  "bg-emerald-400/10 border-emerald-400/20",
    badgeTxt: "text-emerald-300",
  },
  amber: {
    stripe:   "from-amber-400/60 to-amber-700/20",
    border:   "border-amber-400/[0.12]",
    glow:     "hover:shadow-[0_4px_40px_rgba(245,158,11,0.18)]",
    iconBg:   "bg-amber-400/[0.08] border border-amber-400/[0.15]",
    iconTxt:  "text-amber-300",
    sub:      "text-amber-500/80",
    spot:     RAW.spot.amber,
    accent:   RAW.accent.amber,
    lineTop:  "rgba(245,158,11,0.25)",
    badgeBg:  "bg-amber-400/10 border-amber-400/20",
    badgeTxt: "text-amber-300",
  },
  violet: {
    stripe:   "from-violet-400/60 to-violet-700/20",
    border:   "border-violet-400/[0.12]",
    glow:     "hover:shadow-[0_4px_40px_rgba(139,92,246,0.18)]",
    iconBg:   "bg-violet-400/[0.08] border border-violet-400/[0.15]",
    iconTxt:  "text-violet-300",
    sub:      "text-violet-500/80",
    spot:     RAW.spot.violet,
    accent:   RAW.accent.violet,
    lineTop:  "rgba(139,92,246,0.25)",
    badgeBg:  "bg-violet-400/10 border-violet-400/20",
    badgeTxt: "text-violet-300",
  },
  rose: {
    stripe:   "from-rose-400/60 to-rose-700/20",
    border:   "border-rose-400/[0.12]",
    glow:     "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]",
    iconBg:   "bg-rose-400/[0.08] border border-rose-400/[0.15]",
    iconTxt:  "text-rose-300",
    sub:      "text-rose-500/80",
    spot:     RAW.spot.rose,
    accent:   RAW.accent.rose,
    lineTop:  "rgba(244,63,94,0.25)",
    badgeBg:  "bg-rose-400/10 border-rose-400/20",
    badgeTxt: "text-rose-300",
  },
} as const;

// ─── Tipografia — classes fixas reutilizáveis ─────────────────────────────────
export const TYPE = {
  cardLabel:    "text-[9px] font-bold uppercase tracking-[0.35em] text-slate-600 leading-tight",
  cardSublabel: "text-[10px] font-semibold uppercase tracking-[0.18em]",
  sectionLabel: "text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500",
  body:         "text-[12px] text-slate-400",
  bodyMd:       "text-[13px] text-slate-300",
  mono:         "font-mono text-[12px]",
} as const;

// ─── Componentes — strings de className completas ────────────────────────────
// (Tailwind precisa ver as classes literais — use aqui como referência/doc)
export const COMPONENT = {
  // Card padrão
  card: "rounded-[20px] border border-white/[0.07] bg-[#0b0e1a] shadow-[0_2px_24px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-white/[0.11]",

  // Card dentro da section (Index.tsx)
  cardInner: "rounded-[20px] border border-white/[0.07] bg-[#0c0f1c] shadow-[0_2px_20px_rgba(0,0,0,0.35)] transition-all duration-300 hover:border-white/[0.11]",

  // Input
  input: "h-8 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-slate-300 [color-scheme:dark] transition-all focus:border-amber-500/30 focus:outline-none",

  // Select
  select: "h-8 rounded-xl border border-white/[0.08] bg-[#0e1120] px-3 text-sm text-slate-300 transition-all focus:border-amber-500/30 focus:outline-none",

  // Botão Atualizar
  btnUpdate: "inline-flex h-8 items-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-500/[0.08] px-3.5 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-400/12 hover:border-amber-400/30 hover:shadow-[0_0_18px_rgba(245,158,11,0.18)]",
  btnUpdateLoading: "inline-flex h-8 items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 text-xs font-semibold text-amber-200 cursor-not-allowed",
} as const;
