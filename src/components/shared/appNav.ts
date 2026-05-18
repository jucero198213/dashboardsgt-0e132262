import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, RefreshCcw,
  FileBarChart, Building2, Tag, Landmark,
  TrendingUp, Activity, Wallet, Banknote, Users,
  Truck, Wrench, MapPin, Briefcase, ShoppingCart, Fuel,
  LineChart as LineChartIcon, Headphones, UserCog,
} from "lucide-react";

export type AppNavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  /** Para itens internos do módulo Financeiro: navega para /financeiro?s={id} */
  financeScreen?: string;
  /** Rota externa (link direto) */
  to?: string;
  section?: string;
  badge?: number;
  badgeColor?: "amber" | "rose";
};

/**
 * NAV global — replicado da sidebar da tela /financeiro.
 * Itens com `financeScreen` controlam sub-telas dentro de /financeiro;
 * itens com `to` são rotas normais.
 */
export const APP_NAV: AppNavItem[] = [
  { id: "fin-painel",       label: "Painel",           icon: LayoutDashboard, financeScreen: "painel",       section: "Financeiro" },
  { id: "fin-pagar",        label: "Contas a Pagar",   icon: ArrowDownCircle, financeScreen: "pagar",        badge: 7 },
  { id: "fin-receber",      label: "Contas a Receber", icon: ArrowUpCircle,   financeScreen: "receber",      badge: 3, badgeColor: "amber" },
  { id: "fin-conciliacao",  label: "Conciliação",      icon: RefreshCcw,      financeScreen: "conciliacao" },
  { id: "fin-realizado",    label: "Realizado",        icon: Activity,        to: "/dashboard" },
  { id: "fin-previsto",     label: "Previsto",         icon: TrendingUp,      financeScreen: "previsto" },
  { id: "fin-relatorios",   label: "Relatórios",       icon: FileBarChart,    financeScreen: "relatorios" },

  { id: "fin-fornecedores", label: "Fornecedores",     icon: Building2,       financeScreen: "fornecedores", section: "Cadastros" },
  { id: "fin-clientes",     label: "Clientes",         icon: Users,           financeScreen: "clientes" },
  { id: "fin-categorias",   label: "Categorias",       icon: Tag,             financeScreen: "categorias" },
  { id: "fin-bancos",       label: "Bancos",           icon: Landmark,        financeScreen: "bancos" },

  { id: "ext-executivo",    label: "Painel Executivo", icon: Briefcase,       to: "/executivo",            section: "Gestão" },
  { id: "ext-indicadores",  label: "Indicadores",      icon: LineChartIcon,   to: "/indicadores" },
  { id: "ext-faturamento",  label: "Faturamento",      icon: Banknote,        to: "/faturamento" },

  { id: "ext-operacional",  label: "Operacional",      icon: MapPin,          to: "/operacional",          section: "Operação" },
  { id: "ext-frota",        label: "Gestão de Frota",  icon: Truck,           to: "/frota" },
  { id: "ext-fin-frota",    label: "Financiamentos",   icon: Wallet,          to: "/financiamento-frota" },
  { id: "ext-manutencao",   label: "Manutenção",       icon: Wrench,          to: "/manutencao" },
  { id: "ext-abastecimento",label: "Abastecimento",    icon: Fuel,            to: "/abastecimento" },

  { id: "ext-compras",      label: "Compras",          icon: ShoppingCart,    to: "/compras",              section: "Compras" },
  { id: "ext-rh",           label: "RH",               icon: UserCog,         to: "/rh",                   section: "RH" },
  { id: "ext-chamados",     label: "Chamados",         icon: Headphones,      to: "/chamados",             section: "Suporte" },
];
