import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_NAV, type AppNavItem } from "./appNav";
import { useAuth } from "@/contexts/AuthContext";
import { usePagePermissions } from "@/hooks/usePagePermissions";

/** Máximo de atalhos fixados no Acesso Rápido. */
export const MAX_FAVS = 6;

const STORE_BASE = "sgt_quick_access_v1";

/** Chave de storage isolada por usuário (favoritos não vazam entre contas no mesmo device). */
function storageKey(userKey: string) {
  return `${STORE_BASE}::${userKey}`;
}

function readIds(userKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export type QuickAccess = {
  /** IDs crus persistidos (inclui itens que o usuário talvez não acesse). */
  ids: string[];
  /** Itens resolvidos do APP_NAV e filtrados por permissão — prontos pra render. */
  favItems: AppNavItem[];
  isFav: (id: string) => boolean;
  /** Liga/desliga um favorito. Retorna false se bateu no limite (não fixou). */
  toggle: (id: string) => boolean;
  count: number;
  max: number;
};

/**
 * Gerencia os atalhos do Acesso Rápido.
 * Persistência por usuário em localStorage (sem dependência de backend).
 * Para sincronizar entre dispositivos no futuro, basta trocar read/persist por Supabase.
 */
export function useQuickAccess(): QuickAccess {
  const { user } = useAuth();
  const { canAccess } = usePagePermissions();
  const userKey = user?.id ?? user?.email ?? "anon";

  const [ids, setIds] = useState<string[]>(() => readIds(userKey));

  // Recarrega quando troca o usuário logado.
  useEffect(() => {
    setIds(readIds(userKey));
  }, [userKey]);

  const persist = useCallback(
    (next: string[]) => {
      setIds(next);
      try {
        localStorage.setItem(storageKey(userKey), JSON.stringify(next));
      } catch {
        /* storage indisponível — mantém só em memória */
      }
    },
    [userKey],
  );

  const isFav = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string): boolean => {
      if (ids.includes(id)) {
        persist(ids.filter((x) => x !== id));
        return true;
      }
      if (ids.length >= MAX_FAVS) return false;
      persist([...ids, id]);
      return true;
    },
    [ids, persist],
  );

  // Resolve ids -> itens reais, descartando ids inválidos e módulos sem permissão.
  const favItems = useMemo(
    () =>
      ids
        .map((id) => APP_NAV.find((i) => i.id === id))
        .filter((i): i is AppNavItem => !!i && (!i.module || canAccess(i.module))),
    [ids, canAccess],
  );

  return { ids, favItems, isFav, toggle, count: ids.length, max: MAX_FAVS };
}
