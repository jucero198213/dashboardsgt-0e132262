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

const SECTOR_CONTEXT: Record<string, string> = {
  compras: "gestão de compras e aquisições de uma empresa de logística/transporte",
  contas_pagar: "contas a pagar e fluxo de saída de caixa de uma empresa de logística/transporte",
  contas_receber: "contas a receber e fluxo de entrada de caixa de uma empresa de logística/transporte",
  faturamento: "faturamento, receita bruta, líquida e margem de uma empresa de logística/transporte",
  frota: "gestão de frota de veículos de uma empresa de logística/transporte",
  manutencao: "manutenção de frota de uma empresa de logística/transporte",
  financiamento_frota: "financiamentos e leasing da frota de uma empresa de logística/transporte",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { setor, dados, periodo } = await req.json() as {
      setor: string;
      dados: Record<string, unknown>;
      periodo?: string;
    };

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return respond({ error: "OPENAI_API_KEY não configurada" }, 500);
    }

    const contexto = SECTOR_CONTEXT[setor] ?? setor;
    const periodoStr = periodo ? `Período de análise: ${periodo}.` : "";

    const systemPrompt = `Você é um analista financeiro sênior especializado em ${contexto}. 
Sua função é analisar dados operacionais e financeiros e gerar insights acionáveis, não óbvios e de alto valor para a diretoria.
Responda SEMPRE em JSON válido, sem markdown, sem texto fora do JSON.`;

    const userPrompt = `Analise os seguintes dados de ${contexto}:
${periodoStr}

DADOS:
${JSON.stringify(dados, null, 2)}

Gere exatamente 4 insights acionáveis baseados nesses dados. Para cada insight, identifique:
- Uma observação não óbvia ou padrão relevante nos dados
- Uma recomendação concreta de ação
- O impacto potencial (financeiro, operacional ou estratégico)

Retorne um JSON com esta estrutura exata:
{
  "insights": [
    {
      "id": 1,
      "tipo": "alerta" | "oportunidade" | "atencao" | "positivo",
      "titulo": "Título curto e direto (máx 60 chars)",
      "descricao": "Descrição detalhada com a observação e recomendação (máx 200 chars)",
      "impacto": "Descrição do impacto potencial (máx 80 chars)",
      "acao": "Ação recomendada em 1 frase imperativa (máx 80 chars)"
    }
  ]
}

Tipos:
- "alerta": situação crítica que requer ação imediata
- "atencao": situação que merece monitoramento próximo  
- "oportunidade": chance de melhoria ou ganho identificada
- "positivo": resultado acima do esperado ou tendência favorável`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return respond({ error: `OpenAI error: ${err}` }, 500);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return respond({ error: "Resposta vazia da OpenAI" }, 500);
    }

    const parsed = JSON.parse(content);
    return respond({ insights: parsed.insights ?? [] });

  } catch (err) {
    return respond({ error: String(err) }, 500);
  }
});
