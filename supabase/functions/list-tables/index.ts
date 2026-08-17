import { corsHeaders, json, requireAdmin } from "../_shared/adminDb.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const { data, error } = await auth.admin!.rpc("admin_list_tables", { _caller: auth.userId });
    if (error) throw error;

    return json(data ?? []);
  } catch (e) {
    console.error("list-tables error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
