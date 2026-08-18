import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

const SPRING = { type: "spring", stiffness: 260, damping: 32, mass: 0.9 } as const;
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

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && expanded) onToggle();
    },
    [expanded, onToggle],
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

  return (
    <>
      {/* Collapsed card — keeps grid slot when expanded */}
      <div
        onClick={disabled ? undefined : expanded ? undefined : onToggle}
        className={className}
        style={{
          cursor: disabled ? "default" : "pointer",
          ...(expanded ? { visibility: "hidden" as const } : {}),
        }}
      >
        {children}
      </div>

      {/* Expanded overlay — portaled to body to escape stacking contexts */}
      {createPortal(
        <AnimatePresence>
          {expanded && (
            <>
              <motion.div
                key={`${layoutId}-backdrop`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={onToggle}
                className="fixed inset-0 z-[60]"
                style={{ background: "rgba(2,3,12,0.82)" }}
              />

              <div className="fixed inset-0 z-[61] flex items-center justify-center p-3 sm:p-6 pointer-events-none">
                <motion.div
                  key={`${layoutId}-expanded`}
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={transition}
                  className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border overflow-hidden pointer-events-auto"
                  style={{
                    background: "var(--sgt-bg-section)",
                    borderColor: "var(--sgt-border-subtle)",
                    boxShadow: "0 25px 80px rgba(0,0,0,0.5), 0 0 60px rgba(139,92,246,0.08)",
                  }}
                >
                  {/* Close button */}
                  <button
                    onClick={onToggle}
                    className="absolute top-3 right-3 z-10 rounded-lg border border-white/[0.08] p-1.5 text-slate-400 hover:border-rose-400/30 hover:text-rose-300 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {expandedContent}
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
