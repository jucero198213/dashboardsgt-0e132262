import { useEffect, useRef, useState } from "react";
import { ExternalLink, Monitor } from "lucide-react";

const URL_DESTINO = "http://54.232.121.164:9474/#/login";
const WINDOW_NAME = "portal-wr-window";

function abrirJanela(url: string, nome: string) {
  const w    = screen.availWidth;
  const h    = screen.availHeight;
  const left = screen.availLeft ?? 0;
  const top  = screen.availTop  ?? 0;
  return window.open(
    url,
    nome,
    `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );
}

export default function PortalWrWorkspace() {
  const windowRef = useRef<Window | null>(null);
  const [janelaAberta, setJanelaAberta] = useState(false);

  /* Detecta quando o usuário fecha a janela */
  useEffect(() => {
    if (!janelaAberta) return;
    const id = setInterval(() => {
      if (windowRef.current?.closed) {
        windowRef.current = null;
        setJanelaAberta(false);
      }
    }, 600);
    return () => clearInterval(id);
  }, [janelaAberta]);

  function handleAbrir() {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.focus();
      return;
    }
    const win = abrirJanela(URL_DESTINO, WINDOW_NAME);
    if (win) {
      windowRef.current = win;
      setJanelaAberta(true);
    } else {
      window.open(URL_DESTINO, "_blank", "noopener,noreferrer");
    }
  }

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
          <Monitor className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
            Portal WR SGT
          </span>
        </div>

        {janelaAberta && (
          <button
            type="button"
            onClick={() => windowRef.current?.focus()}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors hover:bg-white/8"
            style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" }}
            title="Trazer janela para frente"
          >
            <Monitor className="h-3.5 w-3.5" />
            Trazer para frente
          </button>
        )}
      </div>

      {/* ── Launcher ── */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">

          {/* Ícone */}
          <div
            className="flex h-20 w-20 items-center justify-center rounded-3xl border"
            style={{
              borderColor: "rgba(96,165,250,0.25)",
              background: "radial-gradient(circle at 40% 35%, rgba(96,165,250,0.18), rgba(96,165,250,0.04) 70%)",
              boxShadow: "0 0 40px rgba(96,165,250,0.1)",
            }}
          >
            <Monitor className="h-9 w-9 text-blue-400" />
          </div>

          {/* Título + descrição */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
              Portal WR SGT
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "var(--sgt-text-muted)" }}>
              Portal de gestão e operação do sistema integrado. Abre em uma
              janela dedicada e maximizada — faça o login normalmente e o
              sistema continuará na mesma janela após o redirecionamento.
            </p>
          </div>

          {/* Badge: janela aberta */}
          {janelaAberta && (
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
              Janela aberta
            </div>
          )}

          {/* Botão principal */}
          <button
            type="button"
            onClick={handleAbrir}
            className="group inline-flex h-12 items-center gap-2.5 rounded-xl border border-blue-500/40 bg-blue-500/15 px-8 text-sm font-semibold text-blue-300 transition-all hover:-translate-y-0.5 hover:border-blue-500/60 hover:bg-blue-500/25 hover:shadow-[0_8px_28px_rgba(96,165,250,0.25)] active:translate-y-0"
          >
            {janelaAberta ? (
              <>
                <Monitor className="h-4 w-4" />
                Trazer para frente
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                Abrir Portal WR SGT
              </>
            )}
          </button>

          {/* Instrução */}
          <p className="text-[11px] leading-relaxed max-w-xs" style={{ color: "var(--sgt-text-faint)" }}>
            Para voltar ao Workspace SGT, minimize ou feche a janela do
            Portal WR SGT — o Workspace continua aberto em segundo plano.
          </p>

        </div>
      </div>
    </div>
  );
}
