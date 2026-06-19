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

const SYSTEM_PROMPT = `Você é a assistente virtual do SGT Workspace — sistema de gestão interno de uma empresa de transporte e logística rodoviária.

Seu papel é ajudar gestores e a diretoria com:
- Análise e interpretação de dados financeiros, operacionais e de frota
- Respostas sobre módulos do sistema (financeiro, frota, manutenção, abastecimento, compras, RH, indicadores)
- Sugestões estratégicas e operacionais baseadas em contexto de transportadoras
- Explicações de KPIs, métricas e indicadores do setor

Seja objetivo, profissional e direto. Use linguagem corporativa em português brasileiro.
Quando não tiver dados específicos, responda com base em boas práticas do setor de transporte rodoviário de cargas.
Nunca invente números ou dados que não foram fornecidos pelo usuário.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages } = await req.json() as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return respond({ error: "OPENAI_API_KEY não configurada" }, 500);

    if (!messages?.length) return respond({ error: "messages obrigatório" }, 400);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.5,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return respond({ error: `OpenAI error: ${err}` }, 500);
    }

    const result = await response.json();
    const reply = result.choices?.[0]?.message?.content ?? "";
    return respond({ reply });

  } catch (err) {
    return respond({ error: String(err) }, 500);
  }
});
