import { supabase } from "@/integrations/supabase/client";
import { criarNotificacao } from "./notificacoesApi";
import { criarMensagemSistema } from "./ticketMensagensApi";

export type TicketPrioridade = "baixa" | "media" | "alta" | "urgente";
export type TicketStatus = "aberto" | "em_andamento" | "pendente" | "concluido" | "cancelado";

export interface Ticket {
  id: string;
  titulo: string;
  descricao: string | null;
  cliente_setor: string | null;
  responsavel: string | null;
  data_chamado: string; // YYYY-MM-DD
  horario_chamado: string | null; // HH:MM:SS
  prioridade: TicketPrioridade;
  status: TicketStatus;
  observacoes: string | null;
  categoria_id: string | null;
  created_by: string | null;
  aberto_por: string | null;
  created_at: string;
  updated_at: string;
}

export type TicketInput = Omit<Ticket, "id" | "created_at" | "updated_at" | "created_by" | "aberto_por">;

export async function fetchTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("data_chamado", { ascending: true })
    .order("horario_chamado", { ascending: true, nullsFirst: true });
  if (error) throw error;
  return (data ?? []) as Ticket[];
}

export async function fetchTicketsByDate(date: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("data_chamado", date)
    .order("horario_chamado", { ascending: true, nullsFirst: true });
  if (error) throw error;
  return (data ?? []) as Ticket[];
}

export async function createTicket(payload: TicketInput): Promise<Ticket> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  const { data, error } = await supabase
    .from("tickets")
    .insert({ ...payload, created_by: uid, aberto_por: uid })
    .select()
    .single();
  if (error) throw error;
  const ticket = data as Ticket;

  notifyTITeam(ticket, userData.user?.email ?? "Usuário").catch((err) => console.error("notifyTITeam falhou:", err));

  return ticket;
}

async function notifyTITeam(ticket: Ticket, remetenteEmail: string) {
  const { data: tiProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("departamento", "ti");
  if (!tiProfiles?.length) return;

  const tiIds = tiProfiles.map((p) => p.id);

  const notifs = tiIds.map((id) =>
    criarNotificacao(
      id,
      "novo_chamado",
      `Novo chamado: ${ticket.titulo}`,
      `Aberto por ${remetenteEmail}`,
      ticket.id,
    ),
  );
  const results = await Promise.allSettled(notifs);
  const rejected = results.filter((r) => r.status === "rejected");
  if (rejected.length) console.error("Falha ao criar notificações:", rejected);

  const { error } = await supabase.functions.invoke("notify-ticket-email", {
    body: {
      type: "novo_chamado",
      ticket_id: ticket.id,
      ticket_titulo: ticket.titulo,
      destinatarios_ids: tiIds,
      remetente_nome: remetenteEmail,
      conteudo: ticket.descricao,
    },
  });
  if (error) console.error("notify-ticket-email falhou:", error);
}

export async function fetchMyTickets(): Promise<Ticket[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("aberto_por", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Ticket[];
}

export async function updateTicket(id: string, payload: Partial<TicketInput>): Promise<Ticket> {
  let statusAnterior: TicketStatus | null = null;
  if (payload.status) {
    const { data: atual } = await supabase.from("tickets").select("status").eq("id", id).maybeSingle();
    statusAnterior = ((atual as { status: TicketStatus } | null)?.status) ?? null;
  }

  const { data, error } = await supabase
    .from("tickets")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  const ticket = data as Ticket;

  if (payload.status && statusAnterior && statusAnterior !== ticket.status) {
    criarMensagemSistema(
      ticket.id,
      `Status alterado de ${STATUS_LABEL[statusAnterior]} para ${STATUS_LABEL[ticket.status]}`,
    ).catch((err) => console.error("Log de status falhou:", err));
  }

  if (payload.status && ticket.aberto_por) {
    criarNotificacao(
      ticket.aberto_por,
      "status_chamado",
      `Chamado atualizado: ${ticket.titulo}`,
      `Status alterado para ${STATUS_LABEL[ticket.status]}`,
      ticket.id,
    ).catch(() => {});
  }

  return ticket;
}

export async function deleteTicket(id: string): Promise<void> {
  const { error } = await supabase.from("tickets").delete().eq("id", id);
  if (error) throw error;
}

export const PRIORIDADE_LABEL: Record<TicketPrioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  pendente: "Pendente",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const PRIORIDADE_COLOR: Record<TicketPrioridade, { bg: string; text: string; border: string; dot: string }> = {
  baixa: { bg: "bg-slate-500/10", text: "text-slate-300", border: "border-slate-500/30", dot: "bg-slate-400" },
  media: { bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/30", dot: "bg-cyan-400" },
  alta: { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30", dot: "bg-amber-400" },
  urgente: { bg: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/30", dot: "bg-rose-500" },
};

export const STATUS_COLOR: Record<TicketStatus, { bg: string; text: string; border: string }> = {
  aberto: { bg: "bg-blue-500/10", text: "text-blue-300", border: "border-blue-500/30" },
  em_andamento: { bg: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/30" },
  pendente: { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30" },
  concluido: { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30" },
  cancelado: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
};
