import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, Menu, Shield, LogOut, Sun, Moon, X, User, ChevronRight,
  Briefcase, Banknote, LineChart, MapPin, Truck, Car, Wrench, Fuel,
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, RefreshCcw,
  ShoppingCart, UserCog, Sparkles, Activity, TrendingUp,
  Building2, Users, Tag, Landmark,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { usePagePermissions, type AppModule } from "@/hooks/usePagePermissions";
import { APP_NAV } from "./appNav";
import sgtLogo from "@/assets/sgt-logo.png";

// ─── Tipo de item de navegação ────────────────────────────────────────────────
type NavItem = {
  id: string;
  icon: React.ElementType;
  label: string;
  to: string;
  module?: AppModule;
};

// ─── Mapa de itens por contexto (baseado na rota atual) ──────────────────────
const CONTEXT_NAV: Record<string, NavItem[]> = {
  default: [
    { id: "exec", icon: Briefcase,       label: "Executivo",    to: "/executivo",          module: "gestao" },
    { id: "fat",  icon: Banknote,        label: "Faturamento",  to: "/faturamento",         module: "gestao" },
    { id: "ind",  icon: LineChart,       label: "Indicadores",  to: "/indicadores",         module: "gestao" },
  ],
  gestao: [
    { id: "exec", icon: Briefcase,       label: "Executivo",    to: "/executivo",           module: "gestao" },
    { id: "fat",  icon: Banknote,        label: "Faturamento",  to: "/faturamento",          module: "gestao" },
    { id: "ind",  icon: LineChart,       label: "Indicadores",  to: "/indicadores",         module: "gestao" },
  ],
  operacao: [
    { id: "oper",  icon: MapPin,         label: "Operacional",  to: "/operacional",         module: "operacao" },
    { id: "frota", icon: Truck,          label: "Frota",        to: "/frota",               module: "operacao" },
    { id: "financ",icon: Car,            label: "Financiamento",to: "/financiamento-frota", module: "operacao" },
    { id: "manut", icon: Wrench,         label: "Manutenção",   to: "/manutencao",          module: "operacao" },
    { id: "abast", icon: Fuel,           label: "Abastecimento",to: "/abastecimento",        module: "operacao" },
  ],
  financeiro: [
    { id: "fin-p",   icon: LayoutDashboard, label: "Painel",      to: "/financeiro",                    module: "financeiro" },
    { id: "fin-pg",  icon: ArrowDownCircle, label: "Pagar",       to: "/financeiro?s=pagar",             module: "financeiro" },
    { id: "fin-rc",  icon: ArrowUpCircle,   label: "Receber",     to: "/financeiro?s=receber",           module: "financeiro" },
    { id: "fin-cn",  icon: RefreshCcw,      label: "Conciliação", to: "/financeiro?s=conciliacao",       module: "financeiro" },
    { id: "fin-rl",  icon: Activity,        label: "Realizado",   to: "/dashboard",                      module: "financeiro" },
    { id: "fin-pv",  icon: TrendingUp,      label: "Previsto",    to: "/financeiro?s=previsto",          module: "financeiro" },
  ],
  compras: [
    { id: "compras", icon: ShoppingCart, label: "Compras",      to: "/compras",             module: "compras" },
  ],
  rh: [
    { id: "rh",      icon: UserCog,      label: "RH",           to: "/rh",                  module: "rh" },
  ],
  receitaflow: [
    { id: "rf",      icon: Sparkles,     label: "ReceitaFlow",  to: "/receitaflow" },
  ],
  "outras-analises": [
    { id: "oa-forn", icon: Building2, label: "Fornecedores", to: "/financeiro?s=fornecedores", module: "financeiro" },
    { id: "oa-cli",  icon: Users,     label: "Clientes",     to: "/financeiro?s=clientes",     module: "financeiro" },
    { id: "oa-cat",  icon: Tag,       label: "Categorias",   to: "/financeiro?s=categorias",   module: "financeiro" },
    { id: "oa-ban",  icon: Landmark,  label: "Bancos",       to: "/financeiro?s=bancos",        module: "financeiro" },
  ],
};

// ─── Detecta contexto pela rota ──────────────────────────────────────────────
function getNavContext(pathname: string, search: string): string {
  if (["/executivo", "/faturamento", "/indicadores"].some(p => pathname === p || pathname.startsWith(p + "/"))) return "gestao";
  if (["/operacional", "/frota", "/financiamento-frota", "/manutencao", "/abastecimento"].some(p => pathname === p || pathname.startsWith(p + "/"))) return "operacao";
  if (pathname.startsWith("/financeiro")) {
    const s = new URLSearchParams(search).get("s");
    if (s === "fornecedores" || s === "clientes" || s === "categorias" || s === "bancos") return "outras-analises";
    return "financeiro";
  }
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/contas-a")) return "financeiro";
  if (pathname.startsWith("/compras")) return "compras";
  if (pathname.startsWith("/rh")) return "rh";
  if (pathname.startsWith("/receitaflow")) return "receitaflow";
  return "default";
}

