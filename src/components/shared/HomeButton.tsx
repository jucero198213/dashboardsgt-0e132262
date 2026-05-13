import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useCallback } from "react";
import {
  Home,
  ChevronDown,
  BarChart3,
  TrendingUp,
  Receipt,
  CreditCard,
  Truck,
  Wrench,
  LineChart,
  Car,
  ShoppingCart,
  Users,
  Map,
  Fuel,
  ClipboardList,
  Banknote,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePagePermissions } from "@/hooks/usePagePermissions";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  color: string;
  bg: string;
  show: boolean;
}

export function HomeButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { canAccess } = usePagePermissions();
  const [open, setOpen] = useState(false);

  const items: NavItem[] = [
    {
      to: "/financeiro",
      label: "Financeiro",
      icon: Banknote,
      color: "text-emerald-300",
      bg: "bg-emerald-400/10 border-emerald-400/25",
      show: true,
    },
    {
      to: "/executivo",
      label: "Painel Executivo",
      icon: BarChart3,
      color: "text-amber-300",
      bg: "bg-amber-400/10 border-amber-400/25",
      show: canAccess("dashboard"),
    },
    {
      to: "/indicadores",
      label: "Indicadores Estratégicos",
      icon: TrendingUp,
      color: "text-violet-300",
      bg: "bg-violet-400/10 border-violet-400/25",
      show: canAccess("indicadores"),
    },
    {
      to: "/faturamento",
      label: "Faturamento",
      icon: LineChart,
      color: "text-amber-300",
      bg: "bg-amber-400/10 border-amber-400/25",
      show: true,
    },
    {
      to: "/contas-a-receber",
      label: "Contas a Receber",
      icon: Receipt,
      color: "text-emerald-300",
      bg: "bg-emerald-400/10 border-emerald-400/25",
      show: canAccess("dashboard"),
    },
    {
      to: "/contas-a-pagar",
      label: "Contas a Pagar",
      icon: CreditCard,
      color: "text-orange-300",
      bg: "bg-orange-400/10 border-orange-400/25",
      show: canAccess("dashboard"),
    },
    {
      to: "/financiamento-frota",
      label: "Financiamento de Frota",
      icon: Truck,
      color: "text-emerald-300",
      bg: "bg-emerald-400/10 border-emerald-400/25",
      show: true,
    },
    {
      to: "/frota",
      label: "Gestão de Frota",
      icon: Car,
      color: "text-rose-300",
      bg: "bg-rose-400/10 border-rose-400/25",
      show: true,
    },
    {
      to: "/manutencao",
      label: "Manutenção",
      icon: Wrench,
      color: "text-orange-300",
      bg: "bg-orange-400/10 border-orange-400/25",
      show: true,
    },
    {
      to: "/abastecimento",
      label: "Abastecimento",
      icon: Fuel,
      color: "text-orange-300",
      bg: "bg-orange-400/10 border-orange-400/25",
      show: true,
    },
    {
      to: "/operacional",
      label: "Operacional",
      icon: Map,
      color: "text-cyan-300",
      bg: "bg-cyan-400/10 border-cyan-400/25",
      show: true,
    },
    {
      to: "/compras",
      label: "Compras",
      icon: ShoppingCart,
      color: "text-amber-300",
      bg: "bg-amber-400/10 border-amber-400/25",
      show: true,
    },
    {
      to: "/rh",
      label: "RH",
      icon: Users,
      color: "text-violet-300",
      bg: "bg-violet-400/10 border-violet-400/25",
      show: true,
    },
    {
      to: "/chamados",
      label: "Chamados",
      icon: ClipboardList,
      color: "text-rose-300",
      bg: "bg-rose-400/10 border-rose-400/25",
      show: true,
    },
  ];

  const visible = items.filter((i) => i.show && i.to !== location.pathname);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Navegação rápida — SGT Log"
          className="group hidden sm:inline-flex items-center gap-2 h-8 pl-1.5 pr-2.5 rounded-lg border border-white/[0.09] bg-white/[0.04] transition-all duration-150 hover:border-white/[0.16] hover:bg-white/[0.07] data-[state=open]:border-white/[0.16] data-[state=open]:bg-white/[0.07]"
        >
          {/* Avatar workspace */}
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br from-amber-400 to-amber-600 text-[10px] font-black text-white shadow-[0_0_8px_rgba(245,158,11,0.30)]">
            S
          </div>
          {/* Labels */}
          <div className="hidden sm:flex flex-col leading-none gap-px">
            <span className="text-[11px] font-semibold text-slate-200">SGT Log</span>
            <span className="text-[9px] text-slate-500">Workspace</span>
          </div>
          {/* Chevron */}
          <ChevronDown className="h-3 w-3 shrink-0 text-slate-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="flex max-h-[min(85vh,640px)] w-[280px] flex-col overflow-hidden rounded-2xl border p-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]"
        style={{
          background: "var(--sgt-menu-bg, hsl(var(--popover)))",
          borderColor: "var(--sgt-border-medium, hsl(var(--border)))",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-3.5 py-2.5"
          style={{ borderColor: "var(--sgt-border-subtle, hsl(var(--border)))" }}
        >
          <DropdownMenuLabel className="p-0 text-[9px] font-bold uppercase tracking-[0.22em] text-amber-300/80">
            Navegação rápida
          </DropdownMenuLabel>
          <span className="text-[9px] font-medium text-slate-500">
            {visible.length + 1} destinos
          </span>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          {/* Voltar para o Portal — destaque */}
          <div className="p-2">
            <DropdownMenuItem
              onClick={() => navigate("/home")}
              className="group flex cursor-pointer items-center gap-3 rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/15 to-amber-400/5 px-2.5 py-2.5 transition-all focus:border-amber-400/60 focus:from-amber-500/25 focus:to-amber-400/15 focus:!text-amber-100"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/15">
                <Home className="h-4 w-4 text-amber-300" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[12.5px] font-bold text-amber-200">
                  Portal Inicial
                </span>
                <span className="text-[10px] text-amber-300/60">
                  Voltar à tela principal
                </span>
              </div>
            </DropdownMenuItem>
          </div>

          {visible.length > 0 && (
            <>
              <DropdownMenuSeparator
                className="my-0"
                style={{ background: "var(--sgt-divider, hsl(var(--border)))" }}
              />
              <div className="px-3 pt-2 pb-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Ir direto para
                </p>
              </div>

              <div className="px-2 pb-2">
                {visible.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem
                      key={item.to}
                      onClick={() => navigate(item.to)}
                      className="group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-all focus:bg-white/[0.05]"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${item.bg}`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                      </div>
                      <span
                        className="flex-1 truncate text-[12px] font-medium"
                        style={{ color: "var(--sgt-text-secondary, hsl(var(--foreground)))" }}
                      >
                        {item.label}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
