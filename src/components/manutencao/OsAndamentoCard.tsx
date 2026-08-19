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

  // Ordena por dias em aberto (mais antigo primeiro)
  const sorted = [...andamento].sort((a, b) => (b.diasAberto ?? 0) - (a.diasAberto ?? 0));

  return (
    <motion.div
      ref={containerRef}
      className="relative cursor-pointer select-none w-full"
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => !loading && setIsExpanded(v => !v)}
    >
      <motion.div
        className="relative overflow-hidden rounded-xl"
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: "preserve-3d",
          background: "var(--sgt-bg-card)",
          border: "1px solid var(--sgt-border-subtle)",
        }}
        animate={{ height: isExpanded ? 300 : 112 }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        {/* Topo âmbar — tint de hover */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ background: "radial-gradient(ellipse at top left, rgba(245,166,35,0.06), transparent 60%)" }}
        />

        {/* Barra de acento superior */}
        <motion.div
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500/60 to-transparent"
          animate={{ opacity: isHovered || isExpanded ? 1 : 0.3 }}
          transition={{ duration: 0.3 }}
        />

        {/* ── Conteúdo colapsado (sempre visível) ── */}
        <div className="relative z-10 flex flex-col p-4" style={{ minHeight: 112 }}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 leading-tight">
              OS em Andamento
            </p>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <Activity className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            </motion.div>
          </div>

          <p className={`mt-auto pt-3 text-[clamp(1.1rem,2vw,1.4rem)] font-black leading-[1.15] tracking-[-0.04em] dark:text-white text-slate-800${loading ? " animate-pulse" : ""}`}>
            {loading ? "—" : count}
          </p>

          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[11px] font-medium text-amber-600">ordens abertas</p>
            {!loading && count > 0 && (
              <motion.span
                className="text-[9px] font-bold text-slate-500"
                animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 4 }}
                transition={{ duration: 0.2 }}
              >
                {isExpanded ? "fechar ▲" : "ver todas ▼"}
              </motion.span>
            )}
          </div>
        </div>

        {/* ── Lista expandida ── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="absolute inset-x-0 z-10 overflow-hidden"
              style={{ top: 112 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              {/* Separador */}
              <div className="mx-4 h-px" style={{ background: "var(--sgt-border-subtle)" }} />

              {/* Header colunas */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 pt-2 pb-1">
                <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500">Veículo · Fornecedor</span>
                <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500 text-right">Data</span>
                <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500 text-right w-10">Dias</span>
              </div>

              {/* Rows */}
              <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 160 }}>
                {sorted.map((o, i) => (
                  <motion.div
                    key={o.ordem}
                    className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-1.5 transition-colors"
                    style={{ borderTop: i > 0 ? "1px solid var(--sgt-border-subtle)" : undefined }}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.04, duration: 0.2 }}
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

      {/* Hint hover */}
      <motion.p
        className="absolute -bottom-5 left-1/2 text-[9px] text-slate-500 whitespace-nowrap pointer-events-none"
        style={{ x: "-50%" }}
        animate={{ opacity: isHovered && !isExpanded && !loading && count > 0 ? 1 : 0, y: isHovered ? 0 : 4 }}
        transition={{ duration: 0.2 }}
      >
        clique para expandir
      </motion.p>
    </motion.div>
  );
}
