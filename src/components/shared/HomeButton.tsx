import { Link } from "react-router-dom";
import { Home } from "lucide-react";

/**
 * Botão pequeno "Início" que leva ao portal /home.
 * Usado nos headers das páginas internas (Dashboard, Indicadores, etc.).
 */
export function HomeButton() {
  return (
    <Link
      to="/home"
      title="Voltar ao portal"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition-all border-amber-400/30 bg-amber-400/10 text-amber-200 hover:border-amber-400/50 hover:bg-amber-400/20 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(245,158,11,0.18)]"
    >
      <Home className="h-3 w-3" />
      <span className="hidden sm:inline">Início</span>
    </Link>
  );
}
