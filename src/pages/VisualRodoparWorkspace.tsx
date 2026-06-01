import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Home, Globe, RotateCw, AlertTriangle } from "lucide-react";

const URL_DESTINO = "https://webcloud2.datapardc.com";

export default function VisualRodoparWorkspace() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  // Fallback automático: se o iframe não emitir onLoad em 6s, mostra launcher
  useEffect(() => {
    setLoaded(false);
    setShowFallback(false);
    const t = setTimeout(() => {
      if (!loaded) setShowFallback(true);
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function abrirNovaAba() {
    window.open(URL_DESTINO, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="flex h-[100dvh] w-full flex-col"
      style={{ backgroundColor: "var(--sgt-bg-base)" }}
    >
      <div
        className="flex shrink-0 items-center justify-between border-b px-4 py-2"
        style={{ borderColor: "var(--sgt-border-subtle)", backgroundColor: "var(--sgt-bg-surface)" }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors hover:bg-white/8"
            style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" }}
            title="Voltar ao Início"
          >
            <Home className="h-3.5 w-3.5" />
            Início
          </button>
          <span style={{ color: "var(--sgt-border-subtle)" }}>/</span>
          <div className="flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
              Visual Rodopar
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setKey((k) => k + 1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-white/8"
            style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" }}
            title="Recarregar"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={abrirNovaAba}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors hover:bg-white/8"
            style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" }}
            title="Abrir em nova aba"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        <iframe
          key={key}
          ref={iframeRef}
          src={URL_DESTINO}
          title="Visual Rodopar"
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 h-full w-full border-0"
        />

        {showFallback && !loaded && (
          <div className="absolute inset-0 flex items-center justify-center p-6"
            style={{ backgroundColor: "var(--sgt-bg-base)" }}
          >
            <div
              className="max-w-md rounded-2xl border p-6 text-center"
              style={{
                borderColor: "var(--sgt-border-subtle)",
                backgroundColor: "var(--sgt-bg-surface)",
              }}
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(245,166,35,0.12)" }}
              >
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <h2 className="text-base font-semibold" style={{ color: "var(--sgt-text-primary)" }}>
                Visual Rodopar
              </h2>
              <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: "var(--sgt-text-muted)" }}>
                Não foi possível exibir o sistema embutido (pode ser bloqueio de segurança do servidor ou rede interna). Abra em uma nova aba.
              </p>
              <button
                type="button"
                onClick={abrirNovaAba}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[12px] font-semibold"
                style={{
                  background:
                    "linear-gradient(95deg,#F5A623 0%,rgba(199,126,26,0.92) 100%)",
                  color: "#1B1304",
                  boxShadow: "0 0 18px rgba(245,166,35,0.30)",
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir Visual Rodopar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
