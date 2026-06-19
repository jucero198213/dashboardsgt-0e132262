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

// ── DW API config (mesma URL/secret usados pelo cliente) ─────────────────────
const DW_API_URL =
  Deno.env.get("DW_API_URL") ||
  "https://textbooks-filme-saves-atmospheric.trycloudflare.com";
const DW_API_SECRET =
  Deno.env.get("DW_API_SECRET") ||
  "92fdb5856ac33b770f3ea32484dd3222db0fcfe8d56b85919191b8c65ff9e7ab";

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

// ── Tools que a IA pode chamar ────────────────────────────────────────────────
const tools = [
  {
    type: "function",
    function: {
      name: "get_faturamento_resumo",
      description:
        "Retorna APENAS o acumulado do mês corrente e um snapshot parcial do dia em andamento (NÃO é o faturamento fechado de ontem). Use somente para perguntas genéricas tipo 'como está o faturamento do mês'. NÃO USE para perguntas sobre 'ontem', 'hoje fechado' ou qualquer data específica — para isso use get_faturamento_periodo.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_faturamento_periodo",
      description:
        "Retorna o faturamento total e por grupo de clientes em um período. Use quando o usuário pedir faturamento em datas específicas, comparativos, top clientes/segmentos.",
      parameters: {
        type: "object",
        properties: {
          dataInicio: { type: "string", description: "Data início no formato YYYY-MM-DD" },
          dataFim: { type: "string", description: "Data fim no formato YYYY-MM-DD" },
        },
        required: ["dataInicio", "dataFim"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_titulos_financeiros",
      description:
        "Retorna títulos financeiros (contas a pagar e receber) em um período, com totais agregados. Use para perguntas sobre contas a pagar/receber, inadimplência, vencimentos.",
      parameters: {
        type: "object",
        properties: {
          dataInicio: { type: "string", description: "YYYY-MM-DD" },
          dataFim: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["dataInicio", "dataFim"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_manutencao_por_veiculo",
      description:
        "Retorna o ranking de veículos por custo de manutenção em um período (soma de custo + mão de obra + peças por veículo). Use para perguntas como 'qual caminhão gasta mais com manutenção', 'top veículos em oficina', 'gastos de manutenção por placa/frota', 'manutenção corretiva vs preventiva'. Também retorna totais por tipo de serviço (interno/externo).",
      parameters: {
        type: "object",
        properties: {
          dataInicio: { type: "string", description: "YYYY-MM-DD (opcional, default últimos 90 dias)" },
          dataFim: { type: "string", description: "YYYY-MM-DD (opcional, default hoje)" },
          top: { type: "number", description: "Quantos veículos retornar no ranking (default 10)" },
        },
      },
    },
  },
];

// ── Executor das tools ────────────────────────────────────────────────────────
async function dwCall(path: string, body: Record<string, unknown>) {
  const r = await fetch(`${DW_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": DW_API_SECRET,
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`DW ${path} ${r.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function summarize(data: unknown, max = 3500): string {
  const s = JSON.stringify(data);
  if (s.length <= max) return s;
  // Se for array enorme, trunca
  if (Array.isArray(data)) {
    const arr = data as unknown[];
    return JSON.stringify({
      total_registros: arr.length,
      amostra: arr.slice(0, 20),
      nota: "Lista truncada — mostrados 20 de " + arr.length,
    });
  }
  return s.slice(0, max) + "...[truncado]";
}

async function execTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    if (name === "get_faturamento_resumo") {
      const data = await dwCall("/dw-faturamento-resumo", {});
      return JSON.stringify({
        ...(data as Record<string, unknown>),
        _aviso:
          "daily_revenue.reference_date é a data do snapshot — pode ser o dia em andamento (PARCIAL). NÃO apresente como faturamento fechado de ontem. Para faturamento de uma data específica, use get_faturamento_periodo.",
      });
    }
    if (name === "get_faturamento_periodo") {
      const data = await dwCall("/dw-financeiro", {
        action: "faturamento",
        dataInicio: args.dataInicio,
        dataFim: args.dataFim,
      });
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      const total = rows.reduce((s, r) => s + Number(r.FRETE_TOTAL ?? 0), 0);
      return JSON.stringify({
        periodo: { dataInicio: args.dataInicio, dataFim: args.dataFim },
        faturamento_total: total.toFixed(2),
        qtd_grupos: rows.length,
        por_grupo: rows,
      });
    }
    if (name === "get_titulos_financeiros") {
      const data = await dwCall("/dw-financeiro", {
        action: "fetch",
        dataInicio: args.dataInicio,
        dataFim: args.dataFim,
      });
      // Resumir agregando — o fetch é pesado
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      let totalPagar = 0,
        totalReceber = 0,
        totalPago = 0,
        totalRecebido = 0,
        qtdPagar = 0,
        qtdReceber = 0;
      for (const r of rows) {
        const origem = r.ORIGEM as string;
        const vlrPar = Number(r.VLR_PARCELA ?? 0);
        const vlrPag = Number(r.VLR_PAGO ?? 0);
        if (origem === "CP") {
          totalPagar += vlrPar;
          totalPago += vlrPag;
          qtdPagar++;
        } else if (origem === "CR") {
          totalReceber += vlrPar;
          totalRecebido += vlrPag;
          qtdReceber++;
        }
      }
      return JSON.stringify({
        periodo: { dataInicio: args.dataInicio, dataFim: args.dataFim },
        contas_a_pagar: {
          quantidade: qtdPagar,
          valor_total: totalPagar.toFixed(2),
          valor_pago: totalPago.toFixed(2),
          em_aberto: (totalPagar - totalPago).toFixed(2),
        },
        contas_a_receber: {
          quantidade: qtdReceber,
          valor_total: totalReceber.toFixed(2),
          valor_recebido: totalRecebido.toFixed(2),
          em_aberto: (totalReceber - totalRecebido).toFixed(2),
        },
      });
    }
    if (name === "get_manutencao_por_veiculo") {
      const dataFim = (args.dataFim as string) || today();
      const dataInicio = (args.dataInicio as string) || daysAgo(90);
      const topN = Number(args.top ?? 10);
      const data = await dwCall("/dw-manutencao", { dataInicio, dataFim });
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;

      const porVeiculo = new Map<string, { veiculo: string; custo_total: number; ordens: Set<string>; preventiva: number; corretiva: number }>();
      let totalGeral = 0;
      let totalInterno = 0;
      let totalExterno = 0;

      for (const r of rows) {
        const veic = String(r.veiculo ?? "SEM_VEICULO");
        const custo = Number(r.custo ?? 0) + Number(r.valormo ?? 0) + Number(r.valorpc ?? 0);
        totalGeral += custo;
        if (r.tiposervico === "SERVICOINTERNO") totalInterno += custo;
        else if (r.tiposervico === "SERVICOEXTERNO") totalExterno += custo;

        const cur = porVeiculo.get(veic) ?? { veiculo: veic, custo_total: 0, ordens: new Set<string>(), preventiva: 0, corretiva: 0 };
        cur.custo_total += custo;
        if (r.ordem != null) cur.ordens.add(String(r.ordem));
        const classif = String(r.classificacao ?? "").toUpperCase();
        if (classif.includes("PREVENT")) cur.preventiva += custo;
        else if (classif.includes("CORRET")) cur.corretiva += custo;
        porVeiculo.set(veic, cur);
      }

      const ranking = [...porVeiculo.values()]
        .sort((a, b) => b.custo_total - a.custo_total)
        .slice(0, topN)
        .map((v) => ({
          veiculo: v.veiculo,
          custo_total: v.custo_total.toFixed(2),
          qtd_ordens: v.ordens.size,
          custo_preventiva: v.preventiva.toFixed(2),
          custo_corretiva: v.corretiva.toFixed(2),
        }));

      return JSON.stringify({
        periodo: { dataInicio, dataFim },
        total_geral: totalGeral.toFixed(2),
        total_servico_interno: totalInterno.toFixed(2),
        total_servico_externo: totalExterno.toFixed(2),
        qtd_veiculos: porVeiculo.size,
        top_veiculos: ranking,
      });
    }
    return JSON.stringify({ error: "Tool desconhecida: " + name });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

const SYSTEM_PROMPT = `Você é a assistente virtual do SGT Workspace — sistema de gestão de uma transportadora rodoviária. Ajude diretores e gestores com análise de dados, KPIs e boas práticas do setor.

ESCOPO E LIMITES (regra absoluta):
- Você é READ-ONLY. SOMENTE consulta e análise de dados. NUNCA execute, sugira ou simule qualquer alteração, inserção, exclusão, atualização, envio, aprovação, baixa de título, lançamento ou ação operacional no sistema.
- Se o usuário pedir uma alteração (ex: "dá baixa nessa conta", "lança esse título", "aprova esse pagamento"), responda educadamente que você não realiza alterações — apenas consultas e análises — e ofereça mostrar os dados relevantes.

Você TEM acesso direto ao banco de dados operacional da SGT via tools. SEMPRE que o usuário perguntar sobre faturamento, contas, títulos, vencimentos, clientes — USE as tools para buscar dados reais. NUNCA peça ao usuário para fornecer o valor; busque você mesmo.

Datas de referência:
- Hoje: ${today()}
- Ontem: ${daysAgo(1)}
- Últimos 7 dias: ${daysAgo(7)} até ${today()}
- Últimos 30 dias: ${daysAgo(30)} até ${today()}

REGRAS CRÍTICAS DE TOOLS:
- Para faturamento de UMA DATA ESPECÍFICA (ontem, hoje, dia X, semana passada, mês passado) → SEMPRE use get_faturamento_periodo com dataInicio=dataFim=a data pedida. NUNCA use get_faturamento_resumo para isso.
- get_faturamento_resumo só serve para uma visão geral do mês corrente; o campo daily_revenue pode ser do dia em andamento (parcial) — nunca apresente como "faturamento de ontem".
- Quando o usuário disser "ontem", use exatamente ${daysAgo(1)} como data.

Quando responder com valores em R$, formate como "R$ 123.456,78". Seja objetivo, profissional, em português brasileiro. Para sugestões/perguntas conceituais que não exigem dados, responda direto sem chamar tools.`;

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
    if (!lovableKey) return respond({ error: "LOVABLE_API_KEY não configurada" }, 500);

    // Conversa para o gateway (system + histórico)
    const convo: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    // Loop de tool-calling (máx 5 iterações)
    for (let i = 0; i < 5; i++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: convo,
          tools,
          tool_choice: "auto",
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        if (resp.status === 429)
          return respond({ error: "Limite de requisições. Tente em instantes." }, 429);
        if (resp.status === 402)
          return respond({ error: "Créditos de IA esgotados." }, 402);
        return respond({ error: `AI gateway error: ${err}` }, 500);
      }

      const result = await resp.json();
      const msg = result.choices?.[0]?.message;
      if (!msg) return respond({ reply: "Não consegui processar." });

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        return respond({ reply: msg.content ?? "" });
      }

      // Adiciona a mensagem do assistant com os tool_calls
      convo.push(msg);

      // Executa todas as tools em paralelo
      const results = await Promise.all(
        toolCalls.map(async (tc: { id: string; function: { name: string; arguments: string } }) => {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments || "{}");
          } catch {
            args = {};
          }
          const out = await execTool(tc.function.name, args);
          return {
            role: "tool",
            tool_call_id: tc.id,
            content: out,
          };
        }),
      );

      convo.push(...results);
    }

    return respond({ reply: "Não consegui concluir a consulta após várias tentativas." });
  } catch (err) {
    return respond({ error: String(err) }, 500);
  }
});
