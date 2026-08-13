import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, Settings, Database, Activity, Shield,
  ChevronRight, Lock, Server, Zap, ClipboardList, Terminal,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { HomeButton } from "@/components/shared/HomeButton";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import GestaoUsuarios from "./GestaoUsuarios";
import Configuracoes from "./Configuracoes";
import BancoDados from "./BancoDados";
import Monitoramento from "./Monitoramento";
import Seguranca from "./Seguranca";

type Screen = "home" | "usuarios" | "config" | "banco" | "monitor" | "seguranca" | "chamados";

const NAV_ITEMS: {
  id: Screen;
  label: string;
  desc: string;
  icon: React.ElementType;
  gradient: string;
  borderGlow: string;
  iconBg: string;
  route?: string;
}[] = [
  {
    id: "usuarios",
    label: "Gestão de Usuários",
    desc: "Gerencie usuários, permissões e roles do sistema",
    icon: Users,
    gradient: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.08) 100%)",
    borderGlow: "rgba(16,185,129,0.3)",
    iconBg: "bg-emerald-500/20",
  },
  {
    id: "config",
    label: "Configurações",
    desc: "Tunnel URL, integrações e parâmetros do sistema",
    icon: Settings,
    gradient: "linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(59,130,246,0.08) 100%)",
    borderGlow: "rgba(6,182,212,0.3)",
    iconBg: "bg-cyan-500/20",
  },
  {
    id: "banco",
    label: "Banco de Dados",
    desc: "Schema, tabelas e console SQL read-only",
    icon: Database,
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(99,102,241,0.08) 100%)",
    borderGlow: "rgba(139,92,246,0.3)",
    iconBg: "bg-violet-500/20",
  },
  {
    id: "monitor",
    label: "Monitoramento",
    desc: "Logs de atividade, auditoria e métricas em tempo real",
    icon: Activity,
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(239,68,68,0.06) 100%)",
    borderGlow: "rgba(245,158,11,0.3)",
    iconBg: "bg-amber-500/20",
  },
  {
    id: "seguranca",
    label: "Segurança",
    desc: "Sessões ativas, 2FA, IPs permitidos e SSO",
    icon: Shield,
    gradient: "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(244,63,94,0.08) 100%)",
    borderGlow: "rgba(239,68,68,0.3)",
    iconBg: "bg-red-500/20",
  },
  {
    id: "chamados",
    label: "Agenda de Chamados",
    desc: "Calendário, criação e acompanhamento",
    icon: ClipboardList,
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(234,88,12,0.08) 100%)",
    borderGlow: "rgba(245,158,11,0.3)",
    iconBg: "bg-amber-500/20",
    route: "/chamados",
  },
];

