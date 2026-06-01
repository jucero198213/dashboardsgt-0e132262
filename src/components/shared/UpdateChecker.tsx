import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";

interface PendingUpdate {
  version: string;
  notes: string | null;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function UpdateChecker() {
  const [update, setUpdate]         = useState<PendingUpdate | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed]   = useState(false);
  const [progress, setProgress]     = useState(0);

  useEffect(() => {
    if (!isTauri()) return;

    const check = async () => {
      try {
        const { check: checkUpdate } = await import("@tauri-apps/plugin-updater");
        const result = await checkUpdate();
        if (result?.available) {
          setUpdate({ version: result.version, notes: result.body ?? null });
        }
      } catch (err) {
        console.warn("[UpdateChecker] falha ao verificar updates:", err);
      }
    };

    const timer = setTimeout(check, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!update || dismissed) return null;

  async function handleInstall() {
    if (!update) return;
    setInstalling(true);
    try {
      const { check: checkUpdate } = await import("@tauri-apps/plugin-updater");
      const { relaunch }           = await import("@tauri-apps/plugin-process");
      const result = await checkUpdate();
      if (!result?.available) return;
      let downloaded = 0, total = 0;
      await result.downloadAndInstall((event) => {
        if (event.event === "Started")  total      = event.data.contentLength ?? 0;
        if (event.event === "Progress") downloaded += event.data.chunkLength  ?? 0;
        if (total > 0) setProgress(Math.round((downloaded / total) * 100));
      });
      await relaunch();
    } catch (err) {
      console.error("[UpdateChecker] falha ao instalar update:", err);
      setInstalling(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-[340px] animate-in slide-in-from-bottom-4 duration-300">
      <div className="relative overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          background:  "var(--sgt-bg-surface)",
          borderColor: "rgba(245,166,35,0.30)",
          boxShadow:   "0 0 0 1px rgba(245,166,35,0.10), 0 20px 60px rgba(0,0,0,0.60)",
        }}>
        <div className="h-[3px] w-full bg-gradient-to-r from-amber-400/80 via-amber-500 to-amber-400/30" />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/20">
                <Download className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "var(--sgt-text-primary)" }}>
                  Atualização disponível
                </p>
                <p className="text-[11px]" style={{ color: "var(--sgt-text-muted)" }}>
                  Versão {update.version}
                </p>
              </div>
            </div>
            {!installing && (
              <button onClick={() => setDismissed(true)}
                className="shrink-0 rounded-lg p-1 transition-colors hover:bg-white/5"
                style={{ color: "var(--sgt-text-muted)" }}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {update.notes && (
            <p className="mb-3 text-[11px] leading-relaxed rounded-lg px-3 py-2"
              style={{ color: "var(--sgt-text-secondary)", background: "rgba(255,255,255,0.03)", border: "1px solid var(--sgt-border-subtle)" }}>
              {update.notes}
            </p>
          )}

          {installing && (
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>
                  {progress < 100 ? "Baixando..." : "Instalando..."}
                </span>
                <span className="text-[10px] font-mono text-amber-400">{progress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--sgt-border-subtle)" }}>
                <div className="h-full rounded-full bg-amber-400 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {!installing && (
            <div className="flex gap-2">
              <button onClick={() => setDismissed(true)}
                className="flex-1 rounded-xl border py-2 text-[12px] font-medium transition-colors hover:bg-white/5"
                style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" }}>
                Agora não
              </button>
              <button onClick={handleInstall}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold transition-all hover:opacity-90"
                style={{ background: "linear-gradient(95deg, #F5A623 0%, #D4891A 100%)", color: "#1B1304" }}>
                <RefreshCw className="h-3.5 w-3.5" />
                Atualizar
              </button>
            </div>
          )}

          {installing && (
            <p className="text-center text-[11px]" style={{ color: "var(--sgt-text-muted)" }}>
              O app vai reiniciar automaticamente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
