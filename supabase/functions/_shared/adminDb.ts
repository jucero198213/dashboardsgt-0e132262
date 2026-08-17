import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Valida JWT + role admin. Retorna o client service role e o id do admin. */
export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: json({ error: "Não autorizado" }, 401) };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) return { error: json({ error: "Não autorizado" }, 401) };

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleData } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) return { error: json({ error: "Apenas admins têm acesso" }, 403) };

  return { admin, userId: user.id };
}

export const TABLE_RE = /^[a-zA-Z0-9_]+$/;
