import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  BarChart3, TrendingUp, DollarSign, Fuel, Wrench, FileText,
  ArrowRight, Shield, Zap, Globe, ChevronRight,
} from "lucide-react";

const METRICS = [
  { label: "Contas a Receber",  value: "R$ 10,7M", delta: "+12% vs mês ant.", color: "text-emerald-300", dot: "bg-emerald-400" },
  { label: "Contas a Pagar",    value: "R$ 12,2M", delta: "50,5% liquidado",  color: "text-amber-300",  dot: "bg-amber-400"  },
  { label: "Óleo Diesel",       value: "15,6%",    delta: "−10,4% da meta",   color: "text-cyan-300",   dot: "bg-cyan-400"   },
  { label: "Manutenção",        value: "4 C.C.",   delta: "Preventiva ok",    color: "text-violet-300", dot: "bg-violet-400" },
];

const FEATURES = [
  { icon: TrendingUp,  title: "Indicadores Estratégicos", desc: "Diesel, Folha, Pedágio, Manutenção e mais — real vs meta da diretoria em tempo real.", tone: "amber"   },
  { icon: DollarSign,  title: "Análise Financeira",       desc: "Contas a pagar e receber consolidadas com evolução mensal, inadimplência e realização.", tone: "emerald" },
  { icon: BarChart3,   title: "Composição por Fornecedor",desc: "Quebra detalhada de cada centavo por fornecedor, centro de custo e período.", tone: "cyan"    },
  { icon: Fuel,        title: "Óleo Diesel & Frota",      desc: "Gauge de consumo com referência ANP, preço de mercado e variação mensal integrados.", tone: "rose"    },
  { icon: Wrench,      title: "Manutenção de Frota",      desc: "Preventiva e corretiva monitoradas por veículo, com histórico e tendência de gastos.", tone: "violet"  },
  { icon: FileText,    title: "Documentos Detalhados",    desc: "Rastreabilidade completa: emissão, vencimento, pagamento, parcela e situação.", tone: "amber"   },
];

const TONE_FT: Record<string, { border: string; iconBg: string; iconTxt: string; stripe: string }> = {
  amber:   { border: "border-amber-400/[0.12]",   iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]",   iconTxt: "text-amber-300",   stripe: "from-amber-400/50 to-transparent" },
  emerald: { border: "border-emerald-400/[0.12]", iconBg: "bg-emerald-400/[0.08] border border-emerald-400/[0.15]",iconTxt: "text-emerald-300", stripe: "from-emerald-400/50 to-transparent" },
  cyan:    { border: "border-cyan-400/[0.12]",    iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]",    iconTxt: "text-cyan-300",    stripe: "from-cyan-400/50 to-transparent" },
  rose:    { border: "border-rose-400/[0.12]",    iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]",    iconTxt: "text-rose-300",    stripe: "from-rose-400/50 to-transparent" },
  violet:  { border: "border-violet-400/[0.12]",  iconBg: "bg-violet-400/[0.08] border border-violet-400/[0.15]",iconTxt: "text-violet-300",  stripe: "from-violet-400/50 to-transparent" },
};

