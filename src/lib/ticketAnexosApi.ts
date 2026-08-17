import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "ticket-attachments";
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const TIPOS_ACEITOS = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

export interface TicketAnexo {
  id: string;
  ticket_id: string;
  mensagem_id: string | null;
  arquivo_url: string; // caminho no storage
  nome_arquivo: string | null;
  tipo: string | null;
  tamanho: number | null;
  uploaded_by: string | null;
  created_at: string;
}

const TABLE = "ticket_anexos" as never;

export function validarArquivo(file: File): string | null {
  if (!TIPOS_ACEITOS.includes(file.type)) return `${file.name}: formato não suportado (use jpg, png, gif ou webp)`;
  if (file.size > MAX_FILE_SIZE) return `${file.name}: excede o limite de 5MB`;
  return null;
}

export async function fetchAnexos(ticketId: string): Promise<TicketAnexo[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TicketAnexo[];
}

export async function uploadAnexos(
  ticketId: string,
  files: File[],
  mensagemId: string | null = null,
): Promise<TicketAnexo[]> {
  if (!files.length) return [];
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");

  const criados: TicketAnexo[] = [];
  for (const file of files) {
    const erro = validarArquivo(file);
    if (erro) throw new Error(erro);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${ticketId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) throw upErr;

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        ticket_id: ticketId,
        mensagem_id: mensagemId,
        arquivo_url: path,
        nome_arquivo: file.name,
        tipo: file.type,
        tamanho: file.size,
        uploaded_by: uid,
      } as never)
      .select()
      .single();
    if (error) throw error;
    criados.push(data as unknown as TicketAnexo);
  }
  return criados;
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function getSignedUrls(paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, expiresIn);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

export async function excluirAnexo(anexo: TicketAnexo): Promise<void> {
  await supabase.storage.from(BUCKET).remove([anexo.arquivo_url]);
  const { error } = await supabase.from(TABLE).delete().eq("id", anexo.id);
  if (error) throw error;
}
