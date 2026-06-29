/**
 * RouteTransition — SGT Log
 * Aplica slide horizontal (estilo navegação iOS) apenas quando o usuário
 * sai da tela /home para qualquer outra rota. Demais navegações (entre
 * páginas internas, ou voltando para /home) não são afetadas.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const HOME_PATH = "/home";

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const prevPathRef = useRef<string>(location.pathname);

  // Só anima quando a navegação parte EXATAMENTE de /home para outra rota
  const isLeavingHome =
    prevPathRef.current === HOME_PATH && location.pathname !== HOME_PATH;

  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  if (!isLeavingHome) {
    // Navegação normal: sem wrapper de animação, sem custo de motion
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ x: "100%", opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 0.68, 0, 1] }}
        style={{ width: "100%", minHeight: "100dvh" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
