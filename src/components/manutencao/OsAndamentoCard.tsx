import { useRef, useState } from "react";
import { Activity } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import type { OrdemAgregada } from "@/lib/manutencaoUtils";

interface Props {
  ordens: OrdemAgregada[];
  loading?: boolean;
}

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
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 3D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-50, 50], [6, -6]);
  const rotateY = useTransform(mouseX, [-50, 50], [-6, 6]);
  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - (rect.left + rect.width / 2));
    mouseY.set(e.clientY - (rect.top + rect.height / 2));
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const andamento = ordens.filter(o => o.situacao === "ANDAMENTO");
  const count = andamento.length;
  const sorted = [...andamento].sort((a, b) => (b.diasAberto ?? 0) - (a.diasAberto ?? 0));

  const COLLAPSED_H = 112;
  const EXPANDED_H  = 300;

  return (
    // Placeholder fixo — mantém o espaço no grid sempre
    <div ref={containerRef} className="relative" style={{ height: COLLAPSED_H }}>
      <motion.div
        className="absolute inset-x-0 top-0 cursor-pointer select-none overflow-hidden rounded-xl"
        style={{
          zIndex: isExpanded ? 50 : 1,
          perspective: 1000,
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: "preserve-3d",
          background: "var(--sgt-bg-card)",
          border: "1px solid var(--sgt-border-subtle)",
        }}
        animate={{ height: isExpanded ? EXPANDED_H : COLLAPSED_H }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={() => !loading && setIsExpanded(v => !v)}
      >
        {/* Gradiente sutil de hover */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ background: "radial-gradient(ellipse at top left, rgba(245,166,35,0.08), transparent 60%)" }}
        />

        {/* Barra acento âmbar */}
        <motion.div
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500/70 to-transparent pointer-events-none"
          animate={{ opacity: isHovered || isExpanded ? 1 : 0.3 }}
          transition={{ duration: 0.3 }}
        />

        {/* Grid pattern (colapsado) */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: isExpanded ? 0 : 0.025 }}
          transition={{ duration: 0.3 }}
        >
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern id="manut-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#manut-grid)" />
          </svg>
        </motion.div>

        {/* ── Parte colapsada ── */}
        <div className="relative z-10 flex h-[112px] shrink-0 flex-col justify-between p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 leading-tight">
              OS em Andamento
            </p>
            <motion.div
              animate={{
                filter: isHovered
                  ? "drop-shadow(0 0 6px rgba(245,166,35,0.6))"
                  : "drop-shadow(0 0 3px rgba(245,166,35,0.2))",
              }}
              transition={{ duration: 0.3 }}
            >
              <Activity className="h-3.5 w-3.5 text-amber-400" />
            </motion.div>
          </div>

          <div>
            <motion.p
              className={`text-[clamp(1.1rem,2vw,1.4rem)] font-black leading-[1.15] tracking-[-0.04em] dark:text-white text-slate-800${loading ? " animate-pulse" : ""}`}
              animate={{ x: isHovered ? 3 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {loading ? "—" : count}
            </motion.p>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[11px] font-medium text-amber-600">ordens abertas</p>
              <AnimatePresence>
                {!loading && count > 0 && isHovered && (
                  <motion.span
                    className="text-[9px] font-bold text-slate-500"
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
            {/* Underline animada */}
            <motion.div
              className="mt-2 h-px bg-gradient-to-r from-amber-500/50 via-amber-400/30 to-transparent"
              animate={{ scaleX: isHovered || isExpanded ? 1 : 0.25, originX: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* ── Lista expandida ── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="relative z-10 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.08 }}
            >
              <div className="mx-4 h-px" style={{ background: "var(--sgt-border-subtle)" }} />

              {/* Header colunas */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 pt-2.5 pb-1">
                <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500">Veículo · Fornecedor</span>
                <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500 text-right">Data</span>
                <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500 text-right w-10">Dias</span>
              </div>

              {/* Rows */}
              <div className="flex flex-col overflow-y-auto" style={{ maxHeight: EXPANDED_H - 112 - 40 }}>
                {sorted.map((o, i) => (
                  <motion.div
                    key={o.ordem}
                    className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-1.5 transition-colors"
                    style={{ borderTop: "1px solid var(--sgt-border-subtle)" }}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.04, duration: 0.2 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--sgt-row-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold dark:text-white text-slate-800 truncate">
                        {o.veiculo || "—"}
                      </p>
                      <p className="text-[9px] text-slate-500 truncate">
                        #{o.ordem}{o.fornecedor ? ` · ${o.fornecedor}` : ""}
                      </p>
                    </div>
                    <span className="text-[9px] text-slate-500 text-right shrink-0 pt-0.5">
                      {fmtData(o.dataordem)}
                    </span>
                    <span className={`text-[10px] font-black text-right shrink-0 w-10 pt-0.5 ${diasColor(o.diasAberto)}`}>
                      {o.diasAberto !== null ? `${o.diasAberto}d` : "—"}
                    </span>
                  </motion.div>
                ))}
                {sorted.length === 0 && (
                  <p className="px-4 py-4 text-xs text-slate-500 text-center">Nenhuma OS em andamento</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Hint embaixo do card */}
      <AnimatePresence>
        {isHovered && !isExpanded && !loading && count > 0 && (
          <motion.p
            className="absolute -bottom-5 left-1/2 text-[9px] text-slate-500 whitespace-nowrap pointer-events-none"
            style={{ x: "-50%" }}
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
