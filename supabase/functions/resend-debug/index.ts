const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "";

  const out: Record<string, unknown> = {
    has_api_key: !!apiKey,
    api_key_prefix: apiKey ? apiKey.slice(0, 5) + "…" : null,
    from_email: from,
  };

  const dRes = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  out.domains_status = dRes.status;
  out.domains = await dRes.json().catch(() => null);

  let body: { to?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }

  if (body.to) {
    const sRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `SGT Log <${from}>`,
        to: [body.to],
        subject: "[SGT Log] Teste de envio",
        html: "<p>Teste de envio Resend.</p>",
      }),
    });
    out.send_status = sRes.status;
    out.send_body = await sRes.json().catch(() => null);
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
