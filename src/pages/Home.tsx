import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform, MotionValue } from "framer-motion";
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
  CreditCard,
  ShoppingCart,
  Wrench,
  Settings,
  Receipt,
  Fuel,
  Car,
  LineChart,
  Monitor,
  Table,
  FileText,
  Banknote,
} from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
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
  blue: {
    iconBg: "bg-[#4A6FB8]/15 border border-[#4A6FB8]/30",
    iconText: "text-[#A8C0E8]",
    ring: "hover:border-[#4A6FB8]/50",
    cta: "text-[#A8C0E8]",
    glow: "from-[#4A6FB8]/25",
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
        initial={reduce ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.25, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -6, scale: 1.01, transition: { duration: 0.12, ease: "easeOut" } }}
        className={`group relative flex h-full w-full flex-col items-start gap-5 overflow-hidden rounded-3xl border-2 p-8 text-left backdrop-blur-sm transition-all duration-300 cursor-pointer ${f.border} ${f.bgGrad} ${f.hoverBorder} ${f.hoverShadow}`}
      >
        <div className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${f.glow1} via-transparent to-transparent opacity-100`} />
        <div className={`pointer-events-none absolute -top-24 left-1/2 h-48 w-[90%] -translate-x-1/2 rounded-full bg-gradient-to-b ${f.glow2} to-transparent blur-3xl transition-opacity duration-500 opacity-60 group-hover:opacity-100`} />

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
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={data.disabled ? undefined : { y: -4, transition: { duration: 0.12, ease: "easeOut" } }}
      className={`group relative flex h-full w-full flex-col items-start gap-5 overflow-hidden rounded-3xl border p-7 text-left backdrop-blur-sm transition-all duration-300 ${tone.ring} ${
        data.disabled
          ? "cursor-default opacity-80 dark:border-white/8 border-slate-200 dark:bg-white/[0.03] bg-slate-50"
          : "cursor-pointer dark:border-white/10 border-slate-200 dark:bg-white/[0.04] bg-white hover:dark:bg-white/[0.08] hover:bg-slate-50 dark:hover:border-white/20 hover:border-slate-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
      }`}
    >
      {/* Glow superior */}
      <div
        className={`pointer-events-none absolute -top-20 left-1/2 h-40 w-[80%] -translate-x-1/2 rounded-full bg-gradient-to-b ${tone.glow} to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
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
          data.href
            ? <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            : <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        )}
      </div>
    </motion.button>
  );
}

/* ---------------------------------------------------------------- */
/*  Abrir Excel/Word local (Windows) com fallback para Office Online */
/* ---------------------------------------------------------------- */
function openOfficeApp(app: "excel" | "word") {
  const protocol = app === "excel" ? "ms-excel:nft|u|" : "ms-word:nft|u|";
  const fallbackUrl =
    app === "excel"
      ? "https://www.office.com/launch/excel"
      : "https://www.office.com/launch/word";

  // Abre via iframe oculto: se o protocolo estiver registrado no SO,
  // o app local abre. Após um pequeno timeout, abre o fallback online.
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = `${protocol}new`;
  document.body.appendChild(iframe);

  const start = Date.now();
  const fallbackTimer = window.setTimeout(() => {
    // Se a página perdeu o foco rapidamente, o app local abriu.
    if (document.hidden || Date.now() - start > 2200) return;
    window.open(fallbackUrl, "_blank", "noopener,noreferrer");
  }, 1500);

  const onBlur = () => {
    window.clearTimeout(fallbackTimer);
    window.removeEventListener("blur", onBlur);
  };
  window.addEventListener("blur", onBlur);

  window.setTimeout(() => iframe.remove(), 4000);
}

