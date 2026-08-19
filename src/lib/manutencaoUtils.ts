import type { ManutencaoRow } from "@/lib/dwApi";

export interface OrdemAgregada {
  ordem: string;
  veiculo: string;
  dataordem: string | null;
  diasAberto: number | null;
  situacao: string | null;
  tiposervico: string | null;
  classificacao: string | null;
  fornecedor: string | null;
  filial: string | null;
  totalCusto: number;
  qtdItens: number;
}

export interface VehicleSignal {
  veiculo: string;
  totalCusto: number;
  totalOrdens: number;
  signalCount: number;
  signals: {
    stuck: boolean;
    stuckDias: number;
    cost: boolean;
    repeat: boolean;
    repeatCount: number;
    frequency: boolean;
    revisional: boolean;
  };
}

export interface ManutencaoKpis {
  totalCusto: number;
  veiculosEmAtencao: number;
  osEmAndamento: number;
  custoMedioOS: number;
  totalOrdens: number;
}

export interface FornecedorItem {
  fornecedor: string;
  totalCusto: number;
  share: number;
}

export interface DailyCost {
  date: string;
  custo: number;
}

const TODAY = Date.now();

function diasAberto(dataordem: string | null): number | null {
  if (!dataordem) return null;
  const d = new Date(dataordem);
  return isNaN(d.getTime()) ? null : Math.floor((TODAY - d.getTime()) / 86_400_000);
}

/** Groups ManutencaoRow[] by ordem. Excludes CANCELADO. */
export function aggregateOrdens(rows: ManutencaoRow[]): OrdemAgregada[] {
  const map = new Map<string, OrdemAgregada>();
  for (const r of rows) {
    if (r.situacao === "CANCELADO") continue;
    const key = String(r.ordem ?? "");
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, {
        ordem: key,
        veiculo: String(r.veiculo ?? ""),
        dataordem: r.dataordem ?? null,
        diasAberto: diasAberto(r.dataordem ?? null),
        situacao: r.situacao ?? null,
        tiposervico: r.tiposervico ?? null,
        classificacao: r.classificacao ?? null,
        fornecedor: r.fornecedor ?? null,
        filial: r.filial ?? null,
        totalCusto: 0,
        qtdItens: 0,
      });
    }
    const agg = map.get(key)!;
    agg.totalCusto += r.custo ?? 0;
    agg.qtdItens += 1;
  }
  return Array.from(map.values());
}

/** Returns vehicles with at least 1 active signal, sorted by signalCount desc then totalCusto desc. */
export function computeVehicleSignals(ordens: OrdemAgregada[]): VehicleSignal[] {
  // Group by vehicle
  const byVehicle = new Map<string, OrdemAgregada[]>();
  for (const o of ordens) {
    if (!o.veiculo) continue;
    if (!byVehicle.has(o.veiculo)) byVehicle.set(o.veiculo, []);
    byVehicle.get(o.veiculo)!.push(o);
  }

  // Compute cost mean across all vehicles (for cost signal threshold)
  const perVehicleCosts: number[] = [];
  byVehicle.forEach(ords => {
    perVehicleCosts.push(ords.reduce((s, o) => s + o.totalCusto, 0));
  });
  const meanCost = perVehicleCosts.length
    ? perVehicleCosts.reduce((a, b) => a + b, 0) / perVehicleCosts.length
    : 0;

  const results: VehicleSignal[] = [];

  byVehicle.forEach((ords, veiculo) => {
    const totalCusto = ords.reduce((s, o) => s + o.totalCusto, 0);
    const totalOrdens = ords.length;

    // Signal: stuck — any OS ANDAMENTO with diasAberto > 15
    const stuckOS = ords.filter(
      o => o.situacao === "ANDAMENTO" && o.diasAberto !== null && o.diasAberto > 15
    );
    const stuck = stuckOS.length > 0;
    const stuckDias = stuck ? Math.max(...stuckOS.map(o => o.diasAberto!)) : 0;

    // Signal: cost — vehicle total > 2× mean
    const cost = meanCost > 0 && totalCusto > 2 * meanCost;

    // Signal: repeat — 2+ corrective OS
    const correctiveOS = ords.filter(o =>
      o.classificacao?.toUpperCase().includes("CORRET")
    );
    const repeat = correctiveOS.length >= 2;
    const repeatCount = correctiveOS.length;

    // Signal: frequency — 3+ OS in period
    const frequency = totalOrdens >= 3;

    // Signal: revisional — any revisional OS still ANDAMENTO
    const revisional = ords.some(
      o =>
        o.classificacao?.toUpperCase().includes("REVIS") &&
        o.situacao === "ANDAMENTO"
    );

    const signalCount = [stuck, cost, repeat, frequency, revisional].filter(Boolean).length;

    if (signalCount === 0) return;

    results.push({
      veiculo,
      totalCusto,
      totalOrdens,
      signalCount,
      signals: { stuck, stuckDias, cost, repeat, repeatCount, frequency, revisional },
    });
  });

  return results.sort((a, b) =>
    b.signalCount !== a.signalCount
      ? b.signalCount - a.signalCount
      : b.totalCusto - a.totalCusto
  ).slice(0, 10);
}

export function computeKpis(ordens: OrdemAgregada[], vehicleSignals: VehicleSignal[]): ManutencaoKpis {
  const totalCusto = ordens.reduce((s, o) => s + o.totalCusto, 0);
  const osEmAndamento = ordens.filter(o => o.situacao === "ANDAMENTO").length;
  const totalOrdens = ordens.length;
  return {
    totalCusto,
    veiculosEmAtencao: vehicleSignals.length,
    osEmAndamento,
    custoMedioOS: totalOrdens > 0 ? totalCusto / totalOrdens : 0,
    totalOrdens,
  };
}

export function computeFornecedorRanking(ordens: OrdemAgregada[]): FornecedorItem[] {
  const map = new Map<string, number>();
  for (const o of ordens) {
    const key = o.fornecedor?.trim() || "Não informado";
    map.set(key, (map.get(key) ?? 0) + o.totalCusto);
  }
  const sorted = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  const maxCost = sorted[0]?.[1] || 1;
  return sorted.map(([fornecedor, totalCusto]) => ({
    fornecedor,
    totalCusto,
    share: totalCusto / maxCost,
  }));
}

export function computeDailyCosts(ordens: OrdemAgregada[]): DailyCost[] {
  const map = new Map<string, { custo: number; dateObj: Date }>();
  for (const o of ordens) {
    if (!o.dataordem) continue;
    const d = new Date(o.dataordem);
    if (isNaN(d.getTime())) continue;
    const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const existing = map.get(key);
    if (existing) {
      existing.custo += o.totalCusto;
    } else {
      map.set(key, { custo: o.totalCusto, dateObj: d });
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => a[1].dateObj.getTime() - b[1].dateObj.getTime())
    .map(([date, { custo }]) => ({ date, custo }));
}
