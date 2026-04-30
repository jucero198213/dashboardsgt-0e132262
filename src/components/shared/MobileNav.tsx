import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  Home,
  BarChart3,
  TrendingUp,
  Receipt,
  CreditCard,
  Truck,
  Shield,
  LogOut,
  Sun,
  Moon,
  X,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import sgtLogo from "@/assets/sgt-logo.png";

/**
 * MobileNav — Drawer lateral compartilhado para uso em todas as páginas internas.
 * Renderiza apenas no mobile (sm:hidden). Substitui a dupla HomeButton + UserMenu
 * no header das páginas por um único botão hambúrguer.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canAccess } = usePagePermissions();
  const navigate = useNavigate();

  const close = () => setOpen(false);

  const go = (path: string) => {
    close();
    navigate(path);
  };

  const links: Array<{
    to: string;
    label: string;
    icon: typeof Home;
    color: string;
    bg: string;
    show: boolean;
  }> = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: BarChart3,
      color: "text-cyan-300",
      bg: "bg-cyan-400/10 border-cyan-400/20",
      show: canAccess("dashboard"),
    },
    {
      to: "/indicadores",
      label: "Indicadores",
      icon: TrendingUp,
      color: "text-violet-300",
      bg: "bg-violet-400/10 border-violet-400/20",
      show: canAccess("indicadores"),
    },
    {
      to: "/contas-a-receber",
      label: "Contas a Receber",
      icon: Receipt,
      color: "text-emerald-300",
      bg: "bg-emerald-400/10 border-emerald-400/20",
      show: canAccess("dashboard"),
    },
    {
      to: "/contas-a-pagar",
      label: "Contas a Pagar",
      icon: CreditCard,
      color: "text-rose-300",
      bg: "bg-rose-400/10 border-rose-400/20",
      show: canAccess("dashboard"),
    },
    {
      to: "/financiamento-frota",
      label: "Financiamento de Frota",
      icon: Truck,
      color: "text-orange-300",
      bg: "bg-orange-400/10 border-orange-400/20",
      show: true,
    },
    {
      to: "/frota",
      label: "Gestão de Frota",
      icon: Truck, // já importado
    },
  ];

  const initials = (user?.email ?? "U")[0].toUpperCase();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-amber-500/60 bg-gradient-to-r from-amber-500/15 to-amber-400/10 text-amber-200 transition-all active:scale-95 hover:border-amber-400 hover:from-amber-500/25 hover:to-amber-400/20 hover:text-amber-100 sm:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[85vw] max-w-[340px] border-l p-0 [background:var(--sgt-menu-bg)]"
        style={{
          borderColor: "var(--sgt-border-medium)",
          color: "var(--sgt-text-primary)",
        }}
      >
        <SheetTitle className="sr-only">Menu de navegação</SheetTitle>

        <div className="flex h-full flex-col">
          {/* Header com logo + fechar */}
          <div
            className="flex items-center justify-between border-b px-5 py-4"
            style={{ borderColor: "var(--sgt-border-subtle)" }}
          >
            <div className="flex items-center gap-2">
              <img
                src={sgtLogo}
                alt="SGT"
                className="h-7 w-auto shrink-0 object-contain"
              />
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-extrabold tracking-tight [color:var(--sgt-text-primary)]">
                  Workspace SGT
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
                  Menu
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Fechar menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95"
              style={{
                borderColor: "var(--sgt-border-subtle)",
                background: "var(--sgt-input-bg)",
                color: "var(--sgt-text-secondary)",
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* User info */}
          {user && (
            <div
              className="flex items-center gap-3 border-b px-5 py-4"
              style={{ borderColor: "var(--sgt-border-subtle)" }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-[13px] font-bold text-cyan-300">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[12px] font-semibold"
                  style={{ color: "var(--sgt-text-primary)" }}
                >
                  {user.email}
                </p>
                <p
                  className="mt-0.5 flex items-center gap-1 text-[10px]"
                  style={{ color: "var(--sgt-text-muted)" }}
                >
                  {isAdmin ? (
                    <>
                      <Shield className="h-3 w-3 text-red-400" />
                      Administrador
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3" />
                      Usuário
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Lista de links */}
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            <p className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Navegação
            </p>
            <ul className="flex flex-col gap-1">
              {links
                .filter((l) => l.show)
                .map((l) => {
                  const Icon = l.icon;
                  return (
                    <li key={l.to}>
                      <button
                        type="button"
                        onClick={() => go(l.to)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 text-left transition-all active:scale-[0.98] hover:bg-white/[0.04] hover:border-[var(--sgt-border-subtle)]"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${l.bg}`}
                        >
                          <Icon className={`h-4 w-4 ${l.color}`} />
                        </div>
                        <span
                          className="flex-1 text-[13px] font-medium"
                          style={{ color: "var(--sgt-text-secondary)" }}
                        >
                          {l.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>

            {isAdmin && (
              <>
                <div
                  className="my-3 h-px"
                  style={{ background: "var(--sgt-divider)" }}
                />
                <p className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Administração
                </p>
                <button
                  type="button"
                  onClick={() => go("/admin")}
                  className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 text-left transition-all active:scale-[0.98] hover:bg-white/[0.04] hover:border-[var(--sgt-border-subtle)]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10">
                    <Shield className="h-4 w-4 text-red-400" />
                  </div>
                  <span
                    className="flex-1 text-[13px] font-medium"
                    style={{ color: "var(--sgt-text-secondary)" }}
                  >
                    Painel Administrativo
                  </span>
                </button>
              </>
            )}
          </nav>

          {/* Footer com tema + logout */}
          <div
            className="flex flex-col gap-1 border-t p-3"
            style={{ borderColor: "var(--sgt-border-subtle)" }}
          >
            <button
              type="button"
              onClick={() => {
                toggleTheme();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all active:scale-[0.98] hover:bg-white/[0.04]"
            >
              {theme === "dark" ? (
                <>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10">
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: "var(--sgt-text-secondary)" }}
                  >
                    Mudar para tema claro
                  </span>
                </>
              ) : (
                <>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10">
                    <Moon className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: "var(--sgt-text-secondary)" }}
                  >
                    Mudar para tema escuro
                  </span>
                </>
              )}
            </button>

            {user && (
              <button
                type="button"
                onClick={() => {
                  close();
                  signOut();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all active:scale-[0.98] hover:bg-rose-500/[0.08]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-400/25 bg-rose-400/10">
                  <LogOut className="h-3.5 w-3.5 text-rose-400" />
                </div>
                <span className="text-[12px] font-semibold text-rose-300">
                  Sair
                </span>
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
