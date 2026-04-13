import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, MapPinOff } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center sgt-bg-base px-4 sgt-text">

      {/* Atmosfera */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-5%,rgba(180,110,4,0.18),transparent_55%)] sgt-atmosphere" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere" style={{ background:"radial-gradient(ellipse 120% 120% at 50% 50%, transparent 10%, rgba(2,3,12,0.70) 100%)" }} />

      <div className="relative animate-[fadeSlideIn_0.5s_ease-out] text-center">

        {/* Ícone */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--sgt-border-subtle)] sgt-bg-card">
          <MapPinOff className="h-8 w-8 text-[var(--sgt-text-muted)]" />
        </div>

        {/* 404 */}
        <h1 className="mb-3 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-700 bg-clip-text text-7xl font-black tracking-[-0.05em] text-transparent sm:text-8xl">
          404
        </h1>
        <p className="mb-2 text-[18px] font-semibold sgt-text">Página não encontrada</p>
        <p className="mb-10 text-[13px] text-[var(--sgt-text-muted)] max-w-xs mx-auto">
          O endereço{" "}
          <span className="font-mono text-[11px] sgt-text-2">{location.pathname}</span>{" "}
          não existe ou foi movido.
        </p>

        {/* Botão */}
        <button
          onClick={() => navigate("/dashboard")}
          className="relative inline-flex items-center gap-2 overflow-hidden rounded-[14px] border border-amber-400/25 bg-amber-500/[0.10] px-6 py-3 text-[13px] font-bold text-amber-300 transition-all duration-300 hover:bg-amber-400/[0.18] hover:border-amber-400/40 hover:shadow-[0_8px_32px_rgba(245,158,11,0.18)]"
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-amber-400/60 via-amber-300/40 to-transparent" />
          <Home className="h-4 w-4" />
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;