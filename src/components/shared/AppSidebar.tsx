import { useEffect, useRef, useState } from "react";
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
              ? "bg-gradient-to-r from-amber-500/25 to-amber-500/10 text-amber-200 border border-amber-400/50 shadow-[0_0_18px_rgba(245,158,11,0.35)] hover:bg-amber-500/[0.22]"
              : "text-slate-500 border border-transparent hover:bg-amber-500/[0.12] hover:text-amber-300 hover:border-amber-500/25";
            return (
              <div key={item.id} className="relative px-1.5 py-0.5">
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                )}
                <button
                  onClick={() => handleClick(item)}
                  title={item.label}
                  className={`group relative flex items-center gap-2.5 h-9 w-9 hover:w-[176px] overflow-hidden rounded-full pl-2.5 pr-3 text-[12px] font-medium transition-all duration-300 ease-out hover:z-30 hover:shadow-[0_6px_24px_rgba(0,0,0,0.45)] ${tone}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 transition-colors duration-200 group-hover:text-amber-400 ${active ? "text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]" : "text-slate-500"}`} />
                  <span className={`whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 delay-75 ${active ? "font-semibold" : ""}`}>
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

          const baseTone = active
            ? "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-200 border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
            : "text-slate-500 border border-transparent hover:bg-[var(--sgt-row-hover)] hover:text-slate-300";

          return (
            <div key={item.id} className="relative">
              {showSection && (
                <p className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.4em] text-slate-600">{item.section}</p>
              )}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-r-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
              )}
              <button
                onClick={() => handleClick(item)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium transition-all duration-150 rounded-lg mx-1 ${baseTone} ${active ? "font-semibold" : ""}`}
                style={{ width: "calc(100% - 8px)" }}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]" : ""}`} />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.to && <ExternalLink className={`h-3 w-3 shrink-0 ${active ? "text-amber-300/80" : "text-slate-600"}`} />}
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


      {/* Footer: usuário (clique abre menu com tema/admin/sair) */}
      <UserFooter
        collapsed={collapsed}
        email={user?.email ?? ""}
        isAdmin={isAdmin}
        theme={theme}
        onToggleTheme={toggleTheme}
        onGoAdmin={() => navigate("/admin")}
        onSignOut={() => signOut()}
      />
    </aside>
  );
}

function UserFooter({
  collapsed, email, isAdmin, theme, onToggleTheme, onGoAdmin, onSignOut,
}: {
  collapsed: boolean;
  email: string;
  isAdmin: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onGoAdmin: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = (email || "U")[0].toUpperCase();

  return (
    <div ref={ref} className="relative border-t" style={{ borderColor: "var(--sgt-border-subtle)" }}>
      {/* Botão do usuário */}
      <button
        onClick={() => setOpen(o => !o)}
        title={email || "Usuário"}
        className={`group flex items-center gap-2 w-full transition-colors ${
          collapsed ? "justify-center px-1.5 py-2" : "px-3 py-2.5"
        } hover:bg-[var(--sgt-row-hover)]`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/[0.10] text-[11px] font-bold text-amber-300">
          {initials}
        </span>
        {!collapsed && (
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[11px] font-medium truncate" style={{ color: "var(--sgt-text-primary)" }}>{email}</p>
            <p className="text-[9px] text-slate-500">{isAdmin ? "Administrador" : "Usuário"}</p>
          </div>
        )}
      </button>

      {/* Popup com as opções */}
      {open && (
        <div
          className={`absolute z-50 min-w-[200px] overflow-hidden rounded-xl border shadow-[0_20px_40px_rgba(0,0,0,0.45)] ${
            collapsed ? "left-[calc(100%+8px)] bottom-1" : "left-2 right-2 bottom-[calc(100%+6px)]"
          }`}
          style={{ background: "var(--sgt-menu-bg)", borderColor: "var(--sgt-border-medium)" }}
        >
          <button
            onClick={() => { setOpen(false); onToggleTheme(); }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-[12px] transition-colors hover:bg-[var(--sgt-input-hover)]"
            style={{ color: "var(--sgt-text-secondary)" }}
          >
            {theme === "dark"
              ? <><Sun className="h-3.5 w-3.5 text-amber-400" />Tema claro</>
              : <><Moon className="h-3.5 w-3.5 text-cyan-400" />Tema escuro</>}
          </button>

          {isAdmin && (
            <button
              onClick={() => { setOpen(false); onGoAdmin(); }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-[12px] transition-colors hover:bg-[var(--sgt-input-hover)]"
              style={{ color: "var(--sgt-text-secondary)" }}
            >
              <Shield className="h-3.5 w-3.5 text-red-400" />
              Área Administrativa
            </button>
          )}

          <button
            onClick={() => { setOpen(false); onSignOut(); }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-[12px] transition-colors hover:bg-[var(--sgt-input-hover)] hover:!text-rose-300"
            style={{ color: "var(--sgt-text-secondary)" }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      )}
    </div>
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
