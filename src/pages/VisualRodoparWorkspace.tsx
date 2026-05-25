import { useRef, useState, useEffect } from "react";
import { RotateCw, ExternalLink, AlertTriangle } from "lucide-react";

const URL_DESTINO = "https://webcloud2.datapardc.com/";

export default function VisualRodoparWorkspace() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);
  const [blocked, setBlocked] = useState(false);

  // Detecta falha de rede (connection refused, DNS, etc.)
  const handleError = () => setBlocked(true);

  // Detecta X-Frame-Options / CSP frame-ancestors: após load, tenta
  // acessar o contentDocument — se estiver bloqueado, o browser esvazia
  // o iframe e não dispara onError. Usamos um timeout como fallback.
  useEffect(() => {
    setBlocked(false);
    const timer = setTimeout(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        // Se não carregou nada (null ou body vazio) após 6 s → bloqueado
        if (!doc || doc.body?.innerHTML === "") setBlocked(true);
      } catch {
        // SecurityError = cross-origin carregou OK; não está bloqueado
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [key]);

  const abrirNovaAba = () => window.open(URL_DESTINO, "_blank", "noopener,noreferrer");
  const reload = () => { setBlocked(false); setKey((k) => k + 1); };

  return (
    <div
      className="flex h-[100dvh] w-full flex-col"
      style={{ backgroundColor: "var(--sgt-bg-base)" }}
    >
      {/* Topbar */}
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4 py-2"
        style={{
          borderColor: "var(--sgt-border-subtle)",
          backgroundColor: "var(--sgt-bg-surface)",
        }}
      >
        <div
          className="flex-1 truncate rounded-md px-3 py-1.5 font-mono text-xs"
          style={{
            backgroundColor: "var(--sgt-bg-card)",
            color: "var(--sgt-text-secondary)",
            border: "1px solid var(--sgt-border-subtle)",
          }}
          title={URL_DESTINO}
        >
          {URL_DESTINO}
        </div>
        <button
          type="button"
          onClick={reload}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-primary/10"
          style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-primary)" }}
          title="Recarregar"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Recarregar
        </button>
        <button
          type="button"
          onClick={abrirNovaAba}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Nova aba
        </button>
      </div>

      {/* Conteúdo */}
      <div className="relative flex-1 overflow-hidden">
        {/* Tela de erro */}
        {blocked && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 p-8 text-center"
            style={{ backgroundColor: "var(--sgt-bg-base)" }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-lg font-bold" style={{ color: "var(--sgt-text-primary)" }}>
                Não foi possível incorporar o Visual Rodopar
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--sgt-text-muted)" }}>
                O servidor <strong>webcloud2.datapardc.com</strong> recusou a conexão ou
                bloqueou a exibição em iframe. Isso é uma restrição do próprio site, não
                do Workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={abrirNovaAba}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-6 text-sm font-semibold text-amber-300 transition-all hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-amber-500/25 hover:shadow-[0_8px_28px_rgba(245,158,11,0.25)]"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir Visual Rodopar em nova aba
            </button>
          </div>
        )}

        {/* Iframe */}
        <iframe
          key={key}
          ref={iframeRef}
          src={URL_DESTINO}
          title="Visual Rodopar"
          className="h-full w-full border-0"
          onError={handleError}
        />
      </div>
    </div>
  );
}