// ─── Tab individual ───────────────────────────────────────────────────────────
function NavTab({
  icon: Icon, label, active, onClick, fill = false,
}: { icon: React.ElementType; label: string; active: boolean; onClick: () => void; fill?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-[3px] py-2 transition-all active:scale-90 ${fill ? "flex-1" : "w-[72px] shrink-0"}`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {active && (
        <span className="absolute top-1.5 h-[3px] w-8 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
      )}
      <Icon className={`h-[22px] w-[22px] transition-all duration-200 ${
        active ? "text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)] scale-110" : "text-slate-500"
      }`} />
      <span className={`text-[9px] font-bold uppercase tracking-[0.08em] leading-none transition-colors ${
        active ? "text-amber-400" : "text-slate-600"
      }`}>
        {label}
      </span>
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function BottomNav() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user, isAdmin, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canAccess } = usePagePermissions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const ctx = getNavContext(location.pathname, location.search);
  const allItems = CONTEXT_NAV[ctx] ?? CONTEXT_NAV.default;

  // filtra por permissão de módulo
  const visibleItems = useMemo(
    () => allItems.filter(item => !item.module || canAccess(item.module)),
    [allItems, canAccess],
  );

  const isHome = location.pathname === "/home";

  function isActive(item: NavItem): boolean {
    if (item.to.includes("?s=")) {
      const [path, qs] = item.to.split("?");
      const s = new URLSearchParams(qs).get("s") ?? "painel";
      const cur = new URLSearchParams(location.search).get("s") ?? "painel";
      return location.pathname === path && cur === s;
    }
    // /financeiro sem ?s= só ativa quando s não está definido ou é "painel"
    if (item.to === "/financeiro") {
      const cur = new URLSearchParams(location.search).get("s");
      return location.pathname === "/financeiro" && (!cur || cur === "painel");
    }
    return location.pathname === item.to || location.pathname.startsWith(item.to + "/");
  }

  // ── Seções do drawer (mesmo lógica do MobileNav) — oculta portais externos para diretoria ──
  const navItems = APP_NAV.filter(i =>
    (!i.module || canAccess(i.module)) &&
    (role !== "diretoria" || !["portal-visual", "portal-wr"].includes(i.id))
  );
  const sections: { title: string; items: typeof navItems }[] = [];
  navItems.forEach((item) => {
    const t = item.section ?? sections[sections.length - 1]?.title ?? "Geral";
    const existing = sections.find(s => s.title === t);
    if (existing) existing.items.push(item);
    else sections.push({ title: t, items: [item] });
  });
  const initials = (user?.email ?? "U")[0].toUpperCase();

  return (
    <>
      {/* ── Bottom bar ── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-[80] flex items-stretch border-t"
        style={{
          background: "var(--sgt-menu-bg)",
          borderColor: "var(--sgt-border-subtle)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.35)",
        }}
      >
        {/* INÍCIO — fixo à esquerda */}
        <NavTab icon={Home} label="Início" active={isHome} onClick={() => navigate("/home")} fill={false} />

        {/* Itens dinâmicos — max 3 visíveis, scroll com gradient */}
        <div className="relative flex-1 min-w-0">
          {/* Gradient direita — indica mais itens */}
          {visibleItems.length > 3 && (
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10"
              style={{ background: "linear-gradient(to left, var(--sgt-menu-bg), transparent)" }}
            />
          )}
          <div
            className="flex h-full overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            {visibleItems.map(item => (
              <NavTab
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={isActive(item)}
                onClick={() => navigate(item.to)}
                fill={visibleItems.length <= 3}
              />
            ))}
          </div>
        </div>

        {/* MENU — fixo à direita */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="relative flex w-[60px] shrink-0 flex-col items-center justify-center gap-[3px] py-2 transition-all active:scale-90"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Menu className="h-[22px] w-[22px] text-slate-500" />
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] leading-none text-slate-600">Menu</span>
        </button>
      </nav>

      {/* ── Drawer de menu completo ── */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="sm:hidden w-[85vw] max-w-[340px] border-r p-0 [background:var(--sgt-menu-bg)]"
          style={{ borderColor: "var(--sgt-border-medium)", color: "var(--sgt-text-primary)" }}
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="flex h-full flex-col">

            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: "var(--sgt-border-subtle)", paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)" }}>
              <div className="flex items-center gap-2">
                <img src={sgtLogo} alt="SGT" className="h-7 w-auto shrink-0 object-contain" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[13px] font-extrabold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
                    Workspace SGT
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">Menu</span>
                </div>
              </div>
            </div>

            {/* Navegação */}
            <nav className="flex-1 overflow-y-auto py-2 scrollbar-none">
              <div className="px-3 pb-1">
                <button type="button" onClick={() => { setMenuOpen(false); navigate("/home"); }}
                  className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2.5 text-left transition-all active:scale-[0.98] ${
                    location.pathname === "/home"
                      ? "border-amber-400/30 bg-amber-400/8"
                      : "border-transparent hover:bg-white/[0.04] hover:border-[var(--sgt-border-subtle)]"
                  }`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    location.pathname === "/home"
                      ? "border-amber-400/30 bg-amber-400/10"
                      : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]"
                  }`}>
                    <Home className={`h-4 w-4 ${location.pathname === "/home" ? "text-amber-400" : "text-[var(--sgt-text-muted)]"}`} />
                  </div>
                  <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>Início</span>
                  {location.pathname === "/home" && <ChevronRight className="h-3.5 w-3.5 text-amber-400/60" />}
                </button>
              </div>

              {sections.map((section) => (
                <div key={section.title} className="px-3 pt-3 pb-1">
                  <p className="px-1 pb-2 text-[9px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: "var(--sgt-text-muted)" }}>
                    {section.title}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const s = new URLSearchParams(location.search).get("s") ?? "painel";
                      const active = item.financeScreen
                        ? location.pathname === "/financeiro" && s === item.financeScreen
                        : item.to ? location.pathname === item.to || location.pathname.startsWith(item.to + "/") : false;
                      const isPortal = !!item.portal;
                      return (
                        <li key={item.id}>
                          <button type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              if (item.financeScreen) navigate(`/financeiro?s=${item.financeScreen}`);
                              else if (item.to) navigate(item.to);
                            }}
                            className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2.5 text-left transition-all active:scale-[0.98] ${
                              active
                                ? isPortal ? "border-cyan-400/40 bg-cyan-500/12" : "border-white/10 bg-white/6"
                                : "border-transparent hover:bg-white/[0.04] hover:border-[var(--sgt-border-subtle)]"
                            }`}>
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                              isPortal
                                ? active ? "border-cyan-400/40 bg-cyan-500/15" : "border-cyan-500/20 bg-cyan-500/8"
                                : active ? "border-white/15 bg-white/8" : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]"
                            }`}>
                              <Icon className={`h-4 w-4 ${isPortal ? (active ? "text-cyan-300" : "text-cyan-500") : "text-[var(--sgt-text-muted)]"}`} />
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

            </nav>

            {/* ── User footer ── */}
            <div className="border-t shrink-0" style={{ borderColor: "var(--sgt-border-subtle)" }}>

              {/* Opções — visíveis ao expandir */}
              {userOpen && (
                <div className="flex flex-col gap-0.5 border-b px-3 py-2"
                  style={{ borderColor: "var(--sgt-border-subtle)", background: "var(--sgt-bg-section)" }}>
                  {/* Tema */}
                  <button type="button" onClick={toggleTheme}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all active:scale-[0.98] hover:bg-white/[0.04]">
                    {theme === "dark" ? (
                      <><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10">
                        <Sun className="h-3.5 w-3.5 text-amber-400" /></div>
                      <span className="text-[12px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>Tema claro</span></>
                    ) : (
                      <><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10">
                        <Moon className="h-3.5 w-3.5 text-cyan-400" /></div>
                      <span className="text-[12px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>Tema escuro</span></>
                    )}
                  </button>
                  {/* Admin */}
                  {isAdmin && (
                    <button type="button" onClick={() => { setMenuOpen(false); setUserOpen(false); navigate("/admin"); }}
                      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all active:scale-[0.98] hover:bg-white/[0.04]">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10">
                        <Shield className="h-3.5 w-3.5 text-red-400" /></div>
                      <span className="text-[12px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>Área Administrativa</span>
                    </button>
                  )}
                  {/* Sair */}
                  <button type="button" onClick={() => { setMenuOpen(false); setUserOpen(false); signOut(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all active:scale-[0.98] hover:bg-rose-500/[0.08]">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-400/25 bg-rose-400/10">
                      <LogOut className="h-3.5 w-3.5 text-rose-400" /></div>
                    <span className="text-[12px] font-semibold text-rose-300">Sair</span>
                  </button>
                </div>
              )}

              {/* Card do usuário */}
              {user && (
                <div style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)" }}>
                  <button
                    type="button"
                    onClick={() => setUserOpen(o => !o)}
                    className="flex w-full items-center gap-3 px-4 py-3 transition-all active:scale-[0.98] hover:bg-white/[0.03]"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-[13px] font-bold text-amber-300">
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-[12px] font-semibold" style={{ color: "var(--sgt-text-primary)" }}>
                        {user.email}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>
                        {isAdmin
                          ? <><Shield className="h-3 w-3 text-red-400" />Administrador</>
                          : role === "diretoria"
                            ? <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-violet-400 border border-violet-500/20">Diretoria</span>
                            : <><User className="h-3 w-3" />Usuário</>}
                      </p>
                    </div>
                    <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200 ${userOpen ? "-rotate-90" : "rotate-90"}`} />
                  </button>
                </div>
              )}

            </div>

          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
