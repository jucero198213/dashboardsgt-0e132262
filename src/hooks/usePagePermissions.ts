import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppPage = "dashboard" | "indicadores";

interface UsePagePermissionsResult {
  permissions: Set<AppPage>;
  isLoading: boolean;
  canAccess: (page: AppPage) => boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook que carrega as páginas que o usuário atual pode acessar.
 * - Admins têm acesso a tudo (não precisa de registro).
 * - Usuários comuns: lê de page_permissions onde user_id = auth.uid().
 */
export function usePagePermissions(): UsePagePermissionsResult {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Set<AppPage>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setPermissions(new Set());
      setIsLoading(false);
      return;
    }
    if (isAdmin) {
      setPermissions(new Set<AppPage>(["dashboard", "indicadores"]));
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
      setPermissions(new Set());
    } else {
      setPermissions(new Set((data ?? []).map((r) => r.page as AppPage)));
    }
    setIsLoading(false);
  }, [user, isAdmin]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const canAccess = useCallback(
    (page: AppPage) => isAdmin || permissions.has(page),
    [isAdmin, permissions]
  );

  return { permissions, isLoading, canAccess, refresh: load };
}
