import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM_PROMPT =
  "Você é a assistente virtual do SGT Workspace — sistema de gestão interno de uma empresa de transporte e logística rodoviária. Ajude gestores e diretores com análise de dados, KPIs, indicadores e boas práticas do setor. Seja objetivo e profissional em português brasileiro.";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages } = (await req.json()) as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return respond({ error: "messages é obrigatório" }, 400);
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return respond({ error: "LOVABLE_API_KEY não configurada" }, 500);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 429) {
        return respond({ error: "Limite de requisições excedido. Tente novamente em instantes." }, 429);
      }
      if (response.status === 402) {
        return respond({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }, 402);
      }
      return respond({ error: `AI gateway error: ${err}` }, 500);
    }

    const result = await response.json();
    const reply = result.choices?.[0]?.message?.content ?? "";

    return respond({ reply });
  } catch (err) {
    return respond({ error: String(err) }, 500);
  }
});
