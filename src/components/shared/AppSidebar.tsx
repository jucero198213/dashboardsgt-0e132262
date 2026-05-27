import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  PanelLeftClose, PanelLeftOpen, ExternalLink, ChevronRight,
  Sun, Moon, Shield, LogOut, Home, X,
} from "lucide-react";
import { APP_NAV, type AppNavItem } from "./appNav";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import sgtLogo from "@/assets/sgt-logo.png";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { canAccess } = usePagePermissions();
  const { theme, toggleTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const prevPath = useRef(location.pathname);

  // Fecha ao navegar
  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      setOpen(false);
      prevPath.current = location.pathname;
    }
  }, [location.pathname]);

  // Fecha com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

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
    if (item.financeScreen) navigate(`/financeiro?s=${item.financeScreen}`);
    else if (item.to) navigate(item.to);
  }

  const isHomeActive = location.pathname === "/home";

  const portalInactive = "bg-cyan-500/8 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/15 hover:border-cyan-400/40 hover:text-cyan-200";
  const portalActive   = "bg-cyan-500/20 border-cyan-400/50 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.18)]";
  const portalIconActive   = "text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]";
  const portalIconInactive = "text-cyan-500";
  const portalBarActive    = "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]";

  return (
    <>
      {/* ── Botão toggle — sempre visível no canto esquerdo (desktop only) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? "Fechar menu" : "Abrir menu"}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        className="hidden sm:flex fixed top-3 left-3 z-[70] h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200
          border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-section)]/80 backdrop-blur-sm text-slate-500
          hover:border-[var(--sgt-border-medium)] hover:bg-[var(--sgt-row-hover)] hover:text-slate-200 shadow-sm"
      >
        {open
          ? <PanelLeftClose className="h-4 w-4" />
          : <PanelLeftOpen  className="h-4 w-4" />}
      </button>

      {/* ── Backdrop ── */}
      <div
        onClick={() => setOpen(false)}
        className={`hidden sm:block fixed inset-0 z-[55] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ── Sidebar overlay ── */}
      <aside
        className={`hidden sm:flex fixed left-0 top-0 z-[60] h-[100dvh] w-[230px] flex-col border-r transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          borderColor: "var(--sgt-border-subtle)",
          background: "var(--sgt-bg-section)",
          boxShadow: "6px 0 32px rgba(0,0,0,0.35)",
        }}
      >
        {/* ── Header: logo + fechar ── */}
        <div
          className="flex items-center justify-between border-b shrink-0 px-4 py-3"
          style={{ borderColor: "var(--sgt-border-subtle)" }}
        >
          <img src={sgtLogo} alt="SGT" className="h-7 w-auto object-contain" />
          <button
            onClick={() => setOpen(false)}
            title="Fechar menu"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all
              border-[var(--sgt-border-subtle)] text-slate-500
              hover:border-[var(--sgt-border-medium)] hover:bg-[var(--sgt-row-hover)] hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ── Home ── */}
        <div className="pt-2.5 pb-1 shrink-0 px-2">
          <button
            onClick={() => navigate("/home")}
            title="Início"
            className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-200 font-semibold text-[12px]
              ${isHomeActive
                ? "bg-amber-500/20 border-amber-400/50 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.2)]"
                : "bg-[var(--sgt-row-hover)] border-[var(--sgt-border-subtle)] text-slate-400 hover:bg-amber-500/10 hover:border-amber-400/30 hover:text-amber-300"
              }`}
          >
            <Home className={`h-4 w-4 shrink-0 ${isHomeActive ? "text-amber-300" : ""}`} />
            <span className="flex-1 text-left">Início</span>
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="mx-3 my-1 h-px shrink-0" style={{ background: "var(--sgt-border-subtle)" }} />

        {/* ── Nav ── */}
        <div className="relative flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-1 scrollbar-none">
          {APP_NAV.filter((item) => !item.module || canAccess(item.module)).map((item, i, visibleNav) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            const showSection = item.section && (i === 0 || visibleNav[i - 1].section !== item.section);

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

          <div className="h-2 shrink-0" />
        </div>

        {/* ── Footer: Usuário ── */}
        <UserFooter
          email={user?.email ?? ""}
          isAdmin={isAdmin}
          theme={theme}
          onToggleTheme={toggleTheme}
          onGoAdmin={() => navigate("/admin")}
          onSignOut={() => signOut()}
        />
      </aside>
    </>
  );
}

function UserFooter({
  email, isAdmin, theme, onToggleTheme, onGoAdmin, onSignOut,
}: {
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
  const shortEmail = email.length > 24 ? email.substring(0, 24) + "…" : email;

  return (
    <div ref={ref} className="relative border-t shrink-0" style={{ borderColor: "var(--sgt-border-subtle)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={email || "Usuário"}
        className="group flex items-center gap-2.5 w-full px-3 py-3 transition-all duration-150 hover:bg-[var(--sgt-row-hover)]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-[12px] font-bold text-amber-300">
          {initials}
        </span>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[11px] font-medium truncate" style={{ color: "var(--sgt-text-primary)" }}>{shortEmail}</p>
          <p className="text-[9px] text-slate-500 mt-0.5">{isAdmin ? "Administrador" : "Usuário"}</p>
        </div>
        <ChevronRight className={`h-3.5 w-3.5 text-slate-600 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute left-2 right-2 bottom-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          style={{ background: "var(--sgt-menu-bg)", borderColor: "var(--sgt-border-medium)" }}
        >
          <div className="px-3 py-2.5 border-b" style={{ borderColor: "var(--sgt-border-subtle)" }}>
            <p className="text-[10px] text-slate-500 truncate">{email}</p>
          </div>

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

/** Sidebar agora é overlay — não ocupa espaço no layout. Sempre retorna 0. */
export function useSidebarWidth() {
  return 0;
}
