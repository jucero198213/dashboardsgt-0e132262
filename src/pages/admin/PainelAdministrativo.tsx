import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, Settings, Database, Activity, Shield,
  ChevronRight, Lock, Server, Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";
import GestaoUsuarios from "./GestaoUsuarios";
import Configuracoes from "./Configuracoes";
import BancoDados from "./BancoDados";
import Monitoramento from "./Monitoramento";
import Seguranca from "./Seguranca";

type Screen = "home" | "usuarios" | "config" | "banco" | "monitor" | "seguranca";

const NAV_ITEMS = [
  {
    id: "usuarios" as Screen,
    label: "Gestão de Usuários",
    desc: "Usuários, permissões e roles via Supabase Auth",
    icon: Users,
    accent: "emerald",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/8",
    icon_color: "text-emerald-400",
    badge_bg: "bg-emerald-500/15",
  },
  {
    id: "config" as Screen,
    label: "Configurações",
    desc: "Tunnel URL, integrações e parâmetros do sistema",
    icon: Settings,
    accent: "cyan",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/8",
    icon_color: "text-cyan-400",
    badge_bg: "bg-cyan-500/15",
  },
  {
    id: "banco" as Screen,
    label: "Banco de Dados",
    desc: "Schema, tabelas e console SQL read-only",
    icon: Database,
    accent: "violet",
    border: "border-violet-500/20",
    bg: "bg-violet-500/8",
    icon_color: "text-violet-400",
    badge_bg: "bg-violet-500/15",
  },
  {
    id: "monitor" as Screen,
    label: "Monitoramento",
    desc: "Logs de atividade, auditoria e métricas",
    icon: Activity,
    accent: "amber",
    border: "border-amber-500/20",
    bg: "bg-amber-500/8",
    icon_color: "text-amber-400",
    badge_bg: "bg-amber-500/15",
  },
  {
    id: "seguranca" as Screen,
    label: "Segurança",
    desc: "Sessões ativas, 2FA, IPs permitidos e SSO",
    icon: Shield,
    accent: "red",
    border: "border-red-500/20",
    bg: "bg-red-500/8",
    icon_color: "text-red-400",
    badge_bg: "bg-red-500/15",
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
      {/* Atmosfera */}
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(59,130,246,0.18),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_55%_40%_at_100%_110%,rgba(239,68,68,0.07),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:opacity-100" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.72) 100%)" }} />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          <div className="relative flex flex-col flex-1 min-h-0 gap-3 p-2 sm:p-3 lg:p-4 w-full overflow-auto">

            {/* Navbar desktop */}
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
              <UserMenu />
            </div>

            {/* Navbar mobile */}
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
                <UserMenu />
              </div>
            </div>

            <div className="h-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

            {/* Page subtitle */}
            <div>
              <p className="text-[12px] text-[var(--sgt-text-muted)]">
                {screen === "home"
                  ? `Central de controle · ${user?.email ?? "ti@sgtlog.com.br"}`
                  : currentItem?.desc}
              </p>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-6">

        {/* Home — navigation grid */}
        {screen === "home" && (
          <>
            {/* Stats rápidas */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Usuários ativos", value: "7", icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                { label: "Uptime", value: "99.9%", icon: Server, color: "text-cyan-400", bg: "bg-cyan-500/10" },
                { label: "Integrações", value: "5/5", icon: Zap, color: "text-violet-400", bg: "bg-violet-500/10" },
                { label: "Alertas", value: "1", icon: Shield, color: "text-amber-400", bg: "bg-amber-500/10" },
              ].map((s) => (
                <div key={s.label} className="rounded-[16px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-3 flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} shrink-0`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--sgt-text-muted)] uppercase tracking-[0.15em]">{s.label}</p>
                    <p className={`text-[15px] font-bold ${s.color}`}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Nav grid */}
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {NAV_ITEMS.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  className={`group text-left overflow-hidden rounded-[20px] border ${item.border} ${item.bg} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(0,0,0,0.4)] hover:brightness-110`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--sgt-input-bg)] ${item.icon_color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--sgt-text-muted)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--sgt-text-secondary)]" />
                  </div>
                  <h3 className="text-[13px] font-semibold sgt-text mb-1">{item.label}</h3>
                  <p className="text-[11px] sgt-text-2">{item.desc}</p>
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2">
              {NAV_ITEMS.slice(3).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  className={`group text-left overflow-hidden rounded-[20px] border ${item.border} ${item.bg} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(0,0,0,0.4)] hover:brightness-110`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--sgt-input-bg)] ${item.icon_color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--sgt-text-muted)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--sgt-text-secondary)]" />
                  </div>
                  <h3 className="text-[13px] font-semibold sgt-text mb-1">{item.label}</h3>
                  <p className="text-[11px] sgt-text-2">{item.desc}</p>
                </button>
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

            </div> {/* Content */}
          </div>
        </section>
      </div>
    </div>
  );
}