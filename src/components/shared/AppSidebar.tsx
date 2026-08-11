/**
 * AppSidebar — SGT Log v2
 * Design validado: cápsula âmbar, acordeões, flyout em pílula,
 *                  logo + fallback wordmark vermelho.
 * Lógica: auth, permissões e rotas preservadas da v1.
 */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, Home, Sun, Moon, Shield, LogOut } from "lucide-react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { APP_NAV, type AppNavItem } from "./appNav";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import sgtLogo     from "@/assets/sgt-logo.png";
import sgtLogoMark from "@/assets/sgt-logo-clean.png";

// ── Dimensões ────────────────────────────────────────────────────────────────
const STORAGE_KEY       = "sgt-sidebar-collapsed";
export const SB_W_EXPANDED  = 216;
export const SB_W_COLLAPSED = 72;

// ── Dock magnification (vertical) ───────────────────────────────────────────
const MAG_SCALE_MAX = 1.5;
const MAG_DISTANCE  = 120;
const MAG_SPRING    = { mass: 0.1, stiffness: 200, damping: 15 };

const MouseYContext = createContext<MotionValue<number> | null>(null);

const fallbackMotionValue = { get: () => Infinity, set: () => {}, on: () => () => {} } as unknown as MotionValue<number>;

function MagItem({
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  ariaLabel,
  style,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  onMouseEnter?: React.MouseEventHandler;
  onMouseLeave?: React.MouseEventHandler;
  ariaLabel?: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const mouseY = useContext(MouseYContext) ?? fallbackMotionValue;

  const distanceFromMouse = useTransform(mouseY, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
    return val - rect.y - rect.height / 2;
  });

  const scaleTransform = useTransform(
    distanceFromMouse,
    [-MAG_DISTANCE, 0, MAG_DISTANCE],
    [1, MAG_SCALE_MAX, 1],
  );
  const scale = useSpring(scaleTransform, MAG_SPRING);

  return (
    <div className="flex items-center justify-center py-[2px]">
      <motion.button
        ref={ref}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        aria-label={ariaLabel}
        className={className}
        style={{ ...style, scale, willChange: "transform" } as React.CSSProperties}
      >
        {children}
      </motion.button>
    </div>
  );
}

// ── Estrutura do menu ────────────────────────────────────────────────────────
const CORE_GROUPS: { label: string; ids: string[] }[] = [
  { label: "Portais",
    ids: ["portal-receitaflow","portal-visual","portal-wr"] },
  { label: "Financeiro",
    ids: ["fin-painel","fin-pagar","fin-receber","fin-conciliacao",
          "fin-realizado","fin-previsto","fin-relatorios","ext-fiscal"] },
  { label: "Outras Análises",
    ids: ["fin-fornecedores","fin-clientes","fin-categorias","fin-bancos"] },
];

const ACCORDION_GROUPS: { key: string; label: string; ids: string[] }[] = [
  { key: "gestao",    label: "Gestão",       ids: ["ext-executivo","ext-indicadores","ext-faturamento"] },
  { key: "operacao",  label: "Operação",     ids: ["ext-operacional","ext-frota","ext-fin-frota","ext-manutencao","ext-abastecimento"] },
  { key: "comprasrh", label: "Compras / RH", ids: ["ext-compras","ext-rh"] },
  { key: "suporte",   label: "Suporte",      ids: ["ext-chamados"] },
];

const NAV_MAP = new Map(APP_NAV.map(n => [n.id, n]));

// ── Estilos inline ────────────────────────────────────────────────────────────
const PILL_ACTIVE: React.CSSProperties = {
  background:   "linear-gradient(95deg, var(--sb-accent) 0%, var(--sb-accent-hover) 100%)",
  border:       "1px solid color-mix(in srgb, var(--sb-accent) 55%, transparent)",
  boxShadow:    "0 0 12px color-mix(in srgb, var(--sb-accent) 22%, transparent)",
  borderRadius: "9999px",
  color:        "#1B1304",
  fontWeight:   700,
};
const CHIP_ACTIVE: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--sb-accent) 0%, var(--sb-accent-hover) 100%)",
  border:     "1px solid color-mix(in srgb, var(--sb-accent) 60%, transparent)",
  boxShadow:  "0 0 10px color-mix(in srgb, var(--sb-accent) 22%, transparent)",
};

