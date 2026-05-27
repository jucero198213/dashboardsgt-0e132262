import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  PanelLeftClose, PanelLeftOpen, ExternalLink, ChevronRight,
  Sun, Moon, Shield, LogOut, Home,
} from "lucide-react";
import { APP_NAV, type AppNavItem } from "./appNav";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import sgtLogo from "@/assets/sgt-logo.png";

const STORAGE_KEY = "sgt-sidebar-collapsed";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { canAccess } = usePagePermissions();
  const { theme, toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [hovered, setHovered] = useState<{ id: string; label: string; icon: AppNavItem["icon"]; active: boolean; top: number; left: number; height: number } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    window.dispatchEvent(new CustomEvent("sgt-sidebar-toggle", { detail: { collapsed } }));
  }, [collapsed]);

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

  const isHomeActive = location.pathname === "/home";

  return (
    <aside
      className={`hidden sm:flex fixed left-0 top-0 z-40 h-[100dvh] flex-col border-r transition-all duration-300 ${
        collapsed ? "w-[56px]" : "w-[210px]"
      }`}
      style={{
        borderColor: "var(--sgt-border-subtle)",
        background: "var(--sgt-bg-section)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.25)",
      }}
    >
      {/* ── HEADER: Logo + Toggle ── */}
      <div
        className={`flex items-center border-b shrink-0 px-2 py-2.5 ${collapsed ? "flex-col gap-1.5" : "justify-between gap-2"}`}
        style={{ borderColor: "var(--sgt-border-subtle)" }}
      >
        <img
          src={sgtLogo}
          alt="SGT"
          className={`block w-auto object-contain shrink-0 transition-all duration-300 ${collapsed ? "h-5" : "h-7"}`}
        />
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all
            border-[var(--sgt-border-subtle)] bg-transparent text-slate-500
            hover:border-[var(--sgt-border-medium)] hover:bg-[var(--sgt-row-hover)] hover:text-slate-200"
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── HOME BUTTON ── */}
      <div className={`pt-2.5 pb-1 shrink-0 flex ${collapsed ? "justify-center px-0" : "px-2"}`}>
        <button
          onClick={() => navigate("/home")}
          title="Início"
          className={`flex items-center gap-2.5 rounded-xl border transition-all duration-200 font-semibold text-[12px]
            ${collapsed ? "justify-center h-9 w-9" : "w-full px-3 py-2.5"}
            ${isHomeActive
              ? "bg-amber-500/20 border-amber-400/50 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.2)]"
              : "bg-[var(--sgt-row-hover)] border-[var(--sgt-border-subtle)] text-slate-400 hover:bg-amber-500/10 hover:border-amber-400/30 hover:text-amber-300"
            }`}
        >
          <Home className={`h-4 w-4 shrink-0 ${isHomeActive ? "text-amber-300" : ""}`} />
          {!collapsed && <span className="flex-1 text-left">Início</span>}
        </button>
      </div>

      {/* ── DIVIDER ── */}
      <div className="mx-3 my-1 h-px shrink-0" style={{ background: "var(--sgt-border-subtle)" }} />

      {/* ── NAV ── */}
      <div
        className="relative flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-1 scrollbar-none"
        onMouseLeave={() => setHovered(null)}
      >
        {APP_NAV.filter((item) => !item.module || canAccess(item.module)).map((item, i, visibleNav) => {
          const Icon = item.icon;
          const active = isItemActive(item);
          const showSection = item.section && (i === 0 || visibleNav[i - 1].section !== item.section);

          // Estilos para portais integrados (seção "Portais")
          const portalInactive = "bg-cyan-500/8 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/15 hover:border-cyan-400/40 hover:text-cyan-200";
          const portalActive   = "bg-cyan-500/20 border-cyan-400/50 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.18)]";
          const portalIconActive   = "text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]";
          const portalIconInactive = "text-cyan-500";
          const portalBarActive    = "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]";

          /* ── COLLAPSED ── */
          if (collapsed) {
            return (
              <div key={item.id}>
                {/* Divider de seção separado do wrapper do botão */}
                {showSection && (
                  <div className="flex justify-center">
                    <div className="w-8 h-px my-1.5" style={{ background: "var(--sgt-border-subtle)" }} />
                  </div>
                )}
                {/* Wrapper exclusivo do botão — top-1/2 sempre aponta pro centro exato */}
                <div className="relative flex items-center justify-center py-[2px]">
                  {active && (
                    <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full ${
                      item.portal ? portalBarActive : "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                    }`} />
                  )}
                  <button
                    onClick={() => handleClick(item)}
                    onMouseEnter={(e) => {
                      const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                      setHovered({ id: item.id, label: item.label, icon: item.icon, active, top: r.top, left: r.left, height: r.height });
                    }}
                    aria-label={item.label}
                    className={`flex items-center justify-center h-9 w-9 rounded-xl border transition-all duration-200 ${
                      item.portal
                        ? (active ? portalActive : portalInactive)
                        : (active
                            ? "bg-amber-500/20 border-amber-400/40 text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.25)]"
                            : "border-transparent text-slate-500 hover:bg-amber-500/10 hover:border-amber-400/20 hover:text-amber-300")
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${
                      item.portal
                        ? (active ? portalIconActive : portalIconInactive)
                        : (active ? "text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]" : "")
                    }`} />
                  </button>
                </div>
              </div>
            );
          }

          /* ── EXPANDED ── */
          return (
            <div key={item.id}>
              {showSection && (
                <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-[0.4em] ${item.portal ? "text-cyan-600" : "text-slate-600"}`}>
                    {item.section}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "var(--sgt-border-subtle)" }} />
                </div>
              )}

              <div className="relative mx-2 my-[2px]">
                {active && (
                  <span className={`pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2 h-5 w-[3px] rounded-full ${
                    item.portal ? portalBarActive : "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.9)]"
                  }`} />
                )}
                <button
                  onClick={() => handleClick(item)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] rounded-xl border transition-all duration-150
                    ${item.portal
                      ? (active ? `${portalActive} font-semibold` : `${portalInactive} font-medium`)
                      : (active
                          ? "bg-amber-500/15 border-amber-400/35 text-amber-200 font-semibold shadow-[0_0_18px_rgba(245,158,11,0.18)]"
                          : "border-transparent text-slate-500 hover:bg-[var(--sgt-row-hover)] hover:text-slate-300 font-medium")
                    }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${
                    item.portal
                      ? (active ? portalIconActive : portalIconInactive)
                      : (active ? "text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]" : "")
                  }`} />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {/* Portais não mostram ícone ExternalLink — são rotas internas */}
                  {!item.portal && item.to && (
                    <ExternalLink className={`h-3 w-3 shrink-0 opacity-50 ${active ? "text-amber-300" : "text-slate-600"}`} />
                  )}
                  {item.badge && item.financeScreen && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                      item.badgeColor === "amber" ? "bg-amber-400/15 text-amber-300" : "bg-rose-400/15 text-rose-300"
                    }`}>{item.badge}</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {/* Espaço no final da lista */}
        <div className="h-2 shrink-0" />
      </div>

      {/* ── FOOTER: Usuário ── */}
      <UserFooter
        collapsed={collapsed}
        email={user?.email ?? ""}
        isAdmin={isAdmin}
        theme={theme}
        onToggleTheme={toggleTheme}
        onGoAdmin={() => navigate("/admin")}
        onSignOut={() => signOut()}
      />
    {/* ── FLYOUT global (escapa o overflow do scroll) ── */}
    {collapsed && hovered && (() => {
      const HIcon = hovered.icon;
      return (
        <div
          className={`pointer-events-none fixed z-[60] flex items-center gap-2 whitespace-nowrap
            rounded-xl border pr-3 text-[12px] font-semibold tracking-wide backdrop-blur-md animate-fade-in
            ${(() => {
              const isPortal = APP_NAV.find(n => n.id === hovered.id)?.portal;
              if (isPortal) return hovered.active
                ? "bg-cyan-500/20 border-cyan-400/45 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.35)]"
                : "bg-cyan-500/15 border-cyan-400/35 text-cyan-100 shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_18px_rgba(34,211,238,0.22)]";
              return hovered.active
                ? "bg-amber-500/20 border-amber-400/45 text-amber-100 shadow-[0_0_22px_rgba(245,158,11,0.35)]"
                : "bg-amber-500/15 border-amber-400/35 text-amber-100 shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_18px_rgba(245,158,11,0.22)]";
            })()}`}
          style={{ top: hovered.top, left: hovered.left, height: hovered.height, width: 180 }}
        >
          <span className="flex items-center justify-center shrink-0" style={{ width: hovered.height, height: hovered.height }}>
            {(() => {
              const isPortal = APP_NAV.find(n => n.id === hovered.id)?.portal;
              return <HIcon className={`h-4 w-4 ${isPortal ? "text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]" : "text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]"}`} />;
            })()}
          </span>
          <span className="flex-1 truncate">{hovered.label}</span>
          <ChevronRight className="h-3 w-3 shrink-0 text-amber-300/80" />
        </div>
      );
    })()}
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
  const shortEmail = email.length > 22 ? email.substring(0, 22) + "…" : email;

  return (
    <div ref={ref} className="relative border-t shrink-0" style={{ borderColor: "var(--sgt-border-subtle)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={email || "Usuário"}
        className={`group flex items-center gap-2.5 w-full transition-all duration-150 hover:bg-[var(--sgt-row-hover)]
          ${collapsed ? "justify-center px-2 py-3" : "px-3 py-3"}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-[12px] font-bold text-amber-300">
          {initials}
        </span>
        {!collapsed && (
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[11px] font-medium truncate" style={{ color: "var(--sgt-text-primary)" }}>{shortEmail}</p>
            <p className="text-[9px] text-slate-500 mt-0.5">{isAdmin ? "Administrador" : "Usuário"}</p>
          </div>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 min-w-[200px] overflow-hidden rounded-xl border shadow-[0_20px_40px_rgba(0,0,0,0.5)]
            ${collapsed ? "left-[calc(100%+8px)] bottom-1" : "left-2 right-2 bottom-[calc(100%+6px)]"}`}
          style={{ background: "var(--sgt-menu-bg)", borderColor: "var(--sgt-border-medium)" }}
        >
          {/* Email no topo do popup */}
          {!collapsed && (
            <div className="px-3 py-2.5 border-b" style={{ borderColor: "var(--sgt-border-subtle)" }}>
              <p className="text-[10px] text-slate-500 truncate">{email}</p>
            </div>
          )}

          <button
            onClick={() => { setOpen(false); onToggleTheme(); }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[12px] transition-colors hover:bg-[var(--sgt-input-hover)]"
            style={{ color: "var(--sgt-text-secondary)" }}
          >
            {theme === "dark"
              ? <><Sun className="h-3.5 w-3.5 text-amber-400" />Tema claro</>
              : <><Moon className="h-3.5 w-3.5 text-cyan-400" />Tema escuro</>}
          </button>

          {isAdmin && (
            <button
              onClick={() => { setOpen(false); onGoAdmin(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[12px] transition-colors hover:bg-[var(--sgt-input-hover)]"
              style={{ color: "var(--sgt-text-secondary)" }}
            >
              <Shield className="h-3.5 w-3.5 text-red-400" />
              Área Administrativa
            </button>
          )}

          <div className="h-px mx-2" style={{ background: "var(--sgt-border-subtle)" }} />

          <button
            onClick={() => { setOpen(false); onSignOut(); }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[12px] transition-colors hover:bg-[var(--sgt-input-hover)] hover:!text-rose-300"
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

  return collapsed ? 56 : 210;
}
