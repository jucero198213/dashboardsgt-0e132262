import { useEffect, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

const SPRING = { type: "spring", stiffness: 200, damping: 28, mass: 0.9 } as const;
const INSTANT = { duration: 0 } as const;

interface ExpandableCardProps {
  layoutId: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  expandedContent: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function ExpandableCard({
  layoutId,
  expanded,
  onToggle,
  children,
  expandedContent,
  disabled,
  className = "",
}: ExpandableCardProps) {
  const reduced = useReducedMotion();
  const transition = reduced ? INSTANT : SPRING;
  const cardRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<DOMRect | null>(null);

  const handleOpen = useCallback(() => {
    if (disabled || expanded) return;
    if (cardRef.current) {
      setOrigin(cardRef.current.getBoundingClientRect());
    }
    onToggle();
  }, [disabled, expanded, onToggle]);

  const handleClose = useCallback(() => {
    onToggle();
  }, [onToggle]);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && expanded) handleClose();
    },
    [expanded, handleClose],
  );

  useEffect(() => {
    if (expanded) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [expanded, handleEsc]);

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  const expandedW = Math.min(vw - 48, 896);
  const expandedH = Math.min(vh * 0.85, vh - 48);
  const expandedX = (vw - expandedW) / 2;
  const expandedY = (vh - expandedH) / 2;

  const from = origin ?? { x: vw / 2 - 100, y: vh / 2 - 60, width: 200, height: 120 };

  return (
    <>
      {/* Collapsed card — always in DOM to hold grid slot */}
      <div
        ref={cardRef}
        onClick={handleOpen}
        className={className}
        style={{
          cursor: disabled ? "default" : "pointer",
          ...(expanded ? { visibility: "hidden" as const } : {}),
        }}
      >
        {children}
      </div>

      {/* Expanded overlay — portaled to escape stacking contexts */}
      {createPortal(
        <AnimatePresence>
          {expanded && (
            <>
              {/* Backdrop */}
              <motion.div
                key={`${layoutId}-backdrop`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={handleClose}
                className="fixed inset-0 z-[60]"
                style={{ background: "rgba(2,3,12,0.82)" }}
              />

              {/* Expanding panel — animates from card position to center */}
              <motion.div
                key={`${layoutId}-panel`}
                initial={{
                  position: "fixed",
                  top: from.y,
                  left: from.x,
                  width: from.width,
                  height: from.height,
                  borderRadius: 16,
                  opacity: 0.6,
                }}
                animate={{
                  top: expandedY,
                  left: expandedX,
                  width: expandedW,
                  height: expandedH,
                  borderRadius: 16,
                  opacity: 1,
                }}
                exit={{
                  top: from.y,
                  left: from.x,
                  width: from.width,
                  height: from.height,
                  borderRadius: 16,
                  opacity: 0,
                }}
                transition={transition}
                className="fixed z-[61] flex flex-col border overflow-hidden"
                style={{
                  background: "var(--sgt-bg-section)",
                  borderColor: "var(--sgt-border-subtle)",
                  boxShadow: "0 25px 80px rgba(0,0,0,0.5), 0 0 60px rgba(139,92,246,0.08)",
                }}
              >
                {/* Close button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.15, duration: 0.15 }}
                  onClick={handleClose}
                  className="absolute top-3 right-3 z-10 rounded-lg border border-white/[0.08] p-1.5 text-slate-400 hover:border-rose-400/30 hover:text-rose-300 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>

                {/* Content fades in after panel starts expanding */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                  className="flex flex-col flex-1 min-h-0 overflow-hidden"
                >
                  {expandedContent}
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
