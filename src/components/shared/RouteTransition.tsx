/**
 * RouteTransition — SGT Log
 * Layout route (usada como elemento de uma <Route> "casca" que envolve
 * todas as outras rotas como filhas). Aplica slide horizontal apenas
 * quando o usuário sai da tela /home para qualquer outra rota.
 *
 * useOutlet() retorna o elemento da rota filha atual já resolvido pelo
 * <Routes> — isso garante que, ao trocar a key do motion.div, o React
 * desmonte e remonte de fato o conteúdo, permitindo a animação.
 */
import { useEffect, useRef, Suspense } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { motion } from "framer-motion";

const HOME_PATH = "/home";

function PageFallback() {
  return (
    <div
      className="flex h-[100dvh] w-full items-center justify-center"
      style={{ backgroundColor: "var(--sgt-bg-base, #020308)" }}
    >
      <div className="h-8 w-8 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
    </div>
  );
}

export function RouteTransition() {
  const location = useLocation();
  const outlet = useOutlet();
  const prevPathRef = useRef<string>(location.pathname);

  const isLeavingHome = prevPathRef.current === HOME_PATH && location.pathname !== HOME_PATH;

  // Atualiza a ref DEPOIS do commit (useEffect), nunca durante o render —
  // assim isLeavingHome permanece estável enquanto a rota atual não mudar
  // de novo, mesmo que o componente re-renderize por outros motivos
  // (ex.: providers de contexto acima na árvore).
  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  if (!isLeavingHome) {
    return <Suspense fallback={<PageFallback />}>{outlet}</Suspense>;
  }

  // motion.div com key por rota: ao trocar a rota saindo da home, ele remonta
  // e a animação de entrada (initial → animate) dispara de fato. Sem
  // AnimatePresence/initial=false, que estavam suprimindo o slide.
  return (
    <motion.div
      key={location.pathname}
      initial={{ x: 28, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: "100%", minHeight: "100dvh", willChange: "transform, opacity" }}
    >
      <Suspense fallback={<PageFallback />}>{outlet}</Suspense>
    </motion.div>
  );
}
