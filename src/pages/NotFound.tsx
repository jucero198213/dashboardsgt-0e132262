import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { Home, MapPinOff } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] text-white px-4">
      <BackgroundEffects />

      <div className="relative text-center animate-[fadeSlideIn_0.5s_ease-out]">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
          <MapPinOff className="h-9 w-9 text-slate-400" />
        </div>

        <h1 className="mb-2 text-6xl font-extrabold tracking-[-0.04em] bg-gradient-to-r from-white via-slate-300 to-slate-500 bg-clip-text text-transparent">
          404
        </h1>
        <p className="mb-2 text-lg font-medium text-slate-300">Página não encontrada</p>
        <p className="mb-8 text-sm text-slate-500 max-w-sm mx-auto">
          O endereço <span className="text-slate-400 font-mono text-xs">{location.pathname}</span> não existe ou foi movido.
        </p>

        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-300 transition-all hover:border-cyan-300/30 hover:bg-cyan-400/15 hover:shadow-[0_10px_24px_rgba(34,211,238,0.12)]"
        >
          <Home className="h-4 w-4" />
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
