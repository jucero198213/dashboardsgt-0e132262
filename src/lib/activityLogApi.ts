import { supabase } from "@/integrations/supabase/client";

export type ActivityLog = {
  id: string;
  user_id: string;
  action: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export async function logActivity(
  action: string,
  description: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  const { error } = await supabase
    .from("activity_logs")
    .insert({ user_id: uid, action, description, metadata: metadata ?? null } as never);
  if (error) console.error("logActivity falhou:", error);
}

export const ACTION_LABEL: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  ticket_created: "Chamado criado",
  ticket_updated: "Chamado atualizado",
  ticket_deleted: "Chamado excluído",
  user_created: "Usuário criado",
  user_deleted: "Usuário excluído",
  role_changed: "Role alterada",
  permission_changed: "Permissão alterada",
  settings_changed: "Configuração alterada",
};

export function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}
