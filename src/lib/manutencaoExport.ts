import * as XLSX from "xlsx";
import type { OrdemAgregada, ManutencaoKpis, VehicleSignal } from "./manutencaoUtils";

export interface ExportFilter {
  dataInicio: string | null;
  dataFim: string | null;
  filial: string | null;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

function signalDesc(v: VehicleSignal): string {
  const parts: string[] = [];
  if (v.signals.cost)      parts.push("Custo alto");
  if (v.signals.stuck)     parts.push(`OS parada (${v.signals.stuckDias}d)`);
  if (v.signals.repeat)    parts.push(`${v.signals.repeatCount} reincidências`);
  if (v.signals.frequency) parts.push("Alta frequência");
  if (v.signals.revisional) parts.push("Revisional em aberto");
  return parts.join(", ") || "Nenhum";
}

function signalRows(v: VehicleSignal): { sinal: string; descricao: string }[] {
  const rows: { sinal: string; descricao: string }[] = [];
  if (v.signals.cost)
    rows.push({ sinal: "Custo alto", descricao: `Custo do veículo (${fmtBRL(v.totalCusto)}) é mais de 2× a média da frota no período` });
  if (v.signals.stuck)
    rows.push({ sinal: "OS parada", descricao: `OS em andamento há ${v.signals.stuckDias} dias (limite: 15 dias)` });
  if (v.signals.repeat)
    rows.push({ sinal: "Reincidências", descricao: `${v.signals.repeatCount} OS corretivas registradas no período (gatilho: ≥ 2)` });
  if (v.signals.frequency)
    rows.push({ sinal: "Alta frequência", descricao: `${v.totalOrdens} OS abertas no período (gatilho: ≥ 3)` });
  if (v.signals.revisional)
    rows.push({ sinal: "Revisional em aberto", descricao: "OS revisional com situação ANDAMENTO" });
  return rows;
}

export function exportManutencaoXlsx(
  ordens: OrdemAgregada[],
  kpis: ManutencaoKpis,
  vehicleSignals: VehicleSignal[],
  filter: ExportFilter,
) {
  const wb = XLSX.utils.book_new();
  const periodoStr = [filter.dataInicio, filter.dataFim].filter(Boolean).join(" até ") || "Todos os períodos";
  const filialStr = filter.filial ?? "Todas as filiais";
  const totalGeral = ordens.reduce((s, o) => s + o.totalCusto, 0);
  const geradoEm = new Date().toLocaleString("pt-BR");

  // ── Aba 1: Resumo ──────────────────────────────────────────────────
  const resumo = [
    ["SGT Log — Relatório de Manutenção"],
    ["Gerado em:", geradoEm],
    ["Período:", periodoStr],
    ["Filial:", filialStr],
    ["Total de registros:", ordens.length],
    [],
    ["INDICADORES", "", ""],
    ["Indicador", "Valor", "Como é calculado"],
    [
      "Custo Total",
      fmtBRL(kpis.totalCusto),
      "Soma do campo 'custo' de todas as OS no período (ordens CANCELADAS excluídas)",
    ],
    [
      "Veículos em Atenção",
      kpis.veiculosEmAtencao,
      "Veículos com ao menos 1 sinal ativo (ver aba 'Veículos em Atenção' para detalhes de cada sinal)",
    ],
    [
      "OS em Andamento",
      kpis.osEmAndamento,
      "Contagem de OS com campo situacao = 'ANDAMENTO'",
    ],
    [
      "Custo Médio / OS",
      fmtBRL(kpis.custoMedioOS),
      `Custo Total ÷ ${kpis.totalOrdens} ordens = ${fmtBRL(kpis.custoMedioOS)}`,
    ],
    [],
    ["REGRAS DE NEGÓCIO", "", ""],
    ["Regra", "Detalhe", ""],
    ["OS CANCELADAS excluídas", "Situacao = CANCELADO: não entra em nenhum cálculo", ""],
    ["Sinal — Custo alto", "Custo total do veículo no período > 2× a média de todos os veículos", ""],
    ["Sinal — OS parada", "OS ANDAMENTO com mais de 15 dias em aberto desde a data da OS", ""],
    ["Sinal — Reincidências", "2 ou mais OS cuja classificação contém 'CORRET' (corretiva)", ""],
    ["Sinal — Alta frequência", "3 ou mais OS abertas no período, independente de situação", ""],
    ["Sinal — Revisional em aberto", "OS com classificação contendo 'REVIS' e situação = ANDAMENTO", ""],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 85 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // ── Aba 2: Ordens de Serviço ───────────────────────────────────────
  const osHeader = ["Ordem", "Veículo", "Filial", "Data", "Tipo", "Situação", "Classificação", "Fornecedor", "Custo (R$)"];
  const osRows = ordens.map(o => [
    o.ordem,
    o.veiculo || "—",
    o.filial || "—",
    fmtData(o.dataordem),
    o.tiposervico === "SERVICOEXTERNO" ? "Externo"
      : o.tiposervico === "SERVICOINTERNO" ? "Interno"
      : (o.tiposervico || "—"),
    o.situacao || "—",
    o.classificacao || "—",
    o.fornecedor || "—",
    o.totalCusto,
  ]);
  const wsOS = XLSX.utils.aoa_to_sheet([osHeader, ...osRows]);
  wsOS["!cols"] = [
    { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 12 },
    { wch: 10 }, { wch: 12 }, { wch: 24 }, { wch: 32 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOS, "Ordens de Serviço");

  // ── Aba 3: Custo por Veículo ──────────────────────────────────────
  const byVehicle = new Map<string, { custo: number; ordens: number }>();
  for (const o of ordens) {
    if (!o.veiculo) continue;
    const e = byVehicle.get(o.veiculo) ?? { custo: 0, ordens: 0 };
    e.custo += o.totalCusto;
    e.ordens += 1;
    byVehicle.set(o.veiculo, e);
  }
  const veiculoHeader = ["Veículo", "Total OS", "Custo Total (R$)", "% do Total", "Sinais Ativos"];
  const veiculoRows = Array.from(byVehicle.entries())
    .sort((a, b) => b[1].custo - a[1].custo)
    .map(([veiculo, { custo, ordens: total }]) => {
      const sig = vehicleSignals.find(v => v.veiculo === veiculo);
      return [
        veiculo,
        total,
        custo,
        totalGeral > 0 ? `${((custo / totalGeral) * 100).toFixed(1)}%` : "—",
        sig ? signalDesc(sig) : "Nenhum",
      ];
    });
  const wsVeiculo = XLSX.utils.aoa_to_sheet([veiculoHeader, ...veiculoRows]);
  wsVeiculo["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsVeiculo, "Custo por Veículo");

  // ── Aba 4: Custo por Fornecedor ───────────────────────────────────
  const byForn = new Map<string, { custo: number; ordens: number }>();
  for (const o of ordens) {
    const key = o.fornecedor?.trim() || "Não informado";
    const e = byForn.get(key) ?? { custo: 0, ordens: 0 };
    e.custo += o.totalCusto;
    e.ordens += 1;
    byForn.set(key, e);
  }
  const fornHeader = ["Fornecedor", "Total OS", "Custo Total (R$)", "% do Total"];
  const fornRows = Array.from(byForn.entries())
    .sort((a, b) => b[1].custo - a[1].custo)
    .map(([fornecedor, { custo, ordens: total }]) => [
      fornecedor,
      total,
      custo,
      totalGeral > 0 ? `${((custo / totalGeral) * 100).toFixed(1)}%` : "—",
    ]);
  const wsForn = XLSX.utils.aoa_to_sheet([fornHeader, ...fornRows]);
  wsForn["!cols"] = [{ wch: 42 }, { wch: 10 }, { wch: 16 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsForn, "Custo por Fornecedor");

  // ── Aba 5: Veículos em Atenção ─────────────────────────────────────
  const atencaoHeader = ["Veículo", "Total OS", "Custo Total (R$)", "Sinal", "Descrição do sinal"];
  const atencaoRows: (string | number)[][] = [];
  for (const v of vehicleSignals) {
    const sinais = signalRows(v);
    sinais.forEach((s, i) => {
      atencaoRows.push(
        i === 0
          ? [v.veiculo, v.totalOrdens, v.totalCusto, s.sinal, s.descricao]
          : ["", "", "", s.sinal, s.descricao],
      );
    });
  }
  const wsAtencao = XLSX.utils.aoa_to_sheet([atencaoHeader, ...atencaoRows]);
  wsAtencao["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 24 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsAtencao, "Veículos em Atenção");

  // ── Download ───────────────────────────────────────────────────────
  const date = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  XLSX.writeFile(wb, `manutencao-${date}.xlsx`);
}
