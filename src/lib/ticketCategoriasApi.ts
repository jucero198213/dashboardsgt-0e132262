import { supabase } from "@/integrations/supabase/client";

export interface TicketCategoria {
  id: string;
  nome: string;
  cor: string | null;
  ativo: boolean;
  created_at: string;
}

const TABLE = "ticket_categorias" as never;

export async function fetchCategorias(somenteAtivas = true): Promise<TicketCategoria[]> {
  let q = supabase.from(TABLE).select("*").order("nome");
  if (somenteAtivas) q = q.eq("ativo", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as TicketCategoria[];
}

export async function criarCategoria(nome: string, cor: string | null): Promise<void> {
  const { error } = await supabase.from(TABLE).insert({ nome, cor } as never);
  if (error) throw error;
}

export async function atualizarCategoria(
  id: string,
  fields: Partial<Pick<TicketCategoria, "nome" | "cor" | "ativo">>,
): Promise<void> {
  const { error } = await supabase.from(TABLE).update(fields as never).eq("id", id);
  if (error) throw error;
}

export const DEFAULT_CATEGORIA_COR = "#94a3b8";

/** Converte hex em estilos inline para badge translúcido. */
export function categoriaBadgeStyle(cor: string | null) {
  const c = cor || DEFAULT_CATEGORIA_COR;
  return {
    color: c,
    backgroundColor: `${c}1A`,
    borderColor: `${c}4D`,
  };
}
