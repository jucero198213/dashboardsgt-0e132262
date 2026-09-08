import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "sgt:chunk-reloaded";

/**
 * lazy() resiliente a deploys: quando o navegador tem um index.html antigo em
 * cache e tenta buscar um chunk que já não existe, tentamos de novo e, se ainda
 * falhar, recarregamos a página uma única vez para pegar os arquivos novos.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (err) {
      // segunda tentativa (falha de rede pontual)
      try {
        const mod = await factory();
        sessionStorage.removeItem(RELOAD_KEY);
        return mod;
      } catch {
        if (sessionStorage.getItem(RELOAD_KEY) !== "1") {
          sessionStorage.setItem(RELOAD_KEY, "1");
          window.location.reload();
          // devolve uma promise pendente enquanto a página recarrega
          return new Promise<{ default: T }>(() => {});
        }
        throw err;
      }
    }
  });
}
