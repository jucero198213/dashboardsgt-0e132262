import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Garante que toda navegação entre rotas inicie no topo da página.
 * Necessário porque o React Router preserva a posição de scroll anterior.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    // Também rola contêineres com overflow auto/scroll que possam ter scroll preservado
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
