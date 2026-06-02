import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, RefreshCcw,
  FileBarChart, Building2, Tag, Landmark,
  TrendingUp, Activity, Wallet, Banknote, Users,
  Truck, Wrench, MapPin, Briefcase, ShoppingCart, Fuel,
  LineChart as LineChartIcon, Headphones, UserCog, Scale,
  Sparkles, Globe, Monitor,
} from "lucide-react";
import type { AppModule } from "@/hooks/usePagePermissions";

export type AppNavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  /** Para itens internos do módulo Financeiro: navega para /financeiro?s={id} */
  financeScreen?: string;
  /** Rota interna do workspace */
  to?: string;
  /** URL externa — abre em nova aba em vez de navegar internamente */
  externalUrl?: string;
  section?: string;
  badge?: number;
  badgeColor?: "amber" | "rose";
  /** Marca como portal integrado — recebe destaque visual especial */
  portal?: boolean;
  /** Módulo ao qual este item pertence — undefined = visível para todos */
  module?: AppModule;
};

/**
 * NAV global — replicado da sidebar da tela /financeiro.
 * Itens com `financeScreen` controlam sub-telas dentro de /financeiro;
 * itens com `to` são rotas normais.
 * Itens com `portal: true` aparecem primeiro com destaque visual.
 * Itens sem `module` são visíveis para todos os usuários autenticados.
 */
export const APP_NAV: AppNavItem[] = [
  // ── Portais integrados — visíveis para todos ─────────────────────────────
  { id: "portal-receitaflow", label: "ReceitaFlow",    icon: Sparkles, to: "/receitaflow",    portal: true, section: "Portais", module: "portal-receitaflow" },
  { id: "portal-visual",      label: "Visual Rodopar", icon: Globe,    externalUrl: "https://webcloud2.datapardc.com/software/html5.html", portal: true, module: "portal-visual" },
  { id: "portal-wr",          label: "Portal WR SGT",  icon: Monitor,  externalUrl: "http://54.232.121.164:9474/#/login",                  portal: true, module: "portal-wr"     },

  // ── Financeiro ────────────────────────────────────────────────────────────
  { id: "fin-painel",       label: "Painel Financeiro",icon: LayoutDashboard, financeScreen: "painel",       section: "Financeiro", module: "financeiro" },
  { id: "fin-pagar",        label: "Contas a Pagar",   icon: ArrowDownCircle, financeScreen: "pagar",        module: "financeiro" },
  { id: "fin-receber",      label: "Contas a Receber", icon: ArrowUpCircle,   financeScreen: "receber",      module: "financeiro" },
  { id: "fin-conciliacao",  label: "Conciliação",      icon: RefreshCcw,      financeScreen: "conciliacao",  module: "financeiro" },
  { id: "fin-realizado",    label: "Realizado",        icon: Activity,        to: "/dashboard",              module: "financeiro" },
  { id: "fin-previsto",     label: "Previsto",         icon: TrendingUp,      financeScreen: "previsto",     module: "financeiro" },
  { id: "fin-relatorios",   label: "Relatórios",       icon: FileBarChart,    financeScreen: "relatorios",   module: "financeiro" },
  { id: "ext-fiscal",       label: "Fiscal",           icon: Scale,           to: "/fiscal",                 module: "financeiro" },

  // ── Outras Análises (visões financeiras por dimensão) ─────────────────────
  { id: "fin-fornecedores", label: "Fornecedores",     icon: Building2,       financeScreen: "fornecedores", section: "Outras Análises", module: "financeiro" },
  { id: "fin-clientes",     label: "Clientes",         icon: Users,           financeScreen: "clientes",     module: "financeiro" },
  { id: "fin-categorias",   label: "Categorias",       icon: Tag,             financeScreen: "categorias",   module: "financeiro" },
  { id: "fin-bancos",       label: "Bancos",           icon: Landmark,        financeScreen: "bancos",       module: "financeiro" },

  // ── Gestão ────────────────────────────────────────────────────────────────
  { id: "ext-executivo",    label: "Painel Executivo", icon: Briefcase,       to: "/executivo",              section: "Diretoria", module: "gestao" },
  { id: "ext-indicadores",  label: "Indicadores",      icon: LineChartIcon,   to: "/indicadores",                                   module: "gestao" },
  { id: "ext-faturamento",  label: "Faturamento",      icon: Banknote,        to: "/faturamento",                                   module: "gestao" },

  // ── Operação ──────────────────────────────────────────────────────────────
  { id: "ext-operacional",  label: "Operacional",      icon: MapPin,          to: "/operacional",            section: "Operação",  module: "operacao" },
  { id: "ext-frota",        label: "Gestão de Frota",  icon: Truck,           to: "/frota",                                         module: "operacao" },
  { id: "ext-fin-frota",    label: "Financiamentos",   icon: Wallet,          to: "/financiamento-frota",                           module: "operacao" },
  { id: "ext-manutencao",   label: "Manutenção",       icon: Wrench,          to: "/manutencao",                                    module: "operacao" },
  { id: "ext-abastecimento",label: "Abastecimento",    icon: Fuel,            to: "/abastecimento",                                 module: "operacao" },

  // ── Compras ───────────────────────────────────────────────────────────────
  { id: "ext-compras",      label: "Compras",          icon: ShoppingCart,    to: "/compras",                section: "Compras",   module: "compras" },

  // ── RH ────────────────────────────────────────────────────────────────────
  { id: "ext-rh",           label: "RH",               icon: UserCog,         to: "/rh",                     section: "RH",        module: "rh" },

  // ── Suporte ───────────────────────────────────────────────────────────────
  { id: "ext-chamados",     label: "Chamados",         icon: Headphones,      to: "/chamados",               section: "Suporte",   module: "suporte" },
];
