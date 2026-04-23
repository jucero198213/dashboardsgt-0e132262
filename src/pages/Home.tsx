import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Truck,
  Users,
  CreditCard,
  ShoppingCart,
  Wrench,
  Settings,
  Receipt,
  Fuel,
  Car,
  LineChart,
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
  tone: "amber" | "violet" | "slate" | "cyan" | "emerald" | "rose" | "orange";
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
  emerald: {
    iconBg: "bg-emerald-400/10 border border-emerald-400/20",
    iconText: "text-emerald-300",
    ring: "hover:border-emerald-400/40",
    cta: "text-emerald-300",
    glow: "from-emerald-400/20",
  },
  cyan: {
    iconBg: "bg-cyan-400/10 border border-cyan-400/20",
    iconText: "text-cyan-300",
    ring: "hover:border-cyan-400/40",
    cta: "text-cyan-400",
    glow: "from-cyan-400/20",
  },
  rose: {
    iconBg: "bg-rose-400/10 border border-rose-400/20",
    iconText: "text-rose-300",
    ring: "hover:border-rose-400/40",
    cta: "text-rose-300",
    glow: "from-rose-400/20",
  },
  orange: {
    iconBg: "bg-orange-400/10 border border-orange-400/20",
    iconText: "text-orange-300",
    ring: "hover:border-orange-400/40",
    cta: "text-orange-300",
    glow: "from-orange-400/20",
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
      className={`group relative flex h-full w-full flex-col items-start gap-5 overflow-hidden rounded-3xl border p-7 text-left backdrop-blur-sm transition-all duration-300 ${tone.ring} ${
        data.disabled
          ? "cursor-default opacity-80 border-white/8 bg-white/[0.03]"
          : "cursor-pointer border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
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
      key: "financiamento",
      icon: Truck,
      title: "Financiamento de Frota",
      description: "Gerencie contratos, saldos devedores, parcelas e vencimentos de todos os financiamentos da frota.",
      cta: "Acessar financiamentos",
      onClick: () => navigate("/financiamento-frota"),
      tone: "emerald" as const,
    },
    {
      key: "rh",
      icon: Users,
      title: "RH",
      description: "Gestão de colaboradores, folha de pagamento, admissões e desligamentos.",
      cta: "Em breve",
      onClick: () => navigate("/em-desenvolvimento/rh"),
      tone: "violet" as const,
    },
    {
      key: "contas-a-pagar",
      icon: CreditCard,
      title: "Contas a Pagar",
      description: "Controle e gestão dos títulos a pagar, vencimentos e fluxo de caixa.",
      cta: "Em breve",
      onClick: () => navigate("/em-desenvolvimento/contas-a-pagar"),
      tone: "rose" as const,
    },
    {
      key: "contas-a-receber",
      icon: Receipt,
      title: "Contas a Receber",
      description: "Acompanhe títulos em aberto, recebimentos e inadimplência dos clientes.",
      cta: "Em breve",
      onClick: () => navigate("/em-desenvolvimento/contas-a-receber"),
      tone: "emerald" as const,
    },
    {
      key: "compras",
      icon: ShoppingCart,
      title: "Compras",
      description: "Pedidos de compra, fornecedores, cotações e controle de estoque.",
      cta: "Em breve",
      onClick: () => navigate("/em-desenvolvimento/compras"),
      tone: "amber" as const,
    },
    {
      key: "manutencao",
      icon: Wrench,
      title: "Manutenção",
      description: "Ordens de serviço, preventiva e corretiva de veículos e equipamentos.",
      cta: "Em breve",
      onClick: () => navigate("/em-desenvolvimento/manutencao"),
      tone: "orange" as const,
    },
    {
      key: "operacional",
      icon: Settings,
      title: "Operacional",
      description: "Gestão de rotas, viagens, motoristas e desempenho operacional.",
      cta: "Em breve",
      onClick: () => navigate("/em-desenvolvimento/operacional"),
      tone: "cyan" as const,
    },
    {
      key: "faturamento",
      icon: LineChart,
      title: "Faturamento",
      description: "Emissão de NF, faturamento por cliente e acompanhamento de receitas.",
      cta: "Em breve",
      onClick: () => navigate("/em-desenvolvimento/faturamento"),
      tone: "amber" as const,
    },
    {
      key: "abastecimento",
      icon: Fuel,
      title: "Abastecimento",
      description: "Controle de combustível, consumo por veículo e custo operacional.",
      cta: "Em breve",
      onClick: () => navigate("/em-desenvolvimento/abastecimento"),
      tone: "orange" as const,
    },
    {
      key: "frota",
      icon: Car,
      title: "Frota",
      description: "Gestão de veículos, documentação, licenciamento e disponibilidade da frota.",
      cta: "Em breve",
      onClick: () => navigate("/em-desenvolvimento/frota"),
      tone: "cyan" as const,
    },
    {
      key: "executivo",
      icon: BarChart3,
      title: "Executivo",
      description: "Painel gerencial com visão consolidada de todos os indicadores da empresa.",
      cta: "Em breve",
      onClick: () => navigate("/em-desenvolvimento/executivo"),
      tone: "violet" as const,
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

      {/* Section envolvente — mesmo padrão Dashboard / Indicadores */}
      <section
        className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto"
        style={{
          background: "linear-gradient(135deg, rgba(18,22,40,0.98) 0%, rgba(12,15,28,0.98) 50%, rgba(20,18,35,0.98) 100%)",
          borderColor: "var(--sgt-border-subtle)",
          boxShadow: "var(--sgt-section-shadow)",
        }}
      >
        {/* Background sutil — malha logística de pontos e linhas finas */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1.5" fill="rgba(255,255,255,0.12)" />
              </pattern>
              <pattern id="lines" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M0 80 L80 0" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
            <rect width="100%" height="100%" fill="url(#lines)" />
          </svg>
        </div>

        {/* Luz central suave — ilumina o hero */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 55% at 50% 30%, rgba(245,158,11,0.08), transparent 70%)" }} />
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 40% 40% at 10% 50%, rgba(6,182,212,0.06), transparent 60%)" }} />
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 40% 40% at 90% 50%, rgba(139,92,246,0.06), transparent 60%)" }} />
        <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 w-full">

          {/* Top bar minimalista — apenas UserMenu à direita */}
          <div className="flex items-center justify-end py-1">
            <UserMenu showAdmin />
          </div>

          {/* ── HERO ── */}
          <section className="relative mx-auto flex w-full max-w-[1500px] flex-col items-center justify-center px-4 pt-12 pb-8 text-center sm:pt-16 sm:pb-12 lg:px-10 lg:pt-20 lg:pb-16">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-4 py-2"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-300">
                SGT Log · Sistema de Gestão em Transporte
              </span>
            </motion.div>

            <h1 className="text-[clamp(2rem,8vw,7rem)] font-black leading-[1.05] tracking-[-0.045em]">
              <span className="block bg-gradient-to-r from-slate-200 via-white to-slate-300 bg-clip-text text-transparent">
                <AnimatedTitle text="Seja bem-vindo ao" />
              </span>
              <span className="mt-1 block bg-gradient-to-r from-amber-300 via-amber-200 to-amber-500 bg-clip-text text-transparent">
                <AnimatedTitle text="Workspace" delay={0.45} />
              </span>
            </h1>

            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 flex w-full justify-center"
            >
              <SgtLogoSlot className="h-[100px] sm:h-[130px] lg:h-[155px]" />
            </motion.div>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.15 }}
              className="mt-6 max-w-[720px] text-[16px] leading-relaxed text-slate-400 lg:text-[17px]"
            >
              Plataforma centralizada para gestão financeira, operacional e logística da SGT Log. Monitore indicadores, fluxo de caixa e desempenho da operação de transporte em tempo real.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.3 }}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
            >
              <button
                onClick={scrollToModules}
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/[0.15] px-8 text-[14px] font-semibold text-amber-200 transition-all hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-amber-400/[0.25] hover:shadow-[0_8px_28px_rgba(245,158,11,0.25)]"
              >
                Explorar módulos
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={scrollToTools}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-8 text-[14px] font-semibold text-slate-300 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
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
              className="mt-10 flex flex-col items-center gap-1.5 text-slate-600 hover:text-amber-300 transition-colors"
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
          <section id="modulos" className="relative mx-auto w-full max-w-[1500px] px-4 py-10 lg:px-10 lg:py-14">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="mb-10 text-center"
            >
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.32em] text-amber-400/80">
                Módulos principais
              </p>
              <h2 className="text-[clamp(1.75rem,3.5vw,2.8rem)] font-black tracking-[-0.03em] sgt-text">
                Acessos do Workspace SGT
              </h2>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

            <div className="mx-auto max-w-[640px] flex flex-col gap-4">
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

              <motion.a
                href="https://analyticspro.com.br"
                target="_blank"
                rel="noopener noreferrer"
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: 0.1 }}
                whileHover={{ y: -3 }}
                className="group flex items-start gap-5 rounded-3xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]/40 p-6 backdrop-blur-sm transition-colors hover:border-violet-400/30 hover:bg-[var(--sgt-input-hover)]/60"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
                  <BarChart3 className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold sgt-text">Analytics Pro</h3>
                    <ExternalLink className="h-3 w-3 text-[var(--sgt-text-muted)] transition-colors group-hover:text-violet-300" />
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--sgt-text-muted)]">
                    Plataforma de análise e inteligência de dados para apoiar a tomada de decisão no ecossistema SGT.
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
