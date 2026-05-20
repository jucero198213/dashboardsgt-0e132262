import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Globe,
  Pin,
  ClipboardList,
  Truck,
  Users,
  ShoppingCart,
  Wrench,
  Settings,
  Fuel,
  Car,
  LineChart,
  Monitor,
  Table,
  FileText,
  Banknote,
  MapPin,
  UserCog,
} from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import { TodayTicketsPopup } from "@/components/admin/tickets/TodayTicketsPopup";
import sgtLogo from "@/assets/sgt-logo.png";

/* ---------------------------------------------------------------- */
/*  Logo SGT oficial — PNG vetorizado com fundo transparente.        */
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
  href?: string;
  tone: "amber" | "violet" | "slate" | "cyan" | "emerald" | "rose" | "orange" | "blue";
  disabled?: boolean;
  pinned?: boolean;
  featured?: boolean;
}

const TONE: Record<
  string,
  { iconBg: string; iconText: string; ring: string; cta: string; glow: string; accent: string; hoverShadow: string }
> = {
  amber: {
    iconBg: "bg-amber-400/10 border border-amber-400/20",
    iconText: "text-amber-300",
    ring: "hover:border-amber-400/40",
    cta: "text-amber-300",
    glow: "from-amber-400/20",
    accent: "from-amber-400/70 via-amber-400/30 to-transparent",
    hoverShadow: "hover:shadow-[0_8px_32px_rgba(251,191,36,0.12)]",
  },
  violet: {
    iconBg: "bg-violet-400/10 border border-violet-400/20",
    iconText: "text-violet-300",
    ring: "hover:border-violet-400/40",
    cta: "text-violet-300",
    glow: "from-violet-400/20",
    accent: "from-violet-400/70 via-violet-400/30 to-transparent",
    hoverShadow: "hover:shadow-[0_8px_32px_rgba(167,139,250,0.12)]",
  },
  slate: {
    iconBg: "bg-slate-400/10 border border-slate-400/20",
    iconText: "text-slate-300",
    ring: "",
    cta: "text-slate-400",
    glow: "from-slate-400/10",
    accent: "from-slate-400/40 via-slate-400/15 to-transparent",
    hoverShadow: "",
  },
  emerald: {
    iconBg: "bg-emerald-400/10 border border-emerald-400/20",
    iconText: "text-emerald-300",
    ring: "hover:border-emerald-400/40",
    cta: "text-emerald-300",
    glow: "from-emerald-400/20",
    accent: "from-emerald-400/70 via-emerald-400/30 to-transparent",
    hoverShadow: "hover:shadow-[0_8px_32px_rgba(52,211,153,0.12)]",
  },
  cyan: {
    iconBg: "bg-cyan-400/10 border border-cyan-400/20",
    iconText: "text-cyan-300",
    ring: "hover:border-cyan-400/40",
    cta: "text-cyan-400",
    glow: "from-cyan-400/20",
    accent: "from-cyan-400/70 via-cyan-400/30 to-transparent",
    hoverShadow: "hover:shadow-[0_8px_32px_rgba(34,211,238,0.12)]",
  },
  rose: {
    iconBg: "bg-rose-400/10 border border-rose-400/20",
    iconText: "text-rose-300",
    ring: "hover:border-rose-400/40",
    cta: "text-rose-300",
    glow: "from-rose-400/20",
    accent: "from-rose-400/70 via-rose-400/30 to-transparent",
    hoverShadow: "hover:shadow-[0_8px_32px_rgba(251,113,133,0.12)]",
  },
  orange: {
    iconBg: "bg-orange-400/10 border border-orange-400/20",
    iconText: "text-orange-300",
    ring: "hover:border-orange-400/40",
    cta: "text-orange-300",
    glow: "from-orange-400/20",
    accent: "from-orange-400/70 via-orange-400/30 to-transparent",
    hoverShadow: "hover:shadow-[0_8px_32px_rgba(251,146,60,0.12)]",
  },
  blue: {
    iconBg: "bg-[#4A6FB8]/15 border border-[#4A6FB8]/30",
    iconText: "text-[#A8C0E8]",
    ring: "hover:border-[#4A6FB8]/50",
    cta: "text-[#A8C0E8]",
    glow: "from-[#4A6FB8]/25",
    accent: "from-[#4A6FB8]/70 via-[#4A6FB8]/30 to-transparent",
    hoverShadow: "hover:shadow-[0_8px_32px_rgba(74,111,184,0.15)]",
  },
};

