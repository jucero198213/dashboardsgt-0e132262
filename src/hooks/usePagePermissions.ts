import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppPage =
  | "fin-painel"
  | "fin-pagar"
  | "fin-receber"
  | "fin-conciliacao"
  | "fin-realizado"
  | "fin-previsto"
  | "fin-relatorios"
  | "ext-fiscal"
  | "fin-fornecedores"
  | "fin-clientes"
  | "fin-categorias"
  | "fin-bancos"
  | "ext-executivo"
  | "ext-indicadores"
  | "ext-faturamento"
  | "ext-operacional"
  | "ext-frota"
  | "ext-fin-frota"
  | "ext-manutencao"
  | "ext-abastecimento"
  | "ext-compras"
  | "ext-rh"
  | "ext-chamados"
  | "portal-receitaflow"
  | "portal-visual"
  | "sofia-ai";

export const ALL_PAGES: AppPage[] = [
  "fin-painel",
  "fin-pagar",
  "fin-receber",
  "fin-conciliacao",
  "fin-realizado",
  "fin-previsto",
  "fin-relatorios",
  "ext-fiscal",
  "fin-fornecedores",
  "fin-clientes",
  "fin-categorias",
  "fin-bancos",
  "ext-executivo",
  "ext-indicadores",
  "ext-faturamento",
  "ext-operacional",
  "ext-frota",
  "ext-fin-frota",
  "ext-manutencao",
  "ext-abastecimento",
  "ext-compras",
  "ext-rh",
  "ext-chamados",
  "portal-receitaflow",
  "portal-visual",
  "sofia-ai",
];

export const PAGE_GROUPS: { label: string; pages: AppPage[] }[] = [
  {
    label: "Financeiro",
    pages: ["fin-painel", "fin-pagar", "fin-receber", "fin-conciliacao", "fin-realizado", "fin-previsto", "fin-relatorios", "ext-fiscal"],
  },
  {
    label: "Outras Análises",
    pages: ["fin-fornecedores", "fin-clientes", "fin-categorias", "fin-bancos"],
  },
  {
    label: "Gestão",
    pages: ["ext-executivo", "ext-indicadores", "ext-faturamento"],
  },
  {
    label: "Operação",
    pages: ["ext-operacional", "ext-frota", "ext-fin-frota", "ext-manutencao", "ext-abastecimento"],
  },
  {
    label: "Compras",
    pages: ["ext-compras"],
  },
  {
    label: "RH",
    pages: ["ext-rh"],
  },
  {
    label: "Suporte",
    pages: ["ext-chamados"],
  },
  {
    label: "Portais",
    pages: ["portal-receitaflow", "portal-visual"],
  },
  {
    label: "IA",
    pages: ["sofia-ai"],
  },
];

/** @deprecated use AppPage */
export type AppModule = AppPage;
/** @deprecated use ALL_PAGES */
export const ALL_MODULES = ALL_PAGES;

interface UsePagePermissionsResult {
  permissions: Set<AppPage>;
  isLoading: boolean;
  canAccess: (page: AppPage) => boolean;
  refresh: () => Promise<void>;
}

export function usePagePermissions(): UsePagePermissionsResult {
  const { user, isAdmin, role, isLoading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Set<AppPage>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setPermissions(new Set());
      setIsLoading(false);
      return;
    }
    if (role === null) {
      setIsLoading(true);
      return;
    }
    if (isAdmin) {
      setPermissions(new Set<AppPage>(ALL_PAGES));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from("page_permissions")
      .select("page")
      .eq("user_id", user.id);

    if (error) {
      console.error("Erro ao buscar permissões:", error);
      setPermissions(new Set<AppPage>());
    } else {
      const dbPerms = new Set(
        (data ?? [])
          .map((r) => r.page as AppPage)
          .filter((p): p is AppPage => ALL_PAGES.includes(p as AppPage))
      );
      setPermissions(dbPerms);
    }
    setIsLoading(false);
  }, [user, isAdmin, role]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const canAccess = useCallback(
    (page: AppPage) => isAdmin || permissions.has(page),
    [isAdmin, permissions]
  );

  return { permissions, isLoading, canAccess, refresh: load };
}
