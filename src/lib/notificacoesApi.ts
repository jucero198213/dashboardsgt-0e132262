import { supabase } from "@/integrations/supabase/client";

export type TipoNotificacao = "novo_chamado" | "resposta_chamado" | "status_chamado";

export interface Notificacao {
  id: string;
  user_id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string | null;
  referencia_id: string | null;
  lida: boolean;
  created_at: string;
}

export async function fetchNotificacoes(): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []) as Notificacao[];
}

export async function countNaoLidas(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("lida", false);
  if (error) return 0;
  return count ?? 0;
}

export async function marcarComoLida(id: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ lida: true } as never)
    .eq("id", id);
}

export async function marcarTodasComoLidas(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  await supabase
    .from("notifications")
    .update({ lida: true } as never)
    .eq("user_id", uid)
    .eq("lida", false);
}

export async function criarNotificacao(
  userId: string,
  tipo: TipoNotificacao,
  titulo: string,
  mensagem?: string,
  referenciaId?: string,
): Promise<void> {
  await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      tipo,
      titulo,
      mensagem: mensagem ?? null,
      referencia_id: referenciaId ?? null,
    } as never);
}
