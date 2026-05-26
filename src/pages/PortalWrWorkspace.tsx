import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, Home, RefreshCw, Maximize2, ShieldAlert } from "lucide-react";

const URL_APP = "http://54.232.121.164:9474/#/login";

export default function PortalWrWorkspace() {
  const navigate  = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey]       = useState(0);
  const [status, setStatus] = useState<"loading" | "ok" | "blocked">("loading");

  useEffect(() => {
    setStatus("loading");

    /* Mesma técnica do Visual Rodopar:
       SecurityError → cross-origin → carregou ✓
       doc vazio / null → bloqueado (mixed-content ou X-Frame-Options) ✗ */
    const timer = setTimeout(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (!doc || doc.body?.innerHTML === "") {
          setStatus("blocked");
        }
      } catch {
        // SecurityError = cross-origin = iframe carregou!
        setStatus("ok");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [key]);

  function handleReload() { setKey(k => k + 1); }

  return (
    <div
      className="flex h-[100dvh] w-full flex-col"
      style={{ backgroundColor: "var(--sgt-bg-base)" }}
    >
      {/* ── Topbar ── */}
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
            <Monitor className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
              Portal WR SGT
            </span>
          </div>
        </div>

        {/* Ações — só aparecem quando o iframe carregou */}
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

      {/* ── Conteúdo ── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Loading */}
        {status === "loading" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-3"
            style={{ backgroundColor: "var(--sgt-bg-base)" }}>
            <div className="h-5 w-5 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
            <span className="text-sm" style={{ color: "var(--sgt-text-muted)" }}>
              Conectando ao Portal WR SGT…
            </span>
          </div>
        )}

        {/* Bloqueado — mixed content (HTTP dentro de HTTPS) */}
        {status === "blocked" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 p-8 text-center"
            style={{ backgroundColor: "var(--sgt-bg-base)" }}>

            <div
              className="flex h-20 w-20 items-center justify-center rounded-3xl border"
              style={{
                borderColor: "rgba(96,165,250,0.25)",
                background: "radial-gradient(circle at 40% 35%, rgba(96,165,250,0.18), rgba(96,165,250,0.04) 70%)",
                boxShadow: "0 0 40px rgba(96,165,250,0.1)",
              }}
            >
              <ShieldAlert className="h-9 w-9 text-blue-400" />
            </div>

            <div className="space-y-2 max-w-sm">
              <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
                Conteúdo bloqueado pelo Chrome
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "var(--sgt-text-muted)" }}>
                O Portal WR usa HTTP e o Workspace usa HTTPS. O Chrome bloqueia
                esse conteúdo por padrão. Libere em 3 passos:
              </p>
            </div>

            {/* Passo a passo */}
            <div
              className="w-full max-w-sm rounded-2xl border p-5 text-left space-y-3"
              style={{ borderColor: "var(--sgt-border-subtle)", backgroundColor: "var(--sgt-bg-surface)" }}
            >
              {[
                { n: "1", txt: 'Clique no ícone 🔒 ou ⚠️ na barra de endereço do Chrome' },
                { n: "2", txt: 'Clique em "Configurações do site"' },
                { n: "3", txt: 'Em "Conteúdo inseguro", troque para "Permitir" e recarregue' },
              ].map(({ n, txt }) => (
                <div key={n} className="flex items-start gap-3">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ backgroundColor: "rgba(96,165,250,0.15)", color: "#60a5fa" }}
                  >
                    {n}
                  </span>
                  <span className="text-xs leading-relaxed" style={{ color: "var(--sgt-text-muted)" }}>
                    {txt}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleReload}
                className="group inline-flex h-12 items-center gap-2.5 rounded-xl border border-blue-500/40 bg-blue-500/15 px-8 text-sm font-semibold text-blue-300 transition-all hover:-translate-y-0.5 hover:border-blue-500/60 hover:bg-blue-500/25 hover:shadow-[0_8px_28px_rgba(96,165,250,0.25)] active:translate-y-0"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </button>

              <button
                type="button"
                onClick={() => window.open(URL_APP, "_blank", "noopener,noreferrer")}
                className="text-xs underline underline-offset-2"
                style={{ color: "var(--sgt-text-faint)" }}
              >
                Abrir em nova aba (alternativa)
              </button>
            </div>
          </div>
        )}

        {/* Iframe — sempre renderizado, visível só quando ok */}
        <iframe
          key={key}
          ref={iframeRef}
          src={URL_APP}
          title="Portal WR SGT"
          className="h-full w-full border-0"
          style={{ opacity: status === "ok" ? 1 : 0 }}
        />
      </div>
    </div>
  );
}
