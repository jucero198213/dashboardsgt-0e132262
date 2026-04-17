import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Home as HomeIcon,
} from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import sgtLogo from "@/assets/sgt-logo.png";

/* ---------------------------------------------------------------- */
/*  Logo SGT oficial — PNG vetorizado com fundo transparente.        */
/*  Para trocar futuramente, basta substituir o arquivo em            */
/*  src/assets/sgt-logo.png mantendo o mesmo nome.                    */
/* ---------------------------------------------------------------- */
function SgtLogoSlot({ className = "" }: { className?: string }) {
  return (
    <img
      src={sgtLogo}
      alt="SGT — Sistema de Gestão em Transporte"
      className={`mx-auto block h-[88px] w-auto select-none sm:h-[112px] lg:h-[132px] ${className}`}
      draggable={false}
    />
  );
}

/* ---------------------------------------------------------------- */
/*  Animação letra por letra para o título.                          */
/* ---------------------------------------------------------------- */
function AnimatedTitle({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduce = useReducedMotion();
  const letters = Array.from(text);
  return (
    <span aria-label={text} className="inline-block">
      {letters.map((char, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="inline-block"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: delay + i * 0.025,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

/* ---------------------------------------------------------------- */
/*  Cards de módulos                                                  */
/* ---------------------------------------------------------------- */
interface ModuleCardData {
  key: string;
  icon: React.ElementType;
  title: string;
  description: string;
  cta: string;
  onClick?: () => void;
  tone: "amber" | "violet" | "slate" | "cyan";
  disabled?: boolean;
}

const TONE: Record<
  string,
  { iconBg: string; iconText: string; ring: string; cta: string; glow: string }
> = {
  amber: {
    iconBg: "bg-amber-400/10 border border-amber-400/20",
    iconText: "text-amber-300",
    ring: "hover:border-amber-400/40",
    cta: "text-amber-300",
    glow: "from-amber-400/20",
  },
  violet: {
    iconBg: "bg-violet-400/10 border border-violet-400/20",
    iconText: "text-violet-300",
    ring: "hover:border-violet-400/40",
    cta: "text-violet-300",
    glow: "from-violet-400/20",
  },
  slate: {
    iconBg: "bg-slate-400/10 border border-slate-400/20",
    iconText: "text-slate-300",
    ring: "",
    cta: "text-slate-400",
    glow: "from-slate-400/10",
  },
  cyan: {
    iconBg: "bg-cyan-400/10 border border-cyan-400/20",
    iconText: "text-cyan-300",
    ring: "hover:border-cyan-400/40",
    cta: "text-cyan-400",
    glow: "from-cyan-400/20",
  },
};

function ModuleCard({ data, index }: { data: ModuleCardData; index: number }) {
  const tone = TONE[data.tone];
  const Icon = data.icon;
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={data.onClick}
      disabled={data.disabled}
      initial={reduce ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={data.disabled ? undefined : { y: -4 }}
      className={`group relative flex h-full w-full flex-col items-start gap-5 overflow-hidden rounded-3xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]/60 p-7 text-left backdrop-blur-sm transition-colors ${tone.ring} ${
        data.disabled ? "cursor-default opacity-70" : "cursor-pointer hover:bg-[var(--sgt-input-hover)]/70"
      }`}
    >
      {/* Glow superior */}
      <div
        className={`pointer-events-none absolute -top-20 left-1/2 h-40 w-[80%] -translate-x-1/2 rounded-full bg-gradient-to-b ${tone.glow} to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
      />

      {/* Ícone */}
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.iconBg} ${tone.iconText}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Título e descrição */}
      <div className="flex-1 space-y-2">
        <h3 className="text-[18px] font-bold tracking-tight sgt-text">{data.title}</h3>
        <p className="text-[13.5px] leading-relaxed text-[var(--sgt-text-muted)]">
          {data.description}
        </p>
      </div>

      {/* CTA */}
      <div className={`flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] ${tone.cta}`}>
        {data.cta}
        {!data.disabled && (
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        )}
      </div>
    </motion.button>
  );
}

/* ---------------------------------------------------------------- */
/*  Página Home                                                       */
/* ---------------------------------------------------------------- */
export default function Home() {
  const navigate = useNavigate();
  const { canAccess } = usePagePermissions();
  const reduce = useReducedMotion();

  const modules: ModuleCardData[] = [
    canAccess("dashboard") && {
      key: "dashboard",
      icon: BarChart3,
      title: "Dashboard",
      description:
        "Visualize em tempo real contas a pagar, a receber, saldo líquido, inadimplência e evolução mensal do fluxo de caixa.",
      cta: "Acessar dashboard",
      onClick: () => navigate("/dashboard"),
      tone: "amber" as const,
    },
    canAccess("indicadores") && {
      key: "indicadores",
      icon: TrendingUp,
      title: "Indicadores",
      description:
        "Consulte métricas, desempenho e resultados para apoiar a tomada de decisão.",
      cta: "Acessar indicadores",
      onClick: () => navigate("/indicadores"),
      tone: "violet" as const,
    },
    {
      key: "soon",
      icon: Sparkles,
      title: "Próximos módulos",
      description:
        "Novos módulos de gestão operacional e logística estão sendo desenvolvidos para o ecossistema SGT.",
      cta: "Em breve",
      tone: "cyan" as const,
      disabled: true,
    },
  ].filter(Boolean) as ModuleCardData[];

  const scrollToModules = () => {
    document.getElementById("modulos")?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToTools = () => {
    document.getElementById("ferramentas")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="flex flex-col min-h-[100dvh] px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* Atmosfera dark — mesmo padrão das outras telas */}
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_75%_50%_at_50%_-8%,rgba(180,110,4,0.22),transparent_58%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_55%_50%_at_85%_110%,rgba(139,92,246,0.08),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_50%_45%_at_15%_110%,rgba(6,182,212,0.06),transparent_60%)]" />

      {/* Background temático — rodovias e transporte, bem sutil */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-[0.06]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          {/* Rodovia principal horizontal */}
          <line x1="0" y1="60%" x2="100%" y2="60%" stroke="white" strokeWidth="48" />
          <line x1="0" y1="60%" x2="100%" y2="60%" stroke="#0a0a0a" strokeWidth="44" />
          {/* Faixas tracejadas da rodovia */}
          {[0,8,16,24,32,40,48,56,64,72,80,88,96].map((x, i) => (
            <line key={i} x1={`${x}%`} y1="60%" x2={`${x+4}%`} y2="60%" stroke="white" strokeWidth="3" strokeDasharray="40 20" />
          ))}
          {/* Rodovia diagonal */}
          <line x1="-10%" y1="110%" x2="60%" y2="-10%" stroke="white" strokeWidth="32" />
          <line x1="-10%" y1="110%" x2="60%" y2="-10%" stroke="#0a0a0a" strokeWidth="28" />
          {/* Caminhão estilizado — esquerda */}
          <g transform="translate(120, calc(60% - 22))" opacity="0.9">
            <rect x="0" y="8" width="72" height="26" rx="3" fill="white" />
            <rect x="52" y="2" width="22" height="32" rx="3" fill="white" />
            <circle cx="14" cy="36" r="7" fill="white" />
            <circle cx="58" cy="36" r="7" fill="white" />
          </g>
          {/* Caminhão estilizado — direita */}
          <g transform="translate(75%, calc(60% - 22))" opacity="0.9">
            <rect x="0" y="8" width="72" height="26" rx="3" fill="white" />
            <rect x="52" y="2" width="22" height="32" rx="3" fill="white" />
            <circle cx="14" cy="36" r="7" fill="white" />
            <circle cx="58" cy="36" r="7" fill="white" />
          </g>
          {/* Seta de rota — canto superior direito */}
          <path d="M 75% 15% Q 82% 10% 88% 18% Q 92% 24% 88% 32%" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
          <polygon points="86,52 94,46 90,58" fill="white" transform="translate(calc(88% - 90), calc(32% - 52))" />
          {/* Linhas de velocidade */}
          <line x1="5%" y1="58%" x2="18%" y2="58%" stroke="white" strokeWidth="1.5" opacity="0.5" />
          <line x1="5%" y1="62%" x2="15%" y2="62%" stroke="white" strokeWidth="1" opacity="0.3" />
          <line x1="82%" y1="58%" x2="95%" y2="58%" stroke="white" strokeWidth="1.5" opacity="0.5" />
          <line x1="85%" y1="62%" x2="95%" y2="62%" stroke="white" strokeWidth="1" opacity="0.3" />
        </svg>
      </div>

      {/* Section envolvente — mesmo padrão Dashboard / Indicadores */}
      <section
        className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto"
        style={{
          background: "var(--sgt-bg-section)",
          borderColor: "var(--sgt-border-subtle)",
          boxShadow: "var(--sgt-section-shadow)",
        }}
      >
        <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 w-full">

          {/* Top bar minimalista — apenas UserMenu à direita */}
          <div className="flex items-center justify-end py-1">
            <UserMenu showAdmin />
          </div>

          {/* ── HERO ── */}
          <section className="relative mx-auto flex w-full max-w-[1500px] flex-col items-center justify-center px-4 py-12 text-center sm:py-16 lg:px-10 lg:py-20">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-3.5 py-1.5"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300">
                SGT Log · Sistema de Gestão em Transporte
              </span>
            </motion.div>

            <h1 className="text-[clamp(2.4rem,6.2vw,5.2rem)] font-black leading-[1.02] tracking-[-0.045em] sgt-text">
              <span className="block bg-gradient-to-r from-slate-200 via-white to-slate-300 bg-clip-text text-transparent">
                <AnimatedTitle text="Seja bem-vindo ao" />
              </span>
              <span className="mt-2 block bg-gradient-to-r from-amber-300 via-amber-200 to-amber-500 bg-clip-text text-transparent">
                <AnimatedTitle text="Workspace" delay={0.45} />
              </span>
            </h1>

            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex w-full justify-center"
            >
              <SgtLogoSlot />
            </motion.div>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.15 }}
              className="mt-8 max-w-[680px] text-[15px] leading-relaxed text-[var(--sgt-text-muted)] lg:text-[16px]"
            >
              Plataforma centralizada para gestão financeira, operacional e logística da SGT Log. Monitore indicadores, fluxo de caixa e desempenho da operação de transporte em tempo real.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.3 }}
              className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
            >
              <button
                onClick={scrollToModules}
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.12] px-6 text-[13px] font-semibold text-amber-200 transition-all hover:-translate-y-0.5 hover:border-amber-400/50 hover:bg-amber-400/[0.2] hover:shadow-[0_8px_28px_rgba(245,158,11,0.18)]"
              >
                Explorar módulos
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={scrollToTools}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-6 text-[13px] font-semibold text-[var(--sgt-text-secondary)] transition-all hover:-translate-y-0.5 hover:border-[var(--sgt-border-medium)] hover:text-[var(--sgt-text-primary)]"
              >
                Ferramentas complementares
              </button>
            </motion.div>

            <motion.button
              onClick={scrollToModules}
              aria-label="Rolar para módulos"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
              className="mt-12 flex flex-col items-center gap-1.5 text-[var(--sgt-text-muted)] hover:text-amber-300 transition-colors"
            >
              <motion.div
                animate={reduce ? undefined : { y: [0, 6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="flex flex-col items-center gap-1.5"
              >
                <span className="text-[9px] font-semibold uppercase tracking-[0.3em]">
                  Role para ver mais
                </span>
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </motion.button>
          </section>

          {/* ── MÓDULOS PRINCIPAIS ── */}
          <section id="modulos" className="relative mx-auto w-full max-w-[1500px] px-4 py-16 lg:px-10 lg:py-20">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="mb-12 text-center"
            >
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.32em] text-amber-400/80">
                Módulos principais
              </p>
              <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-black tracking-[-0.03em] sgt-text">
                Acessos do Workspace SGT
              </h2>
            </motion.div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m, i) => (
                <ModuleCard key={m.key} data={m} index={i} />
              ))}
            </div>
          </section>

          {/* ── FERRAMENTAS COMPLEMENTARES ── */}
          <section id="ferramentas" className="relative mx-auto w-full max-w-[1500px] px-4 pb-16 pt-4 lg:px-10">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="mb-10 text-center"
            >
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-400/80">
                Ferramentas complementares
              </p>
              <h2 className="text-[clamp(1.4rem,2.6vw,2rem)] font-bold tracking-[-0.025em] sgt-text">
                Recursos de apoio ao ecossistema
              </h2>
            </motion.div>

            <div className="mx-auto max-w-[640px]">
              <motion.a
                href="https://receitaflow.lovable.app"
                target="_blank"
                rel="noopener noreferrer"
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55 }}
                whileHover={{ y: -3 }}
                className="group flex items-start gap-5 rounded-3xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]/40 p-6 backdrop-blur-sm transition-colors hover:border-cyan-400/30 hover:bg-[var(--sgt-input-hover)]/60"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold sgt-text">ReceitaFlow</h3>
                    <ExternalLink className="h-3 w-3 text-[var(--sgt-text-muted)] transition-colors group-hover:text-cyan-300" />
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--sgt-text-muted)]">
                    Ferramenta complementar para apoiar rotinas e processos vinculados ao
                    ecossistema Workspace SGT.
                  </p>
                </div>
              </motion.a>
            </div>

            <p className="mt-12 text-center text-[10px] tracking-[0.2em] text-[var(--sgt-text-faint)]">
              © 2026 SGT Log · Workspace Corporativo
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
