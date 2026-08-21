import type { OrdemAgregada, DailyCost, VehicleSignal } from "@/lib/manutencaoUtils";

// ── parseLocalDate: evita UTC midnight shift em new Date("YYYY-MM-DD") ────────

function parseLocalDate(s: string): Date | null {
  const raw = s.split("T")[0];
  const parts = raw.split("-");
  if (parts.length !== 3) return null;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return isNaN(d.getTime()) ? null : d;
}

function diasAberto(dataordem: string): number {
  const d = parseLocalDate(dataordem);
  if (!d) return 0;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

// ── computeVehicleSignals: usa diasAberto corrigido ───────────────────────────

export function computeVehicleSignals(ordens: OrdemAgregada[]): VehicleSignal[] {
  const map = new Map<string, { ordens: OrdemAgregada[]; totalCusto: number }>();
  for (const o of ordens) {
    if (!o.veiculo || o.situacao === "CANCELADO") continue;
    const e = map.get(o.veiculo) ?? { ordens: [], totalCusto: 0 };
    e.ordens.push(o);
    e.totalCusto += o.totalCusto;
    map.set(o.veiculo, e);
  }

  const vehicleCosts = Array.from(map.values()).map(v => v.totalCusto);
  const avg =
    vehicleCosts.length > 0
      ? vehicleCosts.reduce((s, v) => s + v, 0) / vehicleCosts.length
      : 0;

  const result: VehicleSignal[] = [];
  for (const [veiculo, { ordens: vOrdens, totalCusto }] of map) {
    const cost = totalCusto > avg * 2;

    const stuckDiasArr = vOrdens
      .filter(o => o.situacao === "ANDAMENTO" && o.dataordem)
      .map(o => diasAberto(o.dataordem!));
    const stuckDias = stuckDiasArr.length > 0 ? Math.max(...stuckDiasArr) : 0;
    const stuck = stuckDias > 15;

    const repeatCount = vOrdens.filter(o =>
      o.classificacao?.toUpperCase().includes("CORRET")
    ).length;
    const repeat = repeatCount >= 2;

    const frequency = vOrdens.length >= 3;

    const revisional = vOrdens.some(
      o => o.classificacao?.toUpperCase().includes("REVIS") && o.situacao === "ANDAMENTO"
    );

    if (!cost && !stuck && !repeat && !frequency && !revisional) continue;

    result.push({
      veiculo,
      totalCusto,
      totalOrdens: vOrdens.length,
      signalCount: [cost, stuck, repeat, frequency, revisional].filter(Boolean).length,
      signals: { cost, stuck, stuckDias, repeat, repeatCount, frequency, revisional },
    });
  }

  return result.sort((a, b) => b.totalCusto - a.totalCusto);
}

// ── computeDailyCosts: usa parseLocalDate para evitar bug 30/06 ───────────────

export function computeDailyCosts(ordens: OrdemAgregada[]): DailyCost[] {
  const map = new Map<string, number>();
  for (const o of ordens) {
    if (!o.dataordem || o.situacao === "CANCELADO") continue;
    const d = parseLocalDate(o.dataordem);
    if (!d) continue;
    const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + o.totalCusto);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, custo]) => ({ date, custo }));
}