function ModuleCard({ data, index }: { data: ModuleCardData; index: number }) {
  const tone = TONE[data.tone];
  const Icon = data.icon;
  const reduce = useReducedMotion();

  const handleClick = () => {
    if (data.href) { window.open(data.href, "_blank", "noopener,noreferrer"); return; }
    data.onClick?.();
  };

  if (data.featured) {
    const featuredStyles: Record<string, {
      border: string; bgGrad: string; hoverBorder: string; hoverShadow: string;
      glow1: string; glow2: string; line: string;
      badgeBorder: string; badgeBg: string; badgeText: string;
      iconBorder: string; iconBg: string; iconText: string; iconShadow: string;
      ctaText: string;
    }> = {
      amber: {
        border: "border-amber-400/40",
        bgGrad: "bg-gradient-to-br from-amber-400/[0.08] via-amber-400/[0.04] to-transparent",
        hoverBorder: "hover:border-amber-400/70",
        hoverShadow: "hover:shadow-[0_0_40px_rgba(251,191,36,0.15),0_8px_32px_rgba(0,0,0,0.2)]",
        glow1: "from-amber-400/10",
        glow2: "from-amber-400/25",
        line: "via-amber-400/60",
        badgeBorder: "border-amber-400/40", badgeBg: "bg-amber-400/15", badgeText: "text-amber-300",
        iconBorder: "border-amber-400/30", iconBg: "bg-amber-400/15", iconText: "text-amber-300",
        iconShadow: "shadow-[0_0_20px_rgba(251,191,36,0.15)]",
        ctaText: "text-amber-300",
      },
      blue: {
        border: "border-[#4A6FB8]/45",
        bgGrad: "bg-gradient-to-br from-[#4A6FB8]/[0.10] via-[#4A6FB8]/[0.05] to-transparent",
        hoverBorder: "hover:border-[#4A6FB8]/75",
        hoverShadow: "hover:shadow-[0_0_40px_rgba(74,111,184,0.18),0_8px_32px_rgba(0,0,0,0.2)]",
        glow1: "from-[#4A6FB8]/12",
        glow2: "from-[#4A6FB8]/30",
        line: "via-[#4A6FB8]/65",
        badgeBorder: "border-[#4A6FB8]/45", badgeBg: "bg-[#4A6FB8]/20", badgeText: "text-[#A8C0E8]",
        iconBorder: "border-[#4A6FB8]/35", iconBg: "bg-[#4A6FB8]/20", iconText: "text-[#A8C0E8]",
        iconShadow: "shadow-[0_0_20px_rgba(74,111,184,0.2)]",
        ctaText: "text-[#A8C0E8]",
      },
      rose: {
        border: "border-rose-400/45",
        bgGrad: "bg-gradient-to-br from-rose-400/[0.10] via-rose-400/[0.05] to-transparent",
        hoverBorder: "hover:border-rose-400/75",
        hoverShadow: "hover:shadow-[0_0_40px_rgba(244,63,94,0.18),0_8px_32px_rgba(0,0,0,0.2)]",
        glow1: "from-rose-400/12",
        glow2: "from-rose-400/30",
        line: "via-rose-400/65",
        badgeBorder: "border-rose-400/45", badgeBg: "bg-rose-400/18", badgeText: "text-rose-300",
        iconBorder: "border-rose-400/35", iconBg: "bg-rose-400/18", iconText: "text-rose-300",
        iconShadow: "shadow-[0_0_20px_rgba(244,63,94,0.2)]",
        ctaText: "text-rose-300",
      },
    };
    const f = featuredStyles[data.tone] ?? featuredStyles.amber;
    return (
      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={{ y: -5, transition: { duration: 0.18, ease: "easeOut" } }}
        className={`group relative flex h-full w-full flex-col items-start gap-5 overflow-hidden rounded-3xl border-2 p-8 text-left transition-all duration-300 cursor-pointer ${f.border} ${f.bgGrad} ${f.hoverBorder} ${f.hoverShadow}`}
      >
        <div className={`pointer-events-none absolute -top-24 left-1/2 h-40 w-[80%] -translate-x-1/2 rounded-full bg-gradient-to-b ${f.glow2} to-transparent blur-2xl transition-opacity duration-500 opacity-0 group-hover:opacity-60`} />

        <div className={`absolute inset-x-0 top-0 h-[2px] rounded-t-3xl bg-gradient-to-r from-transparent ${f.line} to-transparent`} />

        <div className="absolute top-5 right-5 flex items-center gap-2">
          <div className={`flex items-center gap-1 rounded-full border ${f.badgeBorder} ${f.badgeBg} px-2.5 py-1`}>
            <Pin className={`h-2.5 w-2.5 ${f.badgeText}`} />
            <span className={`text-[9px] font-bold uppercase tracking-[0.18em] ${f.badgeText}`}>Fixado</span>
          </div>
        </div>

        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${f.iconBorder} ${f.iconBg} ${f.iconText} ${f.iconShadow}`}>
          <Icon className="h-6 w-6" />
        </div>

        <div className="flex-1 space-y-2 relative z-10">
          <h3 className="text-[20px] font-black tracking-tight sgt-text">{data.title}</h3>
          <p className="text-[13.5px] leading-relaxed text-[var(--sgt-text-muted)]">
            {data.description}
          </p>
        </div>

        <div className={`flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] ${f.ctaText} relative z-10`}>
          {data.cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1.5" />
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={data.disabled}
      whileHover={data.disabled ? undefined : { y: -4, transition: { duration: 0.15, ease: "easeOut" } }}
      className={`group relative flex h-full w-full flex-col items-start gap-5 overflow-hidden rounded-3xl border p-7 text-left transition-all duration-300 ${tone.ring} ${tone.hoverShadow} ${
        data.disabled
          ? "cursor-default opacity-80 dark:border-white/8 border-slate-200 dark:bg-white/[0.03] bg-slate-50"
          : "cursor-pointer dark:border-white/10 border-slate-200 dark:bg-white/[0.04] bg-white hover:dark:bg-white/[0.07] hover:bg-slate-50 dark:hover:border-white/20 hover:border-slate-300"
      }`}
    >
      {/* Linha de acento no topo */}
      {!data.disabled && (
        <div className={`absolute inset-x-0 top-0 h-[2px] rounded-t-3xl bg-gradient-to-r ${tone.accent}`} />
      )}

      {/* Glow superior — sutil no hover */}
      <div
        className={`pointer-events-none absolute -top-16 left-1/2 h-32 w-[70%] -translate-x-1/2 rounded-full bg-gradient-to-b ${tone.glow} to-transparent opacity-0 blur-xl transition-opacity duration-400 group-hover:opacity-70`}
      />

      {/* Badge fixado */}
      {data.pinned && !data.featured && (
        <div className={`absolute top-4 right-4 flex items-center gap-1 rounded-full border px-2 py-0.5 ${tone.iconBg} ${tone.iconText}`}
          style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          <Pin className="h-2.5 w-2.5" />
          <span className="text-[9px] font-bold uppercase tracking-[0.18em]">Fixado</span>
        </div>
      )}

      {/* Ícone */}
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${tone.iconBg} ${tone.iconText}`}>
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
          data.href
            ? <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            : <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        )}
      </div>
    </motion.button>
  );
}

