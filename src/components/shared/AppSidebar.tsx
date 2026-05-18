import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  PanelLeftClose, PanelLeftOpen, ExternalLink,
  Sun, Moon, Shield, LogOut, User,
} from "lucide-react";
import { APP_NAV, type AppNavItem } from "./appNav";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const STORAGE_KEY = "sgt-sidebar-collapsed";

/** Sidebar global fixa — replica visual idêntica à sidebar da tela /financeiro. */
export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    // Notifica o layout para ajustar o padding-left
    window.dispatchEvent(new CustomEvent("sgt-sidebar-toggle", { detail: { collapsed } }));
  }, [collapsed]);

  // Detecta sub-tela ativa do módulo financeiro via ?s=
  const search = new URLSearchParams(location.search);
  const financeScreen = search.get("s") ?? "painel";

  function isItemActive(item: AppNavItem): boolean {
    if (item.financeScreen) {
      return location.pathname === "/financeiro" && financeScreen === item.financeScreen;
    }
    if (item.to) {
      if (item.to === "/dashboard") return location.pathname === "/dashboard";
      return location.pathname === item.to || location.pathname.startsWith(item.to + "/");
    }
    return false;
  }

  function handleClick(item: AppNavItem) {
    if (item.financeScreen) {
      navigate(`/financeiro?s=${item.financeScreen}`);
    } else if (item.to) {
      navigate(item.to);
    }
  }

  return (
    <aside
      className={`hidden sm:flex fixed left-0 top-0 z-40 h-[100dvh] flex-col border-r transition-all duration-300 ${
        collapsed ? "w-[52px] overflow-visible" : "w-[200px]"
      }`}
      style={{
        borderColor: "var(--sgt-border-subtle)",
        background: "var(--sgt-bg-section)",
        boxShadow: "var(--sgt-section-shadow, 0 0 0 transparent)",
      }}
    >
      {/* Toggle no topo */}
      <div className="flex items-center justify-end px-2 py-2 border-b" style={{ borderColor: "var(--sgt-border-subtle)" }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--sgt-border-subtle)] bg-transparent text-slate-500 transition-all hover:border-[var(--sgt-border-medium)] hover:bg-[var(--sgt-row-hover)] hover:text-slate-200"
        >
          {collapsed
            ? <PanelLeftOpen className="h-3.5 w-3.5" />
            : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* NAV */}
      <div className={`flex flex-col flex-1 py-2 ${collapsed ? "overflow-visible" : "overflow-y-auto"}`}>
        {APP_NAV.map((item, i) => {
          const Icon = item.icon;
          const active = isItemActive(item);
          const showSection = item.section && (i === 0 || APP_NAV[i - 1].section !== item.section);

          if (collapsed) {
            const tone = active
              ? "bg-amber-500/[0.12] text-amber-300 border border-amber-500/25 hover:bg-amber-500/[0.18]"
              : "text-slate-500 border border-transparent hover:bg-amber-500/[0.12] hover:text-amber-300 hover:border-amber-500/25";
            return (
              <div key={item.id} className="relative px-1.5 py-0.5">
                <button
                  onClick={() => handleClick(item)}
                  title={item.label}
                  className={`group relative flex items-center gap-2.5 h-9 w-9 hover:w-[176px] overflow-hidden rounded-full pl-2.5 pr-3 text-[12px] font-medium transition-all duration-300 ease-out hover:z-30 hover:shadow-[0_6px_24px_rgba(0,0,0,0.45)] ${tone}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 transition-colors duration-200 group-hover:text-amber-400 ${active ? "text-amber-400" : "text-slate-500"}`} />
                  <span className="whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 delay-75">
                    {item.label}
                  </span>
                  {item.badge && item.financeScreen && (
                    <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100 ${
                      item.badgeColor === "amber" ? "bg-amber-400/15 text-amber-300" : "bg-rose-400/15 text-rose-300"
                    }`}>{item.badge}</span>
                  )}
                  {item.to && (
                    <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-amber-300/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100" />
                  )}
                </button>
              </div>
            );
          }

          const baseTone = item.to
            ? "text-slate-500 hover:bg-[var(--sgt-row-hover)] hover:text-slate-300"
            : active
              ? "bg-amber-500/[0.12] text-amber-300 border border-amber-500/25"
              : "text-slate-500 hover:bg-[var(--sgt-row-hover)] hover:text-slate-300";

          return (
            <div key={item.id}>
              {showSection && (
                <p className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.4em] text-slate-600">{item.section}</p>
              )}
              <button
                onClick={() => handleClick(item)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium transition-all duration-150 rounded-lg mx-1 ${baseTone}`}
                style={{ width: "calc(100% - 8px)" }}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-amber-400" : ""}`} />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.to && <ExternalLink className="h-3 w-3 shrink-0 text-slate-600" />}
                {item.badge && item.financeScreen && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    item.badgeColor === "amber" ? "bg-amber-400/15 text-amber-300" : "bg-rose-400/15 text-rose-300"
                  }`}>{item.badge}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer: user info + theme + admin + logout */}
      <div className="border-t" style={{ borderColor: "var(--sgt-border-subtle)" }}>
        {!collapsed && user && (
          <div className="px-3 py-2 border-b" style={{ borderColor: "var(--sgt-border-subtle)" }}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-amber-400/25 bg-amber-400/[0.08] text-amber-300">
                <User className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium truncate" style={{ color: "var(--sgt-text-primary)" }}>{user.email}</p>
                <p className="text-[9px] text-slate-500">{isAdmin ? "Administrador" : "Usuário"}</p>
              </div>
            </div>
          </div>
        )}

        <div className={`flex ${collapsed ? "flex-col items-center" : "flex-col"} py-1`}>
          <FooterAction
            collapsed={collapsed}
            onClick={toggleTheme}
            icon={theme === "dark" ? Sun : Moon}
            label={theme === "dark" ? "Tema claro" : "Tema escuro"}
            iconClass={theme === "dark" ? "text-amber-400" : "text-cyan-400"}
          />
          {isAdmin && (
            <FooterAction
              collapsed={collapsed}
              onClick={() => navigate("/admin")}
              icon={Shield}
              label="Área Administrativa"
              iconClass="text-red-400"
            />
          )}
          <FooterAction
            collapsed={collapsed}
            onClick={() => signOut()}
            icon={LogOut}
            label="Sair"
            iconClass="text-slate-500"
            hoverClass="hover:text-rose-300"
          />
        </div>
      </div>
    </aside>
  );
}

function FooterAction({
  collapsed, onClick, icon: Icon, label, iconClass = "", hoverClass = "",
}: {
  collapsed: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  iconClass?: string;
  hoverClass?: string;
}) {
  if (collapsed) {
    return (
      <div className="relative px-1.5 py-0.5 w-full flex justify-center">
        <button
          onClick={onClick}
          title={label}
          className={`group relative flex items-center gap-2.5 h-9 w-9 hover:w-[176px] overflow-hidden rounded-full pl-2.5 pr-3 text-[12px] font-medium transition-all duration-300 ease-out hover:z-30 hover:shadow-[0_6px_24px_rgba(0,0,0,0.45)] text-slate-500 border border-transparent hover:bg-amber-500/[0.12] hover:border-amber-500/25 ${hoverClass}`}
        >
          <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
          <span className="whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 delay-75">
            {label}
          </span>
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium rounded-lg mx-1 text-slate-500 hover:bg-[var(--sgt-row-hover)] hover:text-slate-300 transition-colors ${hoverClass}`}
      style={{ width: "calc(100% - 8px)" }}
    >
      <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
      <span className="flex-1 text-left truncate">{label}</span>
    </button>
  );
}

/** Hook utilitário para o layout saber a largura atual da sidebar */
export function useSidebarWidth() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.collapsed === "boolean") setCollapsed(detail.collapsed);
    };
    window.addEventListener("sgt-sidebar-toggle", handler as EventListener);
    return () => window.removeEventListener("sgt-sidebar-toggle", handler as EventListener);
  }, []);

  return collapsed ? 52 : 200;
}
