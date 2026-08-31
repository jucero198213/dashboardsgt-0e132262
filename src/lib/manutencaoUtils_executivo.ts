import type { ManutencaoRow } from "@/lib/dwApi";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export interface KpisExecutivo {
  custoTotal:  number;
  custoPeca:   number;
  custoMO:     number;
  custoPlano:  number;
  indicador:   number; // % plano / total
}

export interface MonthlyCost {
  mes:   string; // "Jan", "Fev"...
  custo: number;
}

export interface TipoOsItem {
  tipo:  string;
  custo: number;
  pct:   number;
}

export interface TopCatItem {
  cat:   string;
  custo: number;
  pct:   number;
}

export interface TopVeiculoItem {
  veiculo: string;
  peca:    number;
  mo:      number;
}

export interface TopFornItem {
  fornecedor: string;
  peca:       number;
  mo:         number;
}

// ── KPIs executivo ────────────────────────────────────────────────────────────
export function computeKpisExecutivo(rows: ManutencaoRow[]): KpisExecutivo {
  let custoTotal = 0, custoPeca = 0, custoMO = 0, custoPlano = 0;
  for (const r of rows) {
    const custo = r.custo ?? 0;
    custoTotal += custo;
    if (r.tipoprod === "PLANOMANUTENCAO") {
      custoPlano += custo;
    } else {
      // Usa a proporção valorpc/valormo para repartir r.custo entre peça e MO,
      // evitando somar preços unitários de itens diretamente.
      const peca      = (r.valorpc ?? 0) + (r.valorpc2 ?? 0);
      const mo        = (r.valormo ?? 0) + (r.valormo2 ?? 0);
      const breakdown = peca + mo;
      if (breakdown > 0) {
        custoPeca += custo * (peca / breakdown);
        custoMO   += custo * (mo  / breakdown);
      } else {
        custoPeca += custo * 0.5;
        custoMO   += custo * 0.5;
      }
    }
  }
  const indicador = custoTotal > 0 ? (custoPlano / custoTotal) * 100 : 0;
  return { custoTotal, custoPeca, custoMO, custoPlano, indicador };
}

// ── Custo mês a mês ───────────────────────────────────────────────────────────
export function computeMonthlyCosts(rows: ManutencaoRow[]): MonthlyCost[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.dataordem || !r.custo) continue;
    const d = new Date(r.dataordem);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + r.custo);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, custo]) => {
      const month = parseInt(key.split("-")[1]) - 1;
      return { mes: MESES[month], custo };
    });
}

// ── Tipo de OS (donut) ────────────────────────────────────────────────────────
export function computeTipoOS(rows: ManutencaoRow[]): TipoOsItem[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.tiposervico || !r.custo) continue;
    const label = r.tiposervico === "SERVICOEXTERNO" ? "Serviço Externo" : "Serviço Interno";
    map.set(label, (map.get(label) ?? 0) + r.custo);
  }
  const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([tipo, custo]) => ({ tipo, custo, pct: total > 0 ? (custo / total) * 100 : 0 }));
}

// ── Top N por classificação ───────────────────────────────────────────────────
export function computeTopClassificacao(rows: ManutencaoRow[], n = 10): TopCatItem[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.custo) continue;
    const key = r.classificacao?.trim() || "Não classificado";
    map.set(key, (map.get(key) ?? 0) + r.custo);
  }
  const sorted = Array.from(map.entries()).sort(([, a], [, b]) => b - a).slice(0, n);
  const total  = sorted.reduce((s, [, v]) => s + v, 0);
  return sorted.map(([cat, custo]) => ({ cat, custo, pct: total > 0 ? (custo / total) * 100 : 0 }));
}

// ── Top N veículos (peça + MO) ────────────────────────────────────────────────
export function computeTopVeiculos(rows: ManutencaoRow[], n = 5): TopVeiculoItem[] {
  const map = new Map<string, { peca: number; mo: number }>();
  for (const r of rows) {
    const key = String(r.veiculo ?? "Não informado");
    if (!map.has(key)) map.set(key, { peca: 0, mo: 0 });
    const e = map.get(key)!;
    e.peca += (r.valorpc ?? 0) + (r.valorpc2 ?? 0);
    e.mo   += (r.valormo ?? 0) + (r.valormo2 ?? 0);
  }
  return Array.from(map.entries())
    .map(([veiculo, v]) => ({ veiculo, ...v }))
    .sort((a, b) => (b.peca + b.mo) - (a.peca + a.mo))
    .slice(0, n);
}

// ── Top N fornecedores (peça + MO) ───────────────────────────────────────────
export function computeTopFornecedores(rows: ManutencaoRow[], n = 5): TopFornItem[] {
  const map = new Map<string, { peca: number; mo: number }>();
  for (const r of rows) {
    const key = r.fornecedor?.trim() || "Não informado";
    if (!map.has(key)) map.set(key, { peca: 0, mo: 0 });
    const e = map.get(key)!;
    e.peca += (r.valorpc ?? 0) + (r.valorpc2 ?? 0);
    e.mo   += (r.valormo ?? 0) + (r.valormo2 ?? 0);
  }
  return Array.from(map.entries())
    .map(([fornecedor, v]) => ({ fornecedor, ...v }))
    .sort((a, b) => (b.peca + b.mo) - (a.peca + a.mo))
    .slice(0, n);
}
