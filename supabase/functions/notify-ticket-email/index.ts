// ─────────────────────────────────────────────────────────────────────────────
//  notify-ticket-email — envia email via Resend quando um chamado é criado
//  ou recebe uma resposta.
//
//  Body esperado:
//    { type: "novo_chamado" | "resposta_chamado" | "status_chamado",
//      ticket_id, ticket_titulo, destinatarios: string[],
//      remetente_nome?: string, conteudo?: string }
//
//  Secrets necessários: RESEND_API_KEY, RESEND_FROM_EMAIL (ex: chamados@seudominio.com)
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface EmailPayload {
  type: "novo_chamado" | "resposta_chamado" | "status_chamado";
  ticket_id: string;
  ticket_titulo: string;
  destinatarios: string[];
  remetente_nome?: string;
  conteudo?: string;
  novo_status?: string;
}

function buildSubject(p: EmailPayload): string {
  switch (p.type) {
    case "novo_chamado":
      return `[SGT Log] Novo chamado: ${p.ticket_titulo}`;
    case "resposta_chamado":
      return `[SGT Log] Resposta no chamado: ${p.ticket_titulo}`;
    case "status_chamado":
      return `[SGT Log] Status atualizado: ${p.ticket_titulo}`;
  }
}

function buildHtml(p: EmailPayload): string {
  const header = p.type === "novo_chamado"
    ? `<h2 style="color:#f59e0b;margin:0 0 8px">Novo Chamado Aberto</h2>`
    : p.type === "resposta_chamado"
    ? `<h2 style="color:#10b981;margin:0 0 8px">Nova Resposta</h2>`
    : `<h2 style="color:#3b82f6;margin:0 0 8px">Status Atualizado</h2>`;

  const body = p.type === "status_chamado"
    ? `<p>O chamado <strong>"${p.ticket_titulo}"</strong> teve o status alterado para <strong>${p.novo_status ?? "—"}</strong>.</p>`
    : `<p><strong>${p.remetente_nome ?? "Alguém"}</strong> ${p.type === "novo_chamado" ? "abriu um novo chamado" : "respondeu ao chamado"} <strong>"${p.ticket_titulo}"</strong>:</p>
       ${p.conteudo ? `<blockquote style="border-left:3px solid #d1d5db;padding:8px 12px;margin:12px 0;color:#4b5563;background:#f9fafb;border-radius:4px">${p.conteudo}</blockquote>` : ""}`;

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:540px;margin:0 auto;padding:24px">
      <div style="background:#1a1a2e;border-radius:12px;padding:24px;color:#e2e8f0">
        ${header}
        ${body}
        <hr style="border:none;border-top:1px solid #334155;margin:16px 0"/>
        <p style="font-size:12px;color:#94a3b8;margin:0">SGT Log — Sistema de Gestão em Transporte</p>
      </div>
    </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "chamados@dwsgtlog.com";

    if (!apiKey) return json({ error: "RESEND_API_KEY não configurada" }, 500);

    const payload: EmailPayload = await req.json();
    if (!payload.destinatarios?.length) return json({ error: "Nenhum destinatário" }, 400);

    const results = await Promise.allSettled(
      payload.destinatarios.map(async (to) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `SGT Log <${fromEmail}>`,
            to: [to],
            subject: buildSubject(payload),
            html: buildHtml(payload),
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        return { to, ok: true };
      }),
    );

    const enviados = results.filter((r) => r.status === "fulfilled").length;
    const falhas = results.filter((r) => r.status === "rejected").length;

    return json({ enviados, falhas });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
