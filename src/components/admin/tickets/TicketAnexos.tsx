import { useEffect, useState } from "react";
import { X, ImageIcon } from "lucide-react";
import { TicketAnexo, getSignedUrls } from "@/lib/ticketAnexosApi";

/** Grade de miniaturas de anexos já salvos (clicáveis, abrem em tamanho real). */
export function AnexosGrid({ anexos, className = "" }: { anexos: TicketAnexo[]; className?: string }) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const paths = anexos.map((a) => a.arquivo_url);
    if (!paths.length) { setUrls({}); return; }
    getSignedUrls(paths).then((map) => { if (active) setUrls(map); });
    return () => { active = false; };
  }, [anexos]);

  if (!anexos.length) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {anexos.map((a) => {
        const url = urls[a.arquivo_url];
        return (
          <a
            key={a.id}
            href={url ?? "#"}
            target="_blank"
            rel="noreferrer"
            title={a.nome_arquivo ?? "Anexo"}
            onClick={(e) => { if (!url) e.preventDefault(); }}
            className="relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] flex items-center justify-center"
          >
            {url ? (
              <img src={url} alt={a.nome_arquivo ?? "Anexo do chamado"} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-4 w-4 text-[var(--sgt-text-muted)]" />
            )}
          </a>
        );
      })}
    </div>
  );
}

/** Miniaturas de arquivos ainda não enviados, com remoção. */
export function PendingFilesGrid({
  files, onRemove, className = "",
}: { files: File[]; onRemove: (index: number) => void; className?: string }) {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [files]);

  if (!files.length) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {files.map((f, i) => (
        <div
          key={`${f.name}-${i}`}
          className="relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]"
        >
          {previews[i] && <img src={previews[i]} alt={f.name} className="h-full w-full object-cover" />}
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Remover ${f.name}`}
            className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white hover:bg-rose-600"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
