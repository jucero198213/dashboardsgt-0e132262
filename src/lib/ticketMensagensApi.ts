import { supabase } from "@/integrations/supabase/client";
import { criarNotificacao } from "./notificacoesApi";

export type TipoMensagem = "resposta" | "nota_interna" | "sistema";

export interface TicketMensagem {
  id: string;
  ticket_id: string;
  autor_id: string;
  conteudo: string;
  tipo: TipoMensagem;
  created_at: string;
}

export async function fetchMensagens(ticketId: string): Promise<TicketMensagem[]> {
  const { data, error } = await supabase
    .from("ticket_mensagens")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TicketMensagem[];
}

export async function criarMensagem(
  ticketId: string,
  conteudo: string,
  tipo: TipoMensagem = "resposta",
): Promise<TicketMensagem> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from("ticket_mensagens")
    .insert({ ticket_id: ticketId, autor_id: uid, conteudo, tipo } as never)
    .select()
    .single();
  if (error) throw error;
  const msg = data as TicketMensagem;

  if (tipo === "resposta") {
    notifyTicketReply(ticketId, uid, conteudo).catch(() => {});
  }

  return msg;
}

async function notifyTicketReply(ticketId: string, autorId: string, conteudo: string) {
  const { data: ticket } = await supabase.from("tickets").select("titulo, aberto_por, created_by").eq("id", ticketId).single();
  if (!ticket) return;

  const { data: autorProfile } = await supabase.from("profiles").select("display_name").eq("id", autorId).maybeSingle();
  const autorNome = (autorProfile as { display_name: string | null } | null)?.display_name ?? "Alguém";

  const { data: tiProfiles } = await supabase.from("profiles").select("id").eq("departamento", "ti");
  const tiIds = new Set((tiProfiles ?? []).map((p) => p.id));
  const isTI = tiIds.has(autorId);

  if (isTI && ticket.aberto_por) {
    await criarNotificacao(
      ticket.aberto_por,
      "resposta_chamado",
      `Resposta no chamado: ${ticket.titulo}`,
      `${autorNome} respondeu ao seu chamado`,
      ticketId,
    );
  } else {
    const notifs = [...tiIds]
      .filter((id) => id !== autorId)
      .map((id) =>
        criarNotificacao(id, "resposta_chamado", `Resposta no chamado: ${ticket.titulo}`, `${autorNome} respondeu`, ticketId),
      );
    await Promise.allSettled(notifs);
  }
}

export async function criarMensagemSistema(
  ticketId: string,
  conteudo: string,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;

  await supabase
    .from("ticket_mensagens")
    .insert({ ticket_id: ticketId, autor_id: uid, conteudo, tipo: "sistema" } as never);
}
