import { useRef, useState } from "react";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";
import type { OrdemAgregada } from "@/lib/manutencaoUtils";

interface Props {
  ordens: OrdemAgregada[];
  loading?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

const COLLAPSED_H = 112;
const EXPANDED_H  = 340;

const fmtData = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

function diasColor(dias: number | null) {
  if (dias === null) return "var(--sgt-text-muted)";
  if (dias > 15) return "#f87171";
  if (dias > 7)  return "#fbbf24";
  return "#34d399";
}

export function OsAndamentoCard({ ordens, loading, onExpandChange }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered]   = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-50, 50], [6, -6]);
  const rotateY = useTransform(mouseX, [-50, 50], [-6, 6]);
  const springRX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current || isExpanded) return;
    const r = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - (r.left + r.width  / 2));
    mouseY.set(e.clientY - (r.top  + r.height / 2));
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const toggle = () => {
    if (loading) return;
    const next = !isExpanded;
    setIsExpanded(next);
    onExpandChange?.(next);
  };

  const andamento = ordens.filter(o => o.situacao === "ANDAMENTO");
  const sorted    = [...andamento].sort((a, b) => (b.diasAberto ?? 0) - (a.diasAberto ?? 0));
  const count     = andamento.length;

  return (
    /*
     * O placeholder reserva 112px no grid.
     * O card fica em position:absolute, anchored no TOP → cresce para BAIXO
     * com z-index:50, sobrepondo a seção ANÁLISE sem empurrar nada.
     */
    <div style={{ position: "relative", height: COLLAPSED_H }}>

      <motion.div
        ref={cardRef}
        onClick={toggle}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: isExpanded ? 50 : 1,
          overflow: "hidden",
          background: "var(--sgt-bg-card)",
          border: "1px solid var(--sgt-border-subtle)",
          borderRadius: "0.75rem",
          cursor: "pointer",
          userSelect: "none",
          rotateX: isExpanded ? 0 : springRX,
          rotateY: isExpanded ? 0 : springRY,
          transformStyle: "preserve-3d",
          perspective: 1000,
          boxShadow: isExpanded
            ? "0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(245,166,35,0.15)"
            : "none",
        }}
        animate={{ height: isExpanded ? EXPANDED_H : COLLAPSED_H }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
      >

        {/* Radial hover glow */}
        <motion.div
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse at top left, rgba(245,166,35,0.10), transparent 55%)",
          }}
          animate={{ opacity: isHovered && !isExpanded ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        />

        {/* Top amber accent bar */}
        <motion.div
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2, pointerEvents: "none",
            background: "linear-gradient(to right, rgba(245,166,35,0.9), rgba(245,166,35,0.2), transparent)",
          }}
          animate={{ opacity: isHovered || isExpanded ? 1 : 0.3 }}
          transition={{ duration: 0.3 }}
        />

        {/* Subtle grid pattern — fades out when expanded */}
        <motion.div
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          animate={{ opacity: isExpanded ? 0 : 0.035 }}
          transition={{ duration: 0.3 }}
        >
          <svg width="100%" height="100%">
            <defs>
              <pattern id="os-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#os-grid)" />
          </svg>
        </motion.div>

        {/* ════ KPI AREA — primeiros 112px ════ */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: COLLAPSED_H,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 16,
          }}
        >
          {/* Label + ícone */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <p style={{
              fontSize: 10, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: "0.3em", color: "var(--sgt-text-muted)", lineHeight: 1.2, margin: 0,
            }}>
              OS em Andamento
            </p>
            <motion.div
              animate={{
                filter: isHovered || isExpanded
                  ? "drop-shadow(0 0 7px rgba(245,166,35,0.75))"
                  : "drop-shadow(0 0 3px rgba(245,166,35,0.2))",
              }}
              transition={{ duration: 0.3 }}
            >
              <Activity size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
            </motion.div>
          </div>

          {/* Valor */}
          <div>
            <motion.p
              className={`dark:text-white text-slate-800${loading ? " animate-pulse" : ""}`}
              style={{
                fontSize: "clamp(1.1rem, 2vw, 1.4rem)",
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: "-0.04em",
                margin: "0 0 6px 0",
              }}
              animate={{ x: isHovered && !isExpanded ? 3 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {loading ? "—" : count}
            </motion.p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: "#d97706", margin: 0 }}>
                ordens abertas
              </p>
              <AnimatePresence mode="wait">
                {!loading && count > 0 && (
                  <motion.span
                    key={isExpanded ? "fechar" : "abrir"}
                    style={{
                      fontSize: 9, fontWeight: 700,
                      color: "var(--sgt-text-muted)",
                      display: "flex", alignItems: "center", gap: 2,
                    }}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: isHovered || isExpanded ? 1 : 0, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.15 }}
                  >
                    {isExpanded ? (
                      <><ChevronUp size={10} /> fechar</>
                    ) : (
                      <><ChevronDown size={10} /> ver lista</>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Underline animada */}
            <motion.div
              style={{
                marginTop: 8,
                height: 1,
                background: "linear-gradient(to right, rgba(245,166,35,0.7), rgba(245,166,35,0.2), transparent)",
                transformOrigin: "left",
              }}
              animate={{ scaleX: isHovered || isExpanded ? 1 : 0.2 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* ════ LISTA — aparece abaixo do KPI ════ */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              style={{
                position: "absolute",
                top: COLLAPSED_H,
                left: 0, right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                borderTop: "1px solid var(--sgt-border-subtle)",
                background: "rgba(245,166,35,0.02)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              {/* Cabeçalho colunas */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 52px 36px",
                gap: 8,
                padding: "8px 16px 6px",
                flexShrink: 0,
                borderBottom: "1px solid var(--sgt-border-subtle)",
              }}>
                {["Veículo · Fornecedor", "Data", "Dias"].map(h => (
                  <span key={h} style={{
                    fontSize: 8, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.2em", color: "var(--sgt-text-muted)",
                    textAlign: h === "Dias" ? "right" : h === "Data" ? "right" : "left",
                  }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows com stagger */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                {sorted.length === 0 ? (
                  <p style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--sgt-text-muted)" }}>
                    Nenhuma OS em andamento
                  </p>
                ) : sorted.map((o, i) => (
                  <motion.div
                    key={o.ordem}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 52px 36px",
                      gap: 8,
                      padding: "7px 16px",
                      borderBottom: "1px solid var(--sgt-border-subtle)",
                      cursor: "default",
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.04, duration: 0.2, ease: "easeOut" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--sgt-row-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p className="dark:text-white text-slate-800" style={{
                        fontSize: 11, fontWeight: 600, margin: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {o.veiculo || "—"}
                      </p>
                      <p style={{
                        fontSize: 9, color: "var(--sgt-text-muted)", margin: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        #{o.ordem}{o.fornecedor ? ` · ${o.fornecedor}` : ""}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 9, color: "var(--sgt-text-muted)",
                      textAlign: "right", paddingTop: 2,
                    }}>
                      {fmtData(o.dataordem)}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 900,
                      color: diasColor(o.diasAberto),
                      textAlign: "right", paddingTop: 2,
                    }}>
                      {o.diasAberto !== null ? `${o.diasAberto}d` : "—"}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Fade bottom */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 20,
                background: "linear-gradient(to bottom, transparent, var(--sgt-bg-card))",
                pointerEvents: "none",
              }} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
