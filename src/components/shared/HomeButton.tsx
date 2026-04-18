import { Link } from "react-router-dom";
import { Home } from "lucide-react";

export function HomeButton() {
  return (
    <Link
      to="/home"
      title="Voltar ao portal inicial"
      className="group inline-flex h-8 items-center gap-1.5 rounded-lg border-2 px-3.5 text-[12px] font-bold uppercase tracking-wide transition-all border-amber-500/60 bg-gradient-to-r from-amber-500/15 to-amber-400/10 text-amber-200 hover:border-amber-400 hover:from-amber-500/25 hover:to-amber-400/20 hover:text-amber-100 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(245,158,11,0.25)]"
    >
      <Home className="h-3.5 w-3.5" />
      Início
    </Link>
  );
}
