import { useRef, useState } from "react";
import { Activity } from "lucide-react";
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
}

const COLLAPSED_H = 112;
const EXPANDED_H  = 300;
const LIST_H      = EXPANDED_H - COLLAPSED_H; // 188px para a lista

const fmtData = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

function diasColor(dias: number | null) {
  if (dias === null) return "text-slate-500";
  if (dias > 15) return "text-rose-400";
  if (dias > 7)  return "text-amber-400";
  return "text-emerald-400";
}

export function OsAndamentoCard({ ordens, loading }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered]   = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D tilt — igual ao prompt de referência
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

  const andamento = ordens.filter(o => o.situacao === "ANDAMENTO");
  const sorted    = [...andamento].sort((a, b) => (b.diasAberto ?? 0) - (a.diasAberto ?? 0));
  const count     = andamento.length;

  return (
    // Placeholder fixo — não move os outros cards do grid
    <div style={{ position: "relative", height: COLLAPSED_H }}>

      {/* Card animado — ancorado no BOTTOM: cresce para CIMA */}
      <motion.div
        ref={cardRef}
        onClick={() => !loading && setIsExpanded(v => !v)}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: isExpanded ? 50 : 1,
          perspective: 1000,
          rotateX: springRX,
          rotateY: springRY,
          transformStyle: "preserve-3d",
          cursor: "pointer",
          userSelect: "none",
          background: "var(--sgt-bg-card)",
          border: "1px solid var(--sgt-border-subtle)",
          borderRadius: "0.75rem",
          overflow: "hidden",
        }}
        animate={{ height: isExpanded ? EXPANDED_H : COLLAPSED_H }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
      >

        {/* ── Overlay de hover (radial âmbar) ── */}
        <motion.div
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse at top left, rgba(245,166,35,0.09), transparent 60%)",
          }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        />

        {/* ── Barra de acento superior ── */}
        <motion.div
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2, pointerEvents: "none",
            background: "linear-gradient(to right, rgba(245,166,35,0.8), transparent)",
          }}
          animate={{ opacity: isHovered || isExpanded ? 1 : 0.3 }}
          transition={{ duration: 0.3 }}
        />

        {/* ── Grid pattern (some ao expandir) ── */}
        <motion.div
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          animate={{ opacity: isExpanded ? 0 : 0.03 }}
          transition={{ duration: 0.3 }}
        >
          <svg width="100%" height="100%">
            <defs>
              <pattern id="manut-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#manut-grid)" />
          </svg>
        </motion.div>

        {/* ════ SEÇÃO DA LISTA — aparece acima, desliza para baixo ao fechar ════ */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: LIST_H,
                overflow: "hidden",
              }}
              initial={{ clipPath: "inset(100% 0 0 0)" }}
              animate={{ clipPath: "inset(0% 0 0 0)" }}
              exit={{ clipPath: "inset(100% 0 0 0)" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              {/* Fundo sutil da lista */}
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(245,166,35,0.025)",
                borderBottom: "1px solid var(--sgt-border-subtle)",
              }} />

              {/* Header colunas */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: "0.5rem",
                padding: "10px 16px 6px",
                position: "relative",
              }}>
                <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "var(--sgt-text-muted)" }}>
                  Veículo · Fornecedor
                </span>
                <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "var(--sgt-text-muted)", textAlign: "right" }}>
                  Data
                </span>
                <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "var(--sgt-text-muted)", textAlign: "right", width: 36 }}>
                  Dias
                </span>
              </div>

              {/* Rows com stagger */}
              <div style={{ overflowY: "auto", maxHeight: LIST_H - 36 }}>
                {sorted.map((o, i) => (
                  <motion.div
                    key={o.ordem}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: "0.5rem",
                      padding: "6px 16px",
                      borderTop: "1px solid var(--sgt-border-subtle)",
                    }}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.04, duration: 0.22, ease: "easeOut" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--sgt-row-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        className="dark:text-white text-slate-800">
                        {o.veiculo || "—"}
                      </p>
                      <p style={{ fontSize: 9, color: "var(--sgt-text-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        #{o.ordem}{o.fornecedor ? ` · ${o.fornecedor}` : ""}
                      </p>
                    </div>
                    <span style={{ fontSize: 9, color: "var(--sgt-text-muted)", textAlign: "right", paddingTop: 2 }}>
                      {fmtData(o.dataordem)}
                    </span>
                    <span className={`font-black text-right shrink-0 ${diasColor(o.diasAberto)}`}
                      style={{ fontSize: 10, width: 36, paddingTop: 2 }}>
                      {o.diasAberto !== null ? `${o.diasAberto}d` : "—"}
                    </span>
                  </motion.div>
                ))}
                {sorted.length === 0 && (
                  <p style={{ padding: "16px", textAlign: "center", fontSize: 12, color: "var(--sgt-text-muted)" }}>
                    Nenhuma OS em andamento
                  </p>
                )}
              </div>

              {/* Gradiente fade na base da lista */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 24, pointerEvents: "none",
                background: "linear-gradient(to bottom, transparent, var(--sgt-bg-card))",
              }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════ KPI COLAPSADO — sempre no FUNDO do card ════ */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: COLLAPSED_H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 16,
        }}>
          {/* Topo: label + ícone */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3em", color: "var(--sgt-text-muted)", lineHeight: 1.2, margin: 0 }}>
              OS em Andamento
            </p>
            <motion.div
              animate={{
                filter: isHovered || isExpanded
                  ? "drop-shadow(0 0 6px rgba(245,166,35,0.7))"
                  : "drop-shadow(0 0 3px rgba(245,166,35,0.2))",
              }}
              transition={{ duration: 0.3 }}
            >
              <Activity size={14} className="text-amber-400" style={{ flexShrink: 0 }} />
            </motion.div>
          </div>

          {/* Valor + rodapé */}
          <div>
            <motion.p
              className={`dark:text-white text-slate-800${loading ? " animate-pulse" : ""}`}
              style={{ fontSize: "clamp(1.1rem, 2vw, 1.4rem)", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.04em", margin: "0 0 6px 0" }}
              animate={{ x: isHovered ? 3 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {loading ? "—" : count}
            </motion.p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: "#d97706", margin: 0 }}>ordens abertas</p>
              <AnimatePresence>
                {!loading && count > 0 && isHovered && (
                  <motion.span
                    style={{ fontSize: 9, fontWeight: 700, color: "var(--sgt-text-muted)" }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                  >
                    {isExpanded ? "fechar ▲" : "ver todas ▼"}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Underline animada — igual ao prompt original */}
            <motion.div
              style={{
                marginTop: 8, height: 1,
                background: "linear-gradient(to right, rgba(245,166,35,0.6), rgba(245,166,35,0.2), transparent)",
                transformOrigin: "left",
              }}
              animate={{ scaleX: isHovered || isExpanded ? 1 : 0.2 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

      </motion.div>

      {/* Hint embaixo — só no colapso */}
      <AnimatePresence>
        {isHovered && !isExpanded && !loading && count > 0 && (
          <motion.p
            style={{
              position: "absolute", bottom: -20, left: "50%", transform: "translateX(-50%)",
              fontSize: 9, color: "var(--sgt-text-muted)", whiteSpace: "nowrap", pointerEvents: "none",
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
          >
            clique para expandir
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
