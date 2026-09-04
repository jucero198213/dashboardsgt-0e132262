import React, { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";
import { CountUp } from "@/components/shared/CountUp";

export type KpiTone = "emerald" | "amber" | "cyan" | "violet" | "rose" | "orange" | "blue";

interface KpiCardProps {
  label: string;
  value: string;
  rawValue?: number;
  subtitle?: string;
  icon: React.ElementType;
  tone: KpiTone;
  loading?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

const toneColors: Record<KpiTone, { icon: string; sub: string; rgb: string }> = {
  emerald: { icon: "text-emerald-400", sub: "#059669", rgb: "52,211,153"   },
  amber:   { icon: "text-amber-400",   sub: "#d97706", rgb: "245,166,35"   },
  cyan:    { icon: "text-cyan-400",    sub: "#0891b2", rgb: "34,211,238"   },
  violet:  { icon: "text-violet-400",  sub: "#7c3aed", rgb: "167,139,250"  },
  rose:    { icon: "text-rose-400",    sub: "#e11d48", rgb: "251,113,133"  },
  orange:  { icon: "text-orange-400",  sub: "#ea580c", rgb: "251,146,60"   },
  blue:    { icon: "text-blue-400",    sub: "#2563eb", rgb: "96,165,250"   },
};

export function KpiCard({
  label, value, rawValue, subtitle, icon: Icon, tone, loading, onClick, compact,
}: KpiCardProps) {
  const t = toneColors[tone];
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // 3D tilt — igual ao OsAndamentoCard
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-50, 50], [8, -8]);
  const rotateY = useTransform(mouseX, [-50, 50], [-8, 8]);
  const springRX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - (r.left + r.width  / 2));
    mouseY.set(e.clientY - (r.top  + r.height / 2));
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const isCurrency = value.startsWith("R$");
  const isPercent  = value.endsWith("%");

  return (
    <motion.div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        minHeight: compact ? 92 : 112,
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        background: "var(--sgt-bg-card)",
        border: "1px solid var(--sgt-border-subtle)",
        borderRadius: "0.75rem",
        overflow: "hidden",
        rotateX: springRX,
        rotateY: springRY,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      animate={{
        borderColor: isHovered
          ? `rgba(${t.rgb}, 0.25)`
          : "var(--sgt-border-subtle)",
      }}
      transition={{ duration: 0.25 }}
    >
      {/* Overlay de hover — radial na cor do tone */}
      <motion.div
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse at top left, rgba(${t.rgb},0.09), transparent 60%)`,
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.25 }}
      />

      {/* Barra de acento superior */}
      <motion.div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2, pointerEvents: "none",
          background: `linear-gradient(to right, rgba(${t.rgb},0.8), transparent)`,
        }}
        animate={{ opacity: isHovered ? 1 : 0.3 }}
        transition={{ duration: 0.3 }}
      />

      {/* Grid pattern */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none" }}>
        <svg width="100%" height="100%">
          <defs>
            <pattern id={`kpi-grid-${tone}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#kpi-grid-${tone})`} />
        </svg>
      </div>

      {/* Conteúdo */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", height: "100%", padding: compact ? 12 : 16,
      }}>
        {/* Label + ícone */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <p style={{
            fontSize: 10, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.3em", color: "var(--sgt-text-muted)", lineHeight: 1.2, margin: 0,
          }}>
            {label}
          </p>
          <motion.div
            animate={{
              filter: isHovered
                ? `drop-shadow(0 0 6px rgba(${t.rgb},0.7))`
                : `drop-shadow(0 0 3px rgba(${t.rgb},0.2))`,
            }}
            transition={{ duration: 0.3 }}
          >
            <Icon className={`h-3.5 w-3.5 shrink-0 ${t.icon}`} />
          </motion.div>
        </div>

        {/* Valor */}
        <motion.p
          className={`dark:text-white text-slate-800${loading ? " animate-pulse" : ""}`}
          style={{
            marginTop: "auto",
            paddingTop: compact ? 8 : 12,
            fontSize: "clamp(1.1rem, 2vw, 1.4rem)",
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: "-0.04em",
            marginBottom: subtitle ? 6 : 8,
          }}
          animate={{ x: isHovered ? 3 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {rawValue !== undefined && isCurrency ? (
            <CountUp value={rawValue} format="brl" />
          ) : rawValue !== undefined && isPercent ? (
            <CountUp value={rawValue} format="pct" />
          ) : (
            value
          )}
        </motion.p>

        {/* Subtitle */}
        {subtitle && (
          <p style={{ fontSize: 11, fontWeight: 500, color: t.sub, margin: "0 0 8px 0" }}>
            {subtitle}
          </p>
        )}

        {/* Underline animada */}
        <motion.div
          style={{
            height: 1,
            background: `linear-gradient(to right, rgba(${t.rgb},0.6), rgba(${t.rgb},0.2), transparent)`,
            transformOrigin: "left",
          }}
          animate={{ scaleX: isHovered ? 1 : 0.2 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}
