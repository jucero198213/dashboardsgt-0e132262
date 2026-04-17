import { Link } from "react-router-dom";
import { Home } from "lucide-react";

/**
 * Botão "Início" padronizado com o mesmo estilo dos demais botões da navbar.
 */
export function HomeButton() {
  return (
    <Link
      to="/home"
      title="Voltar ao portal inicial"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3.5 text-[12px] font-semibold transition-all border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400 hover:border-[var(--sgt-border-medium)] hover:bg-[var(--sgt-input-hover)] hover:text-white hover:-translate-y-0.5"
    >
      <Home className="h-3 w-3" />
      Início
    </Link>
  );
}
