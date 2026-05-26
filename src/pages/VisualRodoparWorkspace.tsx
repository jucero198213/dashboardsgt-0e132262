import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Home, RefreshCw, Maximize2, ShieldAlert } from "lucide-react";

/** Página de login — após autenticar, o Rodopar navega para /software/html5.html */
const URL_LOGIN = "https://webcloud2.datapardc.com/";
const URL_APP = "https://webcloud2.datapardc.com/software/html5.html";

export default function VisualRodoparWorkspace() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);
  const [status, setStatus] = useState<"loading" | "ok" | "blocked">("loading");

  useEffect(() => {
    setStatus("loading");

    const timer = setTimeout(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (!doc || doc.body?.innerHTML === "") {
          setStatus("blocked");
        }
      } catch {
        // SecurityError = cross-origin = iframe carregou
        setStatus("ok");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [key]);

  function handleReload() {
    setKey((k) => k + 1);
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

        {status === "ok" && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleReload}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors hover:bg-white/8"
              style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" }}
              title="Recarregar"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => window.open(URL_APP, "_blank", "noopener,noreferrer")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors hover:bg-white/8"
              style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" }}
              title="Abrir em nova aba"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="relative flex-1 overflow-hidden">
        {status === "loading" && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center gap-3"
            style={{ backgroundColor: "var(--sgt-bg-base)" }}
          >
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
            <span className="text-sm" style={{ color: "var(--sgt-text-muted)" }}>
              Conectando ao Visual Rodopar…
            </span>
          </div>
        )}

        {status === "blocked" && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 p-8 text-center"
            style={{ backgroundColor: "var(--sgt-bg-base)" }}
          >
            <div
              className="flex h-20 w-20 items-center justify-center rounded-3xl border"
              style={{
                borderColor: "rgba(245,158,11,0.25)",
                background: "radial-gradient(circle at 40% 35%, rgba(245,158,11,0.18), rgba(245,158,11,0.04) 70%)",
                boxShadow: "0 0 40px rgba(245,158,11,0.1)",
              }}
            >
              <ShieldAlert className="h-9 w-9 text-amber-400" />
            </div>

            <div className="max-w-sm space-y-2">
              <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
                Não foi possível embutir o Visual Rodopar
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "var(--sgt-text-muted)" }}>
                O servidor Datapar pode estar bloqueando exibição em iframe (X-Frame-Options ou CSP).
                Use a nova aba como alternativa.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleReload}
                className="group inline-flex h-12 items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-8 text-sm font-semibold text-amber-300 transition-all hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-amber-500/25"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </button>

              <button
                type="button"
                onClick={() => window.open(URL_LOGIN, "_blank", "noopener,noreferrer")}
                className="text-xs underline underline-offset-2"
                style={{ color: "var(--sgt-text-faint)" }}
              >
                Abrir em nova aba (alternativa)
              </button>
            </div>
          </div>
        )}

        <iframe
          key={key}
          ref={iframeRef}
          src={URL_LOGIN}
          title="Visual Rodopar — Web Rodopar"
          className="h-full w-full border-0"
          style={{ opacity: status === "ok" ? 1 : 0 }}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