export default function Home() {
  const navigate = useNavigate();
  const { canAccess } = usePagePermissions();
  const reduce = useReducedMotion();

  // Parallax — scroll do container .section (overflow-auto)
  const scrollRef = useRef<HTMLElement | null>(null);
  const { scrollY } = useScroll({ container: scrollRef as React.RefObject<HTMLElement> });
  const auroraY = useTransform(scrollY, [0, 800], [0, -120]);
  const auroraScale = useTransform(scrollY, [0, 800], [1, 1.08]);
  const lightsY = useTransform(scrollY, [0, 800], [0, -60]);
  const heroY = useTransform(scrollY, [0, 600], [0, 140]);
  const logoY = useTransform(scrollY, [0, 600], [0, 70]);
  const heroOpacity = useTransform(scrollY, [0, 400, 700], [1, 0.85, 0.35]);



  const modules: ModuleCardData[] = [
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
      key: "faturamento",
      icon: LineChart,
      title: "Faturamento",
      description: "Emissão de NF, faturamento por cliente e acompanhamento de receitas.",
      cta: "Acessar faturamento",
      onClick: () => navigate("/faturamento"),
      tone: "amber" as const,
    },
    {
      key: "rh",
      icon: Users,
      title: "RH",
      description: "Gestão de colaboradores, folha de pagamento, admissões e desligamentos.",
      cta: "Acessar RH",
      onClick: () => navigate("/rh"),
      tone: "violet" as const,
    },
    {
      key: "compras",
      icon: ShoppingCart,
      title: "Compras",
      description: "Notas fiscais de entrada, fornecedores, grupos de produtos e centro de custo.",
      cta: "Acessar compras",
      onClick: () => navigate("/compras"),
      tone: "amber" as const,
    },
    {
      key: "manutencao",
      icon: Wrench,
      title: "Manutenção",
      description: "Ordens de serviço, preventiva e corretiva de veículos e equipamentos.",
      cta: "Acessar",
      onClick: () => navigate("/manutencao"),
      tone: "orange" as const,
    },
    {
      key: "operacional",
      icon: Settings,
      title: "Operacional",
      description: "Gestão de rotas, viagens, motoristas e desempenho operacional.",
      cta: "Acessar operacional",
      onClick: () => navigate("/operacional"),
      tone: "cyan" as const,
    },
    {
      key: "abastecimento",
      icon: Fuel,
      title: "Abastecimento",
      description: "Controle de combustível, consumo por veículo e custo operacional.",
      cta: "Acessar abastecimento",
      onClick: () => navigate("/abastecimento"),
      tone: "orange" as const,
    },
    {
      key: "frota",
      icon: Car,
      title: "Frota",
      description: "Cadastro de veículos, custo de manutenção por veículo, idade da frota e validações analíticas.",
      cta: "Acessar frota",
      onClick: () => navigate("/frota"),
      tone: "rose" as const,
    },
    {
      key: "financeiro",
      icon: Banknote,
      title: "Financeiro",
      description: "Portal financeiro completo: contas a pagar e receber, conciliação bancária, relatórios, fornecedores, categorias e bancos.",
      cta: "Acessar financeiro",
      onClick: () => navigate("/financeiro"),
      tone: "emerald" as const,
    },
    {
      key: "executivo",
      icon: BarChart3,
      title: "Executivo",
      description: "Painel de comando com KPIs consolidados de financeiro, frota, operacional, RH, compras e manutenção.",
      cta: "Acessar executivo",
      onClick: () => navigate("/executivo"),
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
      {/* Atmosfera dark */}
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_75%_50%_at_50%_-8%,rgba(180,110,4,0.22),transparent_58%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_55%_50%_at_85%_110%,rgba(139,92,246,0.08),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_50%_45%_at_15%_110%,rgba(6,182,212,0.06),transparent_60%)]" />

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
        {/* Aurora executiva — 3 radiais (parallax lento) */}
        <motion.div
          className="pointer-events-none absolute inset-0 overflow-hidden will-change-transform"
          style={{
            y: reduce ? 0 : auroraY,
            scale: reduce ? 1 : auroraScale,
            backgroundImage: [
              "radial-gradient(ellipse 60% 50% at 20% 25%, rgba(30,58,95,0.32), transparent 65%)",
              "radial-gradient(ellipse 55% 45% at 80% 30%, rgba(180,140,70,0.18), transparent 65%)",
              "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(15,27,45,0.45), transparent 70%)",
            ].join(", "),
            filter: "blur(2px)",
          }}
        />

        {/* Luzes de fundo (parallax médio) */}
        <motion.div className="pointer-events-none absolute inset-0 will-change-transform"
          style={{ y: reduce ? 0 : lightsY, background: "radial-gradient(ellipse 70% 55% at 50% 30%, rgba(245,158,11,0.08), transparent 70%)" }} />
        <motion.div className="pointer-events-none absolute inset-0 will-change-transform"
          style={{ y: reduce ? 0 : lightsY, background: "radial-gradient(ellipse 40% 40% at 10% 50%, rgba(6,182,212,0.06), transparent 60%)" }} />
        <motion.div className="pointer-events-none absolute inset-0 will-change-transform"
          style={{ y: reduce ? 0 : lightsY, background: "radial-gradient(ellipse 40% 40% at 90% 50%, rgba(139,92,246,0.06), transparent 60%)" }} />


        <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 w-full">

          {/* Top bar */}
          <div className="flex items-center justify-end py-1">
            <UserMenu showAdmin />
          </div>
          <TodayTicketsPopup />

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

            <h1 className="text-[clamp(3rem,9vw,8rem)] font-black leading-[1.15] tracking-[-0.03em] w-full">
              <span className="block dark:bg-gradient-to-r dark:from-slate-200 dark:via-white dark:to-slate-300 dark:bg-clip-text dark:text-transparent text-slate-800 pb-3">
                <AnimatedTitle text="Seja bem-vindo ao" />
              </span>
              <span className="block bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 bg-clip-text text-transparent pb-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[900px] mx-auto">
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
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold sgt-text">ReceitaFlow</h3>
                    <ExternalLink className="h-3 w-3 text-[var(--sgt-text-muted)] transition-colors group-hover:text-cyan-300" />
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--sgt-text-muted)]">
                    Ferramenta complementar para apoiar rotinas e processos vinculados ao ecossistema Workspace SGT.
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
                  <BarChart3 className="h-5 w-5" />
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

              <motion.button
                type="button"
                onClick={() => openOfficeApp("excel")}
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: 0.2 }}
                whileHover={{ y: -3 }}
                className="group flex items-start gap-5 rounded-3xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]/40 p-6 backdrop-blur-sm transition-colors hover:border-emerald-400/30 hover:bg-[var(--sgt-input-hover)]/60 text-left cursor-pointer"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  <Table className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold sgt-text">Microsoft Excel</h3>
                    <ExternalLink className="h-3 w-3 text-[var(--sgt-text-muted)] transition-colors group-hover:text-emerald-300" />
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--sgt-text-muted)]">
                    Abre o Excel instalado na sua máquina. Caso não esteja disponível, abre o Excel Online.
                  </p>
                </div>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => openOfficeApp("word")}
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: 0.3 }}
                whileHover={{ y: -3 }}
                className="group flex items-start gap-5 rounded-3xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]/40 p-6 backdrop-blur-sm transition-colors hover:border-blue-400/30 hover:bg-[var(--sgt-input-hover)]/60 text-left cursor-pointer"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/10 text-blue-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold sgt-text">Microsoft Word</h3>
                    <ExternalLink className="h-3 w-3 text-[var(--sgt-text-muted)] transition-colors group-hover:text-blue-300" />
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--sgt-text-muted)]">
                    Abre o Word instalado na sua máquina. Caso não esteja disponível, abre o Word Online.
                  </p>
                </div>
              </motion.button>
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
