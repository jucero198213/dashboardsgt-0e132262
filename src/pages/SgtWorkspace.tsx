import { useRef, useState } from "react";
import { RotateCw, ExternalLink } from "lucide-react";

const SGT_URL = "https://dashboardsgt.lovable.app/login";

export default function SgtWorkspace() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  return (
    <div
      className="flex h-[calc(100dvh-4rem)] sm:h-[100dvh] w-full flex-col"
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
          SGT Workspace
        </span>

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
            href={SGT_URL}
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
        src={SGT_URL}
        title="SGT Workspace"
        className="w-full flex-1 border-0"
      />
    </div>
  );
}
