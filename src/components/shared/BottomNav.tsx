import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, Menu,
  Briefcase, Banknote, LineChart, MapPin, Truck, Car, Wrench, Fuel,
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, RefreshCcw,
  ShoppingCart, UserCog, Sparkles, Activity, TrendingUp,
  Building2, Users, Tag, Landmark,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePagePermissions, type AppModule } from "@/hooks/usePagePermissions";
import { MenuDrawerContent } from "./MenuDrawerContent";

// ─── Tipo de item de navegação ────────────────────────────────────────────────
type NavItem = {
  id: string;
  icon: React.ElementType;
  label: string;
  to: string;
  module?: AppModule;
  badge?: number;
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

// ─── Tab individual (visual v2: indicador superior + ícone em wrapper âmbar) ──
function NavTab({
  icon: Icon, label, active, onClick, badge, fill = false, isMenu = false, dense = false,
}: {
  icon: React.ElementType; label: string; active: boolean; onClick: () => void;
  badge?: number; fill?: boolean; isMenu?: boolean; dense?: boolean;
}) {
  const tabWidth = fill ? "" : isMenu ? "w-[56px] shrink-0" : dense ? "w-[60px] shrink-0" : "w-[72px] shrink-0";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-[58px] flex-col items-center justify-center gap-[3px] py-2.5 transition-colors active:scale-95 ${fill ? "flex-1" : tabWidth}`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* Indicador superior */}
      <span className={`absolute top-0 h-0.5 w-7 rounded-b bg-amber-400 transition-transform duration-200 ${
        active ? "scale-x-100" : "scale-x-0"
      }`} />

      {/* Wrapper do ícone — preenche âmbar-muted quando ativo */}
      <span className={`relative flex h-[30px] ${dense ? "w-[40px]" : "w-[46px]"} items-center justify-center rounded-lg transition-colors ${
        active ? "bg-amber-400/[0.14]" : "bg-transparent"
      }`}>
        {typeof badge === "number" && badge > 0 && (
          <span className="absolute -right-0.5 top-0 z-[2] min-w-[14px] rounded-full border-[1.5px] px-1 text-center text-[8px] font-bold leading-[12px] text-white"
            style={{ background: "var(--sgt-danger)", borderColor: "var(--sgt-menu-bg)" }}>
            {badge}
          </span>
        )}
        <Icon className={`h-[21px] w-[21px] transition-colors ${active ? "text-amber-400" : "text-[var(--sgt-text-muted)]"}`} />
      </span>

      <span className={`${dense ? "text-[9px]" : "text-[10px]"} font-semibold leading-none transition-colors max-w-full truncate px-0.5 ${active ? "text-amber-400" : "text-[var(--sgt-text-muted)]"}`}>
        {label}
      </span>
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function BottomNav() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { canAccess } = usePagePermissions();
  const [menuOpen, setMenuOpen] = useState(false);

  const ctx = getNavContext(location.pathname, location.search);
  const allItems = CONTEXT_NAV[ctx] ?? CONTEXT_NAV.default;

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
    if (item.to === "/financeiro") {
      const cur = new URLSearchParams(location.search).get("s");
      return location.pathname === "/financeiro" && (!cur || cur === "painel");
    }
    return location.pathname === item.to || location.pathname.startsWith(item.to + "/");
  }

  return (
    <>
      {/* ── Bottom bar ── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-[80] flex items-stretch border-t"
        style={{
          background: "var(--sgt-bg-overlay)",
          borderColor: "var(--sgt-border-subtle)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.35)",
        }}
      >
        {/* INÍCIO — fixo à esquerda */}
        <NavTab icon={Home} label="Início" active={isHome} onClick={() => navigate("/home")} />

        {/* Itens dinâmicos — scroll horizontal com gradient quando > 3 */}
        <div className="relative flex-1 min-w-0">
          {visibleItems.length > 3 && (
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-6"
              style={{ background: "linear-gradient(to left, var(--sgt-bg-overlay), transparent)" }}
            />
          )}
          <div
            className="flex h-full overflow-x-auto scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            {visibleItems.map(item => (
              <NavTab
                key={item.id}
                icon={item.icon}
                label={item.label}
                badge={item.badge}
                active={isActive(item)}
                onClick={() => navigate(item.to)}
                fill={visibleItems.length <= 3}
              />
            ))}
          </div>
        </div>

        {/* MENU — fixo à direita */}
        <NavTab icon={Menu} label="Menu" active={menuOpen} onClick={() => setMenuOpen(true)} isMenu />
      </nav>

      {/* ── Drawer completo (conteúdo compartilhado com a MobileNav) ── */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="sm:hidden w-[88vw] max-w-[330px] border-r p-0 [background:var(--sgt-menu-bg)]"
          style={{ borderColor: "var(--sgt-border-medium)", color: "var(--sgt-text-primary)" }}
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <MenuDrawerContent onClose={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