export default function Landing() {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#060912]">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
    </div>
  );

  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#060912] text-white">

      {/* ── Atmosfera ── */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_-8%,rgba(180,110,4,0.26),transparent_58%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_50%_45%_at_100%_110%,rgba(6,182,212,0.07),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(ellipse 120% 120% at 50% 50%, transparent 10%, rgba(2,3,12,0.65) 100%)" }} />

      {/* ══ NAVBAR ══ */}
      <nav className="relative z-20 mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10">
            <BarChart3 className="h-4.5 w-4.5 text-amber-300" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-white">SGT Log</p>
            <p className="text-[9px] text-slate-600 tracking-[0.12em]">Gestão Financeira</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 text-[13px] font-semibold text-slate-300 transition-all hover:border-white/[0.15] hover:bg-white/[0.07] hover:text-white"
        >
          Acessar Portal <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </nav>

      {/* ══ HERO ══ */}
      <section className="relative mx-auto max-w-[1200px] px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-20 lg:px-10 lg:pt-28">
        <div className="mx-auto max-w-[760px] text-center">

          {/* Pill de status */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-4 py-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300">
              Portal Financeiro · Tempo Real
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(2.2rem,8vw,4.5rem)] font-black leading-[1.05] tracking-[-0.04em]">
            Análise
            <span className="block bg-gradient-to-r from-amber-300 via-amber-200 to-white bg-clip-text text-transparent">
              Consolidada
            </span>
            <span className="block text-slate-400">da Operação</span>
          </h1>

          <p className="mx-auto mt-4 max-w-[520px] text-[14px] leading-relaxed text-slate-400 sm:mt-6 sm:text-[16px] lg:text-[17px]">
            Indicadores financeiros estratégicos, contas a pagar e receber, evolução de custos e composição por fornecedor — tudo em uma única visão executiva.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-[14px] border border-amber-400/30 bg-amber-500/[0.12] px-7 text-[14px] font-bold text-amber-300 transition-all duration-300 hover:bg-amber-400/[0.20] hover:border-amber-400/50 hover:shadow-[0_8px_40px_rgba(245,158,11,0.22)]"
            >
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-amber-400/60 via-amber-300/40 to-transparent" />
              Acessar o Portal
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Mini dashboard preview ── */}
        <div className="relative mx-auto mt-10 max-w-[900px] sm:mt-16">
          {/* Glow sob o preview */}
          <div className="pointer-events-none absolute -inset-4 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(180,110,4,0.14),transparent_65%)]" />
          {/* Cards de métricas */}
          <div className="relative grid grid-cols-2 gap-3 rounded-[24px] border border-white/[0.07] bg-[rgba(8,11,20,0.90)] p-4 shadow-[0_40px_80px_rgba(0,0,0,0.6)] sm:grid-cols-4">
            {/* Stripe no topo do preview */}
            <div className="absolute inset-x-0 top-0 h-[1.5px] rounded-t-[24px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
            {METRICS.map((m) => (
              <div key={m.label} className="flex flex-col rounded-[14px] border border-white/[0.06] bg-[#0b0e1a] p-4">
                <div className="mb-3 flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">{m.label}</p>
                </div>
                <p className={`text-[22px] font-black leading-none tracking-[-0.04em] ${m.color}`}>{m.value}</p>
                <p className="mt-1.5 text-[10px] text-slate-600">{m.delta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="relative mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-20 lg:px-10">
        <div className="mb-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400/60">Módulos disponíveis</p>
          <h2 className="mt-3 text-[clamp(1.5rem,5vw,2.25rem)] font-black tracking-[-0.03em] text-white">
            Uma visão completa da operação
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc, tone }) => {
            const t = TONE_FT[tone];
            return (
              <div key={title} className={`group relative overflow-hidden rounded-[20px] border ${t.border} bg-[#0b0e1a] p-6 transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_4px_40px_rgba(0,0,0,0.4)]`}>
                <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${t.stripe}`} />
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${t.iconBg} ${t.iconTxt} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="mb-2 text-[15px] font-bold text-white">{title}</h3>
                <p className="text-[13px] leading-relaxed text-slate-500">{desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ TRUST BAR ══ */}
      <section className="relative border-t border-white/[0.05] bg-[rgba(6,9,18,0.60)]">
        <div className="mx-auto max-w-[1200px] px-6 py-10 sm:px-10">
          <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16">
            {[
              { icon: Shield, label: "Acesso por perfil",    sub: "Admin e usuário"     },
              { icon: Zap,    label: "Atualização em tempo real", sub: "Conectado ao DW"  },
              { icon: Globe,  label: "Acesso via browser",   sub: "Qualquer dispositivo" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
                  <Icon className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-300">{label}</p>
                  <p className="text-[11px] text-slate-600">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ══ */}
      <section className="relative mx-auto max-w-[1200px] px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(180,110,4,0.10),transparent_65%)]" />
        <h2 className="relative text-[clamp(1.5rem,5vw,2.25rem)] font-black tracking-[-0.03em] text-white">
          Pronto para acessar<br />
          <span className="bg-gradient-to-r from-amber-300 to-white bg-clip-text text-transparent">o portal?</span>
        </h2>
        <p className="relative mt-4 text-[15px] text-slate-500">Acesso restrito. Use suas credenciais corporativas.</p>
        <button
          onClick={() => navigate("/login")}
          className="relative mt-8 inline-flex h-12 items-center gap-2 overflow-hidden rounded-[14px] border border-amber-400/30 bg-amber-500/[0.12] px-8 text-[14px] font-bold text-amber-300 transition-all duration-300 hover:bg-amber-400/[0.20] hover:border-amber-400/50 hover:shadow-[0_8px_40px_rgba(245,158,11,0.22)]"
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-amber-400/60 via-amber-300/40 to-transparent" />
          Fazer Login <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-6 text-center">
        <p className="text-[11px] text-slate-700">© 2026 SGT Log · Portal Financeiro Interno</p>
      </footer>
    </div>
  );
}
