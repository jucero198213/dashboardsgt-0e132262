import { corsHeaders, json, requireAdmin, TABLE_RE } from "../_shared/adminDb.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => ({}));
    const tableName = String(body?.table_name ?? "");
    if (!TABLE_RE.test(tableName)) return json({ error: "Nome de tabela inválido" }, 400);

    const { data, error } = await auth.admin!.rpc("admin_describe_table", {
      _caller: auth.userId,
      _table: tableName,
    });
    if (error) throw error;

    return json(data ?? []);
  } catch (e) {
    console.error("describe-table error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
