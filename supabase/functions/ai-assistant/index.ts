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
  "https://limitations-characteristic-baseline-von.trycloudflare.com";
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
        "Ranking de veículos por custo de manutenção em um período (custo + mão de obra + peças). Use para 'qual caminhão gasta mais com manutenção', 'top veículos em oficina', 'preventiva vs corretiva'. Também retorna totais interno/externo.",
      parameters: {
        type: "object",
        properties: {
          dataInicio: { type: "string", description: "YYYY-MM-DD (opcional, default últimos 90 dias)" },
          dataFim: { type: "string", description: "YYYY-MM-DD (opcional, default hoje)" },
          top: { type: "number", description: "Quantos veículos no ranking (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_manutencao_analise",
      description:
        "Análise DETALHADA de manutenção em um período, agrupável por várias dimensões e com filtro opcional por tipo de item. Use para perguntas que o ranking por veículo NÃO responde: gasto com pneu/óleo/peça específica, gasto por fornecedor, por mecânico (funcionário), por setor, por situação da ordem (em aberto/concluída), por subgrupo, ou peças vs serviço. Ex.: 'quanto gastamos com pneu', 'qual fornecedor de peças mais faturou', 'gasto por mecânico', 'quais OS estão em aberto', 'top subgrupos de gasto'.",
      parameters: {
        type: "object",
        properties: {
          agruparPor: {
            type: "string",
            description:
              "Dimensão de agrupamento: 'subgrupo' (tipo de peça/serviço), 'fornecedor', 'funcionario' (mecânico), 'setor', 'tiposervico' (interno/externo), 'situacao' (andamento/concluído), 'veiculo', 'filial' ou 'produto'. Default 'subgrupo'.",
          },
          filtroSubgrupo: {
            type: "string",
            description:
              "Opcional. Filtra apenas itens cujo subgrupo ou produto contenha este texto (ex.: 'pneu', 'oleo', 'filtro').",
          },
          dataInicio: { type: "string", description: "YYYY-MM-DD (opcional, default últimos 90 dias)" },
          dataFim: { type: "string", description: "YYYY-MM-DD (opcional, default hoje)" },
          top: { type: "number", description: "Quantos grupos retornar (default 15)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_clientes",
      description:
        "Ranking dos clientes/grupos que mais faturaram em um período (a partir de get_faturamento_periodo, ordenado por valor). Use para 'top clientes do mês', 'quais clientes mais faturaram'.",
      parameters: {
        type: "object",
        properties: {
          dataInicio: { type: "string", description: "YYYY-MM-DD" },
          dataFim: { type: "string", description: "YYYY-MM-DD" },
          top: { type: "number", description: "Quantidade no ranking (default 10)" },
        },
        required: ["dataInicio", "dataFim"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_vencimentos",
      description:
        "Títulos a vencer nos próximos N dias (contas a pagar, a receber ou ambas), agrupados por dia. Use para 'o que vence essa semana', 'contas a pagar dos próximos 7 dias', 'recebimentos previstos'.",
      parameters: {
        type: "object",
        properties: {
          dias: { type: "number", description: "Janela em dias a partir de hoje (default 7)" },
          tipo: { type: "string", description: "'pagar' | 'receber' | 'ambos' (default 'ambos')" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inadimplencia",
      description:
        "Contas a receber vencidas e ainda em aberto, com aging (0-30, 31-60, 61-90, 90+ dias) e top devedores. Use para 'inadimplência atual', 'maiores devedores', 'CRs em atraso'.",
      parameters: {
        type: "object",
        properties: {
          top: { type: "number", description: "Top N devedores (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_abastecimento_consumo",
      description:
        "Consumo de combustível e média km/L por veículo em um período (gasto total, litros, média). Use para 'consumo médio da frota', 'qual veículo gasta mais diesel', 'custo de combustível'.",
      parameters: {
        type: "object",
        properties: {
          dataInicio: { type: "string", description: "YYYY-MM-DD (opcional, default últimos 30 dias)" },
          dataFim: { type: "string", description: "YYYY-MM-DD (opcional, default hoje)" },
          top: { type: "number", description: "Top N veículos por gasto (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_frota_resumo",
      description:
        "Resumo da frota: total de veículos por situação (ativo/inativo/baixado), por classificação, por marca e por idade média. Use para 'quantos veículos temos', 'composição da frota', 'idade média da frota'.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_frota_veiculos",
      description:
        "LISTA os veículos da frota (não só o resumo), com placa/código, modelo, marca, ano, classificação e situação. Aceita filtro por situação para responder 'quais caminhões estão ATIVOS/INATIVOS/BAIXADOS', 'me lista a frota ativa', 'quais veículos da marca X'. Use sempre que pedirem a LISTA dos veículos, não apenas a contagem.",
      parameters: {
        type: "object",
        properties: {
          situacao: {
            type: "string",
            description: "Filtra por situação: 'ATIVO', 'INATIVO' ou 'BAIXADO'. Omita para trazer todos.",
          },
          marca: { type: "string", description: "Opcional. Filtra por marca (texto contido)." },
          classificacao: { type: "string", description: "Opcional. Filtra por classificação (texto contido)." },
          top: { type: "number", description: "Máximo de veículos a listar (default 60)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_operacao_snapshot",
      description:
        "Snapshot em tempo real das viagens em andamento (quantidade, % completo, veículos em manutenção, situações). Use para 'como está a operação agora', 'quantas viagens em andamento', 'frota em manutenção'.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_compras_resumo",
      description:
        "Resumo de compras em um período: valor total, top fornecedores, top grupos/subgrupos de produtos. Use para 'quanto compramos esse mês', 'principais fornecedores', 'gastos com peças/pneus'.",
      parameters: {
        type: "object",
        properties: {
          dataInicio: { type: "string", description: "YYYY-MM-DD (opcional, default últimos 30 dias)" },
          dataFim: { type: "string", description: "YYYY-MM-DD (opcional, default hoje)" },
          top: { type: "number", description: "Top N fornecedores/grupos (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_rh_motoristas",
      description:
        "Resumo de motoristas: ativos, demitidos, por filial, CNHs próximas do vencimento (próximos 60 dias). Use para 'quantos motoristas temos', 'CNHs vencendo', 'headcount'.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_bancos_saldos",
      description:
        "Saldos atuais e movimentação do período por conta bancária. Use para 'saldo dos bancos', 'quanto temos em caixa', 'movimentação bancária do mês'.",
      parameters: {
        type: "object",
        properties: {
          dataInicio: { type: "string", description: "YYYY-MM-DD (opcional, default 1º dia do mês corrente)" },
          dataFim: { type: "string", description: "YYYY-MM-DD (opcional, default hoje)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_financiamento_frota",
      description:
        "Parcelas de financiamento de veículos: total em aberto, próximas a vencer, por banco. Use para 'financiamentos de veículos', 'parcelas a pagar', 'dívida bancária da frota'.",
      parameters: {
        type: "object",
        properties: {
          dias: { type: "number", description: "Janela em dias para 'próximas a vencer' (default 30)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_diesel_posto_interno",
      description:
        "Saldo de diesel do posto interno e movimentações (entradas/saídas) no período. Use para 'estoque de diesel', 'quanto temos no posto interno', 'consumo do posto'.",
      parameters: {
        type: "object",
        properties: {
          dataInicio: { type: "string", description: "YYYY-MM-DD (opcional, default 1/jan do ano)" },
          dataFim: { type: "string", description: "YYYY-MM-DD (opcional, default hoje)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_comparativo_faturamento",
      description:
        "Compara o faturamento de dois períodos (atual vs anterior) — total, variação absoluta e %. Use para 'mês x mês passado', 'compare este mês com o anterior', 'crescimento de faturamento'.",
      parameters: {
        type: "object",
        properties: {
          inicioA: { type: "string", description: "Período A início YYYY-MM-DD" },
          fimA: { type: "string", description: "Período A fim YYYY-MM-DD" },
          inicioB: { type: "string", description: "Período B (comparação) início YYYY-MM-DD" },
          fimB: { type: "string", description: "Período B fim YYYY-MM-DD" },
        },
        required: ["inicioA", "fimA", "inicioB", "fimB"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_rh_motoristas_lista",
      description:
        "LISTA os motoristas/funcionários (nome, função, categoria e validade da CNH, admissão, demissão, filial, situação). Use para 'me lista os motoristas ativos', 'quais CNHs vencem', 'quem foi demitido', 'motoristas da filial X', 'quais motoristas da categoria E'. Diferente de get_rh_motoristas (que só conta).",
      parameters: {
        type: "object",
        properties: {
          apenasAtivos: { type: "boolean", description: "true = só quem não tem data de demissão. Default false (todos)." },
          cnhVenceEmDias: { type: "number", description: "Opcional. Só motoristas com CNH vencendo nos próximos N dias (ou já vencida)." },
          funcao: { type: "string", description: "Opcional. Filtra por função (texto contido)." },
          top: { type: "number", description: "Máximo a listar (default 80)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_compras_analise",
      description:
        "Análise DETALHADA de compras agrupável por dimensão, com filtro opcional por produto. Use para 'quanto comprei de pneu', 'compras por centro de custo', 'top fornecedores', 'compras por grupo/subgrupo de produto'. Complementa get_compras_resumo.",
      parameters: {
        type: "object",
        properties: {
          agruparPor: { type: "string", description: "'grupo', 'subgrupo', 'fornecedor', 'centro_custo' ou 'produto'. Default 'grupo'." },
          filtroProduto: { type: "string", description: "Opcional. Filtra itens cujo produto/grupo/subgrupo contenha este texto (ex.: 'pneu', 'oleo')." },
          dataInicio: { type: "string", description: "YYYY-MM-DD (opcional, default últimos 30 dias)" },
          dataFim: { type: "string", description: "YYYY-MM-DD (opcional, default hoje)" },
          top: { type: "number", description: "Quantos grupos retornar (default 15)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_abastecimento_analise",
      description:
        "Análise DETALHADA de abastecimento agrupável por dimensão. Use para 'gasto de combustível por veículo/motorista/posto', 'qual posto abastecemos mais', 'consumo por tipo de combustível', 'gasto por frota'. Complementa get_abastecimento_consumo.",
      parameters: {
        type: "object",
        properties: {
          agruparPor: { type: "string", description: "'veiculo', 'motorista', 'posto', 'tipo_combustivel' ou 'frota'. Default 'veiculo'." },
          dataInicio: { type: "string", description: "YYYY-MM-DD (opcional, default últimos 30 dias)" },
          dataFim: { type: "string", description: "YYYY-MM-DD (opcional, default hoje)" },
          top: { type: "number", description: "Quantos grupos retornar (default 15)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_titulos_lista",
      description:
        "LISTA títulos financeiros individuais (contas a pagar/receber), com parceiro, documento, vencimento, valor e situação. Use para 'quais títulos a pagar do fornecedor X', 'lista os títulos vencidos', 'o que tenho a receber do cliente Y'. Complementa get_titulos_financeiros (que só soma).",
      parameters: {
        type: "object",
        properties: {
          origem: { type: "string", description: "'CP' (contas a pagar) ou 'CR' (contas a receber). Omita para ambos." },
          status: { type: "string", description: "'vencido' (vencido e em aberto), 'aberto' (não pago) ou 'pago'. Omita para todos." },
          parceiro: { type: "string", description: "Opcional. Filtra por nome do fornecedor/cliente (texto contido)." },
          dataInicio: { type: "string", description: "YYYY-MM-DD (opcional, default últimos 30 dias)" },
          dataFim: { type: "string", description: "YYYY-MM-DD (opcional, default hoje)" },
          top: { type: "number", description: "Máximo a listar (default 60)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_bancos_extrato",
      description:
        "Extrato (movimentações) de UMA conta bancária num período: lançamentos com data, histórico, valor e tipo (entrada/saída). Requer o código da conta (cod_conta), que vem de get_bancos_saldos — se o usuário citar o banco pelo nome, chame get_bancos_saldos antes para obter o cod_conta. Use para 'extrato do banco X', 'movimentações da conta Y'.",
      parameters: {
        type: "object",
        properties: {
          codcta: { type: "string", description: "Código da conta (cod_conta retornado por get_bancos_saldos). Obrigatório." },
          codfil: { type: "number", description: "Código da filial (cod_filial de get_bancos_saldos), se houver." },
          dataInicio: { type: "string", description: "YYYY-MM-DD (opcional, default início do mês)" },
          dataFim: { type: "string", description: "YYYY-MM-DD (opcional, default hoje)" },
          top: { type: "number", description: "Máximo de lançamentos (default 80)." },
        },
        required: ["codcta"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_operacao_viagens",
      description:
        "LISTA as viagens em tempo real (cliente, motorista, veículo, origem, destino, % completo, previsão de chegada, situação). Use para 'quais viagens estão em andamento', 'cadê o veículo X', 'viagens do cliente Y', 'quais entregas estão atrasando'. Complementa get_operacao_snapshot (que só conta).",
      parameters: {
        type: "object",
        properties: {
          cliente: { type: "string", description: "Opcional. Filtra por cliente (texto contido)." },
          veiculo: { type: "string", description: "Opcional. Filtra por código do veículo." },
          situacao: { type: "string", description: "Opcional. Filtra pela descrição da situação da viagem (texto contido)." },
          top: { type: "number", description: "Máximo a listar (default 60)." },
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
    if (name === "get_manutencao_analise") {
      const dataFim = (args.dataFim as string) || today();
      const dataInicio = (args.dataInicio as string) || daysAgo(90);
      const topN = Number(args.top ?? 15);
      const filtro = String(args.filtroSubgrupo ?? "").trim().toLowerCase();
      const validKeys = [
        "subgrupo", "fornecedor", "funcionario", "setor",
        "tiposervico", "situacao", "veiculo", "filial", "produto",
      ];
      let agruparPor = String(args.agruparPor ?? "subgrupo").toLowerCase();
      if (!validKeys.includes(agruparPor)) agruparPor = "subgrupo";

      const data = await dwCall("/dw-manutencao", { dataInicio, dataFim });
      let rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;

      if (filtro) {
        rows = rows.filter((r) => {
          const sg = String(r.subgrupo ?? "").toLowerCase();
          const pr = String(r.produto ?? "").toLowerCase();
          return sg.includes(filtro) || pr.includes(filtro);
        });
      }

      const grupos = new Map<string, { chave: string; custo_total: number; qtd_itens: number; ordens: Set<string> }>();
      let totalGeral = 0;
      for (const r of rows) {
        const chave = String(r[agruparPor] ?? "NÃO INFORMADO") || "NÃO INFORMADO";
        // custo (PRECUS) é UNITÁRIO — multiplica pela quantidade, igual a tela
        // de Manutenção do Workspace (custo * qtd).
        const custo = Number(r.custo ?? 0) * Number(r.qtd ?? 1);
        totalGeral += custo;
        const cur = grupos.get(chave) ?? { chave, custo_total: 0, qtd_itens: 0, ordens: new Set<string>() };
        cur.custo_total += custo;
        cur.qtd_itens += 1;
        if (r.ordem != null) cur.ordens.add(String(r.ordem));
        grupos.set(chave, cur);
      }

      const lista = [...grupos.values()]
        .sort((a, b) => b.custo_total - a.custo_total)
        .slice(0, topN)
        .map((g) => ({
          [agruparPor]: g.chave,
          custo_total: g.custo_total.toFixed(2),
          qtd_itens: g.qtd_itens,
          qtd_ordens: g.ordens.size,
          participacao:
            totalGeral > 0 ? ((g.custo_total / totalGeral) * 100).toFixed(1) + "%" : "0%",
        }));

      return JSON.stringify({
        periodo: { dataInicio, dataFim },
        agrupado_por: agruparPor,
        filtro_aplicado: filtro || null,
        custo_total_geral: totalGeral.toFixed(2),
        qtd_grupos: grupos.size,
        resultado: lista,
      });
    }
    if (name === "get_top_clientes") {
      const topN = Number(args.top ?? 10);
      const data = await dwCall("/dw-financeiro", {
        action: "faturamento",
        dataInicio: args.dataInicio,
        dataFim: args.dataFim,
      });
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      const ranked = rows
        .map((r) => ({
          grupo: r.GRUPO_CLIENTE ?? r.NOME_CLIENTE ?? r.CLIENTE ?? "—",
          faturamento: Number(r.FRETE_TOTAL ?? 0),
          ctes: Number(r.QTD_CTES ?? r.QTDE ?? 0),
        }))
        .sort((a, b) => b.faturamento - a.faturamento)
        .slice(0, topN)
        .map((r) => ({ ...r, faturamento: r.faturamento.toFixed(2) }));
      const total = rows.reduce((s, r) => s + Number(r.FRETE_TOTAL ?? 0), 0);
      return JSON.stringify({
        periodo: { dataInicio: args.dataInicio, dataFim: args.dataFim },
        faturamento_total: total.toFixed(2),
        top: ranked,
      });
    }
    if (name === "get_vencimentos") {
      const dias = Number(args.dias ?? 7);
      const tipo = String(args.tipo ?? "ambos").toLowerCase();
      const dataInicio = today();
      const dataFim = (() => {
        const d = new Date();
        d.setDate(d.getDate() + dias);
        return d.toISOString().slice(0, 10);
      })();
      const data = await dwCall("/dw-financeiro", { action: "fetch", dataInicio, dataFim });
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      const hoje = today();
      const filtrados = rows.filter((r) => {
        const venc = String(r.DATA_VENCIMENTO ?? "").slice(0, 10);
        if (!venc || venc < hoje || venc > dataFim) return false;
        const pago = Number(r.VLR_PAGO ?? 0) >= Number(r.VLR_PARCELA ?? 0);
        if (pago) return false;
        if (tipo === "pagar" && r.ORIGEM !== "CP") return false;
        if (tipo === "receber" && r.ORIGEM !== "CR") return false;
        return true;
      });
      const porDia = new Map<string, { data: string; cp: number; cr: number; qtd: number }>();
      let totalCP = 0;
      let totalCR = 0;
      for (const r of filtrados) {
        const d = String(r.DATA_VENCIMENTO).slice(0, 10);
        const v = Number(r.VLR_PARCELA ?? 0) - Number(r.VLR_PAGO ?? 0);
        const cur = porDia.get(d) ?? { data: d, cp: 0, cr: 0, qtd: 0 };
        if (r.ORIGEM === "CP") { cur.cp += v; totalCP += v; }
        else if (r.ORIGEM === "CR") { cur.cr += v; totalCR += v; }
        cur.qtd++;
        porDia.set(d, cur);
      }
      const agenda = [...porDia.values()]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((d) => ({ data: d.data, qtd: d.qtd, contas_pagar: d.cp.toFixed(2), contas_receber: d.cr.toFixed(2) }));
      return JSON.stringify({
        janela: { dataInicio, dataFim, dias },
        tipo,
        total_pagar: totalCP.toFixed(2),
        total_receber: totalCR.toFixed(2),
        saldo_previsto: (totalCR - totalCP).toFixed(2),
        agenda,
      });
    }
    if (name === "get_inadimplencia") {
      const topN = Number(args.top ?? 10);
      const dataInicio = daysAgo(365);
      const dataFim = today();
      const data = await dwCall("/dw-financeiro", { action: "fetch", dataInicio, dataFim });
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      const hojeStr = today();
      const hoje = new Date(hojeStr);
      const aging = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
      const porCliente = new Map<string, { cliente: string; em_aberto: number; titulos: number }>();
      let totalVencido = 0;
      for (const r of rows) {
        if (r.ORIGEM !== "CR") continue;
        const venc = String(r.DATA_VENCIMENTO ?? "").slice(0, 10);
        if (!venc || venc >= hojeStr) continue;
        const aberto = Number(r.VLR_PARCELA ?? 0) - Number(r.VLR_PAGO ?? 0);
        if (aberto <= 0.01) continue;
        const diasAtraso = Math.floor((hoje.getTime() - new Date(venc).getTime()) / 86400000);
        if (diasAtraso <= 30) aging["0-30"] += aberto;
        else if (diasAtraso <= 60) aging["31-60"] += aberto;
        else if (diasAtraso <= 90) aging["61-90"] += aberto;
        else aging["90+"] += aberto;
        totalVencido += aberto;
        const nome = String(r.NOME_PARCEIRO ?? r.COD_PARCEIRO ?? "—");
        const cur = porCliente.get(nome) ?? { cliente: nome, em_aberto: 0, titulos: 0 };
        cur.em_aberto += aberto;
        cur.titulos++;
        porCliente.set(nome, cur);
      }
      const topDevedores = [...porCliente.values()]
        .sort((a, b) => b.em_aberto - a.em_aberto)
        .slice(0, topN)
        .map((c) => ({ cliente: c.cliente, em_aberto: c.em_aberto.toFixed(2), titulos: c.titulos }));
      return JSON.stringify({
        total_vencido: totalVencido.toFixed(2),
        aging: {
          "0-30_dias": aging["0-30"].toFixed(2),
          "31-60_dias": aging["31-60"].toFixed(2),
          "61-90_dias": aging["61-90"].toFixed(2),
          "90_mais_dias": aging["90+"].toFixed(2),
        },
        top_devedores: topDevedores,
      });
    }
    if (name === "get_abastecimento_consumo") {
      const dataFim = (args.dataFim as string) || today();
      const dataInicio = (args.dataInicio as string) || daysAgo(30);
      const topN = Number(args.top ?? 10);
      const data = await dwCall("/dw-abastecimento", { dataInicio, dataFim });
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      const porVeic = new Map<string, { veiculo: string; gasto: number; litros: number; abastecimentos: number; medias: number[] }>();
      let totalGasto = 0;
      let totalLitros = 0;
      for (const r of rows) {
        const v = String(r.veiculo ?? "—");
        const gasto = Number(r.vlrtot ?? 0);
        const litros = Number(r.quanti ?? 0);
        totalGasto += gasto;
        totalLitros += litros;
        const cur = porVeic.get(v) ?? { veiculo: v, gasto: 0, litros: 0, abastecimentos: 0, medias: [] };
        cur.gasto += gasto;
        cur.litros += litros;
        cur.abastecimentos++;
        if (Number(r.media ?? 0) > 0) cur.medias.push(Number(r.media));
        porVeic.set(v, cur);
      }
      const ranking = [...porVeic.values()]
        .sort((a, b) => b.gasto - a.gasto)
        .slice(0, topN)
        .map((v) => ({
          veiculo: v.veiculo,
          gasto_total: v.gasto.toFixed(2),
          litros: v.litros.toFixed(2),
          abastecimentos: v.abastecimentos,
          media_km_l: v.medias.length ? (v.medias.reduce((s, x) => s + x, 0) / v.medias.length).toFixed(2) : null,
        }));
      return JSON.stringify({
        periodo: { dataInicio, dataFim },
        gasto_total: totalGasto.toFixed(2),
        litros_total: totalLitros.toFixed(2),
        qtd_veiculos: porVeic.size,
        top_veiculos: ranking,
      });
    }
    if (name === "get_frota_resumo") {
      const data = await dwCall("/dw-frota", {});
      const rawRows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      // Dedup por veículo: os JOINs podem repetir o mesmo codvei em várias linhas.
      const vistosFr = new Set<string>();
      const rows = rawRows.filter((r) => {
        const id = String(r.codvei ?? "");
        if (!id || vistosFr.has(id)) return false;
        vistosFr.add(id);
        return true;
      });
      const porSit: Record<string, number> = {};
      const porClassif: Record<string, number> = {};
      const porMarca: Record<string, number> = {};
      const idades: number[] = [];
      const anoAtual = new Date().getFullYear();
      for (const r of rows) {
        const sit = String(r.situacao ?? "—");
        porSit[sit] = (porSit[sit] ?? 0) + 1;
        const cl = String(r.classificacao ?? "—");
        porClassif[cl] = (porClassif[cl] ?? 0) + 1;
        const m = String(r.marca ?? "—");
        porMarca[m] = (porMarca[m] ?? 0) + 1;
        const ano = Number(r.anomod ?? r.anofab ?? 0);
        if (ano > 1980 && ano <= anoAtual + 1) idades.push(anoAtual - ano);
      }
      const idadeMedia = idades.length ? (idades.reduce((s, x) => s + x, 0) / idades.length).toFixed(1) : null;
      return JSON.stringify({
        total_veiculos: rows.length,
        por_situacao: porSit,
        por_classificacao: porClassif,
        por_marca: porMarca,
        idade_media_anos: idadeMedia,
      });
    }
    if (name === "get_frota_veiculos") {
      const situacao = args.situacao ? String(args.situacao).toUpperCase() : null;
      const topN = Number(args.top ?? 60);
      const fMarca = String(args.marca ?? "").trim().toLowerCase();
      const fClassif = String(args.classificacao ?? "").trim().toLowerCase();

      // O endpoint filtra por situação no servidor quando informado.
      const data = await dwCall("/dw-frota", situacao ? { situacao } : {});
      let rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;

      if (fMarca) rows = rows.filter((r) => String(r.marca ?? "").toLowerCase().includes(fMarca));
      if (fClassif) rows = rows.filter((r) => String(r.classificacao ?? "").toLowerCase().includes(fClassif));

      // Os JOINs do /dw-frota podem repetir o mesmo veículo em mais de uma linha.
      // Contamos por código de veículo ÚNICO (codvei) para não inflar o total.
      const vistos = new Set<string>();
      rows = rows.filter((r) => {
        const id = String(r.codvei ?? "");
        if (!id || vistos.has(id)) return false;
        vistos.add(id);
        return true;
      });

      const totalFiltrado = rows.length;
      const lista = rows.slice(0, topN).map((r) => ({
        veiculo: r.codvei,
        modelo: r.modelo,
        marca: r.marca,
        ano: r.anomod ?? r.anofab,
        classificacao: r.classificacao,
        situacao: r.situacao,
        municipio: r.municipio,
      }));

      return JSON.stringify({
        filtro: { situacao: situacao ?? "todas", marca: fMarca || null, classificacao: fClassif || null },
        total_encontrado: totalFiltrado,
        exibindo: lista.length,
        veiculos: lista,
      });
    }
    if (name === "get_rh_motoristas_lista") {
      const topN = Number(args.top ?? 80);
      const apenasAtivos = args.apenasAtivos === true;
      const venceDias = args.cnhVenceEmDias != null ? Number(args.cnhVenceEmDias) : null;
      const fFuncao = String(args.funcao ?? "").trim().toLowerCase();

      const data = await dwCall("/dw-rh", {});
      let rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;

      const hoje = new Date();
      const diasPara = (d: unknown): number | null => {
        if (!d) return null;
        const dt = new Date(d as string);
        if (isNaN(dt.getTime())) return null;
        return Math.round((dt.getTime() - hoje.getTime()) / 86400000);
      };

      if (apenasAtivos) rows = rows.filter((r) => !r.data_demissao);
      if (fFuncao) rows = rows.filter((r) => String(r.funcao ?? "").toLowerCase().includes(fFuncao));
      if (venceDias != null) {
        rows = rows.filter((r) => {
          const dd = diasPara(r.validade_habilitacao);
          return dd != null && dd <= venceDias;
        });
      }

      const total = rows.length;
      const lista = rows.slice(0, topN).map((r) => ({
        motorista: r.motorista,
        funcao: r.funcao,
        cnh_categoria: r.categoria_habilitacao,
        cnh_validade: r.validade_habilitacao,
        dias_para_vencer_cnh: diasPara(r.validade_habilitacao),
        admissao: r.data_admissao,
        demissao: r.data_demissao ?? null,
        filial: r.codigo_filial,
        situacao: r.situacao,
      }));

      return JSON.stringify({
        filtro: { apenasAtivos, cnhVenceEmDias: venceDias, funcao: fFuncao || null },
        total_encontrado: total,
        exibindo: lista.length,
        motoristas: lista,
      });
    }
    if (name === "get_compras_analise") {
      const dataFim = (args.dataFim as string) || today();
      const dataInicio = (args.dataInicio as string) || daysAgo(30);
      const topN = Number(args.top ?? 15);
      const filtro = String(args.filtroProduto ?? "").trim().toLowerCase();
      const mapKey: Record<string, string> = {
        grupo: "grupo", subgrupo: "sub_grupo", sub_grupo: "sub_grupo",
        fornecedor: "fornecedor", centro_custo: "centro_custo", produto: "produto",
      };
      const agruparPor = mapKey[String(args.agruparPor ?? "grupo").toLowerCase()] ?? "grupo";

      const data = await dwCall("/dw-compras", { dataInicio, dataFim });
      let rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      if (filtro) {
        rows = rows.filter((r) =>
          String(r.produto ?? "").toLowerCase().includes(filtro) ||
          String(r.grupo ?? "").toLowerCase().includes(filtro) ||
          String(r.sub_grupo ?? "").toLowerCase().includes(filtro));
      }

      const grupos = new Map<string, { chave: string; valor: number; qtd_itens: number }>();
      let totalGeral = 0;
      for (const r of rows) {
        const chave = String(r[agruparPor] ?? "NÃO INFORMADO") || "NÃO INFORMADO";
        const valor = Number(r.quantidade ?? 0) * Number(r.valor_un ?? 0);
        totalGeral += valor;
        const cur = grupos.get(chave) ?? { chave, valor: 0, qtd_itens: 0 };
        cur.valor += valor;
        cur.qtd_itens += 1;
        grupos.set(chave, cur);
      }
      const lista = [...grupos.values()]
        .sort((a, b) => b.valor - a.valor)
        .slice(0, topN)
        .map((g) => ({
          [agruparPor]: g.chave,
          valor_total: g.valor.toFixed(2),
          qtd_itens: g.qtd_itens,
          participacao: totalGeral > 0 ? ((g.valor / totalGeral) * 100).toFixed(1) + "%" : "0%",
        }));

      return JSON.stringify({
        periodo: { dataInicio, dataFim },
        agrupado_por: agruparPor,
        filtro_produto: filtro || null,
        valor_total_geral: totalGeral.toFixed(2),
        qtd_grupos: grupos.size,
        resultado: lista,
      });
    }
    if (name === "get_abastecimento_analise") {
      const dataFim = (args.dataFim as string) || today();
      const dataInicio = (args.dataInicio as string) || daysAgo(30);
      const topN = Number(args.top ?? 15);
      const validKeys = ["veiculo", "motorista", "posto", "tipo_combustivel", "frota"];
      let agruparPor = String(args.agruparPor ?? "veiculo").toLowerCase();
      if (!validKeys.includes(agruparPor)) agruparPor = "veiculo";

      const data = await dwCall("/dw-abastecimento", { dataInicio, dataFim });
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;

      const grupos = new Map<string, { chave: string; gasto: number; litros: number; qtd: number }>();
      let gastoGeral = 0, litrosGeral = 0;
      for (const r of rows) {
        const chave = String(r[agruparPor] ?? "NÃO INFORMADO") || "NÃO INFORMADO";
        const gasto = Number(r.vlrtot ?? 0);
        const litros = Number(r.quanti ?? 0);
        gastoGeral += gasto; litrosGeral += litros;
        const cur = grupos.get(chave) ?? { chave, gasto: 0, litros: 0, qtd: 0 };
        cur.gasto += gasto; cur.litros += litros; cur.qtd += 1;
        grupos.set(chave, cur);
      }
      const lista = [...grupos.values()]
        .sort((a, b) => b.gasto - a.gasto)
        .slice(0, topN)
        .map((g) => ({
          [agruparPor]: g.chave,
          gasto_total: g.gasto.toFixed(2),
          litros: g.litros.toFixed(0),
          qtd_abastecimentos: g.qtd,
          preco_medio_litro: g.litros > 0 ? (g.gasto / g.litros).toFixed(2) : null,
        }));

      return JSON.stringify({
        periodo: { dataInicio, dataFim },
        agrupado_por: agruparPor,
        gasto_total_geral: gastoGeral.toFixed(2),
        litros_total_geral: litrosGeral.toFixed(0),
        resultado: lista,
      });
    }
    if (name === "get_titulos_lista") {
      const status = args.status ? String(args.status).toLowerCase() : null;
      const dataFim = (args.dataFim as string) || today();
      // "vencido"/"aberto" sem período → olha 1 ano atrás (captura atrasados antigos).
      // Listagem geral → últimos 30 dias.
      const lookback = status === "vencido" || status === "aberto" ? 365 : 30;
      const dataInicio = (args.dataInicio as string) || daysAgo(lookback);
      const topN = Number(args.top ?? 60);
      const origem = args.origem ? String(args.origem).toUpperCase() : null;
      const fParceiro = String(args.parceiro ?? "").trim().toLowerCase();

      const data = await dwCall("/dw-financeiro", { action: "fetch", dataInicio, dataFim });
      let rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;

      const hojeStr = today();
      if (origem) rows = rows.filter((r) => String(r.ORIGEM ?? "") === origem);
      if (fParceiro) rows = rows.filter((r) => String(r.NOME_PARCEIRO ?? "").toLowerCase().includes(fParceiro));
      if (status) {
        rows = rows.filter((r) => {
          // Mesma regra da tela (calculateStatus): pagamento parcial = "Parcial",
          // NÃO conta como vencido. Vencido = nada pago E (situação venc OU venc < hoje).
          const parcela = Number(r.VLR_PARCELA ?? 0);
          const pago = Number(r.VLR_PAGO ?? 0);
          const saldo = parcela - pago;
          const venc = String(r.DATA_VENCIMENTO ?? "").slice(0, 10);
          const sit = String(r.SITUACAO ?? "").toLowerCase();
          const nadaPago = pago <= 0.01 && saldo > 0.01;
          const ehVencido = nadaPago && ((sit.includes("venc")) || (!!venc && venc < hojeStr));
          if (status === "pago") return !nadaPago;            // pago ou parcial
          if (status === "aberto") return nadaPago && !ehVencido; // em aberto, a vencer
          if (status === "vencido") return ehVencido;
          return true;
        });
      }

      const total = rows.length;
      const somaParcela = rows.reduce((s, r) => s + Number(r.VLR_PARCELA ?? 0), 0);
      const lista = rows.slice(0, topN).map((r) => ({
        parceiro: r.NOME_PARCEIRO,
        documento: r.DOCUMENTO,
        parcela: r.PARCELA,
        origem: r.ORIGEM,
        vencimento: String(r.DATA_VENCIMENTO ?? "").slice(0, 10),
        pagamento: r.DATA_PAGAMENTO ? String(r.DATA_PAGAMENTO).slice(0, 10) : null,
        valor: Number(r.VLR_PARCELA ?? 0).toFixed(2),
        valor_pago: Number(r.VLR_PAGO ?? 0).toFixed(2),
        centro_custo: r.CENTRO_CUSTO,
      }));

      return JSON.stringify({
        periodo: { dataInicio, dataFim },
        filtro: { origem: origem ?? "ambos", status: status ?? "todos", parceiro: fParceiro || null },
        total_encontrado: total,
        valor_total: somaParcela.toFixed(2),
        exibindo: lista.length,
        titulos: lista,
      });
    }
    if (name === "get_bancos_extrato") {
      const codcta = String(args.codcta ?? "").trim();
      if (!codcta) return JSON.stringify({ erro: "codcta é obrigatório. Use get_bancos_saldos para obter o cod_conta." });
      const dataFim = (args.dataFim as string) || today();
      const dataInicio = (args.dataInicio as string) ||
        `${dataFim.slice(0, 7)}-01`; // início do mês de dataFim
      const topN = Number(args.top ?? 80);

      const body: Record<string, unknown> = { codcta, dataInicio, dataFim };
      if (args.codfil != null) body.codfil = Number(args.codfil);
      const data = await dwCall("/dw-bancos-extrato", body);
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;

      let entradas = 0, saidas = 0;
      for (const r of rows) {
        const v = Number(r.VLRDOC ?? 0);
        if (r.DEBCRE === "C") entradas += v; else saidas += v;
      }
      const lista = rows.slice(0, topN).map((r) => ({
        data: String(r.DATA_LANCAMENTO ?? "").slice(0, 10),
        documento: r.DOCUMENTO,
        historico: r.HISTORICO,
        valor: Number(r.VLRDOC ?? 0).toFixed(2),
        tipo: r.DEBCRE === "C" ? "ENTRADA" : "SAIDA",
        centro_custo: r.CENTRO_CUSTO,
        situacao: r.SITUACAO,
      }));

      return JSON.stringify({
        conta: codcta,
        periodo: { dataInicio, dataFim },
        total_lancamentos: rows.length,
        total_entradas: entradas.toFixed(2),
        total_saidas: saidas.toFixed(2),
        exibindo: lista.length,
        lancamentos: lista,
      });
    }
    if (name === "get_operacao_viagens") {
      const topN = Number(args.top ?? 60);
      const fCliente = String(args.cliente ?? "").trim().toLowerCase();
      const fVeiculo = String(args.veiculo ?? "").trim().toLowerCase();
      const fSituacao = String(args.situacao ?? "").trim().toLowerCase();

      const data = await dwCall("/dw-operacional", {});
      let rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      if (fCliente) rows = rows.filter((r) => String(r.CLI_NOMEAB ?? "").toLowerCase().includes(fCliente));
      if (fVeiculo) rows = rows.filter((r) => String(r.veiculo ?? "").toLowerCase().includes(fVeiculo));
      if (fSituacao) rows = rows.filter((r) => String(r.descricao_situacao ?? "").toLowerCase().includes(fSituacao));

      const total = rows.length;
      const lista = rows.slice(0, topN).map((r) => ({
        cliente: r.CLI_NOMEAB,
        motorista: r.motorista,
        veiculo: r.veiculo,
        origem: r.descricao_origem,
        destino: r.descricao_destino,
        percentual_completo: r.percentual_completo,
        previsao_chegada: r.previsao_chegada,
        situacao: r.descricao_situacao ?? r.situacao_viagem,
        em_manutencao: r.em_manutencao === 1 || r.em_manutencao === "1" || r.em_manutencao === true,
      }));

      return JSON.stringify({
        filtro: { cliente: fCliente || null, veiculo: fVeiculo || null, situacao: fSituacao || null },
        total_encontrado: total,
        exibindo: lista.length,
        viagens: lista,
      });
    }
    if (name === "get_operacao_snapshot") {
      const data = await dwCall("/dw-operacional", {});
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      const porSit: Record<string, number> = {};
      let emManutencao = 0;
      let somaPerc = 0;
      let countPerc = 0;
      for (const r of rows) {
        const s = String(r.descricao_situacao ?? r.situacao_viagem ?? "—");
        porSit[s] = (porSit[s] ?? 0) + 1;
        if (r.em_manutencao === 1 || r.em_manutencao === "1" || r.em_manutencao === true) emManutencao++;
        const p = Number(r.percentual_completo ?? 0);
        if (p > 0) { somaPerc += p; countPerc++; }
      }
      return JSON.stringify({
        total_viagens: rows.length,
        em_manutencao: emManutencao,
        percentual_medio_completo: countPerc ? (somaPerc / countPerc).toFixed(1) : null,
        por_situacao: porSit,
      });
    }
    if (name === "get_compras_resumo") {
      const dataFim = (args.dataFim as string) || today();
      const dataInicio = (args.dataInicio as string) || daysAgo(30);
      const topN = Number(args.top ?? 10);
      const data = await dwCall("/dw-compras", { dataInicio, dataFim });
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      const porForn = new Map<string, number>();
      const porGrupo = new Map<string, number>();
      const porSubGrupo = new Map<string, number>();
      let total = 0;
      for (const r of rows) {
        const valor = Number(r.quantidade ?? 0) * Number(r.valor_un ?? 0);
        total += valor;
        const f = String(r.fornecedor ?? "—");
        porForn.set(f, (porForn.get(f) ?? 0) + valor);
        const g = String(r.grupo ?? "—");
        porGrupo.set(g, (porGrupo.get(g) ?? 0) + valor);
        const sg = String(r.sub_grupo ?? "—");
        porSubGrupo.set(sg, (porSubGrupo.get(sg) ?? 0) + valor);
      }
      const rank = (m: Map<string, number>) =>
        [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([k, v]) => ({ nome: k, valor: v.toFixed(2) }));
      return JSON.stringify({
        periodo: { dataInicio, dataFim },
        valor_total: total.toFixed(2),
        qtd_itens: rows.length,
        top_fornecedores: rank(porForn),
        top_grupos: rank(porGrupo),
        top_subgrupos: rank(porSubGrupo),
      });
    }
    if (name === "get_rh_motoristas") {
      const data = await dwCall("/dw-rh", {});
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      const hoje = new Date();
      const limiteCnh = new Date(); limiteCnh.setDate(limiteCnh.getDate() + 60);
      let ativos = 0;
      let demitidos = 0;
      const porFilial: Record<string, number> = {};
      const cnhVencendo: Array<{ motorista: string; vencimento: string }> = [];
      for (const r of rows) {
        const demissao = r.data_demissao ? new Date(String(r.data_demissao)) : null;
        if (demissao && demissao <= hoje) demitidos++;
        else {
          ativos++;
          const f = String(r.codigo_filial ?? "—");
          porFilial[f] = (porFilial[f] ?? 0) + 1;
        }
        const venc = r.validade_habilitacao ? new Date(String(r.validade_habilitacao)) : null;
        if (venc && venc >= hoje && venc <= limiteCnh) {
          cnhVencendo.push({ motorista: String(r.motorista ?? "—"), vencimento: venc.toISOString().slice(0, 10) });
        }
      }
      return JSON.stringify({
        total_cadastrados: rows.length,
        ativos,
        demitidos,
        por_filial: porFilial,
        cnh_vencendo_60d: cnhVencendo.slice(0, 30),
        qtd_cnh_vencendo_60d: cnhVencendo.length,
      });
    }
    if (name === "get_bancos_saldos") {
      const data = await dwCall("/dw-bancos", { dataInicio: args.dataInicio, dataFim: args.dataFim });
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      let saldoTotal = 0;
      let entradas = 0;
      let saidas = 0;
      const contas = rows.map((c) => {
        const sa = Number(c.saldo_atual ?? 0);
        const en = Number(c.entradas_mes ?? 0);
        const sd = Number(c.saidas_mes ?? 0);
        saldoTotal += sa;
        entradas += en;
        saidas += sd;
        return {
          banco: c.nome_banco,
          conta: c.nome_conta,
          filial: c.nome_filial,
          cod_conta: c.cod_conta, // usado por get_bancos_extrato
          cod_filial: c.filial,
          saldo_atual: sa.toFixed(2),
          entradas: en.toFixed(2),
          saidas: sd.toFixed(2),
        };
      });
      return JSON.stringify({
        saldo_total: saldoTotal.toFixed(2),
        entradas_periodo: entradas.toFixed(2),
        saidas_periodo: saidas.toFixed(2),
        qtd_contas: rows.length,
        contas: contas.slice(0, 20),
      });
    }
    if (name === "get_financiamento_frota") {
      const dias = Number(args.dias ?? 30);
      const data = await dwCall("/dw-financiamento-frota", {});
      const rows = ((data as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
      const hojeStr = today();
      const limite = (() => { const d = new Date(); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); })();
      let totalAberto = 0;
      let proximoVencer = 0;
      const porBanco = new Map<string, number>();
      let qtdProximas = 0;
      for (const r of rows) {
        const sit = String(r.situacao ?? "");
        const venc = String(r.data_vencimento ?? "").slice(0, 10);
        const aberto = Number(r.valor_parcela ?? 0) - Number(r.valor_pago ?? 0);
        if (sit === "A" && aberto > 0.01) {
          totalAberto += aberto;
          const b = String(r.banco ?? "—");
          porBanco.set(b, (porBanco.get(b) ?? 0) + aberto);
          if (venc >= hojeStr && venc <= limite) {
            proximoVencer += aberto;
            qtdProximas++;
          }
        }
      }
      const topBancos = [...porBanco.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([banco, v]) => ({ banco, em_aberto: v.toFixed(2) }));
      return JSON.stringify({
        total_em_aberto: totalAberto.toFixed(2),
        proximas_a_vencer_dias: dias,
        valor_proximas_a_vencer: proximoVencer.toFixed(2),
        qtd_proximas_a_vencer: qtdProximas,
        por_banco: topBancos,
      });
    }
    if (name === "get_diesel_posto_interno") {
      const data = await dwCall("/dw-posto-interno", {
        dataInicio: args.dataInicio,
        dataFim: args.dataFim,
      }) as { data?: Array<Record<string, unknown>>; saldo_atual_litros?: number };
      const rows = data.data ?? [];
      let entradasL = 0;
      let saidasL = 0;
      let entradasV = 0;
      let saidasV = 0;
      for (const r of rows) {
        const q = Number(r.qtdade ?? 0);
        const v = Number(r.valor ?? 0);
        if (r.tipo === "ENTRADA") { entradasL += q; entradasV += v; }
        else if (r.tipo === "SAIDA") { saidasL += q; saidasV += v; }
      }
      return JSON.stringify({
        saldo_atual_litros: data.saldo_atual_litros,
        entradas_litros: entradasL.toFixed(2),
        saidas_litros: saidasL.toFixed(2),
        entradas_valor: entradasV.toFixed(2),
        saidas_valor: saidasV.toFixed(2),
        qtd_movimentos: rows.length,
      });
    }
    if (name === "get_comparativo_faturamento") {
      const sumOf = async (di: string, df: string) => {
        const d = await dwCall("/dw-financeiro", { action: "faturamento", dataInicio: di, dataFim: df });
        const rs = ((d as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>;
        return rs.reduce((s, r) => s + Number(r.FRETE_TOTAL ?? 0), 0);
      };
      const [a, b] = await Promise.all([
        sumOf(args.inicioA as string, args.fimA as string),
        sumOf(args.inicioB as string, args.fimB as string),
      ]);
      const variacao = a - b;
      const variacaoPct = b !== 0 ? (variacao / b) * 100 : null;
      return JSON.stringify({
        periodo_A: { inicio: args.inicioA, fim: args.fimA, faturamento: a.toFixed(2) },
        periodo_B: { inicio: args.inicioB, fim: args.fimB, faturamento: b.toFixed(2) },
        variacao_absoluta: variacao.toFixed(2),
        variacao_percentual: variacaoPct !== null ? variacaoPct.toFixed(2) + "%" : null,
      });
    }
    return JSON.stringify({ error: "Tool desconhecida: " + name });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

const SYSTEM_PROMPT = `Você é a Sofia, a assistente de inteligência artificial da SGT — uma transportadora rodoviária de cargas. Você conversa com a diretoria e os gestores como uma analista sênior de confiança da casa: cordial, natural e direta, mas sempre profissional. Quando se apresentar, diga que é a Sofia.

ESTILO DE CONVERSA:
- Converse de forma fluida e humana, como num bate-papo — não responda de forma robótica. Cumprimente quando cumprimentarem, agradeça, puxe o fio da conversa.
- Entenda perguntas de acompanhamento usando o contexto anterior (ex: se acabou de falar do faturamento de junho e perguntarem "e o mês passado?", entenda que é maio).
- Quando a pergunta for ambígua, faça uma pergunta curta de esclarecimento em vez de chutar.
- Seja conciso. Vá direto ao ponto que interessa pro gestor, sem encher linguiça.

ESCOPO — VOCÊ SÓ FALA DA SGT (regra absoluta):
- Seu universo é EXCLUSIVAMENTE a SGT: operação, faturamento, finanças/contas, frota, manutenção, abastecimento, compras, RH, indicadores e os dados do banco da empresa.
- Se perguntarem qualquer coisa FORA disso (assuntos gerais, notícias, programação, receitas, conselhos pessoais, outras empresas, perguntas de cultura geral, etc.), recuse com simpatia e redirecione. Ex: "Sou a Sofia, assistente da SGT, então fico só nos assuntos da empresa. Posso te ajudar com faturamento, frota, manutenção, contas... o que você precisa por aqui?".
- Nunca saia do personagem nem responda temas fora da SGT, mesmo que insistam.

NUNCA INVENTE DADOS (crítico):
- Só afirme números, valores ou fatos que vieram de uma tool. Se você não tem uma tool que responde àquilo, ou os dados não vieram, diga claramente que não tem esse dado disponível — NUNCA estime, presuma ou invente um número. Um "não tenho esse dado" é sempre melhor que um número errado.
- Se uma tool falhar ou voltar vazia, avise que não conseguiu consultar agora, em vez de inventar.

READ-ONLY (regra absoluta):
- Você SOMENTE consulta e analisa. NUNCA execute, sugira ou simule alteração, inserção, exclusão, atualização, envio, aprovação, baixa de título, lançamento ou qualquer ação operacional.
- Se pedirem uma alteração (ex: "dá baixa nessa conta", "aprova esse pagamento"), explique educadamente que você só consulta e analisa, e ofereça mostrar os dados relevantes.

Você TEM acesso direto ao banco de dados operacional da SGT via tools. SEMPRE que perguntarem sobre faturamento, contas, títulos, vencimentos, clientes, frota, manutenção — USE as tools para buscar dados reais. NUNCA peça ao usuário para fornecer o valor; busque você mesmo.

Datas de referência:
- Hoje: ${today()}
- Ontem: ${daysAgo(1)}
- Últimos 7 dias: ${daysAgo(7)} até ${today()}
- Últimos 30 dias: ${daysAgo(30)} até ${today()}

REGRAS CRÍTICAS DE TOOLS:
- Para faturamento de UMA DATA ESPECÍFICA (ontem, hoje, dia X, semana passada, mês passado) → SEMPRE use get_faturamento_periodo com dataInicio=dataFim=a data pedida. NUNCA use get_faturamento_resumo para isso.
- get_faturamento_resumo só serve para uma visão geral do mês corrente; o campo daily_revenue pode ser do dia em andamento (parcial) — nunca apresente como "faturamento de ontem".
- Quando o usuário disser "ontem", use exatamente ${daysAgo(1)} como data.

GUIA DE TOOLS POR ASSUNTO:
- Faturamento/Receita → get_faturamento_periodo (data específica), get_faturamento_resumo (mês corrente), get_top_clientes (ranking), get_comparativo_faturamento (período x período).
- Contas/Títulos/Financeiro → get_titulos_financeiros (totais do período), get_vencimentos (próximos dias), get_inadimplencia (CR vencido com aging). Para LISTAR títulos individuais (por fornecedor/cliente, vencidos, em aberto) → get_titulos_lista.
- Extrato bancário (movimentações de uma conta) → get_bancos_extrato (precisa do cod_conta de get_bancos_saldos).
- Manutenção (visão macro) → get_manutencao_por_veiculo (ranking por veículo, preventiva vs corretiva, interno/externo).
- Manutenção (detalhe) → get_manutencao_analise para: gasto por subgrupo/peça (pneu, óleo, filtro), por fornecedor, por mecânico (funcionário), por setor, por situação da OS (em aberto/concluída) ou filtrando um tipo de item específico. Use o parâmetro filtroSubgrupo para itens como "pneu" ou "oleo", e agruparPor para a dimensão pedida.
- Abastecimento/Combustível → get_abastecimento_consumo (gasto, litros, km/L), get_diesel_posto_interno (estoque do tanque).
- Frota → get_frota_resumo (composição/contagem: quantos, por situação/marca/idade). Para LISTAR os veículos (quais são, placa/modelo, filtrar por ATIVO/INATIVO/BAIXADO ou marca) → get_frota_veiculos.
- Operação em tempo real → get_operacao_snapshot (contagem/% completo). Para LISTAR viagens (cliente, motorista, veículo, origem/destino, previsão) ou achar um veículo/cliente → get_operacao_viagens.
- Compras → get_compras_resumo (visão geral). Para detalhe por grupo/subgrupo/fornecedor/centro de custo/produto ou filtrar um item → get_compras_analise.
- RH/Motoristas → get_rh_motoristas (contagem/headcount, CNH vencendo). Para LISTAR motoristas (nomes, função, CNH, admissão/demissão, filial) ou filtrar ativos/CNH vencendo → get_rh_motoristas_lista.
- Abastecimento → get_abastecimento_consumo (km/L por veículo). Para gasto por veículo/motorista/posto/combustível/frota → get_abastecimento_analise.
- Bancos → get_bancos_saldos (saldos e movimentação).
- Financiamentos de veículos → get_financiamento_frota.

DICIONÁRIO DE DADOS (termos do DW/Rodopar):
- Situação de veículo: ATIVO (em operação), INATIVO (parado), BAIXADO (vendido/descartado).
- TIPOS DE VEÍCULO ≠ "veículo" genérico: a frota tem classificações diferentes (cavalo mecânico, carreta/reboque, truck, utilitário, etc.). "Caminhão" NÃO é sinônimo de "veículo" — é um SUBCONJUNTO. Quando o usuário pedir um tipo específico ("caminhões", "carretas", "cavalos"), use get_frota_veiculos com o parâmetro classificacao filtrando aquele tipo — NUNCA devolva a frota inteira como se fossem todos caminhões. Se você não tiver certeza de qual classificação corresponde ao termo, chame get_frota_resumo (que traz por_classificacao) para ver as classificações reais e/ou pergunte ao usuário qual delas ele considera "caminhão".
- Manutenção: "preventiva" = planejada/programada; "corretiva" = conserto de falha; serviço INTERNO = oficina própria, EXTERNO = terceirizada. "subgrupo" agrupa o tipo de item (pneu, óleo, filtro...).
- Títulos: ORIGEM "CP" = Contas a Pagar (saída), "CR" = Contas a Receber (entrada). Vencido = data de vencimento passada e ainda em aberto.
- Faturamento = receita de frete (FRETE_TOTAL), agrupado por grupo de cliente.
- CNH: cnh_validade é a data de vencimento da habilitação; dias_para_vencer_cnh negativo = já vencida.
- Abastecimento: "media" = km/L do veículo; "posto" pode ser externo ou o posto interno da empresa.
- Sempre que um termo do usuário for ambíguo (ex: "parado"), confirme se é situação de frota, viagem ou veículo em manutenção.

Quando responder com valores em R$, formate como "R$ 123.456,78". Datas em dd/mm/yyyy. Seja objetivo, profissional, em português brasileiro. Use markdown leve (negrito, listas, tabelas pequenas) para clareza. Para sugestões/perguntas conceituais que não exigem dados, responda direto sem chamar tools.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages } = (await req.json()) as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return respond({ error: "messages é obrigatório" }, 400);
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return respond({ error: "OPENAI_API_KEY não configurada" }, 500);

    // Conversa para a OpenAI (system + histórico)
    const convo: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    // Loop de tool-calling (máx 5 iterações)
    for (let i = 0; i < 5; i++) {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
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
        return respond({ error: `OpenAI error: ${err}` }, 500);
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
