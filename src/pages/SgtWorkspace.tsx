import { useRef, useState } from "react";
import { RotateCw, ExternalLink } from "lucide-react";

const SGT_URL = "https://dashboardsgt.lovable.app/login";

export default function SgtWorkspace() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  const reload = () => {
    setKey((k) => k + 1);
  };

  return (
    <div
      className="flex h-[100dvh] w-full flex-col"
      style={{ backgroundColor: "var(--sgt-bg-base)" }}
    >
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
          title={SGT_URL}
        >
          {SGT_URL}
        </div>
        <button
          type="button"
          onClick={reload}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-primary/10"
          style={{
            borderColor: "var(--sgt-border-subtle)",
            color: "var(--sgt-text-primary)",
          }}
          title="Recarregar"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Recarregar
        </button>
        <a
          href={SGT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          title="Abrir em nova aba"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Nova aba
        </a>
      </div>
      <iframe
        key={key}
        ref={iframeRef}
        src={SGT_URL}
        title="SGT Workspace"
        className="w-full flex-1 border-0"
      />
    </div>
  );
}
