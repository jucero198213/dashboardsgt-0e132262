import { supabase } from "@/integrations/supabase/client";

export type TicketPrioridade = "baixa" | "media" | "alta" | "urgente";
export type TicketStatus = "aberto" | "em_andamento" | "concluido" | "cancelado";

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
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TicketInput = Omit<Ticket, "id" | "created_at" | "updated_at" | "created_by">;

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
  const { data, error } = await supabase
    .from("tickets")
    .insert({ ...payload, created_by: userData.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Ticket;
}

export async function updateTicket(id: string, payload: Partial<TicketInput>): Promise<Ticket> {
  const { data, error } = await supabase
    .from("tickets")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Ticket;
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
  concluido: { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30" },
  cancelado: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
};
