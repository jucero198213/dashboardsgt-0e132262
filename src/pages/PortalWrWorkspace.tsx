import { ExternalLink, ShieldAlert } from "lucide-react";

const URL_DESTINO = "http://54.232.121.164:9474/#/login";

export default function PortalWrWorkspace() {
  const abrirNovaAba = () => window.open(URL_DESTINO, "_blank", "noopener,noreferrer");

  return (
    <div
      className="flex h-[100dvh] w-full flex-col"
      style={{ backgroundColor: "var(--sgt-bg-base)" }}
    >
      {/* Topbar integrada — sem URL exposta */}
      <div
        className="flex shrink-0 items-center justify-between border-b px-4 py-2"
        style={{
          borderColor: "var(--sgt-border-subtle)",
          backgroundColor: "var(--sgt-bg-surface)",
        }}
      >
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ color: "var(--sgt-text-primary)" }}
        >
          Portal WR SGT
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={abrirNovaAba}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-white/8"
            style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" }}
            title="Abrir em nova aba"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tela informativa */}
      <div
        className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center"
        style={{ backgroundColor: "var(--sgt-bg-base)" }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-400/10">
          <ShieldAlert className="h-8 w-8 text-blue-400" />
        </div>
        <div className="space-y-3 max-w-md">
          <h2 className="text-lg font-bold" style={{ color: "var(--sgt-text-primary)" }}>
            Portal WR SGT não pode ser incorporado
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--sgt-text-muted)" }}>
            O portal usa <strong>HTTP</strong> e o Workspace roda em <strong>HTTPS</strong>.
            Os navegadores bloqueiam automaticamente conteúdo HTTP dentro de páginas HTTPS
            por segurança.
          </p>
          <p className="text-xs" style={{ color: "var(--sgt-text-faint)" }}>
            Para resolver, o servidor do portal precisaria habilitar HTTPS.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNovaAba}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/15 px-6 text-sm font-semibold text-blue-300 transition-all hover:-translate-y-0.5 hover:border-blue-500/60 hover:bg-blue-500/25 hover:shadow-[0_8px_28px_rgba(74,111,184,0.25)]"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir Portal WR SGT em nova aba
        </button>
      </div>
    </div>
  );
}
