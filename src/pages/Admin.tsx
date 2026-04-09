import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  ChevronRight,
  Shield,
  Users,
  Settings,
  Database,
  Activity,
  Lock,
} from "lucide-react";

const adminModules = [
  {
    title: "Gestão de Usuários",
    description: "Gerencie usuários, permissões e roles do sistema",
    icon: Users,
    tone: "cyan",
    status: "Em breve",
  },
  {
    title: "Configurações",
    description: "Configurações gerais do sistema e integrações",
    icon: Settings,
    tone: "violet",
    status: "Em breve",
  },
  {
    title: "Banco de Dados",
    description: "Visualização e gestão das tabelas de dados",
    icon: Database,
    tone: "emerald",
    status: "Em breve",
  },
  {
    title: "Monitoramento",
    description: "Logs de atividade e auditoria do sistema",
    icon: Activity,
    tone: "amber",
    status: "Em breve",
  },
  {
    title: "Segurança",
    description: "Políticas de acesso, sessões e autenticação",
    icon: Lock,
    tone: "rose",
    status: "Em breve",
  },
];

const toneMap: Record<string, string> = {
  cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  violet: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  rose: "border-rose-500/20 bg-rose-500/10 text-rose-300",
};

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#020617] text-white px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:88px_88px]" />

      <div className="relative mx-auto max-w-[1400px] space-y-6 animate-[fadeSlideIn_0.5s_ease-out]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <button onClick={() => navigate("/")} className="transition-colors hover:text-white">
            Dashboard
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-white">Administração</span>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate("/")}
              className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300">
                  <Shield className="h-3 w-3" />
                  Área Administrativa
                </div>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
                Painel Administrativo
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl">
                Central de controle do sistema · {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.title}
                className="group relative overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.82)_0%,rgba(10,16,36,0.98)_100%)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_20px_42px_rgba(0,0,0,0.30)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_30%)]" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${toneMap[mod.tone]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {mod.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{mod.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-400">{mod.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
