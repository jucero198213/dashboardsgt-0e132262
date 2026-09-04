// ─────────────────────────────────────────────────────────────────────────────
//  automacao-notificar — envia os avisos da Automação MB via WhatsApp (Sofia).
//
//  Chamada pela automação que roda na máquina do DW (Node) após cada baixa:
//  concluída, divergência ou erro. Usa o TEMPLATE aprovado `automacao_baixa_mb`
//  (variável {{1}} = a frase do momento), que entrega mesmo fora da janela 24h.
//
//  Auth: header x-automacao-key deve bater com o secret AUTOMACAO_NOTIFY_KEY.
//  Destinatários: body.numeros (opcional) ou o secret WHATSAPP_AUTOMACAO_NUMEROS.
//  Deploy no Lovable com verify_jwt = false (chamada máquina-a-máquina).
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GRAPH_VERSION = "v21.0";
const TEMPLATE_NOME = Deno.env.get("WHATSAPP_AUTOMACAO_TEMPLATE") || "automacao_baixa_mb";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-automacao-key, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Envia o template automacao_baixa_mb com {{1}} = texto (sem quebra de linha).
async function sendTemplate(to: string, texto: string): Promise<{ ok: boolean; resp: string }> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) return { ok: false, resp: "WHATSAPP_TOKEN/PHONE_NUMBER_ID ausente" };

  const param = (texto || "—").replace(/\s+/g, " ").trim();
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: TEMPLATE_NOME,
          language: { code: "pt_BR" },
          components: [{ type: "body", parameters: [{ type: "text", text: param }] }],
        },
      }),
    },
  );
  const resp = await res.text();
  return { ok: res.ok, resp };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, erro: "use POST" }, 405);

  // Auth por chave compartilhada
  const key = Deno.env.get("AUTOMACAO_NOTIFY_KEY");
  if (key && req.headers.get("x-automacao-key") !== key) {
    return json({ ok: false, erro: "não autorizado" }, 401);
  }

  let mensagem: string | undefined;
  let numeros: string[] | undefined;
  try {
    const body = await req.json();
    mensagem = body?.mensagem;
    numeros = body?.numeros;
  } catch {
    return json({ ok: false, erro: "body JSON inválido" }, 400);
  }

  if (!mensagem || !String(mensagem).trim()) {
    return json({ ok: false, erro: "campo 'mensagem' é obrigatório" }, 400);
  }

  const lista = (numeros && numeros.length
    ? numeros
    : (Deno.env.get("WHATSAPP_AUTOMACAO_NUMEROS") ?? "").split(/[;,]/)
  ).map((n) => String(n).trim()).filter(Boolean);

  if (lista.length === 0) {
    return json({ ok: false, erro: "nenhum destinatário (WHATSAPP_AUTOMACAO_NUMEROS vazio)" }, 400);
  }

  const resultados: Array<{ to: string; ok: boolean; resp: string }> = [];
  for (const to of lista) {
    const r = await sendTemplate(to, String(mensagem));
    resultados.push({ to, ok: r.ok, resp: r.resp });
    console.log(`automacao-notificar → ${to}: ${r.ok ? "aceito" : "FALHOU"} ${r.resp}`);
  }

  return json({ ok: true, resultados });
});
