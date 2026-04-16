import { Link } from "react-router-dom";
import { Home } from "lucide-react";

/**
 * Botão "Início" destacado que leva ao portal /home.
 * Vem precedido de um divisor vertical para se destacar dos demais controles.
 * Usado nos headers das páginas internas (Dashboard, Indicadores, etc.).
 */
export function HomeButton() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-7 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />
      <Link
        to="/home"
        title="Voltar ao portal inicial"
        className="group inline-flex h-9 items-center gap-2 rounded-xl border-2 px-4 text-[13px] font-bold uppercase tracking-wide transition-all border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-amber-400/15 text-amber-100 shadow-[0_2px_12px_rgba(245,158,11,0.18)] hover:border-amber-300 hover:from-amber-500/30 hover:to-amber-400/25 hover:text-amber-50 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(245,158,11,0.35)]"
      >
        <Home className="h-4 w-4 transition-transform group-hover:scale-110" />
        <span>Início</span>
      </Link>
    </div>
  );
}
