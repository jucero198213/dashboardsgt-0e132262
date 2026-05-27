import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Home, Shield, LogOut, Sun, Moon, X, User, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import { APP_NAV } from "./appNav";
import sgtLogo from "@/assets/sgt-logo.png";

/**
 * MobileNav — Drawer lateral para mobile (sm:hidden).
 * Driven pelo APP_NAV — permanece em sync com a sidebar automaticamente.
 * Permissões por módulo: itens sem `module` são visíveis para todos.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canAccess } = usePagePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  const close = () => setOpen(false);
  const go = (path: string) => { close(); navigate(path); };

  // Filtra pelo módulo (sem módulo = visível para todos)
  const visibleItems = APP_NAV.filter(
    (item) => !item.module || canAccess(item.module)
  );

  // Agrupa por seção mantendo a ordem original
  const sections: { title: string; items: typeof visibleItems }[] = [];
  visibleItems.forEach((item) => {
    const sectionTitle = item.section ?? sections[sections.length - 1]?.title ?? "Geral";
    const existing = sections.find((s) => s.title === sectionTitle);
    if (existing) {
      existing.items.push(item);
    } else {
      sections.push({ title: sectionTitle, items: [item] });
    }
  });

  const initials = (user?.email ?? "U")[0].toUpperCase();

  const isActive = (item: typeof visibleItems[0]) => {
    if (item.to) return location.pathname === item.to || location.pathname.startsWith(item.to + "/");
    if (item.financeScreen) return location.pathname === "/financeiro";
    return false;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu"
          className="group inline-flex items-center gap-2 h-8 pl-1.5 pr-2.5 rounded-lg border border-white/[0.09] bg-white/[0.04] transition-all active:scale-95 hover:border-white/[0.16] hover:bg-white/[0.07] sm:hidden"
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br from-amber-400 to-amber-600 text-[10px] font-black text-white shadow-[0_0_8px_rgba(245,158,11,0.30)]">
            S
          </div>
          <div className="flex flex-col leading-none gap-px">
            <span className="text-[11px] font-semibold text-slate-200">SGT Log</span>
            <span className="text-[9px] text-slate-500">Workspace</span>
          </div>
          <Menu className="h-3.5 w-3.5 text-slate-500 ml-0.5" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[85vw] max-w-[340px] border-l p-0 [background:var(--sgt-menu-bg)]"
        style={{ borderColor: "var(--sgt-border-medium)", color: "var(--sgt-text-primary)" }}
      >
        <SheetTitle className="sr-only">Menu de navegação</SheetTitle>

        <div className="flex h-full flex-col">

          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4"
            style={{ borderColor: "var(--sgt-border-subtle)" }}>
            <div className="flex items-center gap-2">
              <img src={sgtLogo} alt="SGT" className="h-7 w-auto shrink-0 object-contain" />
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-extrabold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
                  Workspace SGT
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">Menu</span>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Fechar menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95"
              style={{ borderColor: "var(--sgt-border-subtle)", background: "var(--sgt-input-bg)", color: "var(--sgt-text-secondary)" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* User info */}
          {user && (
            <div className="flex items-center gap-3 border-b px-5 py-3"
              style={{ borderColor: "var(--sgt-border-subtle)" }}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-[13px] font-bold text-cyan-300">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold" style={{ color: "var(--sgt-text-primary)" }}>
                  {user.email}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>
                  {isAdmin
                    ? <><Shield className="h-3 w-3 text-red-400" />Administrador</>
                    : <><User className="h-3 w-3" />Usuário</>}
                </p>
              </div>
            </div>
          )}

          {/* Navegação */}
          <nav className="flex-1 overflow-y-auto py-2 scrollbar-none">

            {/* Início */}
            <div className="px-3 pb-1">
              <button
                type="button"
                onClick={() => go("/home")}
                className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2.5 text-left transition-all active:scale-[0.98] ${
                  location.pathname === "/home"
                    ? "border-amber-400/30 bg-amber-400/8"
                    : "border-transparent hover:bg-white/[0.04] hover:border-[var(--sgt-border-subtle)]"
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                  location.pathname === "/home"
                    ? "border-amber-400/30 bg-amber-400/10"
                    : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]"
                }`}>
                  <Home className={`h-4 w-4 ${location.pathname === "/home" ? "text-amber-400" : "text-[var(--sgt-text-muted)]"}`} />
                </div>
                <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>
                  Início
                </span>
                {location.pathname === "/home" && <ChevronRight className="h-3.5 w-3.5 text-amber-400/60" />}
              </button>
            </div>

            {/* Seções dinâmicas via APP_NAV */}
            {sections.map((section) => (
              <div key={section.title} className="px-3 pt-3 pb-1">
                <p className="px-1 pb-2 text-[9px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "var(--sgt-text-muted)" }}>
                  {section.title}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);
                    const to = item.to ?? "/financeiro";
                    const isPortal = !!item.portal;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => go(to)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2.5 text-left transition-all active:scale-[0.98] ${
                            active
                              ? isPortal ? "border-cyan-400/40 bg-cyan-500/12" : "border-white/10 bg-white/6"
                              : "border-transparent hover:bg-white/[0.04] hover:border-[var(--sgt-border-subtle)]"
                          }`}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            isPortal
                              ? active ? "border-cyan-400/40 bg-cyan-500/15" : "border-cyan-500/20 bg-cyan-500/8"
                              : active ? "border-white/15 bg-white/8" : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]"
                          }`}>
                            <Icon className={`h-4 w-4 ${
                              isPortal ? (active ? "text-cyan-300" : "text-cyan-500") : "text-[var(--sgt-text-muted)]"
                            }`} />
                          </div>
                          <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>
                            {item.label}
                          </span>
                          {active && <ChevronRight className="h-3.5 w-3.5 opacity-40" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* Admin */}
            {isAdmin && (
              <div className="px-3 pt-2 pb-1">
                <div className="mb-3 h-px" style={{ background: "var(--sgt-divider)" }} />
                <p className="px-1 pb-2 text-[9px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "var(--sgt-text-muted)" }}>
                  Administração
                </p>
                <button
                  type="button"
                  onClick={() => go("/admin")}
                  className="flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 text-left transition-all active:scale-[0.98] hover:bg-white/[0.04] hover:border-[var(--sgt-border-subtle)]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10">
                    <Shield className="h-4 w-4 text-red-400" />
                  </div>
                  <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>
                    Painel Administrativo
                  </span>
                </button>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="flex flex-col gap-1 border-t p-3" style={{ borderColor: "var(--sgt-border-subtle)" }}>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all active:scale-[0.98] hover:bg-white/[0.04]"
            >
              {theme === "dark" ? (
                <>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10">
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <span className="text-[12px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>Tema claro</span>
                </>
              ) : (
                <>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10">
                    <Moon className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <span className="text-[12px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>Tema escuro</span>
                </>
              )}
            </button>

            {user && (
              <button
                type="button"
                onClick={() => { close(); signOut(); }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all active:scale-[0.98] hover:bg-rose-500/[0.08]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-400/25 bg-rose-400/10">
                  <LogOut className="h-3.5 w-3.5 text-rose-400" />
                </div>
                <span className="text-[12px] font-semibold text-rose-300">Sair</span>
              </button>
            )}
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