/* ---------------------------------------------------------------- */
/*  Abrir Excel/Word Online (Microsoft 365 na web)                   */
/* ---------------------------------------------------------------- */
function openOfficeApp(app: "excel" | "word") {
  const url =
    app === "excel"
      ? "https://www.office.com/launch/excel"
      : "https://www.office.com/launch/word";
  window.open(url, "_blank", "noopener,noreferrer");
}

/* ---------------------------------------------------------------- */
/*  Reveal — fade + slide up, dispara uma vez ao entrar na tela      */
/* ---------------------------------------------------------------- */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

function useGreeting(email?: string) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const raw = (email ?? "").split("@")[0].split(/[._-]/)[0].replace(/\d+/g, "").trim();
  const name = raw.length >= 2
    ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
    : "";

  return { greeting, name };
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAccess } = usePagePermissions();
  const reduce = useReducedMotion();
  const { greeting, name } = useGreeting(user?.email);

  // Parallax — scroll do container .section (overflow-auto)
  const scrollRef = useRef<HTMLElement | null>(null);
  const { scrollY } = useScroll({ container: scrollRef as React.RefObject<HTMLElement> });
  const heroY = useTransform(scrollY, [0, 600], [0, 320]);
  const logoY = useTransform(scrollY, [0, 600], [0, 180]);
  const heroOpacity = useTransform(scrollY, [0, 300, 600], [1, 0.6, 0]);




  // ── Cards fixados — NÃO ALTERAR ──────────────────────────────────
  const pinnedModules: ModuleCardData[] = [
    {
      key: "visual-rodopar",
      icon: Globe,
      title: "Visual Rodopar",
      description: "Portal de gestão e monitoramento complementar ao ecossistema Workspace SGT.",
      cta: "Acessar portal",
      href: "https://webcloud2.datapardc.com/",
      tone: "amber" as const,
      pinned: true,
      featured: true,
    },
    {
      key: "portal-wr-sgt",
      icon: Monitor,
      title: "Portal WR SGT",
      description: "Acesso ao portal WR SGT para gestão e operação do sistema integrado.",
      cta: "Acessar portal",
      href: "http://54.232.121.164:9474/#/login",
      tone: "blue" as const,
      pinned: true,
      featured: true,
    },
    {
      key: "chamados",
      icon: ClipboardList,
      title: "Chamados",
      description: "Abra e acompanhe chamados de suporte. Admins podem gerenciar status, responsáveis e prioridades.",
      cta: "Acessar chamados",
      onClick: () => navigate("/chamados"),
      tone: "rose" as const,
      pinned: true,
      featured: true,
    },
  ];

  // ── Cards de módulo agrupado — mesmo padrão visual do ModuleCard ──
  const moduleCards: ModuleCardData[] = [
    {
      key: "receitaflow",
      icon: Sparkles,
      title: "ReceitaFlow",
      description: "Ferramenta complementar para apoiar rotinas e processos vinculados ao ecossistema Workspace SGT.",
      cta: "Acessar ReceitaFlow",
      href: "https://receitaflow.lovable.app",
      tone: "cyan" as const,
    },
    {
      key: "financeiro",
      icon: Banknote,
      title: "Financeiro",
      description: "Contas a pagar e receber, conciliação bancária, fluxo de caixa e relatórios financeiros.",
      cta: "Acessar financeiro",
      onClick: () => navigate("/financeiro"),
      tone: "emerald" as const,   // verde = dinheiro/finanças
    },
    {
      key: "gestao",
      icon: BarChart3,
      title: "Gestão",
      description: "Painel executivo, indicadores estratégicos e faturamento consolidado.",
      cta: "Acessar gestão",
      onClick: () => navigate("/executivo"),
      tone: "violet" as const,    // violeta = inteligência/estratégia
    },
    {
      key: "operacao",
      icon: MapPin,
      title: "Operação",
      description: "Operacional, gestão de frota, financiamentos, manutenção e abastecimento.",
      cta: "Acessar operação",
      onClick: () => navigate("/operacional"),
      tone: "blue" as const,       // azul = movimento/logística
    },
    {
      key: "compras",
      icon: ShoppingCart,
      title: "Compras",
      description: "Notas fiscais de entrada, fornecedores, grupos de produtos e centro de custo.",
      cta: "Acessar compras",
      onClick: () => navigate("/compras"),
      tone: "orange" as const,    // laranja = comércio/aquisição
    },
    {
      key: "rh",
      icon: UserCog,
      title: "RH",
      description: "Gestão de colaboradores, folha de pagamento, admissões e desligamentos.",
      cta: "Acessar RH",
      onClick: () => navigate("/rh"),
      tone: "rose" as const,      // rosa = pessoas/equipe
    },
  ];

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
      {/* Atmosfera dark — sutil */}
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_75%_50%_at_50%_-8%,rgba(180,110,4,0.10),transparent_58%)]" />

      {/* Section envolvente */}
      <section
        ref={scrollRef}
        className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto"
        style={{
          background: "var(--sgt-bg-section)",
          borderColor: "var(--sgt-border-subtle)",
          boxShadow: "var(--sgt-section-shadow)",
        }}
      >
        {/* Ambient sutil */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 65% 40% at 50% 10%, rgba(180,140,70,0.08), transparent 65%)" }}
        />


        <>
        <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 w-full">

          {/* Top bar */}
          <div className="flex items-center justify-between py-1">
            {/* Saudação na top bar — discreta, sempre visível */}
            <motion.span
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden sm:block text-[14px] font-medium text-slate-400 tracking-wide pl-1"
            >
              {name ? `${greeting}, ${name}! 👋` : `${greeting}! 👋`}
            </motion.span>
            <UserMenu showAdmin />
          </div>
          <TodayTicketsPopup />

          {/* ── HERO ── */}
          <motion.section
            style={reduce ? undefined : { y: heroY, opacity: heroOpacity }}
            className="relative mx-auto flex w-full max-w-[1500px] flex-col items-center justify-center px-4 pt-16 pb-6 text-center sm:pt-20 sm:pb-8 lg:px-10 lg:pt-24 lg:pb-10 will-change-transform">

            {/* Título hero */}
            <h1 className="w-full leading-none tracking-tight">

              {/* "BEM-VINDO AO" — visível, claro, espaçado */}
              <motion.span
                className="block text-[clamp(0.7rem,1.3vw,1rem)] font-semibold uppercase tracking-[0.5em] text-slate-300/70 mb-4"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.3 }}
              >
                Bem&#8209;vindo ao
              </motion.span>

              {/* "Workspace" — de branco/creme até laranja, máximo contraste */}
              <span
                className="block font-black tracking-[-0.04em] bg-clip-text text-transparent"
                style={{
                  fontSize: "clamp(4.5rem,13vw,11rem)",
                  backgroundImage: "linear-gradient(135deg, #fffbeb 0%, #fcd34d 30%, #f59e0b 60%, #ea580c 100%)",
                  filter: "drop-shadow(0 2px 16px rgba(245,158,11,0.22))",
                  lineHeight: 1,
                }}
              >
                <AnimatedTitle text="Workspace" delay={0.4} />
              </span>

              {/* Linha decorativa — cor que une frio e quente */}
              <motion.span
                className="block mx-auto mt-6 h-[1.5px] rounded-full"
                style={{
                  width: "clamp(100px,28vw,280px)",
                  background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.3) 20%, rgba(245,158,11,0.7) 50%, rgba(251,191,36,0.3) 80%, transparent)",
                }}
                initial={reduce ? false : { scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
              />
            </h1>

            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
              style={reduce ? undefined : { y: logoY }}
              className="mt-8 flex w-full justify-center will-change-transform"
            >
              <SgtLogoSlot className="h-[100px] sm:h-[130px] lg:h-[155px]" />
            </motion.div>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.15 }}
              className="mt-6 max-w-[720px] text-[16px] leading-relaxed dark:text-slate-400 text-slate-600 lg:text-[17px]"
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
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/[0.15] px-8 text-[14px] font-semibold dark:text-amber-200 text-amber-700 transition-all hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-amber-500/[0.25] hover:shadow-[0_8px_28px_rgba(245,158,11,0.25)]"
              >
                Explorar módulos
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={scrollToTools}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border dark:border-white/10 border-slate-300 dark:bg-white/[0.04] bg-slate-100 px-8 text-[14px] font-semibold dark:text-slate-300 text-slate-600 transition-all hover:-translate-y-0.5 dark:hover:border-white/20 hover:border-slate-400 dark:hover:bg-white/[0.08] hover:bg-slate-200 dark:hover:text-white hover:text-slate-800"
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
          </motion.section>

          {/* ── MÓDULOS PRINCIPAIS ── */}
          <section id="modulos" className="relative mx-auto w-full max-w-[1500px] px-4 py-10 lg:px-10 lg:py-14">

            <Reveal className="mb-10 text-center">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.32em] text-amber-400/80">
                Acessos rápidos
              </p>
              <h2 className="text-[clamp(1.75rem,3.5vw,2.8rem)] font-black tracking-[-0.03em] sgt-text">
                Acessos do Workspace SGT
              </h2>
            </Reveal>

            {/* Cards fixados — Visual Rodopar, Portal WR SGT, Chamados */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-14">
              {pinnedModules.map((m, i) => (
                <Reveal key={m.key} delay={i * 0.12} className="h-full">
                  <ModuleCard data={m} index={0} />
                </Reveal>
              ))}
            </div>

            {/* Separador Módulos do sistema */}
            <Reveal delay={0.05} className="mb-8">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 dark:bg-white/[0.07] bg-slate-200" />
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] dark:text-slate-500 text-slate-400">
                  Módulos do sistema
                </p>
                <div className="h-px flex-1 dark:bg-white/[0.07] bg-slate-200" />
              </div>
            </Reveal>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {moduleCards.map((m, i) => (
                <Reveal key={m.key} delay={i * 0.1} className="h-full">
                  <ModuleCard data={m} index={0} />
                </Reveal>
              ))}
            </div>
          </section>

          {/* ── FERRAMENTAS COMPLEMENTARES ── */}
          <section id="ferramentas" className="relative mx-auto w-full max-w-[1500px] px-4 pb-16 pt-4 lg:px-10">
            <Reveal className="mb-10 text-center">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-400/80">
                Ferramentas complementares
              </p>
              <h2 className="text-[clamp(1.4rem,2.6vw,2rem)] font-bold tracking-[-0.025em] sgt-text">
                Recursos de apoio ao ecossistema
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[900px] mx-auto">
              {[
                { href: "https://receitaflow.lovable.app", label: "ReceitaFlow",
                  desc: "Ferramenta complementar para apoiar rotinas e processos vinculados ao ecossistema Workspace SGT.",
                  iconEl: <Sparkles className="h-5 w-5" />,
                  iconCls: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
                  hoverCls: "hover:border-cyan-400/30", linkCls: "group-hover:text-cyan-300", onClick: undefined as (() => void) | undefined },
                { href: "https://analyticspro.com.br", label: "Analytics Pro",
                  desc: "Plataforma de análise e inteligência de dados para apoiar a tomada de decisão no ecossistema SGT.",
                  iconEl: <BarChart3 className="h-5 w-5" />,
                  iconCls: "border-violet-400/20 bg-violet-400/10 text-violet-300",
                  hoverCls: "hover:border-violet-400/30", linkCls: "group-hover:text-violet-300", onClick: undefined as (() => void) | undefined },
                { href: undefined, label: "Microsoft Excel",
                  desc: "Acesse o Microsoft Excel Online para criar e editar planilhas diretamente no navegador.",
                  iconEl: <Table className="h-5 w-5" />,
                  iconCls: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
                  hoverCls: "hover:border-emerald-400/30", linkCls: "group-hover:text-emerald-300", onClick: () => openOfficeApp("excel") },
                { href: undefined, label: "Microsoft Word",
                  desc: "Acesse o Microsoft Word Online para criar e editar documentos diretamente no navegador.",
                  iconEl: <FileText className="h-5 w-5" />,
                  iconCls: "border-blue-400/20 bg-blue-400/10 text-blue-300",
                  hoverCls: "hover:border-blue-400/30", linkCls: "group-hover:text-blue-300", onClick: () => openOfficeApp("word") },
              ].map((item, i) => (
                <Reveal key={item.label} delay={i * 0.1} className="h-full">
                  {item.href ? (
                    <motion.a href={item.href} target="_blank" rel="noopener noreferrer"
                      whileHover={{ y: -3, transition: { duration: 0.15 } }}
                      className={`group flex items-start gap-5 rounded-3xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]/40 p-6 backdrop-blur-sm transition-colors hover:bg-[var(--sgt-input-hover)]/60 ${item.hoverCls} h-full`}>
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${item.iconCls}`}>{item.iconEl}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[15px] font-bold sgt-text">{item.label}</h3>
                          <ExternalLink className={`h-3 w-3 text-[var(--sgt-text-muted)] transition-colors ${item.linkCls}`} />
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-[var(--sgt-text-muted)]">{item.desc}</p>
                      </div>
                    </motion.a>
                  ) : (
                    <motion.button type="button" onClick={item.onClick}
                      whileHover={{ y: -3, transition: { duration: 0.15 } }}
                      className={`group flex items-start gap-5 rounded-3xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]/40 p-6 backdrop-blur-sm transition-colors hover:bg-[var(--sgt-input-hover)]/60 ${item.hoverCls} text-left cursor-pointer w-full h-full`}>
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${item.iconCls}`}>{item.iconEl}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[15px] font-bold sgt-text">{item.label}</h3>
                          <ExternalLink className={`h-3 w-3 text-[var(--sgt-text-muted)] transition-colors ${item.linkCls}`} />
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-[var(--sgt-text-muted)]">{item.desc}</p>
                      </div>
                    </motion.button>
                  )}
                </Reveal>
              ))}
            </div>

            <p className="mt-12 text-center text-[10px] tracking-[0.2em] text-[var(--sgt-text-faint)]">
              © 2026 SGT Log · Workspace Corporativo
            </p>
          </section>

        </div>
        </>
      </section>
    </div>
  );
}
