import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCw, ExternalLink, Home, Sparkles } from "lucide-react";

const URL_DESTINO = "https://receitaflow.lovable.app";

export default function ReceitaFlowWorkspace() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  return (
    <div
      className="flex h-[calc(100dvh-4rem)] sm:h-[100dvh] w-full flex-col"
      style={{ backgroundColor: "var(--sgt-bg-base)" }}
    >
      {/* Topbar integrada */}
      <div
        className="flex shrink-0 items-center justify-between border-b px-4 py-2"
        style={{
          borderColor: "var(--sgt-border-subtle)",
          backgroundColor: "var(--sgt-bg-surface)",
        }}
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
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
              ReceitaFlow
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
          <a
            href={URL_DESTINO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-white/8"
            style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" }}
            title="Abrir em nova aba"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Iframe */}
      <iframe
        key={key}
        ref={iframeRef}
        src={URL_DESTINO}
        title="ReceitaFlow"
        className="w-full flex-1 border-0"
      />
    </div>
  );
}
