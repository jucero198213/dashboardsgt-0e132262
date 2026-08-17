import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Send, Loader2, MessageSquare, Shield, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  TicketMensagem, TipoMensagem,
  fetchMensagens, criarMensagem,
} from "@/lib/ticketMensagensApi";
import { supabase } from "@/integrations/supabase/client";
import { TicketAnexo, fetchAnexos, uploadAnexos, validarArquivo, TIPOS_ACEITOS } from "@/lib/ticketAnexosApi";
import { AnexosGrid, PendingFilesGrid } from "./TicketAnexos";

interface Props {
  ticketId: string;
}

const TIPO_STYLE: Record<TipoMensagem, { label: string; bg: string; border: string }> = {
  resposta: { label: "Resposta", bg: "bg-blue-500/8", border: "border-blue-500/20" },
  nota_interna: { label: "Nota interna", bg: "bg-amber-500/8", border: "border-amber-500/20" },
  sistema: { label: "Sistema", bg: "bg-slate-500/8", border: "border-slate-500/20" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function TicketThread({ ticketId }: Props) {
  const { user, isAdmin } = useAuth();
  const [mensagens, setMensagens] = useState<TicketMensagem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);
  const [tipo, setTipo] = useState<TipoMensagem>("resposta");
  const [anexos, setAnexos] = useState<TicketAnexo[]>([]);
  const [pendentes, setPendentes] = useState<File[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const anexosPorMensagem = useMemo(() => {
    const map: Record<string, TicketAnexo[]> = {};
    for (const a of anexos) {
      if (!a.mensagem_id) continue;
      (map[a.mensagem_id] ??= []).push(a);
    }
    return map;
  }, [anexos]);

  const loadMensagens = useCallback(async () => {
    try {
      const msgs = await fetchMensagens(ticketId);
      setMensagens(msgs);
      fetchAnexos(ticketId).then(setAnexos).catch(() => {});

      const autorIds = [...new Set(msgs.map((m) => m.autor_id))];
      const missing = autorIds.filter((id) => !profiles[id]);
      if (missing.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", missing);
        if (data) {
          setProfiles((prev) => {
            const next = { ...prev };
            for (const p of data) next[p.id] = p.display_name ?? "Usuário";
            return next;
          });
        }
      }
    } catch {
      // silencia
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    setLoading(true);
    loadMensagens();
  }, [loadMensagens]);

  useEffect(() => {
    if (!ticketId) return;
    const channelName = `thread-${ticketId}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_mensagens",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => { loadMensagens(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, loadMensagens]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const validos: File[] = [];
    for (const f of Array.from(list)) {
      const erro = validarArquivo(f);
      if (erro) toast.error(erro);
      else validos.push(f);
    }
    if (validos.length) setPendentes((p) => [...p, ...validos]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const enviar = async () => {
    const txt = texto.trim();
    if (!txt && pendentes.length === 0) return;
    setSending(true);
    try {
      const msg = await criarMensagem(ticketId, txt || "(imagem)", tipo);
      if (pendentes.length) {
        try {
          await uploadAnexos(ticketId, pendentes, msg.id);
        } catch (e: any) {
          toast.error(e?.message ?? "Erro ao enviar anexo");
        }
        setPendentes([]);
      }
      setTexto("");
      await loadMensagens();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const visibleMsgs = isAdmin ? mensagens : mensagens.filter((m) => m.tipo !== "nota_interna");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--sgt-text-muted)]">
        <MessageSquare className="h-3.5 w-3.5" />
        Conversa
      </div>

      <div
        className="flex flex-col gap-2 max-h-[260px] overflow-y-auto rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-base)] p-2.5"
        style={{ scrollbarWidth: "thin" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          </div>
        ) : visibleMsgs.length === 0 ? (
          <p className="text-center text-[12px] text-[var(--sgt-text-muted)] py-6">
            Nenhuma mensagem ainda. Inicie a conversa.
          </p>
        ) : (
          visibleMsgs.map((m) => {
            const isMe = m.autor_id === user?.id;
            const style = TIPO_STYLE[m.tipo];
            return (
              <div
                key={m.id}
                className={`flex flex-col gap-0.5 max-w-[85%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--sgt-text-muted)]">
                  <span className="font-medium">
                    {isMe ? "Você" : (profiles[m.autor_id] ?? "Usuário")}
                  </span>
                  {m.tipo === "nota_interna" && (
                    <span className="flex items-center gap-0.5 text-amber-400">
                      <Shield className="h-2.5 w-2.5" />
                      interna
                    </span>
                  )}
                  <span>{timeAgo(m.created_at)}</span>
                </div>
                <div
                  className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed border ${style.border} ${style.bg} ${
                    isMe ? "rounded-br-sm" : "rounded-bl-sm"
                  }`}
                  style={{ color: "var(--sgt-text-primary)" }}
                >
                  {m.conteudo}
                </div>
                <AnexosGrid anexos={anexosPorMensagem[m.id] ?? []} className="mt-1" />
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex items-end gap-2">
        <div className="flex-1 flex flex-col gap-1">
          {isAdmin && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setTipo("resposta")}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${
                  tipo === "resposta"
                    ? "border-blue-500/40 bg-blue-500/15 text-blue-300"
                    : "border-[var(--sgt-border-subtle)] text-[var(--sgt-text-muted)] hover:bg-slate-500/10"
                }`}
              >
                Resposta
              </button>
              <button
                type="button"
                onClick={() => setTipo("nota_interna")}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${
                  tipo === "nota_interna"
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : "border-[var(--sgt-border-subtle)] text-[var(--sgt-text-muted)] hover:bg-slate-500/10"
                }`}
              >
                Nota interna
              </button>
            </div>
          )}
          <PendingFilesGrid
            files={pendentes}
            onRemove={(i) => setPendentes((p) => p.filter((_, idx) => idx !== i))}
          />
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tipo === "nota_interna" ? "Nota interna (só admins veem)..." : "Escreva uma mensagem..."}
            rows={1}
            className="min-h-[38px] max-h-[100px] resize-none text-[13px]"
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={TIPOS_ACEITOS.join(",")}
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Anexar imagem"
          className="h-[38px] px-3 border-[var(--sgt-border-subtle)]"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={enviar}
          disabled={sending || (!texto.trim() && pendentes.length === 0)}
          className="bg-amber-500 hover:bg-amber-600 text-black h-[38px] px-3"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
