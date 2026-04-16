import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Workflow,
} from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { usePagePermissions } from "@/hooks/usePagePermissions";

/* ---------------------------------------------------------------- */
/*  Slot pronto para receber a logo SGT real depois.                 */
/*  Para trocar: substitua o conteúdo deste componente por           */
/*    <img src={logoSgt} alt="SGT" className="h-12 w-auto" />        */
/* ---------------------------------------------------------------- */
function SgtLogoSlot({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-5 py-2.5 ${className}`}
      aria-label="SGT"
    >
      <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-500 bg-clip-text text-2xl font-black tracking-[0.32em] text-transparent">
        SGT
      </span>
    </div>
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
  tone: "amber" | "violet" | "slate";
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
        "Acompanhe a visão geral do sistema, acessos rápidos e informações centrais do Workflow SGT.",
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
        "Espaço preparado para futuras telas e funcionalidades do ecossistema.",
      cta: "Em breve",
      tone: "slate" as const,
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
    <div className="relative min-h-screen overflow-x-hidden sgt-bg-base sgt-text">
      {/* ── Atmosfera ── */}
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_75%_50%_at_50%_-8%,rgba(180,110,4,0.22),transparent_58%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_55%_50%_at_85%_110%,rgba(139,92,246,0.08),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_50%_45%_at_15%_110%,rgba(6,182,212,0.06),transparent_60%)]" />

      {/* ── Topbar (ícone usuário com acesso admin) ── */}
      <header className="relative z-20">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-5 lg:px-10">
          <motion.div
            initial={reduce ? false : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10">
              <Workflow className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-400/70">
                Workflow SGT
              </p>
              <p className="text-[9px] tracking-[0.18em] text-[var(--sgt-text-muted)]">
                PORTAL CORPORATIVO
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <UserMenu showAdmin />
          </motion.div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-[1500px] flex-col items-center justify-center px-6 py-16 text-center lg:px-10">
        {/* Selo */}
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
            Ecossistema digital
          </span>
        </motion.div>

        {/* Título */}
        <h1 className="text-[clamp(2.4rem,6.2vw,5.2rem)] font-black leading-[1.02] tracking-[-0.045em] sgt-text">
          <span className="block">
            <AnimatedTitle text="Seja bem-vindo ao" />
          </span>
          <span className="mt-2 block bg-gradient-to-r from-amber-300 via-amber-200 to-amber-500 bg-clip-text text-transparent">
            <AnimatedTitle text="Workflow" delay={0.45} />
          </span>
        </h1>

        {/* Logo SGT abaixo do Workflow */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6"
        >
          <SgtLogoSlot />
        </motion.div>

        {/* Subtítulo */}
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.15 }}
          className="mt-8 max-w-[680px] text-[15px] leading-relaxed text-[var(--sgt-text-muted)] lg:text-[16px]"
        >
          Seu ecossistema para gestão, análise e evolução de processos. Acesse módulos
          principais e ferramentas complementares em um único ambiente.
        </motion.p>

        {/* Ações */}
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

        {/* Scroll indicator */}
        <motion.button
          onClick={scrollToModules}
          aria-label="Rolar para módulos"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.6 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[var(--sgt-text-muted)] hover:text-amber-300 transition-colors"
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
      <section id="modulos" className="relative z-10 mx-auto max-w-[1500px] px-6 py-20 lg:px-10">
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
            Acessos do Workflow SGT
          </h2>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => (
            <ModuleCard key={m.key} data={m} index={i} />
          ))}
        </div>
      </section>

      {/* ── FERRAMENTAS COMPLEMENTARES ── */}
      <section id="ferramentas" className="relative z-10 mx-auto max-w-[1500px] px-6 pb-24 pt-8 lg:px-10">
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
                ecossistema Workflow SGT.
              </p>
            </div>
          </motion.a>
        </div>

        <p className="mt-16 text-center text-[10px] tracking-[0.2em] text-[var(--sgt-text-faint)]">
          © 2026 SGT Log · Workflow Corporativo
        </p>
      </section>
    </div>
  );
}