export default function PainelAdministrativo() {
  const [screen, setScreen] = useState<Screen>("home");
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const renderContent = () => {
    switch (screen) {
      case "usuarios":  return <GestaoUsuarios />;
      case "config":    return <Configuracoes />;
      case "banco":     return <BancoDados />;
      case "monitor":   return <Monitoramento />;
      case "seguranca": return <Seguranca />;
      default: return null;
    }
  };

  const currentItem = NAV_ITEMS.find((n) => n.id === screen);

  return (
    <div
      className="flex flex-col min-h-[100dvh] transition-all duration-300 px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      <BackgroundEffects />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          <div className="relative flex flex-col flex-1 min-h-0 gap-3 p-2 sm:p-3 lg:p-4 w-full overflow-auto">

            {/* ─── Navbar desktop ─── */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/[0.08]">
                  <Shield className="h-4 w-4 text-red-400" />
                </div>
                <div className="h-6 w-px" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-red-400/70">Workspace</span>
                  <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">
                    {screen === "home" ? "Painel Administrativo" : currentItem?.label}
                  </span>
                </div>
              </div>
              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-red-400/20 bg-red-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">Área restrita</span>
              </div>
              {isAdmin && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  <Lock className="h-2.5 w-2.5" />
                  Admin
                </div>
              )}
              <div className="flex-1" />
              {screen !== "home" && (
                <button
                  onClick={() => setScreen("home")}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400 hover:text-white transition-all hover:border-[var(--sgt-border-medium)] hover:bg-[var(--sgt-input-hover)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <HomeButton />
              <UserMenu />
            </div>

            {/* ─── Navbar mobile ─── */}
            <div className="flex sm:hidden items-center justify-between gap-2 py-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/[0.08] shrink-0">
                  <Shield className="h-3.5 w-3.5 text-red-400" />
                </div>
                <div className="h-5 w-px shrink-0" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-red-400/70">Workspace</span>
                  <span className="text-[15px] font-black tracking-[-0.03em] dark:text-white text-slate-800 truncate">
                    {screen === "home" ? "Admin" : currentItem?.label}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {screen !== "home" && (
                  <button onClick={() => setScreen("home")} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400">
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                )}
                <HomeButton />
                <UserMenu />
              </div>
            </div>

            <div className="h-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

            {/* ─── Content ─── */}
            <div className="flex flex-col gap-6">

        {screen === "home" && (
          <>
            {/* ═══ Hero banner ═══ */}
            <AnimatedCard delay={0} hover={false} className="rounded-[20px] sm:rounded-[24px] overflow-hidden border border-[var(--sgt-border-subtle)]">
              <div
                className="relative px-5 py-6 sm:px-8 sm:py-8"
                style={{
                  background: "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(139,92,246,0.08) 40%, rgba(6,182,212,0.06) 100%)",
                }}
              >
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }} />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 backdrop-blur-sm shrink-0">
                    <Terminal className="h-7 w-7 sm:h-8 sm:w-8 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-black tracking-[-0.03em] dark:text-white text-slate-800 mb-1">
                      Central de Controle
                    </h1>
                    <p className="text-sm sm:text-base text-[var(--sgt-text-secondary)] leading-relaxed">
                      Gerencie usuários, integrações, segurança e infraestrutura do Workspace SGT.
                    </p>
                    <p className="text-xs text-[var(--sgt-text-muted)] mt-2 font-mono">
                      {user?.email ?? "ti@sgtlog.com.br"}
                    </p>
                  </div>
                  <div className="hidden lg:flex gap-3 shrink-0">
                    {[
                      { label: "Usuários", value: "7", color: "text-emerald-400", icon: Users, bg: "bg-emerald-500/10 border-emerald-500/20" },
                      { label: "Uptime", value: "99.9%", color: "text-cyan-400", icon: Server, bg: "bg-cyan-500/10 border-cyan-500/20" },
                      { label: "Integrações", value: "5/5", color: "text-violet-400", icon: Zap, bg: "bg-violet-500/10 border-violet-500/20" },
                    ].map((s) => (
                      <div key={s.label} className={`flex flex-col items-center rounded-xl border px-4 py-3 backdrop-blur-sm ${s.bg}`}>
                        <s.icon className={`h-4 w-4 ${s.color} mb-1`} />
                        <span className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</span>
                        <span className="text-[9px] uppercase tracking-[0.15em] text-[var(--sgt-text-muted)]">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedCard>

            {/* ═══ Stats mobile (visíveis só em < lg) ═══ */}
            <div className="grid grid-cols-3 gap-2.5 lg:hidden">
              {[
                { label: "Usuários", value: "7", color: "text-emerald-400", icon: Users, gradient: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.04))" },
                { label: "Uptime", value: "99.9%", color: "text-cyan-400", icon: Server, gradient: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(59,130,246,0.04))" },
                { label: "Integrações", value: "5/5", color: "text-violet-400", icon: Zap, gradient: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.04))" },
              ].map((s, i) => (
                <AnimatedCard key={s.label} delay={80 + i * 50} className="rounded-[16px] border border-[var(--sgt-border-subtle)] sgt-bg-card">
                  <div className="flex flex-col items-center py-3 px-2" style={{ background: s.gradient }}>
                    <s.icon className={`h-4 w-4 ${s.color} mb-1.5`} />
                    <span className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</span>
                    <span className="text-[9px] uppercase tracking-[0.15em] text-[var(--sgt-text-muted)]">{s.label}</span>
                  </div>
                </AnimatedCard>
              ))}
            </div>

            {/* ═══ Módulos ═══ */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Módulos</span>
              <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
            </div>

            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {NAV_ITEMS.map((item, i) => (
                <AnimatedCard
                  key={item.id}
                  delay={200 + i * 70}
                  hover
                  className="group rounded-[20px] overflow-hidden cursor-pointer"
                >
                  <button
                    onClick={() => item.route ? navigate(item.route) : setScreen(item.id)}
                    className="text-left w-full h-full"
                  >
                    <div
                      className="relative p-5 sm:p-6 h-full border rounded-[20px] transition-all duration-300"
                      style={{
                        background: item.gradient,
                        borderColor: item.borderGlow,
                      }}
                    >
                      {/* Dot pattern overlay */}
                      <div className="absolute inset-0 opacity-[0.025] rounded-[20px]" style={{
                        backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 0.5px, transparent 0)",
                        backgroundSize: "16px 16px",
                      }} />

                      <div className="relative">
                        <div className="flex items-start justify-between mb-5">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconBg} backdrop-blur-sm border border-white/[0.06]`}>
                            <item.icon className="h-6 w-6" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-[var(--sgt-text-muted)] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--sgt-text-secondary)]" />
                        </div>
                        <h3 className="text-[15px] sm:text-base font-bold sgt-text mb-1.5 tracking-[-0.01em]">{item.label}</h3>
                        <p className="text-[12px] sm:text-[13px] text-[var(--sgt-text-secondary)] leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </button>
                </AnimatedCard>
              ))}
            </div>
          </>
        )}

        {/* Sub-pages */}
        {screen !== "home" && (
          <div className="animate-[fadeSlideIn_0.4s_ease-out]">
            {renderContent()}
          </div>
        )}

            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
