import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Departamento =
  | "ti"
  | "financeiro"
  | "operacao"
  | "rh"
  | "diretoria"
  | "compras"
  | "comercial";

export const DEPARTAMENTO_LABEL: Record<Departamento, string> = {
  ti: "T.I.",
  financeiro: "Financeiro",
  operacao: "Operação",
  rh: "RH",
  diretoria: "Diretoria",
  compras: "Compras",
  comercial: "Comercial",
};

export const DEPARTAMENTO_COLOR: Record<Departamento, { bg: string; text: string; border: string }> = {
  ti: { bg: "bg-blue-500/10", text: "text-blue-300", border: "border-blue-500/30" },
  financeiro: { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30" },
  operacao: { bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/30" },
  rh: { bg: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/30" },
  diretoria: { bg: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/30" },
  compras: { bg: "bg-orange-500/10", text: "text-orange-300", border: "border-orange-500/30" },
  comercial: { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30" },
};

export interface Profile {
  id: string;
  display_name: string;
  departamento: Departamento | null;
  telefone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("display_name");
    if (!error && data) setProfiles(data as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const getProfile = useCallback(
    (userId: string) => profiles.find((p) => p.id === userId) ?? null,
    [profiles],
  );

  const upsertProfile = useCallback(
    async (userId: string, fields: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>) => {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, ...fields } as never, { onConflict: "id" });
      if (error) throw error;
      await fetchProfiles();
    },
    [fetchProfiles],
  );

  return { profiles, loading, fetchProfiles, getProfile, upsertProfile };
}

export async function fetchProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data as Profile | null;
}
