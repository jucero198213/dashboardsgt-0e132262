import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Home, LogIn, RefreshCw, Maximize2 } from "lucide-react";

const URL_LOGIN  = "https://webcloud2.datapardc.com/";
const URL_APP    = "https://webcloud2.datapardc.com/software/html5.html";
const STORAGE_KEY = "vr-logged-in";

export default function VisualRodoparWorkspace() {
  const navigate  = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey]           = useState(0);
  const [status, setStatus]     = useState<"loading" | "ok" | "blocked">("loading");

  /* Após o login (same-tab), o usuário volta com session cookie.
     Guardamos essa info no localStorage para pular a tela de login. */
  const jaFezLogin = localStorage.getItem(STORAGE_KEY) === "1";

  useEffect(() => {
    setStatus("loading");

    /* Detecta se o iframe carregou ou foi bloqueado pelo X-Frame-Options.
       SecurityError ao acessar contentDocument = cross-origin = carregou ✓
       Documento vazio sem erro = bloqueado pelo servidor              ✗  */
    const timer = setTimeout(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (!doc || doc.body?.innerHTML === "") {
          setStatus("blocked");
        }
        // sem exceção e com conteúdo = same-origin (improvável mas ok)
      } catch {
        // SecurityError = cross-origin = iframe carregou com sucesso!
        setStatus("ok");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [key]);

  function handleLogin() {
    localStorage.setItem(STORAGE_KEY, "1");
    window.open(URL_LOGIN, "_blank", "noopener,noreferrer");
  }

  function handleReload() {
    setKey(k => k + 1);
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
            <div className="h-5 w-5 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
            <span className="text-sm" style={{ color: "var(--sgt-text-muted)" }}>
              Conectando ao Visual Rodopar…
            </span>
          </div>
        )}

        {/* Bloqueado — precisa fazer login ou servidor bloqueia iframe */}
        {status === "blocked" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 p-8 text-center"
            style={{ backgroundColor: "var(--sgt-bg-base)" }}>

            <div
              className="flex h-20 w-20 items-center justify-center rounded-3xl border"
              style={{
                borderColor: "rgba(245,158,11,0.25)",
                background: "radial-gradient(circle at 40% 35%, rgba(245,158,11,0.18), rgba(245,158,11,0.04) 70%)",
                boxShadow: "0 0 40px rgba(245,158,11,0.1)",
              }}
            >
              <Globe className="h-9 w-9 text-amber-400" />
            </div>

            <div className="space-y-2 max-w-sm">
              <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
                Visual Rodopar
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "var(--sgt-text-muted)" }}>
                {jaFezLogin
                  ? "Sua sessão expirou. Faça login em nova aba, volte aqui e clique em \"Já fiz login\"."
                  : "Clique em \"Fazer login\" — uma nova aba vai abrir. Após logar, feche a aba e clique em \"Já fiz login\"."}
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleLogin}
                className="group inline-flex h-12 items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-8 text-sm font-semibold text-amber-300 transition-all hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-amber-500/25 hover:shadow-[0_8px_28px_rgba(245,158,11,0.25)] active:translate-y-0"
              >
                <LogIn className="h-4 w-4" />
                {jaFezLogin ? "Fazer login novamente" : "Fazer login"}
              </button>

              <button
                type="button"
                onClick={handleReload}
                className="text-xs underline underline-offset-2"
                style={{ color: "var(--sgt-text-faint)" }}
              >
                Já fiz login — carregar sistema
              </button>
            </div>

            <p className="text-[11px] max-w-xs leading-relaxed" style={{ color: "var(--sgt-text-faint)" }}>
              O login abre em uma nova aba. Após entrar, feche a nova aba e clique em "Já fiz login" acima.
            </p>
          </div>
        )}

        {/* Iframe — sempre renderizado, visível só quando ok */}
        <iframe
          key={key}
          ref={iframeRef}
          src={URL_APP}
          title="Visual Rodopar"
          className="h-full w-full border-0"
          style={{ opacity: status === "ok" ? 1 : 0 }}
        />
      </div>
    </div>
  );
}
