import { corsHeaders, json, requireAdmin, TABLE_RE } from "../_shared/adminDb.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => ({}));
    const tableName = String(body?.table_name ?? "");
    if (!TABLE_RE.test(tableName)) return json({ error: "Nome de tabela inválido" }, 400);

    const page = Math.max(1, Number(body?.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(body?.per_page) || 50));

    const { data, error } = await auth.admin!.rpc("admin_read_table", {
      _caller: auth.userId,
      _table: tableName,
      _page: page,
      _per_page: perPage,
    });
    if (error) throw error;

    return json(data ?? { rows: [], total: 0, page, per_page: perPage });
  } catch (e) {
    console.error("read-table error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
