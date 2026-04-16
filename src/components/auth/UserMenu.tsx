import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Link } from "react-router-dom";
import { LogOut, Shield, User, ChevronDown, Sun, Moon } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface UserMenuProps {
  /** Mostrar link da área administrativa (default: false). Use true apenas na Home. */
  showAdmin?: boolean;
}

export function UserMenu({ showAdmin = false }: UserMenuProps = {}) {
  const { user, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const initials = (user.email ?? "U")[0].toUpperCase();

  const menuStyle: React.CSSProperties = {
    background: "var(--sgt-menu-bg)",
    borderColor: "var(--sgt-border-medium)",
  };

  const itemStyle: React.CSSProperties = {
    color: "var(--sgt-text-secondary)",
  };

  const dividerStyle: React.CSSProperties = {
    borderColor: "var(--sgt-border-subtle)",
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] transition-all"
        style={{
          background: "var(--sgt-input-bg)",
          borderColor: "var(--sgt-input-border)",
          color: "var(--sgt-text-secondary)",
        }}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10 text-[11px] font-bold text-cyan-300">
          {initials}
        </div>
        <span className="hidden sm:inline max-w-[120px] truncate">{user.email}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 min-w-[200px] overflow-hidden rounded-xl border shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
          style={menuStyle}
        >
          {/* User info */}
          <div className="border-b px-4 py-3" style={dividerStyle}>
            <p className="text-xs font-medium truncate" style={{ color: "var(--sgt-text-primary)" }}>
              {user.email}
            </p>
            <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: "var(--sgt-text-muted)" }}>
              {isAdmin ? (
                <><Shield className="h-3 w-3 text-red-400" />Administrador</>
              ) : (
                <><User className="h-3 w-3" />Usuário</>
              )}
            </p>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-xs transition-colors hover:brightness-110"
            style={{ ...itemStyle, background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--sgt-input-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {theme === "dark" ? (
              <><Sun className="h-3.5 w-3.5 text-amber-400" />Tema claro</>
            ) : (
              <><Moon className="h-3.5 w-3.5 text-cyan-400" />Tema escuro</>
            )}
          </button>

          {isAdmin && showAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs transition-colors"
              style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--sgt-input-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Shield className="h-3.5 w-3.5 text-red-400" />
              Área Administrativa
            </Link>
          )}

          <button
            onClick={() => { setOpen(false); signOut(); }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-xs transition-colors"
            style={{ ...itemStyle, background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--sgt-input-hover)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--sgt-text-secondary)"; }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
