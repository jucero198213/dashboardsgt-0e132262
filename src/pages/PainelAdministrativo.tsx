import { useState } from "react";
import { ArrowLeft, Users, Settings, Database, Activity, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import GestaoUsuarios from "./Admin/GestaoUsuarios";
import Configuracoes from "./Admin/Configuracoes";
import BancoDados from "./Admin/BancoDados";
import Monitoramento from "./Admin/Monitoramento";
import Seguranca from "./Admin/Seguranca";

type Screen = "home" | "usuarios" | "config" | "banco" | "monitor" | "seguranca";

interface NavItem {
  id: Screen;
  label: string;
  desc: string;
  icon: React.ReactNode;
  iconBg: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "usuarios", label: "Gestão de Usuários", desc: "Gerencie usuários, permissões e roles do sistema", icon: <Users className="w-6 h-6" />, iconBg: "bg-blue-500/15 text-blue-400" },
  { id: "config", label: "Configurações", desc: "Configurações gerais do sistema e integrações", icon: <Settings className="w-6 h-6" />, iconBg: "bg-white/10 text-white/60" },
  { id: "banco", label: "Banco de Dados", desc: "Visualização e gestão das tabelas de dados", icon: <Database className="w-6 h-6" />, iconBg: "bg-emerald-500/15 text-emerald-400" },
  { id: "monitor", label: "Monitoramento", desc: "Logs de atividade e auditoria do sistema", icon: <Activity className="w-6 h-6" />, iconBg: "bg-amber-500/15 text-amber-400" },
  { id: "seguranca", label: "Segurança", desc: "Políticas de acesso, sessões e autenticação", icon: <Shield className="w-6 h-6" />, iconBg: "bg-red-500/15 text-red-400" },
];

const PAGE_TITLES: Record<Screen, string> = {
  home: "Painel Administrativo",
  usuarios: "Gestão de Usuários",
  config: "Configurações",
  banco: "Banco de Dados",
  monitor: "Monitoramento",
  seguranca: "Segurança",
};

export default function PainelAdministrativo() {
  const [screen, setScreen] = useState<Screen>("home");

  const renderContent = () => {
    switch (screen) {
      case "usuarios": return <GestaoUsuarios />;
      case "config": return <Configuracoes />;
      case "banco": return <BancoDados />;
      case "monitor": return <Monitoramento />;
      case "seguranca": return <Seguranca />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1424]">
      {/* Breadcrumb */}
      <div className="px-6 py-3 text-sm text-white/30">
        <span
          className="hover:text-white/60 cursor-pointer transition-colors"
          onClick={() => setScreen("home")}
        >
          Dashboard
        </span>
        <span className="mx-2">›</span>
        <span className="text-white/70">Administração</span>
        {screen !== "home" && (
          <>
            <span className="mx-2">›</span>
            <span className="text-white">{PAGE_TITLES[screen]}</span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="px-6 pb-6">
        <div className="flex items-start gap-4">
          {screen !== "home" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScreen("home")}
              className="mt-1 w-9 h-9 p-0 rounded-full border border-white/10 text-white/50 hover:text-white hover:bg-white/5 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1.5 text-[11px] text-red-400 border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                ÁREA ADMINISTRATIVA
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {screen === "home" ? "Painel Administrativo" : PAGE_TITLES[screen]}
            </h1>
            <p className="text-sm text-white/35 mt-1">Central de controle do sistema · ti@sgtlog.com.br</p>
          </div>
        </div>
      </div>

      {/* Home grid */}
      {screen === "home" && (
        <div className="px-6 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {NAV_ITEMS.slice(0, 3).map((item) => (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className="group text-left bg-[#111c2e] border border-white/[0.07] rounded-2xl p-6 hover:border-white/[0.15] hover:bg-[#142030] transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.iconBg}`}>
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-base font-semibold text-white mb-1">{item.label}</h3>
                <p className="text-sm text-white/35">{item.desc}</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {NAV_ITEMS.slice(3).map((item) => (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className="group text-left bg-[#111c2e] border border-white/[0.07] rounded-2xl p-6 hover:border-white/[0.15] hover:bg-[#142030] transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.iconBg}`}>
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-base font-semibold text-white mb-1">{item.label}</h3>
                <p className="text-sm text-white/35">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sub-pages */}
      {screen !== "home" && (
        <div className="px-6 pb-8">
          {renderContent()}
        </div>
      )}
    </div>
  );
}
