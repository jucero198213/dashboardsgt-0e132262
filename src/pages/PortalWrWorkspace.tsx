import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Home, Monitor, RotateCw, AlertTriangle } from "lucide-react";

const URL_DESTINO = "http://54.232.121.164:9474/#/login";

export default function PortalWrWorkspace() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  // Mixed content (http embutido em https) é bloqueado pelos navegadores.
  const isHttpsApp = typeof window !== "undefined" && window.location.protocol === "https:";
  const mixedContent = isHttpsApp && URL_DESTINO.startsWith("http://");

  // Abre automaticamente em nova aba apenas na primeira entrada da sessão
  useEffect(() => {
    if (!mixedContent) return;
    const flag = "sgt-portal-wr-autoopened";
    if (!sessionStorage.getItem(flag)) {
      sessionStorage.setItem(flag, "1");
      window.open(URL_DESTINO, "_blank", "noopener,noreferrer");
    }
  }, [mixedContent]);

  // Fallback automático: se o iframe não emitir onLoad em 4s, mostra launcher
  useEffect(() => {
    if (mixedContent) {
      setShowFallback(true);
      return;
    }
    setLoaded(false);
    setShowFallback(false);
    const t = setTimeout(() => {
      if (!loaded) setShowFallback(true);
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mixedContent]);

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
            <Monitor className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
              Portal WR SGT
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
        {!mixedContent && (
          <iframe
            key={key}
            ref={iframeRef}
            src={URL_DESTINO}
            title="Portal WR SGT"
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 h-full w-full border-0"
          />
        )}

        {showFallback && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div
              className="max-w-md rounded-2xl border p-6 text-center backdrop-blur-sm"
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
                Portal WR SGT
              </h2>
              <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: "var(--sgt-text-muted)" }}>
                {mixedContent
                  ? "Este sistema usa conexão HTTP interna e não pode ser exibido embutido em uma página HTTPS. Abrimos automaticamente em uma nova aba."
                  : "Não foi possível exibir o sistema embutido. Acesse em uma nova aba."}
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
                Abrir Portal WR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
