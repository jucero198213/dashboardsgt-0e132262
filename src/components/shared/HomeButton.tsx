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
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }, [cancelClose]);

  const openNow = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const items: NavItem[] = [
    {
      to: "/dashboard",
      label: "Dashboard Financeiro",
      icon: BarChart3,
      color: "text-cyan-300",
      bg: "bg-cyan-400/10 border-cyan-400/25",
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
      color: "text-rose-300",
      bg: "bg-rose-400/10 border-rose-400/25",
      show: canAccess("dashboard"),
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
      to: "/frota",
      label: "Gestão de Frota",
      icon: Car,
      color: "text-cyan-300",
      bg: "bg-cyan-400/10 border-cyan-400/25",
      show: true,
    },
    {
      to: "/financiamento-frota",
      label: "Financiamento de Frota",
      icon: Truck,
      color: "text-orange-300",
      bg: "bg-orange-400/10 border-orange-400/25",
      show: true,
    },
    {
      to: "/manutencao",
      label: "Manutenção",
      icon: Wrench,
      color: "text-fuchsia-300",
      bg: "bg-fuchsia-400/10 border-fuchsia-400/25",
      show: true,
    },
  ];

  const visible = items.filter((i) => i.show && i.to !== location.pathname);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Navegação rápida"
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
          onFocus={openNow}
          className="group relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-xl border-2 border-amber-500/60 bg-gradient-to-r from-amber-500/[0.18] via-amber-400/[0.10] to-amber-500/[0.18] px-2.5 sm:px-3.5 text-[12px] font-bold uppercase tracking-[0.08em] text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(245,158,11,0.12)] transition-all duration-200 hover:border-amber-400 hover:from-amber-500/25 hover:to-amber-400/20 hover:text-white hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_rgba(245,158,11,0.35)] data-[state=open]:border-amber-400 data-[state=open]:from-amber-500/25 data-[state=open]:to-amber-400/20 data-[state=open]:text-white data-[state=open]:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_rgba(245,158,11,0.35)]"
        >
          {/* Sheen effect on hover */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/20 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100"
          />
          <Home
            className="relative h-3.5 w-3.5 shrink-0 text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)] transition-transform duration-300 group-hover:scale-110 group-hover:text-amber-200"
          />
          <span className="relative hidden sm:inline">Início</span>
          <ChevronDown className="relative h-3.5 w-3.5 shrink-0 text-amber-300/80 transition-transform duration-300 group-data-[state=open]:rotate-180 group-hover:text-amber-200" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[280px] overflow-hidden rounded-2xl border p-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]"
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

            <div className="max-h-[320px] overflow-y-auto px-2 pb-2">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
