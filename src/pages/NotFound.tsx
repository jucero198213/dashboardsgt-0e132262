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
    <div
      className="flex flex-col min-h-[100dvh] px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(180,110,4,0.18),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:opacity-100" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.70) 100%)" }} />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex items-center justify-center border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-hidden"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
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
        </section>
      </div>
    </div>
  );
};

export default NotFound;