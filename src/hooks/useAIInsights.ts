import { useState, useCallback } from "react";

export type InsightTipo = "alerta" | "oportunidade" | "atencao" | "positivo";

export interface InsightDetalhe {
  rotulo: string;   // ex: "Veículos parados", "Receita em risco"
  valor: string;    // ex: "5 caminhões", "R$ 82.000"
  obs?: string;     // ex: "nos 18 dias úteis restantes"
}

export interface AIInsight {
  id: number;
  tipo: InsightTipo;
  titulo: string;
  descricao: string;
  impacto: string;
  acao: string;
  /** Dados detalhados para o modal — opcional */
  detalhes?: InsightDetalhe[];
  /** Contexto adicional longo para o modal */
  contexto?: string;
  /** Lista de itens (ex: nomes de veículos, clientes) para o modal */
  itens?: string[];
}

interface UseAIInsightsReturn {
  insights: AIInsight[];
  loading: boolean;
  error: string | null;
  gerarInsights: (setor: string, dados: Record<string, unknown>, periodo?: string) => Promise<void>;
  limpar: () => void;
}

const insightsCache = new Map<string, { insights: AIInsight[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const n = (v: unknown): number => (typeof v === "number" ? v : 0);
const s = (v: unknown): string => (typeof v === "string" ? v : "");
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

// ─── helpers para selecionar insights por prioridade ──────────────────────────
function pick(arr: AIInsight[], max = 4): AIInsight[] {
  // Prioridade: alerta > atencao > oportunidade > positivo
  const order: InsightTipo[] = ["alerta", "atencao", "oportunidade", "positivo"];
  const sorted = [...arr].sort((a, b) => order.indexOf(a.tipo) - order.indexOf(b.tipo));
  return sorted.slice(0, max).map((ins, i) => ({ ...ins, id: i + 1 }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FATURAMENTO
// ═══════════════════════════════════════════════════════════════════════════════
function gerarFaturamento(d: Record<string, unknown>): AIInsight[] {
  const total = n(d.totalFaturado);
  const media = n(d.mediaDiaUtil);
  const provisao = n(d.provisao);
  const diasUteis = n(d.diasUteis);
  const diasUteisMes = n(d.diasUteisMes);
  const qtdClientes = n(d.qtdClientes);
  const top5 = (d.top5Clientes as { nome: string; valor: number; percentual: number }[]) ?? [];

  // OS em andamento — caminhões imobilizados
  const osTotal = n(d.osAndamento_totalOS);
  const osVeiculos = n(d.osAndamento_totalVeiculos);
  const osCusto = n(d.osAndamento_custoPrevisto);
  const osReceitaPerdida = n(d.osAndamento_receitaDiariaPerdida);
  const osVeiculosList = (d.osAndamento_veiculos as { veiculo: string; ordens: number }[]) ?? [];

  const ins: AIInsight[] = [];

  // ── OS em andamento — impacto direto no faturamento ────────────────────────
  if (osVeiculos > 0) {
    const diasRestantes = diasUteisMes - diasUteis;
    const receitaPotencialPerdida = osReceitaPerdida * diasRestantes;
    const topVeis = osVeiculosList.slice(0, 3).map(v => v.veiculo).join(", ");

    ins.push({ id: 0,
      tipo: osVeiculos >= 5 ? "alerta" : "atencao",
      titulo: `${osVeiculos} caminhão(ões) imobilizado(s) em manutenção`,
      descricao: `${osTotal} OS abertas (situação A) em ${osVeiculos} veículo(s) parado(s): ${topVeis}${osVeiculosList.length > 3 ? " e outros" : ""}. Cada dia parado é receita não gerada.`,
      impacto: diasRestantes > 0
        ? `Estimativa de ${fmtBRL(receitaPotencialPerdida)} de receita não gerada nos ${diasRestantes} dias úteis restantes`
        : `${fmtBRL(osReceitaPerdida)}/dia útil de capacidade ociosa`,
      acao: `Priorizar liberação dos veículos parados — cada dia conta ${fmtBRL(osReceitaPerdida)} em receita potencial`,
      detalhes: [
        { rotulo: "Veículos parados", valor: `${osVeiculos} caminhão(ões)` },
        { rotulo: "OS em aberto (sit. A)", valor: `${osTotal} ordens` },
        { rotulo: "Receita diária em risco", valor: fmtBRL(osReceitaPerdida), obs: "estimativa por veículo parado" },
        ...(diasRestantes > 0 ? [{ rotulo: "Perda estimada até fim do mês", valor: fmtBRL(receitaPotencialPerdida), obs: `${diasRestantes} dias úteis restantes` }] : []),
        ...(osCusto > 0 ? [{ rotulo: "Custo previsto nas OS abertas", valor: fmtBRL(osCusto) }] : []),
      ],
      contexto: `Caminhões com OS na situação "A" (Andamento) estão imobilizados e não geram receita. Cálculo: (veículos parados ÷ total de veículos ativos na frota) × receita média diária. Representa a proporção real da capacidade ociosa sobre o faturamento do dia.`,
      itens: osVeiculosList.map(v => `${v.veiculo}${v.ordens > 1 ? ` (${v.ordens} OS)` : ""}`),
    });
  }

  // Concentração top 1
  if (top5.length > 0) {
    const top1 = top5[0];
    const tipo: InsightTipo = top1.percentual >= 60 ? "alerta" : top1.percentual >= 40 ? "atencao" : "positivo";
    if (top1.percentual >= 40) {
      ins.push({ id: 0, tipo, titulo: `${top1.nome} concentra ${fmtPct(top1.percentual)} da receita`,
        descricao: `${fmtBRL(top1.valor)} de ${fmtBRL(total)} total. ${top1.percentual >= 60 ? "Dependência crítica de um único cliente." : "Nível de concentração relevante."}`,
        impacto: "Perda desse contrato comprometeria a operação financeira",
        acao: "Acelerar prospecção e crescimento dos demais clientes para diluir dependência",
        detalhes: [
          { rotulo: "Cliente", valor: top1.nome },
          { rotulo: "Faturamento", valor: fmtBRL(top1.valor), obs: `${fmtPct(top1.percentual)} do total` },
          { rotulo: "Total da carteira", valor: fmtBRL(total), obs: `${qtdClientes} clientes ativos` },
          { rotulo: "Receita em risco", valor: fmtBRL(top1.valor), obs: "em caso de perda do contrato" },
          ...(top5.length > 1 ? [{ rotulo: "2º maior cliente", valor: top5[1].nome, obs: `${fmtPct(top5[1].percentual)} — ${fmtBRL(top5[1].valor)}` }] : []),
        ],
        contexto: `Concentração acima de ${top1.percentual >= 60 ? "60%" : "40%"} em um único cliente representa risco crítico de receita. Qualquer renegociação, inadimplência ou perda desse contrato impacta diretamente a capacidade operacional da empresa. O ideal é que nenhum cliente represente mais de 30% da receita total.`,
        itens: top5.map(c => `${c.nome}: ${fmtBRL(c.valor)} (${fmtPct(c.percentual)})`),
      });
    } else {
      ins.push({ id: 0, tipo: "positivo", titulo: "Carteira bem distribuída",
        descricao: `${top1.nome} responde por apenas ${fmtPct(top1.percentual)} com ${qtdClientes} clientes ativos. Boa diversificação.`,
        impacto: "Risco de receita concentrada sob controle",
        acao: "Manter política de diversificação e nutrir clientes de menor porte",
        detalhes: [
          { rotulo: "Maior cliente", valor: top1.nome, obs: `${fmtPct(top1.percentual)} da receita` },
          { rotulo: "Total clientes", valor: `${qtdClientes} ativos` },
          { rotulo: "Faturamento total", valor: fmtBRL(total) },
        ],
        itens: top5.map(c => `${c.nome}: ${fmtBRL(c.valor)} (${fmtPct(c.percentual)})`),
      });
    }
  }

  // Top 3 concentração
  if (top5.length >= 3) {
    const top3pct = top5.slice(0, 3).reduce((s, c) => s + c.percentual, 0);
    if (top3pct >= 85) {
      ins.push({ id: 0, tipo: "atencao", titulo: `Top 3 clientes: ${fmtPct(top3pct)} do faturamento`,
        descricao: `${top5[0].nome}, ${top5[1].nome} e ${top5[2].nome} dominam a receita de ${qtdClientes} clientes.`,
        impacto: "Alta vulnerabilidade a renegociações simultâneas dos principais contratos",
        acao: "Criar meta de crescimento para os clientes fora do top 3" });
    }
  }

  // Ritmo vs projeção — sempre gera com dado útil
  if (provisao > 0 && total > 0 && diasUteis > 0 && diasUteisMes > 0) {
    const percRealizadoDoMes = (diasUteis / diasUteisMes) * 100;
    const percFaturadoDoTotal = (total / provisao) * 100;
    const eficiencia = percFaturadoDoTotal / percRealizadoDoMes * 100;
    const diasRestantes = diasUteisMes - diasUteis;
    const faltaParaMeta = provisao - total;
    const ritmoNecessario = diasRestantes > 0 ? faltaParaMeta / diasRestantes : 0;
    const ritmoAtual = media;
    const diffRitmo = ritmoNecessario - ritmoAtual;

    const tipo: InsightTipo = eficiencia < 70 ? "alerta" : eficiencia >= 110 ? "positivo" : "oportunidade";

    ins.push({ id: 0, tipo,
      titulo: eficiencia < 70
        ? `Falta ${fmtBRL(faltaParaMeta)} para a meta — ritmo insuficiente`
        : eficiencia >= 110
          ? `Projeção quase batida com ${diasRestantes} dias úteis sobrando`
          : `Precisa de ${fmtBRL(ritmoNecessario)}/dia útil para fechar a meta`,
      descricao: diasRestantes > 0
        ? `Realizado: ${fmtBRL(total)} de ${fmtBRL(provisao)}. Faltam ${fmtBRL(faltaParaMeta)} em ${diasRestantes} dias úteis. Ritmo necessário: ${fmtBRL(ritmoNecessario)}/dia vs ritmo atual: ${fmtBRL(ritmoAtual)}/dia (${diffRitmo > 0 ? "+" : ""}${fmtBRL(diffRitmo)} de diferença).`
        : `Mês encerrado. Realizado ${fmtPct(percFaturadoDoTotal)} da projeção (${fmtBRL(total)} de ${fmtBRL(provisao)}).`,
      impacto: diffRitmo > 0
        ? `Precisa acelerar ${fmtBRL(diffRitmo)}/dia útil para bater a meta`
        : `Ritmo atual é suficiente — folga de ${fmtBRL(Math.abs(diffRitmo))}/dia útil`,
      acao: eficiencia < 70
        ? `Identificar e antecipar emissão de notas para recuperar ritmo nos próximos ${diasRestantes} dias`
        : eficiencia >= 110
          ? "Garantir que os serviços dos dias restantes sejam faturados sem atraso"
          : diffRitmo > 0
            ? `Focar em antecipar faturamentos para cobrir a diferença de ${fmtBRL(diffRitmo)}/dia`
            : "Manter ritmo — meta praticamente garantida no fechamento",
    });
  }

  // Potencial da cauda da carteira
  if (top5.length >= 3 && total > 0) {
    const top1valor = top5[0].valor;
    const menores = top5.slice(2); // clientes 3º em diante
    const valorMenores = menores.reduce((s, c) => s + c.valor, 0);
    const percMenores = (valorMenores / total) * 100;
    const ticketMedio = qtdClientes > 0 ? total / qtdClientes : 0;
    const ticketTop1 = top1valor;
    const multiplicador = ticketMedio > 0 ? parseFloat((ticketTop1 / ticketMedio).toFixed(1)) : 0;

    if (multiplicador >= 3 && qtdClientes > 3) {
      ins.push({ id: 0, tipo: "oportunidade",
        titulo: `${top5[0].nome} fatura ${multiplicador}x a média dos demais`,
        descricao: `Ticket médio geral: ${fmtBRL(ticketMedio)}. O maior cliente fatura ${fmtBRL(ticketTop1)}. Os ${qtdClientes - 1} outros clientes representam apenas ${fmtPct(100 - top5[0].percentual)} da receita.`,
        impacto: `Dobrar o ticket de 3 clientes menores geraria +${fmtBRL(ticketMedio * 3)}/mês`,
        acao: "Identificar os 3 clientes com maior potencial de upsell e abrir conversa comercial ativa" });
    } else if (percMenores > 0 && diasUteis > 0) {
      // Insight de sazonalidade/concentração de dias
      const mediaUltDias = media;
      const diasRestantes = diasUteisMes - diasUteis;
      const receitaRestanteEstimada = mediaUltDias * diasRestantes;
      if (diasRestantes > 0 && receitaRestanteEstimada > 0) {
        ins.push({ id: 0, tipo: "oportunidade",
          titulo: `Estimativa: +${fmtBRL(receitaRestanteEstimada)} nos ${diasRestantes} dias úteis restantes`,
          descricao: `Mantendo a média atual de ${fmtBRL(media)}/dia útil, o mês deve fechar em ${fmtBRL(total + receitaRestanteEstimada)} — ${fmtPct(((total + receitaRestanteEstimada) / provisao) * 100)} da projeção de ${fmtBRL(provisao)}.`,
          impacto: "Monitorar ritmo diário é crítico para garantir o fechamento do mês",
          acao: "Antecipar faturamento de serviços já executados para garantir emissão nos dias úteis restantes" });
      }
    }
  }

  return pick(ins);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABASTECIMENTO
// ═══════════════════════════════════════════════════════════════════════════════
function gerarAbastecimento(d: Record<string, unknown>): AIInsight[] {
  const custo = n(d.custoTotal);
  const volume = n(d.volumeTotalLitros);
  const consumo = n(d.mediaConsumoKmL);
  const fabrica = n(d.mediaFabricaKmL);
  const delta = n(d.deltaConsumoPercent);
  const preco = n(d.precoMedioLitro);
  const km = n(d.kmRodados);
  const cpm = n(d.custoPorKm);
  const qtdAbast = n(d.qtdAbastecimentos);
  const qtdPostos = n(d.qtdPostos);
  const qtdEstados = n(d.qtdEstados);
  const veiculos = (d.rankingVeiculos as { veiculo: string; custo: number; litros: number; km: number; qtd: number; consumo: number }[]) ?? [];
  const motoristas = (d.rankingMotoristas as { motorista: string; custo: number; litros: number; qtd: number }[]) ?? [];
  const combust = (d.distCombustivel as { tipo: string; custo: number; litros: number; qtd: number }[]) ?? [];
  const frota = (d.comparativoFrota as { frota: string; consumoReal: number; consumoFabrica: number; desvioPercent: number }[]) ?? [];
  const ins: AIInsight[] = [];

  // Desvio consumo vs fábrica
  if (fabrica > 0 && consumo > 0) {
    const desvio = ((consumo - fabrica) / fabrica) * 100;
    ins.push({ id: 0,
      tipo: desvio < -20 ? "alerta" : desvio < -10 ? "atencao" : "positivo",
      titulo: desvio < -5 ? `Consumo ${Math.abs(desvio).toFixed(1)}% abaixo da especificação` : "Consumo dentro do esperado de fábrica",
      descricao: `Média real: ${consumo.toFixed(2)} km/L vs ${fabrica.toFixed(2)} km/L de fábrica. ${desvio < -20 ? "Desvio crítico exige investigação imediata." : desvio < -10 ? "Atenção ao nível de desvio." : "Frota operando dentro da especificação."}`,
      impacto: desvio < -10 ? `Consumo extra vs fábrica representa custo adicional significativo` : "Eficiência de consumo adequada",
      acao: desvio < -10 ? "Inspecionar veículos com maior desvio: pressão de pneus, filtros, estilo de condução" : "Manter programa de manutenção preventiva focado em eficiência" });
  }

  // Variação período anterior
  if (delta !== 0) {
    ins.push({ id: 0, tipo: delta > 0 ? "positivo" : "atencao",
      titulo: `Consumo ${delta > 0 ? "melhorou" : "piorou"} ${Math.abs(delta).toFixed(1)}% vs período anterior`,
      descricao: `Delta de ${delta > 0 ? "+" : ""}${delta.toFixed(1)}% na média de consumo. ${delta < -5 ? "Piora relevante merece investigação." : ""}`,
      impacto: delta > 0 ? "Economia real de combustível no período" : "Aumento do custo por km rodado",
      acao: delta > 0 ? "Identificar boas práticas responsáveis pela melhora e replicar" : "Auditar os 5 veículos com maior piora de consumo individual" });
  }

  // Ranking de veículos — top custoso
  if (veiculos.length > 0) {
    const top = veiculos[0];
    const percTop = custo > 0 ? (top.custo / custo) * 100 : 0;
    ins.push({ id: 0, tipo: percTop >= 30 ? "atencao" : "oportunidade",
      titulo: `${top.veiculo} responde por ${fmtPct(percTop)} do custo`,
      descricao: `${fmtBRL(top.custo)} em ${top.qtd} abastecimentos, ${top.litros.toLocaleString("pt-BR")} litros. ${top.consumo > 0 ? `Consumo: ${top.consumo.toFixed(2)} km/L.` : ""}`,
      impacto: percTop >= 30 ? "Veículo concentra custo desproporcional à frota" : "Identificar causa do alto consumo pode gerar economia",
      acao: "Realizar inspeção completa focando em motor, transmissão e sistema de injeção" });
  }

  // Custo por km
  if (cpm > 0) {
    ins.push({ id: 0, tipo: cpm > 1.5 ? "atencao" : "positivo",
      titulo: `CPKm de R$ ${cpm.toFixed(2)}/km em combustível`,
      descricao: `${km.toLocaleString("pt-BR")} km rodados a ${fmtBRL(custo)} de combustível. ${qtdAbast} abastecimentos em ${qtdPostos} postos em ${qtdEstados} estado(s).`,
      impacto: "CPKm é base para precificação correta de fretes",
      acao: cpm > 1.5 ? "Revisar precificação dos fretes para garantir cobertura do custo de combustível" : "Usar CPKm como referência na negociação de novos contratos" });
  }

  // Concentração de tipo de combustível
  if (combust.length > 1) {
    const top1 = combust[0];
    const percComb = custo > 0 ? (top1.custo / custo) * 100 : 0;
    if (percComb < 90) {
      ins.push({ id: 0, tipo: "oportunidade",
        titulo: `Mix de combustíveis: ${combust.length} tipos utilizados`,
        descricao: `${top1.tipo} domina com ${fmtPct(percComb)}. Frota usa ${combust.map(c => c.tipo).join(", ")}.`,
        impacto: "Diversificação de combustível pode ser oportunidade de negociação de contratos",
        acao: "Avaliar conversão de veículos com alta quilometragem para o combustível de menor custo por km" });
    }
  }

  // Frota com pior desvio
  const piorFrota = frota.filter(f => f.desvioPercent < -15).sort((a, b) => a.desvioPercent - b.desvioPercent)[0];
  if (piorFrota) {
    ins.push({ id: 0, tipo: "alerta",
      titulo: `Frota "${piorFrota.frota}" com desvio de ${Math.abs(piorFrota.desvioPercent).toFixed(1)}% vs fábrica`,
      descricao: `Real: ${piorFrota.consumoReal.toFixed(2)} km/L vs ${piorFrota.consumoFabrica.toFixed(2)} km/L esperado. Maior desvio entre todas as frotas.`,
      impacto: "Custo de combustível desta frota está acima do tolerável",
      acao: "Priorizar revisão dos veículos desta frota no próximo ciclo de manutenção preventiva" });
  }

  // Ranking motoristas
  if (motoristas.length >= 2) {
    const top = motoristas[0];
    const segundo = motoristas[1];
    const percTop = custo > 0 ? (top.custo / custo) * 100 : 0;
    if (percTop >= 20) {
      ins.push({ id: 0, tipo: "atencao",
        titulo: `${top.motorista} lidera ranking de custo com ${fmtPct(percTop)}`,
        descricao: `${fmtBRL(top.custo)} em ${top.qtd} abastecimentos vs ${fmtBRL(segundo.custo)} do 2º colocado (${segundo.motorista}).`,
        impacto: "Comportamento de condução pode estar inflacionando o custo",
        acao: "Analisar rotas, estilo de condução e frequência de abastecimento do motorista" });
    }
  }

  return pick(ins);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANUTENÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function gerarManutencao(d: Record<string, unknown>): AIInsight[] {
  const totalOS = n(d.totalOrdens);
  const abertas = n(d.ordensAbertas);
  const custo = n(d.custoTotal);
  const custoMedio = n(d.custoMedioOrdem);
  const pecas = n(d.custoTotalPecas);
  const mo = n(d.custoTotalMaoDeObra);
  const externas = n(d.ordensExternas);
  const internas = n(d.ordensInternas);
  const outliers = n(d.outliersCusto);
  const travadas = n(d.ordensTravadas30d);
  const semForn = n(d.semFornecedor);
  const concVei = n(d.concentracaoTopVeiculo);
  const topVei = s(d.topVeiculoNome);
  const ratioCorr = n(d.ratioCorretivaPercent);
  const semMO = n(d.semMaoDeObra);
  const rankVei = (d.rankingVeiculos as { veiculo: string; custo: number }[]) ?? [];
  const rankForn = (d.rankingFornecedores as { fornecedor: string; custo: number }[]) ?? [];
  const distClassif = (d.distClassificacao as { classificacao: string; custo: number }[]) ?? [];
  const ins: AIInsight[] = [];

  // OS abertas há mais de 30 dias
  if (travadas > 0) {
    ins.push({ id: 0, tipo: "alerta",
      titulo: `${travadas} OS abertas há mais de 30 dias`,
      descricao: `Ordens em andamento travadas indicam gargalo na oficina, espera de peças ou falta de acompanhamento.`,
      impacto: "Veículos parados por longo período geram custo fixo sem retorno",
      acao: "Auditar cada OS travada: escalar fornecedor de peças ou realalocar para oficina externa" });
  }

  // Ratio corretiva vs preventiva
  if (ratioCorr > 0) {
    ins.push({ id: 0, tipo: ratioCorr >= 70 ? "alerta" : ratioCorr >= 50 ? "atencao" : "positivo",
      titulo: `${fmtPct(ratioCorr)} das OS são manutenção corretiva`,
      descricao: `${ratioCorr >= 70 ? "Frota operando em modo de apagação de incêndios. Falta de preventiva eleva custo e risco de parada." : ratioCorr >= 50 ? "Equilíbrio ruim entre corretiva e preventiva." : "Bom equilíbrio entre preventiva e corretiva."}`,
      impacto: "Manutenção corretiva custa em média 3-5x mais que preventiva equivalente",
      acao: ratioCorr >= 50 ? "Estruturar cronograma de manutenção preventiva por km e por prazo" : "Manter ritmo de preventiva e monitorar indicador mensalmente" });
  }

  // Outliers de custo
  if (outliers > 0) {
    ins.push({ id: 0, tipo: "atencao",
      titulo: `${outliers} OS com custo outlier (> 2σ da média)`,
      descricao: `Ordens com custo muito acima da média de ${fmtBRL(custoMedio)}. Podem indicar fraude, erro de lançamento ou serviço superdimensionado.`,
      impacto: "Outliers inflam custo total e distorcem benchmarks internos",
      acao: "Revisar cada OS outlier com aprovação gerencial antes de fechar" });
  }

  // Concentração em veículo
  if (concVei >= 30 && topVei) {
    ins.push({ id: 0, tipo: concVei >= 45 ? "alerta" : "atencao",
      titulo: `${topVei} concentra ${fmtPct(concVei)} do custo de manutenção`,
      descricao: `Um único veículo absorve ${fmtPct(concVei)} de todo o custo do período. Candidato a avaliação de viabilidade econômica.`,
      impacto: `Custo desproporcional: se o CPV > valor residual do veículo, descarte é mais econômico`,
      acao: "Calcular custo acumulado de manutenção vs valor de mercado do veículo e decidir entre reformar ou substituir" });
  }

  // Peças vs MO
  const percPecas = custo > 0 ? (pecas / custo) * 100 : 0;
  ins.push({ id: 0, tipo: percPecas >= 65 ? "atencao" : "oportunidade",
    titulo: `Peças: ${fmtPct(percPecas)} do custo total`,
    descricao: `${fmtBRL(pecas)} em peças vs ${fmtBRL(mo)} em mão de obra. ${percPecas >= 65 ? "Alta proporção de peças pode indicar frota envelhecida ou reposição sem preventiva." : "Distribuição equilibrada entre peças e serviços."}`,
    impacto: "Custo de peças cresce aceleradamente em frotas sem preventiva regular",
    acao: percPecas >= 65 ? "Avaliar programa de revisão periódica para antecipar trocas de consumíveis" : "Manter política atual de manutenção preventiva" });

  // OS externas sem fornecedor
  if (semForn > 0) {
    ins.push({ id: 0, tipo: "atencao",
      titulo: `${semForn} OS externas sem fornecedor cadastrado`,
      descricao: `Ordens de serviço externas sem fornecedor identificado dificultam rastreabilidade e auditoria de gastos.`,
      impacto: "Risco de pagamento sem controle e impossibilidade de auditar histórico",
      acao: "Obrigar preenchimento de fornecedor em todas as OS externas antes do fechamento" });
  }

  // OS sem MO mas com peças
  if (semMO > 0) {
    ins.push({ id: 0, tipo: "atencao",
      titulo: `${semMO} OS com peças mas sem mão de obra lançada`,
      descricao: `Possível sub-lançamento de mão de obra ou serviços executados sem registro adequado.`,
      impacto: "Custo real da manutenção pode estar subestimado no sistema",
      acao: "Revisar OS sem MO e regularizar lançamento antes do fechamento do período" });
  }

  // Top fornecedor
  if (rankForn.length > 0) {
    const topF = rankForn[0];
    const percF = custo > 0 ? (topF.custo / custo) * 100 : 0;
    if (percF >= 35) {
      ins.push({ id: 0, tipo: "atencao",
        titulo: `${topF.fornecedor} representa ${fmtPct(percF)} do custo externo`,
        descricao: `Alta dependência de um único fornecedor de manutenção limita poder de negociação.`,
        impacto: "Risco de reajuste de preço sem alternativa competitiva",
        acao: "Qualificar ao menos 2 fornecedores alternativos para os serviços mais frequentes" });
    }
  }

  // Classificação dominante
  if (distClassif.length > 0) {
    const top1 = distClassif[0];
    const percC = custo > 0 ? (top1.custo / custo) * 100 : 0;
    if (percC >= 40) {
      ins.push({ id: 0, tipo: "oportunidade",
        titulo: `"${top1.classificacao}" domina com ${fmtPct(percC)} do custo`,
        descricao: `Classificação mais cara do período. Concentração em um tipo de serviço pode abrir espaço para contrato específico.`,
        impacto: "Volume previsível nesta categoria permite negociar preço por volume",
        acao: "Negociar contrato de volume com fornecedores especializados nesta classificação" });
    }
  }

  return pick(ins);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FROTA
// ═══════════════════════════════════════════════════════════════════════════════
function gerarFrota(d: Record<string, unknown>): AIInsight[] {
  const total = n(d.totalVeiculos);
  const ativos = n(d.veiculosAtivos);
  const inativos = n(d.veiculosInativos);
  const percAtivos = n(d.percAtivos);
  const idadeMedia = n(d.idadeMediaAnos);
  const custoTotal = n(d.custoTotalManutencao);
  const custoMedio = n(d.custoMedioPorVeiculo);
  const ordensAbertas = n(d.ordensAbertas);
  const maiores10 = n(d.veiculosMaiores10Anos);
  const maiores15 = n(d.veiculosMaiores15Anos);
  const top10 = (d.top10MaioresGastos as { nome: string; custo: number; ordens: number; marca: string; multiplo: number }[]) ?? [];
  const distMarca = (d.distMarca as { marca: string; qtd: number }[]) ?? [];
  const distClassif = (d.distClassificacao as { classificacao: string; qtd: number }[]) ?? [];
  const ins: AIInsight[] = [];

  // Taxa de atividade
  ins.push({ id: 0, tipo: percAtivos < 70 ? "alerta" : percAtivos < 85 ? "atencao" : "positivo",
    titulo: `${fmtPct(percAtivos)} da frota operacional (${ativos}/${total})`,
    descricao: `${inativos} veículos inativos. ${percAtivos < 70 ? "Taxa crítica — muitos veículos parados gerando custo fixo sem retorno." : percAtivos < 85 ? "Taxa abaixo do ideal de 90%+." : "Boa disponibilidade operacional."}`,
    impacto: `Custo fixo de ${inativos} veículo(s) sem produzir receita`,
    acao: percAtivos < 85 ? "Revisar veículos inativos: definir prazo para retorno, descarte ou venda" : "Manter programa de manutenção preventiva para sustentar disponibilidade" });

  // Frota envelhecida
  if (maiores15 > 0) {
    ins.push({ id: 0, tipo: "alerta",
      titulo: `${maiores15} veículo(s) com mais de 15 anos de uso`,
      descricao: `Veículos com 15+ anos têm custo de manutenção 5-8x maior e risco elevado de parada não planejada. Idade média da frota: ${idadeMedia.toFixed(1)} anos.`,
      impacto: "Cada ano adicional após 10 anos aumenta exponencialmente o custo de manutenção corretiva",
      acao: "Priorizar substituição dos veículos mais antigos no próximo ciclo de renovação de frota" });
  } else if (maiores10 > 0) {
    ins.push({ id: 0, tipo: "atencao",
      titulo: `${maiores10} veículo(s) com mais de 10 anos`,
      descricao: `Frota com idade média de ${idadeMedia.toFixed(1)} anos. Veículos acima de 10 anos demandam atenção redobrada em manutenção.`,
      impacto: "Risco crescente de custo de manutenção e parada não planejada",
      acao: "Elaborar plano de renovação priorizando os veículos mais antigos e com maior custo acumulado" });
  }

  // OS abertas
  if (ordensAbertas > 0) {
    const percOSAbertas = total > 0 ? (ordensAbertas / total) * 100 : 0;
    ins.push({ id: 0, tipo: percOSAbertas > 20 ? "alerta" : "atencao",
      titulo: `${ordensAbertas} OS abertas (${fmtPct(percOSAbertas)} da frota)`,
      descricao: `Volume de ordens em aberto indica veículos imobilizados aguardando manutenção.`,
      impacto: "Veículos em manutenção não geram receita mas mantêm custo fixo",
      acao: "Monitorar SLA de execução das OS e acionar oficina para priorizar veículos críticos" });
  }

  // Veículo outlier de custo
  if (top10.length > 0) {
    const top1 = top10[0];
    if (top1.multiplo >= 3) {
      ins.push({ id: 0, tipo: "atencao",
        titulo: `${top1.nome} custa ${top1.multiplo}x a média da frota`,
        descricao: `${fmtBRL(top1.custo)} em ${top1.ordens} OS, vs média de ${fmtBRL(custoMedio)}. Marca: ${top1.marca}.`,
        impacto: `Custo excedente vs média: ${fmtBRL(top1.custo - custoMedio)}`,
        acao: "Realizar laudo técnico para decidir entre reforma profunda ou substituição do veículo" });
    }
  }

  // Concentração de marca
  if (distMarca.length > 0) {
    const topMarca = distMarca[0];
    const percMarca = total > 0 ? (topMarca.qtd / total) * 100 : 0;
    if (percMarca >= 60) {
      ins.push({ id: 0, tipo: "oportunidade",
        titulo: `${topMarca.marca} domina ${fmtPct(percMarca)} da frota (${topMarca.qtd} veíc.)`,
        descricao: `Alta concentração de marca cria oportunidade de negociar contrato de manutenção e peças por volume.`,
        impacto: "Poder de barganha com fornecedor oficial da marca",
        acao: "Negociar contrato de manutenção preventiva com a concessionária da marca dominante" });
    }
  }

  // Diversidade de classificação
  if (distClassif.length >= 3) {
    const classifs = distClassif.slice(0, 3).map(c => `${c.classificacao} (${c.qtd})`).join(", ");
    ins.push({ id: 0, tipo: "positivo",
      titulo: `Frota diversificada: ${distClassif.length} tipos de veículo`,
      descricao: `Principais: ${classifs}. Diversidade garante flexibilidade operacional para diferentes tipos de carga/serviço.`,
      impacto: "Capacidade de atender diferentes demandas operacionais sem terceirização",
      acao: "Mapear utilização real por classificação para identificar ociosidade específica por tipo" });
  }

  return pick(ins);
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERACIONAL
// ═══════════════════════════════════════════════════════════════════════════════
function gerarOperacional(d: Record<string, unknown>): AIInsight[] {
  const emAndamento = n(d.viagensEmAndamento);
  const emManutencao = n(d.emManutencao);
  const comAtraso = n(d.comAtraso);
  const percAtraso = n(d.percAtraso);
  const percMedio = n(d.percMedioCompleto);
  const prevUltrapassada = n(d.prevUltrapassada);
  const divergentes = n(d.itensDivergentes);
  const semGps = n(d.semGps);
  const total = n(d.totalViagens);
  const completas = n(d.viagensCompletas);
  const naoIniciadas = n(d.viagensNaoIniciadas);
  const qtdMotoristas = n(d.qtdMotoristas);
  const qtdClientes = n(d.qtdClientes);
  const distSituacao = (d.distSituacao as { situacao: string; qtd: number }[]) ?? [];
  const ins: AIInsight[] = [];

  // GPS ausente
  if (semGps > 0) {
    ins.push({ id: 0, tipo: "alerta",
      titulo: `${semGps} veículo(s) sem sinal GPS`,
      descricao: `Rastreamento inativo compromete visibilidade da operação, segurança e resposta a incidentes.`,
      impacto: "Veículo sem GPS não pode ser monitorado: risco de desvio de rota, acidente ou sinistro sem registro",
      acao: "Verificar dispositivos GPS imediatamente e acionar manutenção técnica de rastreamento" });
  }

  // Atrasos
  if (comAtraso > 0) {
    ins.push({ id: 0, tipo: percAtraso >= 30 ? "alerta" : percAtraso >= 15 ? "atencao" : "oportunidade",
      titulo: `${comAtraso} viagem(ns) em atraso (${fmtPct(percAtraso)} do total em andamento)`,
      descricao: `${emAndamento} em andamento, ${comAtraso} atrasadas. ${percAtraso >= 30 ? "Nível crítico de pontualidade." : ""}`,
      impacto: "Cada atraso é risco de multa contratual, insatisfação e perda de cliente",
      acao: "Contatar motoristas em atraso, comunicar clientes proativamente e mapear causas recorrentes" });
  }

  // Previsão ultrapassada
  if (prevUltrapassada > 0) {
    ins.push({ id: 0, tipo: "alerta",
      titulo: `${prevUltrapassada} viagem(ns) com previsão de chegada ultrapassada`,
      descricao: `Viagens que deveriam ter chegado e ainda não chegaram. Risco de incidente ou problema operacional grave.`,
      impacto: "Carga não entregue impacta SLA, gera custo de espera e risco de perda",
      acao: "Acionar motoristas imediatamente e verificar se há necessidade de socorro ou assistência" });
  }

  // Veículos em manutenção
  if (emManutencao > 0) {
    const percManut = total > 0 ? (emManutencao / total) * 100 : 0;
    ins.push({ id: 0, tipo: percManut >= 20 ? "atencao" : "oportunidade",
      titulo: `${emManutencao} veículo(s) em manutenção (${fmtPct(percManut)} da frota monitorada)`,
      descricao: `Capacidade operacional reduzida por manutenção. ${percManut >= 20 ? "Volume alto pode impactar atendimento de demanda." : "Dentro do normal para o dia."}`,
      impacto: "Redução de capacidade pode exigir subcontratação ou recusa de carga",
      acao: percManut >= 20 ? "Avaliar terceirização de rotas para cobrir veículos em manutenção" : "Monitorar retorno dos veículos para reintegração rápida" });
  }

  // Itens divergentes
  if (divergentes > 0) {
    ins.push({ id: 0, tipo: "atencao",
      titulo: `${divergentes} item(ns) com divergência`,
      descricao: `Diferenças entre itens planejados e executados indicam problemas de coleta, entrega ou conferência.`,
      impacto: "Divergências geram retrabalho, custo de devolução e risco de perda de carga",
      acao: "Auditar itens divergentes e identificar se é falha de sistema ou operacional recorrente" });
  }

  // Progresso e viagens não iniciadas
  if (naoIniciadas > 0 && total > 5) {
    const percNI = total > 0 ? (naoIniciadas / total) * 100 : 0;
    ins.push({ id: 0, tipo: "atencao",
      titulo: `${naoIniciadas} viagem(ns) ainda não iniciadas (${fmtPct(percNI)})`,
      descricao: `Viagens com 0% de progresso e não em manutenção. Motoristas ou cargas ainda não saíram.`,
      impacto: "Atrasos no início geram efeito cascata no prazo de entrega",
      acao: "Verificar com motoristas e operação a causa do não início e priorizar saída" });
  }

  // Eficiência geral
  ins.push({ id: 0, tipo: percMedio >= 75 ? "positivo" : "oportunidade",
    titulo: `Progresso médio: ${percMedio.toFixed(0)}% em ${total} viagens`,
    descricao: `${completas} viagem(ns) concluída(s). ${qtdMotoristas} motorista(s) ativos atendendo ${qtdClientes} cliente(s).`,
    impacto: "Visão consolidada do andamento operacional do dia",
    acao: percMedio >= 75 ? "Preparar equipe para recepção e conferência das entregas finais" : "Intensificar monitoramento para antecipar desvios nas viagens em andamento" });

  return pick(ins);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RH
// ═══════════════════════════════════════════════════════════════════════════════
function gerarRh(d: Record<string, unknown>): AIInsight[] {
  const ativos = n(d.colaboradoresAtivos);
  const admissoes = n(d.admissoesNoPeriodo);
  const demissoes = n(d.demissoesNoPeriodo);
  const turnover = n(d.taxaTurnover);
  const mediaAnos = n(d.mediaTempoCasa);
  const cnh30 = n(d.cnhVencendo30d);
  const cnh60 = n(d.cnhVencendo60d);
  const cnhVencidas = n(d.cnhVencidas);
  const semCnh = n(d.semCnh);
  const semCpf = n(d.semCpf);
  const topMotivo = s(d.topMotivoDemissao);
  const distFuncao = (d.distFuncao as { funcao: string; qtd: number }[]) ?? [];
  const distCatCnh = (d.distCatCnh as { categoria: string; qtd: number }[]) ?? [];
  const distTipo = (d.distTipo as { tipo: string; qtd: number }[]) ?? [];
  const distSexo = (d.distSexo as { sexo: string; qtd: number }[]) ?? [];
  const distTempoCasa = (d.distTempoCasa as { faixa: string; qtd: number }[]) ?? [];
  const distMotivoDem = (d.distMotivoDem as { motivo: string; qtd: number }[]) ?? [];
  const evolucao = (d.evolucaoMensal as { mes: string; admissoes: number; demissoes: number }[]) ?? [];
  const ins: AIInsight[] = [];

  // CNH vencidas — crítico imediato
  if (cnhVencidas > 0) {
    ins.push({ id: 0, tipo: "alerta",
      titulo: `${cnhVencidas} CNH vencida(s) — motoristas ilegais na frota`,
      descricao: `Motoristas com CNH vencida não podem conduzir veículos comerciais. Infração grave com responsabilidade da empresa.`,
      impacto: "Risco jurídico severo, multa pesada e potencial interdição em caso de acidente",
      acao: "Afastar imediatamente do volante e notificar formalmente para renovação urgente" });
  }

  // CNH vencendo 30d
  if (cnh30 > 0) {
    ins.push({ id: 0, tipo: "atencao",
      titulo: `${cnh30} CNH(s) vencendo em até 30 dias`,
      descricao: `${cnh60 > 0 ? `Outros ${cnh60} vencem em 31–60 dias.` : ""} Agir antes do vencimento evita afastamento abrupto.`,
      impacto: `Risco de indisponibilidade de ${cnh30 + cnh60} motorista(s) em breve`,
      acao: "Notificar individualmente e exigir comprovante de renovação agendada esta semana" });
  }

  // Motoristas sem CNH
  if (semCnh > 0) {
    ins.push({ id: 0, tipo: "alerta",
      titulo: `${semCnh} motorista(s) sem CNH cadastrada`,
      descricao: `Colaboradores em funções operacionais sem habilitação registrada no sistema. Risco legal imediato.`,
      impacto: "Exposição a autuação grave e responsabilidade da empresa por acidente",
      acao: "Regularizar cadastro ou afastar das funções de condução imediatamente" });
  }

  // Turnover
  if (turnover > 0) {
    ins.push({ id: 0, tipo: turnover >= 10 ? "alerta" : turnover >= 5 ? "atencao" : "positivo",
      titulo: `Turnover de ${fmtPct(turnover)} no período`,
      descricao: `${admissoes} admissões e ${demissoes} demissões${topMotivo ? `. Principal motivo: "${topMotivo}"` : ""}. ${turnover >= 10 ? "Taxa crítica, acima do padrão do setor." : ""}`,
      impacto: "Custo de reposição: 1,5 a 2 salários por colaborador substituído (seleção + treinamento)",
      acao: turnover >= 10 ? "Investigar causas de saída voluntária e revisar política de retenção urgentemente" : "Monitorar tendência mensal e agir preventivamente" });
  }

  // Motivo de demissão recorrente
  if (distMotivoDem.length > 0) {
    const top = distMotivoDem[0];
    const percMotivo = demissoes > 0 ? (top.qtd / demissoes) * 100 : 0;
    if (percMotivo >= 40 && top.motivo !== "Não informado") {
      ins.push({ id: 0, tipo: "atencao",
        titulo: `"${top.motivo}" causa ${fmtPct(percMotivo)} das demissões`,
        descricao: `${top.qtd} de ${demissoes} saídas por este motivo. Concentração indica problema estrutural, não isolado.`,
        impacto: "Causa recorrente gera custo de turnover previsível e evitável",
        acao: "Criar grupo de trabalho para endereçar a causa raiz deste motivo de demissão" });
    }
  }

  // Tempo de casa — equipe jovem/nova
  const novatos = distTempoCasa.find(f => f.faixa === "< 1 ano");
  const veteranos = distTempoCasa.find(f => f.faixa === "> 10 anos");
  if (novatos && ativos > 0) {
    const percNovatos = (novatos.qtd / ativos) * 100;
    if (percNovatos >= 35) {
      ins.push({ id: 0, tipo: "atencao",
        titulo: `${fmtPct(percNovatos)} da equipe tem menos de 1 ano (${novatos.qtd} colaboradores)`,
        descricao: `Alta proporção de colaboradores novos aumenta necessidade de treinamento e supervisão. ${veteranos ? `Apenas ${veteranos.qtd} com mais de 10 anos.` : ""}`,
        impacto: "Equipe inexperiente eleva risco operacional e reduz produtividade por período de adaptação",
        acao: "Fortalecer programa de onboarding e mentoria de novatos por colaboradores seniores" });
    }
  }

  // Categoria CNH — sem habilitação E/D
  const catE = distCatCnh.find(c => c.categoria === "E");
  const catD = distCatCnh.find(c => c.categoria === "D");
  const habilitadosCarga = (catE?.qtd ?? 0) + (catD?.qtd ?? 0);
  if (habilitadosCarga > 0 && ativos > 0) {
    const percHab = (habilitadosCarga / ativos) * 100;
    ins.push({ id: 0, tipo: percHab < 50 ? "atencao" : "positivo",
      titulo: `${fmtPct(percHab)} dos colaboradores habilitados para carga (Cat. D/E)`,
      descricao: `${habilitadosCarga} com CNH D/E de ${ativos} ativos. ${percHab < 50 ? "Capacidade operacional de condução pode ser limitante." : "Boa cobertura de motoristas habilitados."}`,
      impacto: percHab < 50 ? "Pode limitar cobertura de rotas sem motorista habilitado disponível" : "Frota de motoristas qualificados garante flexibilidade operacional",
      acao: percHab < 50 ? "Mapear necessidade de requalificação de colaboradores para categoria D ou E" : "Manter política de habilitação e atualização dos motoristas" });
  }

  // Cadastro incompleto
  if (semCpf > 0) {
    ins.push({ id: 0, tipo: "atencao",
      titulo: `${semCpf} colaborador(es) sem CPF cadastrado`,
      descricao: `Cadastros incompletos causam problemas no eSocial e impossibilitam emissão de documentos fiscais.`,
      impacto: "Risco de inconsistência nas obrigações acessórias e multa no eSocial",
      acao: "Regularizar cadastros com CPF faltante antes do próximo fechamento da folha" });
  }

  // Função dominante
  if (distFuncao.length > 0) {
    const topFunc = distFuncao[0];
    const percFunc = ativos > 0 ? (topFunc.qtd / ativos) * 100 : 0;
    ins.push({ id: 0, tipo: "oportunidade",
      titulo: `"${topFunc.funcao}" é a função dominante (${fmtPct(percFunc)}, ${topFunc.qtd} pessoas)`,
      descricao: `Maior grupo funcional de ${ativos} colaboradores. ${distFuncao.length} funções distintas na equipe.`,
      impacto: "Concentração funcional define onde focam os investimentos em capacitação",
      acao: "Priorizar treinamentos e certificações para o maior grupo funcional" });
  }

  return pick(ins);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTAS A PAGAR
// ═══════════════════════════════════════════════════════════════════════════════
function gerarContasPagar(d: Record<string, unknown>): AIInsight[] {
  const vencido = n(d.totalVencido);
  const aberto = n(d.totalAberto);
  const pago = n(d.totalPago);
  const dpo = n(d.dpo);
  const concentracao = n(d.concentracaoTop3Fornecedores);
  const titulosProblema = n(d.titulosProblema);
  const custoAtraso = n(d.custoAtraso);
  const ins: AIInsight[] = [];

  if (vencido > 0) {
    ins.push({ id: 0, tipo: "alerta",
      titulo: `${fmtBRL(vencido)} em títulos vencidos sem pagamento`,
      descricao: `Inadimplência com fornecedores gera juros, multas e risco de bloqueio de crédito.`,
      impacto: `Custo estimado de atraso: ${fmtBRL(custoAtraso)}`,
      acao: "Priorizar pagamento dos títulos vencidos há mais tempo para evitar escalada de custo" });
  }
  if (dpo > 0) {
    ins.push({ id: 0, tipo: dpo > 45 ? "atencao" : "positivo",
      titulo: `DPO de ${dpo} dias`,
      descricao: `Prazo médio de pagamento de ${dpo} dias. ${dpo > 45 ? "Pode indicar dificuldade de caixa ou desorganização." : "Saudável."}`,
      impacto: dpo > 45 ? "Risco de restrição por fornecedores estratégicos" : "Bom equilíbrio de caixa",
      acao: dpo > 45 ? "Negociar prazos e organizar calendário de pagamentos" : "Manter disciplina de pagamento" });
  }
  if (concentracao > 70) {
    ins.push({ id: 0, tipo: "atencao",
      titulo: `Top 3 fornecedores: ${fmtPct(concentracao)} do total`,
      descricao: `Alta dependência reduz poder de negociação em renovações de contrato.`,
      impacto: "Reajuste de 10% nos principais fornecedores impacta diretamente o caixa",
      acao: "Qualificar fornecedores alternativos para reduzir concentração" });
  }
  if (titulosProblema > 0) {
    ins.push({ id: 0, tipo: "alerta",
      titulo: `${titulosProblema} título(s) com inconsistência`,
      descricao: `Títulos com dados incompletos que podem gerar pagamentos incorretos ou duplicados.`,
      impacto: "Risco de pagamento indevido ou duplicidade",
      acao: "Revisar e corrigir antes do próximo ciclo de pagamento" });
  }
  return pick(ins);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTAS A RECEBER
// ═══════════════════════════════════════════════════════════════════════════════
function gerarContasReceber(d: Record<string, unknown>): AIInsight[] {
  const vencido = n(d.totalVencido);
  const recebido = n(d.totalRecebido);
  const dso = n(d.dso);
  const concentracao = n(d.concentracaoTop3Clientes);
  const glosa = n(d.glosaPercentual);
  const inadimplentes = n(d.clientesInadimplentes);
  const ins: AIInsight[] = [];

  if (vencido > 0) {
    ins.push({ id: 0, tipo: "alerta",
      titulo: `${fmtBRL(vencido)} em recebíveis vencidos`,
      descricao: `Recebíveis em atraso comprimem caixa e podem exigir provisão para devedores duvidosos.`,
      impacto: "Impacto direto na liquidez e necessidade de capital de giro",
      acao: "Acionar cobrança ativa priorizando maiores valores e maior tempo de atraso" });
  }
  if (dso > 30) {
    ins.push({ id: 0, tipo: "atencao",
      titulo: `DSO de ${dso} dias — acima do ideal`,
      descricao: `Ciclo longo de recebimento pressiona capital de giro.`,
      impacto: "Cada 10 dias extras de DSO aumenta necessidade de capital de giro",
      acao: "Revisar política de prazo e oferecer desconto para pagamento antecipado" });
  }
  if (glosa >= 2) {
    ins.push({ id: 0, tipo: glosa >= 5 ? "alerta" : "atencao",
      titulo: `${fmtPct(glosa)} de glosa no período`,
      descricao: `Receita não recebida por erros operacionais ou divergências no faturamento.`,
      impacto: "Glosa é perda direta na margem operacional",
      acao: "Mapear causas das glosas e criar checklist de validação pré-faturamento" });
  }
  if (inadimplentes > 0) {
    ins.push({ id: 0, tipo: "atencao",
      titulo: `${inadimplentes} cliente(s) inadimplente(s)`,
      descricao: `Clientes com títulos vencidos sem regularização.`,
      impacto: "Pode exigir provisão contábil e impactar resultado do período",
      acao: "Acionar comercial para negociar parcelamento ou garantias com inadimplentes" });
  }
  return pick(ins);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPRAS
// ═══════════════════════════════════════════════════════════════════════════════
function gerarCompras(d: Record<string, unknown>): AIInsight[] {
  return [{ id: 1, tipo: "oportunidade",
    titulo: "Análise de compras disponível",
    descricao: "Os dados de compras estão carregados. Analise concentração de fornecedores e ticket médio.",
    impacto: "Consolidação de pedidos pode gerar descontos de volume",
    acao: "Identificar itens comprados em pequenas quantidades e negociar pedidos maiores" }];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAMENTO DE FROTA
// ═══════════════════════════════════════════════════════════════════════════════
function gerarFinanciamentoFrota(d: Record<string, unknown>): AIInsight[] {
  const saldo = n(d.saldoDevedor);
  const mensal = n(d.valorMensalTotal);
  const bancos = n(d.qtdBancos);
  const contratos = n(d.totalContratos);
  const ins: AIInsight[] = [];

  ins.push({ id: 0, tipo: saldo > 5000000 ? "atencao" : "positivo",
    titulo: `Saldo devedor: ${fmtBRL(saldo)} em ${contratos} contratos`,
    descricao: `Comprometimento fixo de ${fmtBRL(mensal)}/mês com financiamentos.`,
    impacto: "Custo fixo de caixa todo mês independente da receita",
    acao: "Avaliar amortização antecipada nos contratos com maior taxa de juros" });

  if (bancos > 1) {
    ins.push({ id: 0, tipo: "oportunidade",
      titulo: `${bancos} bancos credores — oportunidade de consolidação`,
      descricao: `Múltiplos credores permitem comparar taxas e negociar portabilidade.`,
      impacto: "Cada ponto percentual reduzido gera economia expressiva no saldo total",
      acao: "Solicitar propostas de refinanciamento usando histórico de pagamento como alavanca" });
  }

  return pick(ins);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════
function gerarPorSetor(setor: string, dados: Record<string, unknown>): AIInsight[] {
  switch (setor) {
    case "faturamento":         return gerarFaturamento(dados);
    case "abastecimento":       return gerarAbastecimento(dados);
    case "manutencao":          return gerarManutencao(dados);
    case "frota":               return gerarFrota(dados);
    case "operacional":         return gerarOperacional(dados);
    case "rh":                  return gerarRh(dados);
    case "contas_a_pagar":      return gerarContasPagar(dados);
    case "contas_a_receber":    return gerarContasReceber(dados);
    case "compras":             return gerarCompras(dados);
    case "financiamento_frota": return gerarFinanciamentoFrota(dados);
    default:                    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════
export function useAIInsights(): UseAIInsightsReturn {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    await new Promise(r => setTimeout(r, 250));

    try {
      const result = gerarPorSetor(setor, dados);
      if (result.length === 0) {
        setError("Sem dados suficientes para gerar insights");
      } else {
        setInsights(result);
        insightsCache.set(cacheKey, { insights: result, timestamp: Date.now() });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  const limpar = useCallback(() => { setInsights([]); setError(null); }, []);

  return { insights, loading, error, gerarInsights, limpar };
}
