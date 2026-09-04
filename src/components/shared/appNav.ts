import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, RefreshCcw,
  FileBarChart, Building2, Tag, Landmark,
  TrendingUp, Activity, Wallet, Banknote, Users,
  Truck, Wrench, MapPin, Briefcase, ShoppingCart, Fuel,
  LineChart as LineChartIcon, Headphones, UserCog, Scale,
  Sparkles, Globe, BotMessageSquare, CircleDot,
} from "lucide-react";
import type { AppPage } from "@/hooks/usePagePermissions";

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
  /** Tela à qual este item pertence — undefined = visível para todos */
  page?: AppPage;
};

/**
 * NAV global — replicado da sidebar da tela /financeiro.
 * Itens com `financeScreen` controlam sub-telas dentro de /financeiro;
 * itens com `to` são rotas normais.
 * Itens com `portal: true` aparecem primeiro com destaque visual.
 * Itens sem `page` são visíveis para todos os usuários autenticados.
 */
export const APP_NAV: AppNavItem[] = [
  // ── Sofia AI ──────────────────────────────────────────────────────────────
  { id: "sofia-ai",           label: "Sofia AI",       icon: BotMessageSquare, to: "/sofia", portal: true, section: "IA", page: "sofia-ai" },

  // ── Portais integrados ───────────────────────────────────────────────────
  { id: "portal-receitaflow", label: "ReceitaFlow",    icon: Sparkles, to: "/receitaflow",    portal: true, section: "Portais", page: "portal-receitaflow" },
  { id: "portal-visual",      label: "Visual Rodopar", icon: Globe,    externalUrl: "https://webcloud2.datapardc.com/software/html5.html", portal: true, page: "portal-visual" },

  // ── Financeiro ────────────────────────────────────────────────────────────
  { id: "fin-painel",       label: "Painel Financeiro",icon: LayoutDashboard, financeScreen: "painel",       section: "Financeiro", page: "fin-painel" },
  { id: "fin-pagar",        label: "Contas a Pagar",   icon: ArrowDownCircle, financeScreen: "pagar",        page: "fin-pagar" },
  { id: "fin-receber",      label: "Contas a Receber", icon: ArrowUpCircle,   financeScreen: "receber",      page: "fin-receber" },
  { id: "fin-conciliacao",  label: "Conciliação",      icon: RefreshCcw,      financeScreen: "conciliacao",  page: "fin-conciliacao" },
  { id: "fin-realizado",    label: "Realizado",        icon: Activity,        to: "/dashboard",              page: "fin-realizado" },
  { id: "fin-previsto",     label: "Previsto",         icon: TrendingUp,      financeScreen: "previsto",     page: "fin-previsto" },
  { id: "fin-relatorios",   label: "Relatórios",       icon: FileBarChart,    financeScreen: "relatorios",   page: "fin-relatorios" },
  { id: "ext-fiscal",       label: "Fiscal",           icon: Scale,           to: "/fiscal",                 page: "ext-fiscal" },
  { id: "ext-fin-frota",    label: "Financiamentos",   icon: Wallet,          to: "/financiamento-frota",    page: "ext-fin-frota" },

  // ── Outras Análises (visões financeiras por dimensão) ─────────────────────
  { id: "fin-fornecedores", label: "Fornecedores",     icon: Building2,       financeScreen: "fornecedores", section: "Outras Análises", page: "fin-fornecedores" },
  { id: "fin-clientes",     label: "Clientes",         icon: Users,           financeScreen: "clientes",     page: "fin-clientes" },
  { id: "fin-categorias",   label: "Categorias",       icon: Tag,             financeScreen: "categorias",   page: "fin-categorias" },
  { id: "fin-bancos",       label: "Bancos",           icon: Landmark,        financeScreen: "bancos",       page: "fin-bancos" },

  // ── Gestão ────────────────────────────────────────────────────────────────
  { id: "ext-executivo",    label: "Painel Executivo", icon: Briefcase,       to: "/executivo",              section: "Diretoria", page: "ext-executivo" },
  { id: "ext-indicadores",  label: "Indicadores",      icon: LineChartIcon,   to: "/indicadores",                                   page: "ext-indicadores" },
  { id: "ext-faturamento",  label: "Faturamento",      icon: Banknote,        to: "/faturamento",                                   page: "ext-faturamento" },

  // ── Operação ──────────────────────────────────────────────────────────────
  { id: "ext-operacional",  label: "Operacional",      icon: MapPin,          to: "/operacional",            section: "Operação",  page: "ext-operacional" },

  // ── Frota ─────────────────────────────────────────────────────────────────
  { id: "ext-frota",        label: "Gestão de Frota",  icon: Truck,           to: "/frota",                  section: "Frota",     page: "ext-frota" },
  { id: "ext-manutencao",   label: "Manutenção",       icon: Wrench,          to: "/manutencao",                                   page: "ext-manutencao" },
  { id: "ext-abastecimento",label: "Abastecimento",    icon: Fuel,            to: "/abastecimento",                                page: "ext-abastecimento" },
  { id: "ext-pneus",        label: "Pneus",            icon: CircleDot,       to: "/pneus",                                        page: "ext-pneus" },

  // ── Compras ───────────────────────────────────────────────────────────────
  { id: "ext-compras",      label: "Compras",          icon: ShoppingCart,    to: "/compras",                section: "Compras",   page: "ext-compras" },

  // ── RH ────────────────────────────────────────────────────────────────────
  { id: "ext-rh",           label: "RH",               icon: UserCog,         to: "/rh",                     section: "RH",        page: "ext-rh" },

  // ── Suporte ───────────────────────────────────────────────────────────────
  { id: "ext-chamados",     label: "Chamados",         icon: Headphones,      to: "/chamados",               section: "Suporte",   page: "ext-chamados" },
];