// ── Componente principal ──────────────────────────────────────────────────────
export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, role, signOut } = useAuth();
  const { canAccess }         = usePagePermissions();
  const { theme, toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [openAcc, setOpenAcc] = useState<Record<string, boolean>>({});
  const [flyout, setFlyout]   = useState<{
    id: string; label: string; icon: AppNavItem["icon"]; active: boolean; rect: DOMRect;
  } | null>(null);
  const [logoErr, setLogoErr] = useState(false);
  const [markErr, setMarkErr] = useState(false);
  const mouseY = useMotionValue(Infinity);

  // ── helpers ────────────────────────────────────────────────────────────────
  const search       = new URLSearchParams(location.search);
  const finScreen    = search.get("s") ?? "painel";
  const isHomeActive = location.pathname === "/home";

  function isActive(item: AppNavItem): boolean {
    if (item.externalUrl) return false;
    if (item.financeScreen)
      return location.pathname === "/financeiro" && finScreen === item.financeScreen;
    if (item.to) {
      if (item.to === "/dashboard") return location.pathname === "/dashboard";
      return location.pathname === item.to || location.pathname.startsWith(item.to + "/");
    }
    return false;
  }

  function goItem(item: AppNavItem) {
    if (item.externalUrl)        window.open(item.externalUrl, "_blank", "noopener,noreferrer");
    else if (item.financeScreen) navigate(`/financeiro?s=${item.financeScreen}`);
    else if (item.to)            navigate(item.to);
  }

  function visible(ids: string[]): AppNavItem[] {
    return ids
      .map(id => NAV_MAP.get(id))
      .filter(Boolean)
      .filter(i => !i!.module || canAccess(i!.module))
      .filter(i => !(role === "diretoria" && ["portal-visual","portal-wr"].includes(i!.id))) as AppNavItem[];
  }

  // ── efeitos ────────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    window.dispatchEvent(new CustomEvent("sgt-sidebar-toggle", { detail: { collapsed } }));
    if (collapsed) setOpenAcc({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  useEffect(() => {
    if (collapsed) return;
    const upd: Record<string, boolean> = {};
    ACCORDION_GROUPS.forEach(g => {
      if (visible(g.ids).some(item => isActive(item))) upd[g.key] = true;
    });
    if (Object.keys(upd).length) setOpenAcc(p => ({ ...p, ...upd }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, collapsed]);

  function toggleAcc(key: string) {
    if (!collapsed) setOpenAcc(p => ({ ...p, [key]: !p[key] }));
  }

  // ── render helper: item de nav ────────────────────────────────────────────
  function renderItem(item: AppNavItem) {
    const Icon   = item.icon;
    const active = isActive(item);

    // ── estado recolhido ──────────────────────────────────────────────────
    if (collapsed) {
      return (
        <MagItem
          key={item.id}
          onClick={() => goItem(item)}
          onMouseEnter={e => {
            setFlyout({ id: item.id, label: item.label, icon: item.icon, active,
              rect: (e.currentTarget as HTMLButtonElement).getBoundingClientRect() });
          }}
          onMouseLeave={() => setFlyout(null)}
          ariaLabel={item.label}
          className="flex items-center justify-center w-11 h-10 rounded-lg border transition-colors duration-150"
          style={active
            ? { ...CHIP_ACTIVE }
            : { borderColor: "transparent", color: "var(--sb-text-secondary)", background: "transparent" }}
        >
          <Icon className="w-4 h-4 shrink-0"
            style={active ? { color: "#1B1304", opacity: 1 } : { opacity: 0.6 }} />
        </MagItem>
      );
    }

    // ── estado expandido ──────────────────────────────────────────────────
    return (
      <div key={item.id} className="mx-3 my-[2px]">
        <button
          onClick={() => goItem(item)}
          className={`w-full flex items-center gap-3 text-[14px] font-medium transition-all duration-100 ${active ? "sgt-nav-active" : ""}`}
          style={active
            ? { ...PILL_ACTIVE, padding: "8px 12px 8px 16px" }
            : { color: "var(--sb-text-secondary)", borderRadius: "9999px",
                border: "1px solid transparent", background: "transparent",
                padding: "8px 16px" }}
          onMouseEnter={e => {
            if (!active) {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "var(--sb-sidebar-hover)";
              b.style.color      = "var(--sb-text-primary)";
            }
          }}
          onMouseLeave={e => {
            if (!active) {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "transparent";
              b.style.color      = "var(--sb-text-secondary)";
            }
          }}
        >
          <Icon className="w-4 h-4 shrink-0"
            style={active ? { color: "#1B1304", opacity: 1 } : { opacity: 0.6 }} />
          <span className="flex-1 text-left truncate">{item.label}</span>
          {item.portal && !active && (
            <svg className="w-3 h-3 shrink-0 opacity-30" viewBox="0 0 12 12" fill="none"
                 stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l6-6M6 3h3v3"/>
            </svg>
          )}
          {active && (
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 12 12" fill="none"
                 stroke="#1B1304" strokeWidth="2">
              <path d="M4.5 2.5L8 6l-3.5 3.5"/>
            </svg>
          )}
        </button>
      </div>
    );
  }

  // ── render helper: item Início ────────────────────────────────────────────
  function renderHome() {
    if (collapsed) {
      return (
        <div className="mt-2">
          <MagItem
            onClick={() => navigate("/home")}
            onMouseEnter={e =>
              setFlyout({ id: "__home", label: "Início",
                icon: Home as AppNavItem["icon"], active: isHomeActive,
                rect: (e.currentTarget as HTMLButtonElement).getBoundingClientRect() })
            }
            onMouseLeave={() => setFlyout(null)}
            ariaLabel="Início"
            className="flex items-center justify-center w-11 h-10 rounded-lg border transition-colors duration-150"
            style={isHomeActive ? { ...CHIP_ACTIVE }
              : { borderColor: "transparent", color: "var(--sb-text-secondary)", background: "transparent" }}
          >
            <Home className="w-4 h-4 shrink-0"
              style={isHomeActive ? { color: "#1B1304", opacity: 1 } : { opacity: 0.6 }} />
          </MagItem>
        </div>
      );
    }
    return (
      <div className="mx-3 mt-3 mb-1">
        <button
          onClick={() => navigate("/home")}
          className={`w-full flex items-center gap-3 text-[14px] font-medium transition-all duration-100 ${isHomeActive ? "sgt-nav-active" : ""}`}
          style={isHomeActive
            ? { ...PILL_ACTIVE, padding: "8px 12px 8px 16px" }
            : { color: "var(--sb-text-secondary)", borderRadius: "9999px",
                border: "1px solid transparent", background: "transparent",
                padding: "8px 16px" }}
          onMouseEnter={e => {
            if (!isHomeActive) {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "var(--sb-sidebar-hover)";
              b.style.color      = "var(--sb-text-primary)";
            }
          }}
          onMouseLeave={e => {
            if (!isHomeActive) {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "transparent";
              b.style.color      = "var(--sb-text-secondary)";
            }
          }}
        >
          <Home className="w-4 h-4 shrink-0"
            style={isHomeActive ? { color: "#1B1304", opacity: 1 } : { opacity: 0.6 }} />
          <span className="flex-1 text-left">Início</span>
          {isHomeActive && (
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 12 12" fill="none"
                 stroke="#1B1304" strokeWidth="2">
              <path d="M4.5 2.5L8 6l-3.5 3.5"/>
            </svg>
          )}
        </button>
      </div>
    );
  }

  // ── render helper: label de seção ────────────────────────────────────────
  function renderSectionLabel(label: string) {
    if (collapsed) {
      return (
        <div key={`sec-${label}`} className="flex justify-center my-1">
          <div className="w-6 h-px" style={{ background: "var(--sb-border-subtle)" }} />
        </div>
      );
    }
    return (
      <div key={`sec-${label}`}
           className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.12em]"
           style={{ color: "var(--sb-text-muted)", fontFamily: "var(--sgt-font-body)" }}>
        {label}
      </div>
    );
  }

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <aside
      className="hidden sm:flex fixed left-0 top-0 z-40 h-[100dvh] flex-col transition-all duration-300"
      style={{
        width:        collapsed ? SB_W_COLLAPSED : SB_W_EXPANDED,
        background:   "var(--sb-bg-surface)",
        borderRight:  "1px solid var(--sb-border-subtle)",
        borderRadius: "0 16px 16px 0",
        boxShadow:    "4px 0 24px rgba(0,0,0,0.25)",
      }}
    >

      {/* ── LOGO + TOGGLE ─────────────────────────────────────────────────── */}
      <div
        className={`flex shrink-0 items-center border-b ${
          collapsed ? "flex-col justify-center gap-3 py-4 px-0" : "justify-between gap-2 px-5 py-5"
        }`}
        style={{ borderColor: "var(--sb-border-subtle)" }}
      >
        {!collapsed && (
          logoErr
            ? <div style={{
                fontFamily: "var(--sgt-font-display)", fontSize: 22, fontWeight: 700,
                fontStyle: "italic", color: "#E8202A", letterSpacing: "-0.5px",
                textShadow: "0 0 18px rgba(232,32,42,0.35)", whiteSpace: "nowrap",
              }}>
                SGT<sup style={{ fontSize: 9, fontStyle: "normal", letterSpacing: "0.18em",
                  fontWeight: 600, position: "relative", top: "-0.9em" }}>LOG</sup>
              </div>
            : <img src={sgtLogo} alt="SGT Log"
                className="h-[26px] w-auto max-w-[130px] object-contain block"
                onError={() => setLogoErr(true)} />
        )}

        {collapsed && (
          markErr || logoErr
            ? <div style={{
                width: 32, height: 32, borderRadius: 6, background: "#E8202A", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--sgt-font-display)", fontWeight: 700, fontStyle: "italic",
                fontSize: 16, color: "#fff", boxShadow: "0 0 14px rgba(232,32,42,0.4)",
              }}>S</div>
            : <img src={sgtLogoMark} alt="SGT"
                className="h-[34px] w-[34px] object-contain"
                onError={() => setMarkErr(true)} />
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex items-center justify-center w-7 h-7 rounded-md border shrink-0 transition-all duration-100"
          style={{ borderColor: "var(--sb-border-subtle)", color: "var(--sb-text-muted)", background: "transparent" }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.borderColor = "var(--sb-border-medium)";
            b.style.color       = "var(--sb-text-secondary)";
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.borderColor = "var(--sb-border-subtle)";
            b.style.color       = "var(--sb-text-muted)";
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
               width="15" height="15"
               style={{ transform: collapsed ? "rotate(180deg)" : "none",
                        transition: "transform 200ms ease" }}>
            <rect x="2" y="2" width="12" height="12" rx="2"/>
            <path d="M6 2v12"/>
          </svg>
        </button>
      </div>

      {/* ── NAVEGAÇÃO ────────────────────────────────────────────────────── */}
      <MouseYContext.Provider value={mouseY}>
      <div
        className="flex-1 min-h-0 overflow-y-auto py-1 flex flex-col"
        style={{ scrollbarWidth: "none", overflowX: "visible" }}
        onMouseMove={collapsed ? (e) => mouseY.set(e.clientY) : undefined}
        onMouseLeave={() => { mouseY.set(Infinity); setFlyout(null); }}
      >
        {/* Início */}
        {renderHome()}

        {/* Grupos core (flat) */}
        {CORE_GROUPS.map(group => {
          const items = visible(group.ids);
          if (!items.length) return null;
          return (
            <div key={group.label}>
              {renderSectionLabel(group.label)}
              {items.map(item => renderItem(item))}
            </div>
          );
        })}

        <div className="h-2 shrink-0" />

        {/* Acordeões */}
        {ACCORDION_GROUPS.map(group => {
          const items = visible(group.ids);
          if (!items.length) return null;
          const isOpen = !!openAcc[group.key];

          return (
            <div key={group.key}>
              {collapsed
                ? <div className="flex justify-center my-1">
                    <div className="w-6 h-px" style={{ background: "var(--sb-border-subtle)" }} />
                  </div>
                : <button
                    onClick={() => toggleAcc(group.key)}
                    className="flex items-center gap-2 w-full px-4 pt-4 pb-1 transition-colors duration-100"
                    style={{
                      fontFamily: "var(--sgt-font-body)", fontSize: 10, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.12em",
                      color: isOpen ? "var(--sb-text-muted)" : "var(--sb-text-faint)",
                      background: "none", border: "none", cursor: "pointer",
                    }}
                  >
                    <span>{group.label}</span>
                    <ChevronDown className="ml-auto w-3 h-3 transition-transform duration-200"
                      style={{ color: "var(--sb-text-muted)",
                               transform: isOpen ? "rotate(180deg)" : "none" }} />
                  </button>
              }

              {/* Corpo: grid-template-rows para animação sem overflow-hidden no pai */}
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: collapsed ? "1fr" : (isOpen ? "1fr" : "0fr") }}
              >
                <div className="overflow-hidden">
                  <div className="py-6 -my-6">
                    {items.map(item => renderItem(item))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="h-2 shrink-0" />
      </div>
      </MouseYContext.Provider>

      {/* ── RODAPÉ ───────────────────────────────────────────────────────── */}
      <UserFooter
        collapsed={collapsed}
        email={user?.email ?? ""}
        isAdmin={isAdmin}
        role={role}
        theme={theme}
        onToggleTheme={toggleTheme}
        onGoAdmin={() => navigate("/admin")}
        onSignOut={() => signOut()}
      />

      {/* ── FLYOUT (estado recolhido) ─────────────────────────────────────── */}
      {collapsed && flyout && (
        <div
          className="pointer-events-none fixed z-[200] flex items-center gap-2 whitespace-nowrap px-3 py-1.5 text-[14px] font-semibold"
          style={{
            top:          flyout.rect.top + flyout.rect.height / 2,
            left:         flyout.rect.right + 10,
            transform:    "translateY(-50%)",
            borderRadius: "9999px",
            ...(flyout.active ? {
              background: "linear-gradient(95deg, var(--sb-accent) 0%, var(--sb-accent-hover) 70%)",
              color:      "#1B1304",
              border:     "1px solid color-mix(in srgb, var(--sb-accent) 60%, transparent)",
              boxShadow:  "0 0 20px color-mix(in srgb, var(--sb-accent) 28%, transparent)",
            } : {
              background: "var(--sb-flyout-bg)",
              color:      "var(--sb-text-primary)",
              border:     "1px solid var(--sb-flyout-border)",
              boxShadow:  "0 4px 8px rgba(0,0,0,0.25)",
            }),
          }}
        >
          {(() => { const FIcon = flyout.icon; return <FIcon className="w-4 h-4 shrink-0"
            style={flyout.active ? { color: "#1B1304" } : {}} />; })()}
          <span>{flyout.label}</span>
          {flyout.active && <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "#1B1304" }} />}
        </div>
      )}
    </aside>
  );
}

// ── UserFooter ────────────────────────────────────────────────────────────────
function UserFooter({
  collapsed, email, isAdmin, role, theme, onToggleTheme, onGoAdmin, onSignOut,
}: {
  collapsed: boolean; email: string; isAdmin: boolean; role: string | null;
  theme: "dark" | "light"; onToggleTheme: () => void;
  onGoAdmin: () => void; onSignOut: () => void;
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

  const initial    = (email || "U")[0].toUpperCase();
  const shortEmail = email.length > 22 ? email.substring(0, 22) + "…" : email;
  const roleLabel  = isAdmin ? "Administrador" : role === "diretoria" ? "Diretoria" : "Usuário";

  const menuActions = [
    {
      label: theme === "dark" ? "Tema claro" : "Tema escuro",
      icon:  theme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-cyan-400" />,
      fn:    () => { setOpen(false); onToggleTheme(); },
    },
    ...(isAdmin ? [{
      label: "Área Administrativa",
      icon:  <Shield className="h-3.5 w-3.5 text-red-400" />,
      fn:    () => { setOpen(false); onGoAdmin(); },
    }] : []),
  ];

  return (
    <div ref={ref} className="relative border-t shrink-0"
         style={{ borderColor: "var(--sb-border-subtle)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={email || "Usuário"}
        className={`flex items-center gap-2.5 w-full transition-all duration-150 ${
          collapsed ? "justify-center px-2 py-3" : "px-4 py-3"
        }`}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "var(--sb-row-hover)"}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
      >
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-xl text-[12px] font-bold"
              style={{ border: "1px solid color-mix(in srgb, var(--sb-accent) 25%, transparent)", background: "var(--sb-accent-soft)", color: "var(--sb-accent-text)" }}>
          {initial}
        </span>
        {!collapsed && (
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[12px] font-medium truncate" style={{ color: "var(--sb-text-secondary)" }}>{shortEmail}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--sb-text-faint)" }}>{roleLabel}</p>
          </div>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 min-w-[200px] overflow-hidden rounded-xl border shadow-[0_20px_40px_rgba(0,0,0,0.5)] ${
            collapsed ? "left-[calc(100%+8px)] bottom-1" : "left-2 right-2 bottom-[calc(100%+6px)]"
          }`}
          style={{ background: "var(--sb-menu-bg)", borderColor: "var(--sb-border-medium)" }}
        >
          {!collapsed && (
            <div className="px-3 py-2.5 border-b" style={{ borderColor: "var(--sb-border-subtle)" }}>
              <p className="text-[10px] truncate" style={{ color: "var(--sb-text-faint)" }}>{email}</p>
            </div>
          )}
          {menuActions.map(a => (
            <button key={a.label} onClick={a.fn}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[12px] transition-colors"
              style={{ color: "var(--sb-text-secondary)" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "var(--sb-input-hover)"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
            >{a.icon}{a.label}</button>
          ))}
          <div className="h-px mx-2" style={{ background: "var(--sb-border-subtle)" }} />
          <button
            onClick={() => { setOpen(false); onSignOut(); }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[12px] transition-colors"
            style={{ color: "var(--sb-text-secondary)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--sb-input-hover)"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--sb-text-secondary)"; }}
          >
            <LogOut className="h-3.5 w-3.5" />Sair
          </button>
        </div>
      )}
    </div>
  );
}

// ── useSidebarWidth — consumido pelo AppLayout ────────────────────────────────
export function useSidebarWidth() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d && typeof d.collapsed === "boolean") setCollapsed(d.collapsed);
    };
    window.addEventListener("sgt-sidebar-toggle", handler as EventListener);
    return () => window.removeEventListener("sgt-sidebar-toggle", handler as EventListener);
  }, []);
  return collapsed ? SB_W_COLLAPSED : SB_W_EXPANDED;
}
