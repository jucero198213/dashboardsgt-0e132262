import { useState, useCallback, useRef } from "react";

export type InsightTipo = "alerta" | "oportunidade" | "atencao" | "positivo";

export interface AIInsight {
  id: number;
  tipo: InsightTipo;
  titulo: string;
  descricao: string;
  impacto: string;
  acao: string;
}

interface UseAIInsightsReturn {
  insights: AIInsight[];
  loading: boolean;
  error: string | null;
  gerarInsights: (setor: string, dados: Record<string, unknown>, periodo?: string) => Promise<void>;
  limpar: () => void;
}

// Cache simples para evitar recalcular com os mesmos dados
const insightsCache = new Map<string, { insights: AIInsight[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const n = (v: unknown): number => (typeof v === "number" ? v : 0);
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

// ─── Geradores por setor ──────────────────────────────────────────────────────

function gerarFaturamento(d: Record<string, unknown>): AIInsight[] {
  const total = n(d.totalFaturado);
  const media = n(d.mediaDiaUtil);
  const provisao = n(d.provisao);
  const diasUteis = n(d.diasUteis);
  const qtdClientes = n(d.qtdClientes);
  const top5 = (d.top5Clientes as { nome: string; valor: number; percentual: number }[]) ?? [];

  const insights: AIInsight[] = [];

  // 1. Concentração de cliente
  if (top5.length > 0) {
    const top1Pct = top5[0].percentual;
    if (top1Pct >= 50) {
      insights.push({
        id: 1,
        tipo: "alerta",
        titulo: "Alta concentração em 1 cliente",
        descricao: `${top5[0].nome} representa ${fmtPct(top1Pct)} do faturamento total (${fmtBRL(top5[0].valor)}). Risco alto de dependência.`,
        impacto: "Exposição a churn de um único cliente pode comprometer a receita",
        acao: "Desenvolver estratégia de diversificação de carteira de clientes",
      });
    } else if (top1Pct >= 35) {
      insights.push({
        id: 1,
        tipo: "atencao",
        titulo: "Concentração relevante no top cliente",
        descricao: `${top5[0].nome} representa ${fmtPct(top1Pct)} do faturamento. Atenção ao nível de dependência.`,
        impacto: "Risco moderado de receita concentrada",
        acao: "Monitorar evolução e buscar novos contratos para diluir concentração",
      });
    }
  }

  // 2. Projeção vs realizado
  if (provisao > 0 && total > 0 && diasUteis > 0) {
    const percRealizado = (total / provisao) * 100;
    if (percRealizado < 30 && diasUteis <= 5) {
      insights.push({
        id: 2,
        tipo: "atencao",
        titulo: "Ritmo abaixo do projetado",
        descricao: `Com ${diasUteis} dias úteis registrados, o realizado (${fmtBRL(total)}) representa ${fmtPct(percRealizado)} da projeção mensal (${fmtBRL(provisao)}).`,
        impacto: "Risco de não atingir a meta mensal se o ritmo se mantiver",
        acao: "Verificar se há notas fiscais pendentes de lançamento ou atraso operacional",
      });
    } else if (percRealizado >= 90 && diasUteis <= 15) {
      insights.push({
        id: 2,
        tipo: "positivo",
        titulo: "Faturamento acima do ritmo esperado",
        descricao: `${fmtPct(percRealizado)} da projeção mensal já realizado com ${diasUteis} dias úteis. Ritmo excelente.`,
        impacto: "Tendência de superar a meta mensal",
        acao: "Garantir capacidade operacional para sustentar o ritmo até o final do mês",
      });
    }
  }

  // 3. Produtividade por dia útil
  if (media > 0) {
    const mediaAnual = media * 22; // referência de 22 dias úteis/mês
    insights.push({
      id: 3,
      tipo: media >= 200000 ? "positivo" : "oportunidade",
      titulo: `Média de ${fmtBRL(media)}/dia útil`,
      descricao: `Projetando ${fmtBRL(media * 22)} ao mês em ritmo constante (22 dias úteis). ${media >= 200000 ? "Resultado sólido." : "Há espaço para crescimento."}`,
      impacto: `Referência mensal de ${fmtBRL(mediaAnual)}`,
      acao: media >= 200000
        ? "Manter estratégia comercial atual e buscar contratos adicionais"
        : "Analisar gargalos operacionais que limitam o volume diário faturado",
    });
  }

  // 4. Diversificação de carteira
  if (top5.length > 0) {
    const top3Pct = top5.slice(0, 3).reduce((s, c) => s + c.percentual, 0);
    if (top3Pct >= 85) {
      insights.push({
        id: 4,
        tipo: "atencao",
        titulo: "Top 3 clientes concentram quase toda a receita",
        descricao: `${fmtPct(top3Pct)} do faturamento vem dos 3 maiores clientes. Base de ${qtdClientes} clientes no total.`,
        impacto: "Vulnerabilidade a renegociações ou perdas nos maiores contratos",
        acao: "Priorizar crescimento dos clientes menores para equilibrar a carteira",
      });
    } else {
      insights.push({
        id: 4,
        tipo: "positivo",
        titulo: "Carteira de clientes bem distribuída",
        descricao: `Top 3 clientes representam ${fmtPct(top3Pct)} — carteira equilibrada com ${qtdClientes} clientes ativos.`,
        impacto: "Menor risco de impacto por perda de um cliente individual",
        acao: "Manter política de diversificação e nutrir clientes de menor porte",
      });
    }
  }

  return insights.slice(0, 4);
}

function gerarContasPagar(d: Record<string, unknown>): AIInsight[] {
  const vencido = n(d.totalVencido);
  const aberto = n(d.totalAberto);
  const pago = n(d.totalPago);
  const dpo = n(d.dpo);
  const concentracao = n(d.concentracaoTop3Fornecedores);
  const titulosProblema = n(d.titulosProblema);
  const custoAtraso = n(d.custoAtraso);

  const insights: AIInsight[] = [];

  if (vencido > 0) {
    insights.push({
      id: 1,
      tipo: "alerta",
      titulo: `${fmtBRL(vencido)} em títulos vencidos`,
      descricao: `Existem títulos vencidos não pagos que podem gerar multas, juros e danos ao relacionamento com fornecedores.`,
      impacto: `Custo estimado de atraso: ${fmtBRL(custoAtraso)}`,
      acao: "Priorizar pagamento dos títulos vencidos há mais tempo para reduzir custo de atraso",
    });
  }

  if (dpo > 0) {
    insights.push({
      id: 2,
      tipo: dpo > 45 ? "atencao" : "positivo",
      titulo: `DPO de ${dpo} dias`,
      descricao: `Prazo médio de pagamento de ${dpo} dias. ${dpo > 45 ? "Acima do ideal, pode indicar dificuldade de caixa." : "Dentro de um patamar saudável."}`,
      impacto: dpo > 45 ? "Risco de restrição de crédito com fornecedores" : "Bom equilíbrio entre caixa e fornecedores",
      acao: dpo > 45 ? "Renegociar prazos e priorizar fornecedores estratégicos" : "Manter disciplina de pagamento",
    });
  }

  if (concentracao > 0) {
    insights.push({
      id: 3,
      tipo: concentracao >= 70 ? "atencao" : "oportunidade",
      titulo: `Top 3 fornecedores: ${fmtPct(concentracao)} do total`,
      descricao: `Alta concentração em poucos fornecedores aumenta risco de dependência e reduz poder de negociação.`,
      impacto: "Risco de variação de preço impactar significativamente o caixa",
      acao: "Buscar fornecedores alternativos para os insumos mais concentrados",
    });
  }

  if (titulosProblema > 0) {
    insights.push({
      id: 4,
      tipo: "alerta",
      titulo: `${titulosProblema} títulos com inconsistências`,
      descricao: `Títulos com dados incompletos ou inconsistentes que podem impedir pagamento correto.`,
      impacto: "Risco de pagamentos duplicados ou indevidos",
      acao: "Revisar e corrigir os títulos problemáticos antes do próximo ciclo de pagamento",
    });
  } else if (pago > 0) {
    insights.push({
      id: 4,
      tipo: "positivo",
      titulo: `${fmtBRL(pago)} pagos no período`,
      descricao: `Fluxo de pagamentos saudável, sem títulos com inconsistências identificadas.`,
      impacto: "Boa saúde operacional no relacionamento com fornecedores",
      acao: "Manter rotina de conferência preventiva dos títulos a vencer",
    });
  }

  return insights.slice(0, 4);
}

function gerarContasReceber(d: Record<string, unknown>): AIInsight[] {
  const vencido = n(d.totalVencido);
  const recebido = n(d.totalRecebido);
  const aReceber = n(d.totalAReceber);
  const dso = n(d.dso);
  const concentracao = n(d.concentracaoTop3Clientes);
  const glosa = n(d.glosaPercentual);
  const inadimplentes = n(d.clientesInadimplentes);

  const insights: AIInsight[] = [];

  if (vencido > 0) {
    insights.push({
      id: 1,
      tipo: "alerta",
      titulo: `${fmtBRL(vencido)} em títulos vencidos`,
      descricao: `Recebíveis vencidos representam risco de inadimplência e pressão no fluxo de caixa.`,
      impacto: "Impacto direto na liquidez operacional",
      acao: "Acionar cobrança ativa dos títulos vencidos, priorizando os de maior valor",
    });
  }

  if (dso > 0) {
    insights.push({
      id: 2,
      tipo: dso > 30 ? "atencao" : "positivo",
      titulo: `DSO de ${dso} dias`,
      descricao: `Prazo médio de recebimento de ${dso} dias. ${dso > 30 ? "Ciclo longo pode pressionar o capital de giro." : "Prazo saudável de conversão."}`,
      impacto: dso > 30 ? "Necessidade maior de capital de giro para financiar o ciclo" : "Boa velocidade de conversão de receita em caixa",
      acao: dso > 30 ? "Revisar política de crédito e condições de prazo para novos contratos" : "Manter política atual de crédito",
    });
  }

  if (glosa > 0) {
    insights.push({
      id: 3,
      tipo: glosa >= 3 ? "alerta" : "atencao",
      titulo: `${fmtPct(glosa)} de glosa no período`,
      descricao: `Glosas representam receita não recebida por erros operacionais ou divergências. ${glosa >= 3 ? "Nível crítico." : "Atenção ao nível."}`,
      impacto: `Redução direta na margem operacional`,
      acao: "Mapear causas das glosas e criar processo de revisão prévia ao faturamento",
    });
  }

  if (inadimplentes > 0) {
    insights.push({
      id: 4,
      tipo: "atencao",
      titulo: `${inadimplentes} clientes inadimplentes`,
      descricao: `Clientes com títulos vencidos sem pagamento. Risco de provisão para devedores duvidosos.`,
      impacto: "Pode exigir provisão contábil e impactar resultado",
      acao: "Acionar equipe comercial para negociar parcelamento ou garantias",
    });
  } else if (recebido > 0) {
    insights.push({
      id: 4,
      tipo: "positivo",
      titulo: `${fmtBRL(recebido)} recebidos no período`,
      descricao: `Sem clientes inadimplentes identificados. Carteira com boa saúde de pagamento.`,
      impacto: "Fluxo de caixa previsível e saudável",
      acao: "Manter critérios de crédito e monitorar novos clientes de perto",
    });
  }

  return insights.slice(0, 4);
}

function gerarFrota(d: Record<string, unknown>): AIInsight[] {
  const total = n(d.totalVeiculos);
  const ativos = n(d.veiculosAtivos);
  const idadeMedia = n(d.idadeMediaAnos);
  const custoTotal = n(d.custoTotalManutencao);
  const custoMedio = n(d.custoMedioPorVeiculo);
  const ordensAbertas = n(d.ordensAbertas);
  const top5 = (d.top5MaioresGastos as { nome: string; custo: number }[]) ?? [];

  const insights: AIInsight[] = [];
  const percAtivos = total > 0 ? (ativos / total) * 100 : 0;

  if (percAtivos < 80 && total > 0) {
    insights.push({
      id: 1,
      tipo: "alerta",
      titulo: `Apenas ${fmtPct(percAtivos)} da frota ativa`,
      descricao: `${ativos} de ${total} veículos ativos. Alta ociosidade pode indicar manutenções prolongadas ou frota superdimensionada.`,
      impacto: "Custo fixo elevado com ativos improdutivos",
      acao: "Revisar veículos inativos e definir prazo para retorno ou descarte",
    });
  } else {
    insights.push({
      id: 1,
      tipo: "positivo",
      titulo: `${fmtPct(percAtivos)} da frota em operação`,
      descricao: `${ativos} de ${total} veículos ativos — boa taxa de disponibilidade operacional.`,
      impacto: "Frota bem aproveitada, baixo custo de ociosidade",
      acao: "Manter programa de manutenção preventiva para sustentar disponibilidade",
    });
  }

  if (idadeMedia > 7) {
    insights.push({
      id: 2,
      tipo: "atencao",
      titulo: `Idade média da frota: ${idadeMedia} anos`,
      descricao: `Frota envelhecida tende a gerar mais custos de manutenção corretiva e maior risco de parada não planejada.`,
      impacto: "Custo de manutenção cresce exponencialmente após 7 anos",
      acao: "Elaborar plano de renovação de frota priorizando os veículos mais antigos",
    });
  }

  if (ordensAbertas > 5) {
    insights.push({
      id: 3,
      tipo: "atencao",
      titulo: `${ordensAbertas} ordens de serviço abertas`,
      descricao: `Volume de OS em aberto pode indicar gargalo na oficina ou peças aguardando. Veículos parados = capacidade perdida.`,
      impacto: "Redução de disponibilidade e potencial impacto em entregas",
      acao: "Priorizar OS dos veículos de maior utilização e verificar gargalo de peças",
    });
  }

  if (top5.length > 0 && custoMedio > 0) {
    const top1Custo = top5[0].custo;
    const multiplo = custoMedio > 0 ? (top1Custo / custoMedio).toFixed(1) : "0";
    insights.push({
      id: 4,
      tipo: "atencao",
      titulo: `${top5[0].nome} custa ${multiplo}x a média`,
      descricao: `Custo de ${fmtBRL(top1Custo)} vs média da frota de ${fmtBRL(custoMedio)}. Veículo candidato a revisão profunda ou substituição.`,
      impacto: `Economia potencial de até ${fmtBRL(top1Custo - custoMedio)} com substituição`,
      acao: "Realizar inspeção completa e avaliar viabilidade econômica de manter o veículo",
    });
  }

  return insights.slice(0, 4);
}

function gerarManutencao(d: Record<string, unknown>): AIInsight[] {
  const totalOrdens = n(d.totalOrdens);
  const abertas = n(d.ordensAbertas);
  const custoTotal = n(d.custoTotal);
  const custoMedio = n(d.custoMedioOrdem);
  const pecas = n(d.custoTotalPecas);
  const mo = n(d.custoTotalMaoDeObra);
  const externas = n(d.ordensExternas);
  const internas = n(d.ordensInternas);

  const insights: AIInsight[] = [];

  const percAbertas = totalOrdens > 0 ? (abertas / totalOrdens) * 100 : 0;
  if (percAbertas > 30) {
    insights.push({
      id: 1,
      tipo: "alerta",
      titulo: `${fmtPct(percAbertas)} das OS ainda abertas`,
      descricao: `${abertas} ordens em aberto de ${totalOrdens} total. Alto volume pode indicar gargalo na execução.`,
      impacto: "Veículos imobilizados comprometem capacidade operacional",
      acao: "Auditar OS abertas há mais de 48h e escalar resolução prioritária",
    });
  }

  const percPecas = custoTotal > 0 ? (pecas / custoTotal) * 100 : 0;
  const percMO = custoTotal > 0 ? (mo / custoTotal) * 100 : 0;
  insights.push({
    id: 2,
    tipo: percPecas > 60 ? "atencao" : "oportunidade",
    titulo: `Peças representam ${fmtPct(percPecas)} do custo`,
    descricao: `Distribuição: ${fmtBRL(pecas)} em peças e ${fmtBRL(mo)} em mão de obra. ${percPecas > 60 ? "Alto gasto com peças pode indicar falta de preventiva." : "Equilíbrio saudável."}`,
    impacto: "Custo de peças impacta diretamente a margem operacional",
    acao: percPecas > 60 ? "Intensificar manutenção preventiva para reduzir substituição de peças" : "Manter política atual de manutenção",
  });

  if (externas > 0 && internas > 0) {
    const percExt = ((externas / (externas + internas)) * 100);
    insights.push({
      id: 3,
      tipo: percExt > 50 ? "atencao" : "positivo",
      titulo: `${fmtPct(percExt)} de OS executadas externamente`,
      descricao: `${externas} OS externas vs ${internas} internas. ${percExt > 50 ? "Alta dependência de terceiros eleva custo e tempo de execução." : "Boa capacidade de execução interna."}`,
      impacto: percExt > 50 ? "Custo unitário externo tipicamente 30-50% maior que interno" : "Eficiência interna reduz custo e agiliza retorno",
      acao: percExt > 50 ? "Avaliar ampliação da capacidade interna para serviços mais frequentes" : "Manter estrutura interna e selecionar bem os serviços terceirizados",
    });
  }

  if (custoMedio > 0) {
    insights.push({
      id: 4,
      tipo: "oportunidade",
      titulo: `Custo médio por OS: ${fmtBRL(custoMedio)}`,
      descricao: `Total de ${fmtBRL(custoTotal)} em ${totalOrdens} ordens. Referência para identificar OS atípicas e outliers de custo.`,
      impacto: "Controle do custo médio é o primeiro passo para redução estrutural",
      acao: "Identificar OS acima de 3x a média e investigar causa raiz",
    });
  }

  return insights.slice(0, 4);
}

function gerarAbastecimento(d: Record<string, unknown>): AIInsight[] {
  const custo = n(d.custoTotal);
  const volume = n(d.volumeTotalLitros);
  const consumo = n(d.mediaConsumoKmL);
  const fabrica = n(d.mediaFabricaKmL);
  const delta = n(d.deltaConsumo);
  const preco = n(d.precoMedioLitro);
  const km = n(d.kmRodados);

  const insights: AIInsight[] = [];

  if (fabrica > 0 && consumo > 0) {
    const desvio = ((consumo - fabrica) / fabrica) * 100;
    insights.push({
      id: 1,
      tipo: desvio < -15 ? "alerta" : desvio < -8 ? "atencao" : "positivo",
      titulo: `Consumo ${desvio >= 0 ? "acima" : Math.abs(desvio).toFixed(0) + "% abaixo"} da fábrica`,
      descricao: `Média real de ${consumo.toFixed(1)} km/L vs ${fabrica.toFixed(1)} km/L de fábrica (${desvio >= 0 ? "+" : ""}${desvio.toFixed(1)}%). ${desvio < -15 ? "Desvio crítico." : ""}`,
      impacto: desvio < -8 ? `Combustível extra consumido vs referência de fábrica` : "Frotas dentro do esperado de consumo",
      acao: desvio < -15 ? "Investigar veículos com maior desvio: manutenção, pneus e comportamento do motorista" : "Manter monitoramento mensal do consumo por veículo",
    });
  }

  if (delta !== 0) {
    insights.push({
      id: 2,
      tipo: delta > 0 ? "positivo" : "atencao",
      titulo: `Consumo ${delta > 0 ? "melhorou" : "piorou"} ${Math.abs(delta).toFixed(1)} km/L`,
      descricao: `Variação de ${delta > 0 ? "+" : ""}${delta.toFixed(1)} km/L em relação ao período anterior. ${delta > 0 ? "Tendência favorável." : "Investigar causa da piora."}`,
      impacto: delta > 0 ? "Economia real de combustível no período" : "Aumento do custo de combustível por km",
      acao: delta > 0 ? "Identificar práticas responsáveis pela melhora e replicar" : "Auditar veículos com maior piora de consumo",
    });
  }

  if (preco > 0 && volume > 0) {
    insights.push({
      id: 3,
      tipo: "oportunidade",
      titulo: `Preço médio: R$ ${preco.toFixed(2)}/L`,
      descricao: `${volume.toLocaleString("pt-BR")} litros abastecidos a ${`R$ ${preco.toFixed(2)}`}/L. Comparar com preço de referência do mercado regional.`,
      impacto: "Cada R$ 0,10 de diferença no litro impacta o custo total significativamente",
      acao: "Negociar contratos de fornecimento com postos parceiros para garantir preço competitivo",
    });
  }

  if (km > 0 && custo > 0) {
    const cpm = custo / km;
    insights.push({
      id: 4,
      tipo: "oportunidade",
      titulo: `Custo de R$ ${cpm.toFixed(2)}/km`,
      descricao: `Total de ${km.toLocaleString("pt-BR")} km rodados com custo de ${fmtBRL(custo)}. Métrica fundamental para precificação de fretes.`,
      impacto: "CPKm acima da precificação comprime a margem operacional",
      acao: "Verificar se a precificação dos fretes está cobrindo o CPKm real de combustível",
    });
  }

  return insights.slice(0, 4);
}

function gerarOperacional(d: Record<string, unknown>): AIInsight[] {
  const emAndamento = n(d.viagensEmAndamento);
  const comAtraso = n(d.comAtraso);
  const percMedio = n(d.percMedioCompleto);
  const atrasados = n(d.atrasados);
  const semGps = n(d.semGps);
  const divergentes = n(d.itensDivergentes);
  const total = n(d.totalViagens);

  const insights: AIInsight[] = [];
  const percAtraso = emAndamento > 0 ? (comAtraso / emAndamento) * 100 : 0;

  if (percAtraso > 20) {
    insights.push({
      id: 1,
      tipo: "alerta",
      titulo: `${fmtPct(percAtraso)} das viagens com atraso`,
      descricao: `${comAtraso} de ${emAndamento} viagens em andamento estão em atraso. Nível crítico de pontualidade.`,
      impacto: "Risco de penalidades contratuais e insatisfação de clientes",
      acao: "Acionar motoristas em atraso e identificar gargalos operacionais recorrentes",
    });
  } else if (percAtraso > 0) {
    insights.push({
      id: 1,
      tipo: "atencao",
      titulo: `${comAtraso} viagens com atraso`,
      descricao: `${fmtPct(percAtraso)} das viagens em andamento em atraso. Dentro do tolerável, mas merece atenção.`,
      impacto: "Impacto na satisfação do cliente e SLA de entrega",
      acao: "Monitorar individualmente as viagens em atraso e comunicar clientes proativamente",
    });
  } else {
    insights.push({
      id: 1,
      tipo: "positivo",
      titulo: "Nenhuma viagem em atraso",
      descricao: `${emAndamento} viagens em andamento com ${fmtPct(percMedio)} de progresso médio — todas dentro do prazo.`,
      impacto: "Excelente pontualidade operacional",
      acao: "Manter padrão operacional e documentar boas práticas da equipe",
    });
  }

  if (semGps > 0) {
    insights.push({
      id: 2,
      tipo: "alerta",
      titulo: `${semGps} veículos sem sinal GPS`,
      descricao: `Veículos sem rastreamento ativo comprometem a visibilidade da operação e dificultam resposta a incidentes.`,
      impacto: "Risco operacional e de segurança sem rastreamento em tempo real",
      acao: "Verificar dispositivos GPS dos veículos sem sinal e acionar manutenção imediata",
    });
  }

  if (divergentes > 0) {
    insights.push({
      id: 3,
      tipo: "atencao",
      titulo: `${divergentes} itens com divergência`,
      descricao: `Divergências entre o planejado e executado podem indicar problemas de coleta, entrega ou conferência.`,
      impacto: "Divergências geram retrabalho, custo adicional e risco de perda de carga",
      acao: "Auditar itens divergentes e identificar se é falha de sistema ou operacional",
    });
  }

  if (percMedio > 0) {
    insights.push({
      id: 4,
      tipo: percMedio >= 75 ? "positivo" : "oportunidade",
      titulo: `Progresso médio das viagens: ${percMedio.toFixed(0)}%`,
      descricao: `${total} viagens monitoradas com ${fmtPct(percMedio)} de execução em média. ${percMedio >= 75 ? "Operação em fase avançada." : "Grande parte ainda em curso."}`,
      impacto: "Visibilidade do andamento geral da operação do dia",
      acao: percMedio >= 75 ? "Preparar equipe para recepção e conferência das entregas finais" : "Manter contato ativo com motoristas para antecipar desvios",
    });
  }

  return insights.slice(0, 4);
}

function gerarRh(d: Record<string, unknown>): AIInsight[] {
  const ativos = n(d.colaboradoresAtivos);
  const admissoes = n(d.admissoesNoPeriodo);
  const demissoes = n(d.demissoesNoPeriodo);
  const turnover = n(d.taxaTurnover);
  const mediaAnos = n(d.mediaTempoCasa);
  const cnh30 = n(d.cnhVencendo30d);
  const cnhVencidas = n(d.cnhVencidas);
  const semCpf = n(d.semCpf);

  const insights: AIInsight[] = [];

  if (cnhVencidas > 0) {
    insights.push({
      id: 1,
      tipo: "alerta",
      titulo: `${cnhVencidas} CNH${cnhVencidas > 1 ? "s" : ""} vencida${cnhVencidas > 1 ? "s" : ""}`,
      descricao: `Motoristas com CNH vencida não podem operar legalmente. Risco imediato de autuação e acidente com responsabilidade da empresa.`,
      impacto: "Risco jurídico, multas e impedimento legal de operação",
      acao: "Afastar imediatamente motoristas com CNH vencida e notificar para regularização urgente",
    });
  }

  if (cnh30 > 0) {
    insights.push({
      id: 2,
      tipo: "atencao",
      titulo: `${cnh30} CNH${cnh30 > 1 ? "s" : ""} vencendo em 30 dias`,
      descricao: `Motoristas com habilitação próxima do vencimento. Necessário agir antes que vençam para evitar paralisação.`,
      impacto: "Risco de indisponibilidade de motoristas em até 30 dias",
      acao: "Notificar os motoristas agora e garantir que renovem antes do vencimento",
    });
  }

  if (turnover > 5) {
    insights.push({
      id: 3,
      tipo: turnover > 10 ? "alerta" : "atencao",
      titulo: `Turnover de ${fmtPct(turnover)} no período`,
      descricao: `${admissoes} admissões e ${demissoes} demissões. Taxa ${turnover > 10 ? "crítica" : "elevada"} de rotatividade impacta treinamento e produtividade.`,
      impacto: "Custo de reposição estimado em 1-2 salários por colaborador substituído",
      acao: "Investigar causas de demissão voluntária e revisar política de retenção",
    });
  } else {
    insights.push({
      id: 3,
      tipo: "positivo",
      titulo: `Turnover de ${fmtPct(turnover)} — estável`,
      descricao: `${admissoes} admissões e ${demissoes} demissões com ${ativos} colaboradores ativos. Rotatividade sob controle.`,
      impacto: "Equipe estável = menor custo de treinamento e maior produtividade",
      acao: "Manter programas de reconhecimento e desenvolvimento para reduzir ainda mais o turnover",
    });
  }

  if (semCpf > 0) {
    insights.push({
      id: 4,
      tipo: "atencao",
      titulo: `${semCpf} colaborador${semCpf > 1 ? "es" : ""} sem CPF cadastrado`,
      descricao: `Cadastros incompletos impedem emissão correta de documentos fiscais e podem causar problemas no eSocial.`,
      impacto: "Risco de inconsistências no eSocial e obrigações acessórias",
      acao: "Regularizar cadastros com CPF faltante no sistema antes do próximo fechamento",
    });
  } else if (mediaAnos > 0) {
    insights.push({
      id: 4,
      tipo: mediaAnos >= 3 ? "positivo" : "oportunidade",
      titulo: `Tempo médio de casa: ${mediaAnos.toFixed(1)} anos`,
      descricao: `Equipe com ${ativos} colaboradores e média de ${mediaAnos.toFixed(1)} anos na empresa. ${mediaAnos >= 3 ? "Equipe experiente e estável." : "Equipe relativamente nova."}`,
      impacto: mediaAnos >= 3 ? "Maior experiência e produtividade por colaborador" : "Necessidade de investimento em treinamento",
      acao: mediaAnos >= 3 ? "Valorizar e engajar colaboradores de longo prazo para reduzir risco de saída" : "Estruturar programa de onboarding e aceleração de curva de aprendizado",
    });
  }

  return insights.slice(0, 4);
}

function gerarCompras(d: Record<string, unknown>): AIInsight[] {
  const total = n(d.totalCompras ?? d.valorTotal);
  const qtd = n(d.qtdPedidos ?? d.qtdNotas);
  const mediaTicket = qtd > 0 ? total / qtd : 0;

  const insights: AIInsight[] = [];

  insights.push({
    id: 1,
    tipo: "oportunidade",
    titulo: `${fmtBRL(total)} em compras no período`,
    descricao: `${qtd} pedidos com ticket médio de ${fmtBRL(mediaTicket)}. Base para análise de oportunidades de consolidação.`,
    impacto: "Consolidar pedidos pode gerar descontos de volume com fornecedores",
    acao: "Identificar itens comprados em pequenas quantidades e consolidar em pedidos maiores",
  });

  return insights.slice(0, 4);
}

function gerarFinanciamentoFrota(d: Record<string, unknown>): AIInsight[] {
  const contratos = n(d.totalContratos);
  const saldo = n(d.saldoDevedor);
  const parcelas = n(d.totalParcelas);
  const mensal = n(d.valorMensalTotal);
  const bancos = n(d.qtdBancos);

  const insights: AIInsight[] = [];

  insights.push({
    id: 1,
    tipo: saldo > 5000000 ? "atencao" : "positivo",
    titulo: `Saldo devedor: ${fmtBRL(saldo)}`,
    descricao: `${contratos} contratos ativos com ${parcelas} parcelas pendentes. Comprometimento mensal de ${fmtBRL(mensal)}.`,
    impacto: "Comprometimento fixo de caixa todo mês",
    acao: "Avaliar possibilidade de amortização antecipada nos contratos com maior taxa",
  });

  if (bancos > 1) {
    insights.push({
      id: 2,
      tipo: "oportunidade",
      titulo: `Financiamentos em ${bancos} bancos diferentes`,
      descricao: `Diversificação entre ${bancos} credores. Oportunidade de renegociar taxas usando o histórico como alavanca.`,
      impacto: "Cada ponto percentual de redução gera economia expressiva no saldo total",
      acao: "Solicitar proposta de portabilidade ou refinanciamento ao banco com melhor taxa atual",
    });
  }

  return insights.slice(0, 4);
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
function gerarInsightsPorSetor(setor: string, dados: Record<string, unknown>): AIInsight[] {
  switch (setor) {
    case "faturamento":         return gerarFaturamento(dados);
    case "contas_a_pagar":      return gerarContasPagar(dados);
    case "contas_a_receber":    return gerarContasReceber(dados);
    case "frota":               return gerarFrota(dados);
    case "manutencao":          return gerarManutencao(dados);
    case "abastecimento":       return gerarAbastecimento(dados);
    case "operacional":         return gerarOperacional(dados);
    case "rh":                  return gerarRh(dados);
    case "compras":             return gerarCompras(dados);
    case "financiamento_frota": return gerarFinanciamentoFrota(dados);
    default:                    return [];
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAIInsights(): UseAIInsightsReturn {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const gerarInsights = useCallback(async (
    setor: string,
    dados: Record<string, unknown>,
    _periodo?: string
  ) => {
    const cacheKey = `${setor}:${JSON.stringify(dados)}`;
    const cached = insightsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setInsights(cached.insights);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simula uma pequena espera para dar sensação de processamento
      await new Promise(r => setTimeout(r, 300));

      const result = gerarInsightsPorSetor(setor, dados);

      if (result.length === 0) {
        setError("Sem dados suficientes para gerar insights");
      } else {
        setInsights(result);
        insightsCache.set(cacheKey, { insights: result, timestamp: Date.now() });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao gerar insights");
    } finally {
      setLoading(false);
    }
  }, []);

  const limpar = useCallback(() => {
    setInsights([]);
    setError(null);
  }, []);

  return { insights, loading, error, gerarInsights, limpar };
}
