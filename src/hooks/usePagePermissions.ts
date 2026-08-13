import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppModule =
  | "financeiro"
  | "gestao"
  | "operacao"
  | "compras"
  | "rh"
  | "suporte"
  | "portal-receitaflow"
  | "portal-visual"
  | "sofia-ai";

export const ALL_MODULES: AppModule[] = [
  "financeiro",
  "gestao",
  "operacao",
  "compras",
  "rh",
  "suporte",
  "portal-receitaflow",
  "portal-visual",
  "sofia-ai",
];


interface UsePagePermissionsResult {
  permissions: Set<AppModule>;
  isLoading: boolean;
  canAccess: (module: AppModule) => boolean;
  refresh: () => Promise<void>;
}
export function usePagePermissions(): UsePagePermissionsResult {
  const { user, isAdmin, role, isLoading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Set<AppModule>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setPermissions(new Set());
      setIsLoading(false);
      return;
    }
    // Aguarda a role ser determinada antes de decidir permissões
    // (evita race onde isAdmin=false momentaneamente e redireciona)
    if (role === null) {
      setIsLoading(true);
      return;
    }
    if (isAdmin) {
      setPermissions(new Set<AppModule>(ALL_MODULES));
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
      // Diretoria sempre tem gestao como fallback
      setPermissions(new Set<AppModule>(role === "diretoria" ? ["gestao"] : []));
    } else {
      const dbPerms = new Set(
        (data ?? [])
          .map((r) => r.page as AppModule)
          .filter((m): m is AppModule => ALL_MODULES.includes(m as AppModule))
      );
      // Diretoria sempre inclui gestao, mais quaisquer extras do banco
      if (role === "diretoria") dbPerms.add("gestao");
      setPermissions(dbPerms);
    }
    setIsLoading(false);
  }, [user, isAdmin, role]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const canAccess = useCallback(
    (module: AppModule) => isAdmin || permissions.has(module),
    [isAdmin, permissions]
  );

  return { permissions, isLoading, canAccess, refresh: load };
}
