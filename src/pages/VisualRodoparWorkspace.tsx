import { ArrowLeft, Globe } from "lucide-react";

const URL_DESTINO = "https://webcloud2.datapardc.com/";

export default function VisualRodoparWorkspace() {
  function handleAbrir() {
    window.location.href = URL_DESTINO;
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
          <Globe className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
            Visual Rodopar
          </span>
        </div>
      </div>

      {/* ── Launcher ── */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">

          {/* Ícone */}
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

          {/* Título + descrição */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
              Visual Rodopar
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "var(--sgt-text-muted)" }}>
              Portal de gestão e monitoramento complementar.
              Ao clicar, o portal abre nesta mesma aba — use o botão
              voltar do browser para retornar ao Workspace SGT.
            </p>
          </div>

          {/* Botão principal */}
          <button
            type="button"
            onClick={handleAbrir}
            className="group inline-flex h-12 items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-8 text-sm font-semibold text-amber-300 transition-all hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-amber-500/25 hover:shadow-[0_8px_28px_rgba(245,158,11,0.25)] active:translate-y-0"
          >
            <Globe className="h-4 w-4 transition-transform group-hover:scale-110" />
            Abrir Visual Rodopar
          </button>

          {/* Instrução */}
          <div
            className="flex items-center gap-2 rounded-xl border px-4 py-3 text-[11px] leading-relaxed max-w-xs"
            style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-faint)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            Para voltar ao Workspace, clique em <strong>&nbsp;← Voltar&nbsp;</strong> no browser
          </div>

        </div>
      </div>
    </div>
  );
}
