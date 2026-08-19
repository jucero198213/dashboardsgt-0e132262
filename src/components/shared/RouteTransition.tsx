import { Suspense } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { motion } from "framer-motion";

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
  const outlet   = useOutlet();

  return (
    <motion.div
      key={location.pathname}
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0,  opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: "100%", minHeight: "100dvh" }}
    >
      <Suspense fallback={<PageFallback />}>{outlet}</Suspense>
    </motion.div>
  );
}
