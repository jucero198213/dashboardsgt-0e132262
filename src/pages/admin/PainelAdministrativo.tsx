import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, Settings, Database, Activity, Shield,
  ChevronRight, Lock, Server, Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
    <div className="min-h-screen bg-[#020617] text-white px-4 py-6 lg:px-8 lg:py-8">
      {/* Background effects — same as portal */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.06),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:88px_88px]" />

      <div className="relative mx-auto max-w-[1400px] space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <button onClick={() => navigate("/dashboard")} className="transition-colors hover:text-white">Dashboard</button>
            <ChevronRight className="h-3.5 w-3.5" />
            {screen === "home" ? (
              <span className="text-white">Administração</span>
            ) : (
              <>
                <button onClick={() => setScreen("home")} className="transition-colors hover:text-white">Administração</button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-white">{currentItem?.label}</span>
              </>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          {screen !== "home" && (
            <button
              onClick={() => setScreen("home")}
              className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 hover:text-white transition-all hover:border-white/20 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                Área Administrativa
              </div>
              {isAdmin && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  <Lock className="h-2.5 w-2.5" />
                  Admin
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              {screen === "home" ? "Painel Administrativo" : currentItem?.label}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {screen === "home"
                ? `Central de controle · ${user?.email ?? "ti@sgtlog.com.br"}`
                : currentItem?.desc}
            </p>
          </div>
        </div>

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
                <div key={s.label} className="rounded-[16px] border border-white/8 bg-white/[0.03] px-4 py-3 flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} shrink-0`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase tracking-[0.15em]">{s.label}</p>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Nav grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {NAV_ITEMS.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  className={`group text-left overflow-hidden rounded-[20px] border ${item.border} ${item.bg} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(0,0,0,0.4)] hover:brightness-110`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 ${item.icon_color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-slate-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{item.label}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {NAV_ITEMS.slice(3).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  className={`group text-left overflow-hidden rounded-[20px] border ${item.border} ${item.bg} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(0,0,0,0.4)] hover:brightness-110`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 ${item.icon_color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-slate-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{item.label}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
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

      </div>
    </div>
  );
}
