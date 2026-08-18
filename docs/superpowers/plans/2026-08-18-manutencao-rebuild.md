# Manutenção Page Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `src/pages/Manutencao.tsx` with a clean alert-first layout that answers "quais veículos precisam de atenção?" and "onde estou gastando mais?" without vertical scroll.

**Architecture:** Pure-function data layer in `src/lib/manutencaoUtils.ts`; four focused sub-components under `src/components/manutencao/`; main page wires everything together and owns all state. No new context, no new API calls.

**Tech Stack:** React + TypeScript, shadcn/ui (Card, Sheet, Select, Input, Badge, Skeleton, ScrollArea, Table), Recharts (BarChart), Lucide icons, Tailwind v3, `cn()` from `@/lib/utils`.

**Spec:** `docs/superpowers/specs/2026-08-18-manutencao-rebuild-design.md`

## Global Constraints

- Design system: shadcn `Card` (`bg-card border-border rounded-xl`) only — zero custom card surfaces or inline background colors on card containers.
- Palette for data: violet (`text-violet-400`), indigo (`text-indigo-400`), amber (`text-amber-400`), rose (`text-rose-400`), orange (`text-orange-400`), emerald (`text-emerald-400`) — only on icons, badges, signal chips. Never on card backgrounds.
- Typography: eyebrow labels `text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground`; values `font-black tracking-tight text-foreground`; body `text-sm text-muted-foreground`.
- Imports: `@/components/ui/*`, `@/lib/dwApi` (types + fetch), `@/lib/utils` (`cn`), `@/components/indicators/KpiCard`.
- No score number, no score bar. Signals are the only ranking mechanism.
- All verification steps are browser-based (no test framework in project).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/manutencaoUtils.ts` | **Create** | Pure functions: aggregate rows → ordens; compute vehicle signals; compute KPIs; compute fornecedor ranking; compute daily costs |
| `src/components/manutencao/VehicleAttentionPanel.tsx` | **Create** | Renders vehicle list with signal chips; emits `onSelectVeiculo` |
| `src/components/manutencao/FornecedorRanking.tsx` | **Create** | Top-7 fornecedor card with proportional bars |
| `src/components/manutencao/CustoMiniChart.tsx` | **Create** | Mini daily cost bar chart (72px height, no axes) |
| `src/components/manutencao/OsSheet.tsx` | **Create** | Sheet with search + filters + full OS table |
| `src/pages/Manutencao.tsx` | **Rewrite** | Wires everything; owns all state; KPI row + 2-col grid + Sheet trigger |

---

## Task 1: Data utility functions (`src/lib/manutencaoUtils.ts`)

**Files:**
- Create: `src/lib/manutencaoUtils.ts`

**Interfaces — Produces (used by all later tasks):**

```ts
// OrdemAgregada — one row per OS (ordem unique)
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
  totalCusto: number;   // sum of custo across all items in this OS
  qtdItens: number;
}

// VehicleSignals — one record per vehicle with active signals
export interface VehicleSignal {
  veiculo: string;
  totalCusto: number;
  totalOrdens: number;
  signalCount: number;
  signals: {
    stuck: boolean;       // any OS ANDAMENTO > 15 dias
    stuckDias: number;    // max diasAberto of stuck OS (0 if none)
    cost: boolean;        // totalCusto > 2× mean across vehicles
    repeat: boolean;      // 2+ corrective OS
    repeatCount: number;  // count of corrective OS
    frequency: boolean;   // 3+ OS in period
    revisional: boolean;  // any revisional OS still ANDAMENTO
  };
}

// ManutencaoKpis
export interface ManutencaoKpis {
  totalCusto: number;
  veiculosEmAtencao: number;   // vehicles with signalCount > 0
  osEmAndamento: number;       // ordens with situacao === "ANDAMENTO"
  custoMedioOS: number;        // totalCusto / count of unique ordens
  totalOrdens: number;
}

// FornecedorItem
export interface FornecedorItem {
  fornecedor: string;
  totalCusto: number;
  share: number;  // 0–1, fraction of max cost (for bar width)
}

// DailyCost
export interface DailyCost {
  date: string;   // "DD/MM"
  custo: number;
}
```

- [ ] **Step 1: Create `src/lib/manutencaoUtils.ts` with `aggregateOrdens`**

```ts
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
```

- [ ] **Step 2: Add `computeVehicleSignals` to the same file**

```ts
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
```

- [ ] **Step 3: Add `computeKpis`, `computeFornecedorRanking`, `computeDailyCosts` to the same file**

```ts
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
  const maxCost = sorted[0]?.[1] ?? 1;
  return sorted.map(([fornecedor, totalCusto]) => ({
    fornecedor,
    totalCusto,
    share: totalCusto / maxCost,
  }));
}

export function computeDailyCosts(ordens: OrdemAgregada[]): DailyCost[] {
  const map = new Map<string, number>();
  for (const o of ordens) {
    if (!o.dataordem) continue;
    const d = new Date(o.dataordem);
    if (isNaN(d.getTime())) continue;
    const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    map.set(key, (map.get(key) ?? 0) + o.totalCusto);
  }
  return Array.from(map.entries())
    .sort((a, b) => {
      const [da, ma] = a[0].split("/").map(Number);
      const [db, mb] = b[0].split("/").map(Number);
      return ma !== mb ? ma - mb : da - db;
    })
    .map(([date, custo]) => ({ date, custo }));
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/manutencaoUtils.ts
git commit -m "feat(manutencao): funções utilitárias de agregação e sinais"
```

---

## Task 2: `VehicleAttentionPanel` component

**Files:**
- Create: `src/components/manutencao/VehicleAttentionPanel.tsx`

**Interfaces:**
- Consumes: `VehicleSignal` from `@/lib/manutencaoUtils`
- Produces: `<VehicleAttentionPanel vehicles={VehicleSignal[]} onSelectVeiculo={(v: string) => void} />`

- [ ] **Step 1: Create `src/components/manutencao/VehicleAttentionPanel.tsx`**

```tsx
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VehicleSignal } from "@/lib/manutencaoUtils";

interface Props {
  vehicles: VehicleSignal[];
  onSelectVeiculo: (veiculo: string) => void;
  loading?: boolean;
}

const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")}M`
  : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(1).replace(".", ",")}k`
  : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function VehicleAttentionPanel({ vehicles, onSelectVeiculo, loading }: Props) {
  return (
    <Card className="rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Veículos que precisam de atenção
        </span>
        <Badge variant="secondary" className="ml-auto text-[9px] font-bold tracking-wider">
          {vehicles.length} veículos
        </Badge>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-[24px_1fr_auto] gap-3 px-4 py-1.5 border-b border-border/50">
        <span />
        <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/60">
          Veículo · sinais
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/60 text-right">
          Custo · OS
        </span>
      </div>

      {/* List */}
      <div className="flex flex-col divide-y divide-border/40 overflow-y-auto">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[24px_1fr_auto] gap-3 px-4 py-3 items-center">
                <div className="h-3 w-4 rounded bg-muted animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </div>
            ))
          : vehicles.map((v, i) => (
              <button
                key={v.veiculo}
                type="button"
                onClick={() => onSelectVeiculo(v.veiculo)}
                className={cn(
                  "grid grid-cols-[24px_1fr_auto] gap-3 px-4 py-3 items-start text-left",
                  "transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40",
                  i >= 5 && "opacity-60"
                )}
              >
                {/* Rank */}
                <span className="text-[11px] font-bold text-muted-foreground/40 text-right pt-0.5">
                  {i + 1}
                </span>

                {/* Vehicle + signals */}
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground/90 mb-1.5 truncate">
                    {v.veiculo}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {v.signals.stuck && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        ⏱ OS parada {v.signals.stuckDias}d
                      </span>
                    )}
                    {v.signals.revisional && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        🔧 Revisional em aberto
                      </span>
                    )}
                    {v.signals.cost && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        💰 Custo alto
                      </span>
                    )}
                    {v.signals.repeat && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        🔄 {v.signals.repeatCount} reincidências
                      </span>
                    )}
                    {v.signals.frequency && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        📋 Alta frequência
                      </span>
                    )}
                  </div>
                </div>

                {/* Cost + OS count */}
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-black text-foreground tracking-tight">
                    {fmtK(v.totalCusto)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {v.totalOrdens} OS
                  </p>
                </div>
              </button>
            ))}

        {!loading && vehicles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
            <span className="text-2xl mb-2">✅</span>
            <p className="text-xs font-medium">Nenhum veículo com sinal ativo</p>
          </div>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/manutencao/VehicleAttentionPanel.tsx
git commit -m "feat(manutencao): componente VehicleAttentionPanel com sinais analíticos"
```

---

## Task 3: `FornecedorRanking` component

**Files:**
- Create: `src/components/manutencao/FornecedorRanking.tsx`

**Interfaces:**
- Consumes: `FornecedorItem` from `@/lib/manutencaoUtils`
- Produces: `<FornecedorRanking items={FornecedorItem[]} loading?: boolean />`

- [ ] **Step 1: Create `src/components/manutencao/FornecedorRanking.tsx`**

```tsx
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FornecedorItem } from "@/lib/manutencaoUtils";

interface Props {
  items: FornecedorItem[];
  loading?: boolean;
}

const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")}M`
  : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(1).replace(".", ",")}k`
  : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FornecedorRanking({ items, loading }: Props) {
  return (
    <Card className="rounded-xl overflow-hidden flex flex-col flex-1">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Por fornecedor
        </span>
        <Badge variant="secondary" className="ml-auto text-[9px] font-bold tracking-wider">
          TOP {items.length}
        </Badge>
      </div>
      <div className="flex flex-col divide-y divide-border/40">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="h-2.5 w-4 rounded bg-muted animate-pulse" />
                <div className="h-2.5 flex-1 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-12 rounded bg-muted animate-pulse" />
              </div>
            ))
          : items.map((item, i) => (
              <div key={item.fornecedor} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-[10px] font-bold text-muted-foreground/40 w-4 text-right shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-[11px] text-foreground/80 truncate" title={item.fornecedor}>
                    {item.fornecedor}
                  </span>
                  <div className="h-[3px] rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500"
                      style={{ width: `${Math.round(item.share * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-400 shrink-0 min-w-[52px] text-right">
                  {fmtK(item.totalCusto)}
                </span>
              </div>
            ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/manutencao/FornecedorRanking.tsx
git commit -m "feat(manutencao): componente FornecedorRanking"
```

---

## Task 4: `CustoMiniChart` component

**Files:**
- Create: `src/components/manutencao/CustoMiniChart.tsx`

**Interfaces:**
- Consumes: `DailyCost` from `@/lib/manutencaoUtils`, `totalCusto: number`
- Produces: `<CustoMiniChart data={DailyCost[]} totalCusto={number} loading?: boolean />`

- [ ] **Step 1: Create `src/components/manutencao/CustoMiniChart.tsx`**

```tsx
import { Card } from "@/components/ui/card";
import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";
import type { DailyCost } from "@/lib/manutencaoUtils";

interface Props {
  data: DailyCost[];
  totalCusto: number;
  loading?: boolean;
}

const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")}M`
  : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(1).replace(".", ",")}k`
  : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-violet-400/30 bg-background/95 px-2.5 py-1.5 shadow-xl text-[11px]">
      <p className="font-bold text-muted-foreground mb-0.5">{label}</p>
      <p className="font-black text-violet-400">{fmtK(payload[0].value)}</p>
    </div>
  );
};

export function CustoMiniChart({ data, totalCusto, loading }: Props) {
  return (
    <Card className="rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Custo no período
          </p>
          <p className={`text-xl font-black tracking-tight text-foreground mt-0.5${loading ? " animate-pulse" : ""}`}>
            {loading ? "—" : fmtK(totalCusto)}
          </p>
        </div>
      </div>
      {loading ? (
        <div className="h-[72px] rounded-lg bg-muted animate-pulse" />
      ) : (
        <div className="h-[72px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="20%">
              <Bar dataKey="custo" fill="rgba(123,110,245,0.6)" radius={[2, 2, 0, 0]} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(123,110,245,0.08)" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/manutencao/CustoMiniChart.tsx
git commit -m "feat(manutencao): componente CustoMiniChart"
```

---

## Task 5: `OsSheet` component

**Files:**
- Create: `src/components/manutencao/OsSheet.tsx`

**Interfaces:**
- Consumes: `OrdemAgregada` from `@/lib/manutencaoUtils`
- Produces:
  ```ts
  <OsSheet
    open: boolean
    onOpenChange: (open: boolean) => void
    ordens: OrdemAgregada[]
    initialVeiculo?: string | null
  />
  ```

- [ ] **Step 1: Create `src/components/manutencao/OsSheet.tsx`**

```tsx
import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrdemAgregada } from "@/lib/manutencaoUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordens: OrdemAgregada[];
  initialVeiculo?: string | null;
}

const SITUACAO_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  CONCLUIDO:     { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Concluído" },
  ANDAMENTO:     { bg: "bg-amber-500/10",   text: "text-amber-400",   label: "Andamento" },
  CANCELADO:     { bg: "bg-rose-500/10",    text: "text-rose-400",    label: "Cancelado" },
  INCONSISTENTE: { bg: "bg-slate-500/10",   text: "text-slate-400",   label: "Inconsistente" },
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

export function OsSheet({ open, onOpenChange, ordens, initialVeiculo }: Props) {
  const [search, setSearch] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroVeiculo, setFiltroVeiculo] = useState("Todos");

  // Pre-filter by vehicle when opened from vehicle row
  useEffect(() => {
    if (open && initialVeiculo) {
      setFiltroVeiculo(initialVeiculo);
    }
    if (!open) {
      setSearch("");
      setFiltroSituacao("Todos");
      setFiltroTipo("Todos");
      setFiltroVeiculo("Todos");
    }
  }, [open, initialVeiculo]);

  const veiculos = useMemo(() => {
    const s = new Set<string>();
    ordens.forEach(o => { if (o.veiculo) s.add(o.veiculo); });
    return Array.from(s).sort();
  }, [ordens]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ordens.filter(o => {
      if (filtroSituacao !== "Todos" && o.situacao !== filtroSituacao) return false;
      if (filtroTipo !== "Todos" && o.tiposervico !== filtroTipo) return false;
      if (filtroVeiculo !== "Todos" && o.veiculo !== filtroVeiculo) return false;
      if (q && !`${o.ordem} ${o.veiculo} ${o.fornecedor} ${o.classificacao}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ordens, search, filtroSituacao, filtroTipo, filtroVeiculo]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[860px] p-0 flex flex-col">
        <SheetTitle className="sr-only">Detalhamento de Ordens de Serviço</SheetTitle>

        {/* Sheet header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Detalhamento
            </p>
            <p className="text-base font-black tracking-tight text-foreground">
              Ordens de Serviço
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto text-[9px] font-bold">
            {filtered.length} / {ordens.length} OS
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por ordem, veículo, fornecedor…"
              className="pl-8 h-8 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Select value={filtroVeiculo} onValueChange={setFiltroVeiculo}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Veículo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos veículos</SelectItem>
              {veiculos.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todas</SelectItem>
              <SelectItem value="ANDAMENTO">Andamento</SelectItem>
              <SelectItem value="CONCLUIDO">Concluído</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-8 text-xs w-[110px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos tipos</SelectItem>
              <SelectItem value="SERVICOEXTERNO">Externo</SelectItem>
              <SelectItem value="SERVICOINTERNO">Interno</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] tracking-wider w-[90px]">Ordem</TableHead>
                <TableHead className="text-[10px] tracking-wider">Veículo</TableHead>
                <TableHead className="text-[10px] tracking-wider w-[90px]">Data</TableHead>
                <TableHead className="text-[10px] tracking-wider w-[80px]">Tipo</TableHead>
                <TableHead className="text-[10px] tracking-wider w-[100px]">Situação</TableHead>
                <TableHead className="text-[10px] tracking-wider">Classificação</TableHead>
                <TableHead className="text-[10px] tracking-wider">Fornecedor</TableHead>
                <TableHead className="text-[10px] tracking-wider text-right w-[100px]">Custo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(o => {
                const sit = SITUACAO_STYLE[o.situacao ?? ""] ?? SITUACAO_STYLE.INCONSISTENTE;
                return (
                  <TableRow key={o.ordem}>
                    <TableCell className="text-[11px] font-mono text-muted-foreground">{o.ordem}</TableCell>
                    <TableCell className="text-[11px] font-semibold">{o.veiculo || "—"}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">{fmtData(o.dataordem)}</TableCell>
                    <TableCell>
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider", o.tiposervico === "SERVICOEXTERNO" ? "text-cyan-400" : "text-violet-400")}>
                        {o.tiposervico === "SERVICOEXTERNO" ? "Ext" : o.tiposervico === "SERVICOINTERNO" ? "Int" : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", sit.bg, sit.text)}>
                        {sit.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground max-w-[140px] truncate" title={o.classificacao ?? ""}>{o.classificacao || "—"}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground max-w-[160px] truncate" title={o.fornecedor ?? ""}>{o.fornecedor || "—"}</TableCell>
                    <TableCell className="text-[11px] font-black text-right text-foreground">{fmtBRL(o.totalCusto)}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-10">
                    Nenhuma OS encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/manutencao/OsSheet.tsx
git commit -m "feat(manutencao): OsSheet com busca, filtros e tabela completa"
```

---

## Task 6: Rewrite `src/pages/Manutencao.tsx`

**Files:**
- Rewrite: `src/pages/Manutencao.tsx`

**Interfaces:**
- Consumes all components and utils defined in Tasks 1–5.
- Exports: `export default function Manutencao()` (same export name — routing unchanged).

- [ ] **Step 1: Read and understand the current `carregarDados` logic** (already done — it calls `fetchManutencao({ dataInicio, dataFim, filial })` from `dwFilter`, handled by `useCooldown`)

- [ ] **Step 2: Rewrite `src/pages/Manutencao.tsx`**

```tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { DollarSign, AlertTriangle, Activity, TrendingUp, ChevronRight, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/indicators/KpiCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { UpdateButton } from "@/components/shared/UpdateButton";
import { VehicleAttentionPanel } from "@/components/manutencao/VehicleAttentionPanel";
import { FornecedorRanking } from "@/components/manutencao/FornecedorRanking";
import { CustoMiniChart } from "@/components/manutencao/CustoMiniChart";
import { OsSheet } from "@/components/manutencao/OsSheet";
import {
  aggregateOrdens,
  computeVehicleSignals,
  computeKpis,
  computeFornecedorRanking,
  computeDailyCosts,
} from "@/lib/manutencaoUtils";
import { fetchManutencao, type ManutencaoRow } from "@/lib/dwApi";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useCooldown } from "@/hooks/useCooldown";
import { cn } from "@/lib/utils";

const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")}M`
  : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(1).replace(".", ",")}k`
  : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Manutencao() {
  const { dwFilter, setDwFilter, filiais, empresas } = useFinancialData();
  const manutCooldown = useCooldown("dw_manutencao_fetch_ts");
  const filiaisFiltradas = filiais.filter(f => !dwFilter.empresa || f.empresa === dwFilter.empresa);

  // ── State ──────────────────────────────────────────────────────────────────
  const [dados, setDados] = useState<ManutencaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetVeiculo, setSheetVeiculo] = useState<string | null>(null);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const carregarDados = useCallback(async (force = false) => {
    if (!force && !manutCooldown.canFetch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchManutencao({
        dataInicio: dwFilter.dataInicio,
        dataFim: dwFilter.dataFim,
        filial: dwFilter.filial ?? null,
      });
      setDados(res.data ?? []);
      manutCooldown.start();
    } catch (err) {
      setError((err as Error).message ?? "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [dwFilter.dataInicio, dwFilter.dataFim, dwFilter.filial]);

  useEffect(() => { carregarDados(); }, []);

  // ── Derived data ────────────────────────────────────────────────────────────
  const ordens = useMemo(() => aggregateOrdens(dados), [dados]);
  const vehicleSignals = useMemo(() => computeVehicleSignals(ordens), [ordens]);
  const kpis = useMemo(() => computeKpis(ordens, vehicleSignals), [ordens, vehicleSignals]);
  const fornecedorRanking = useMemo(() => computeFornecedorRanking(ordens), [ordens]);
  const dailyCosts = useMemo(() => computeDailyCosts(ordens), [ordens]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSelectVeiculo = (veiculo: string) => {
    setSheetVeiculo(veiculo);
    setSheetOpen(true);
  };

  const handleOpenSheet = () => {
    setSheetVeiculo(null);
    setSheetOpen(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileNav title="Manutenção" />

      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-2.5 flex items-center gap-3">
        <HomeButton />
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">SGT Log</p>
          <p className="text-[15px] font-black tracking-tight text-foreground leading-tight">Manutenção</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <DatePickerInput
            label="Início"
            value={dwFilter.dataInicio}
            onChange={v => setDwFilter(prev => ({ ...prev, dataInicio: v }))}
          />
          <DatePickerInput
            label="Fim"
            value={dwFilter.dataFim}
            onChange={v => setDwFilter(prev => ({ ...prev, dataFim: v }))}
          />
          <Select
            value={dwFilter.filial ?? "Todas"}
            onValueChange={v => setDwFilter(prev => ({ ...prev, filial: v === "Todas" ? null : v }))}
          >
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="Filial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas as filiais</SelectItem>
              {filiaisFiltradas.map(f => (
                <SelectItem key={f.codfilial} value={String(f.codfilial)}>{f.filial}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <UpdateButton
            onClick={() => carregarDados(true)}
            loading={loading}
            cooldown={!manutCooldown.canFetch}
          />
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-3 max-w-[1600px] w-full mx-auto">
        {/* Error */}
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3">
          <KpiCard
            label="Custo Total"
            value={fmtK(kpis.totalCusto)}
            rawValue={kpis.totalCusto}
            subtitle="período atual"
            icon={DollarSign}
            tone="violet"
            loading={loading}
          />
          <KpiCard
            label="Veículos em Atenção"
            value={String(kpis.veiculosEmAtencao)}
            rawValue={kpis.veiculosEmAtencao}
            subtitle="com sinal ativo"
            icon={AlertTriangle}
            tone="rose"
            loading={loading}
          />
          <KpiCard
            label="OS em Andamento"
            value={String(kpis.osEmAndamento)}
            rawValue={kpis.osEmAndamento}
            subtitle="ordens abertas"
            icon={Activity}
            tone="amber"
            loading={loading}
          />
          <KpiCard
            label="Custo Médio / OS"
            value={fmtK(kpis.custoMedioOS)}
            rawValue={kpis.custoMedioOS}
            subtitle={`base: ${kpis.totalOrdens} ordens`}
            icon={TrendingUp}
            tone="emerald"
            loading={loading}
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-[1fr_300px] gap-3 flex-1 min-h-0">
          {/* Vehicle attention panel */}
          <VehicleAttentionPanel
            vehicles={vehicleSignals}
            onSelectVeiculo={handleSelectVeiculo}
            loading={loading}
          />

          {/* Right column */}
          <div className="flex flex-col gap-3">
            <CustoMiniChart
              data={dailyCosts}
              totalCusto={kpis.totalCusto}
              loading={loading}
            />
            <FornecedorRanking
              items={fornecedorRanking}
              loading={loading}
            />
          </div>
        </div>

        {/* OS Sheet trigger */}
        <button
          type="button"
          onClick={handleOpenSheet}
          className={cn(
            "w-full rounded-xl border border-border bg-card px-4 py-3",
            "flex items-center gap-3 text-left",
            "transition-colors hover:border-violet-400/25 hover:bg-muted/30"
          )}
        >
          <span className="text-base">📋</span>
          <span className="text-[11px] font-semibold text-muted-foreground">
            Detalhamento de Ordens de Serviço
          </span>
          <Badge variant="secondary" className="text-[9px] font-bold">
            {kpis.totalOrdens} OS
          </Badge>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/40" />
        </button>
      </main>

      {/* Sheet */}
      <OsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        ordens={ordens}
        initialVeiculo={sheetVeiculo}
      />
    </div>
  );
}
```

- [ ] **Step 3: Start dev server and verify in browser**

```bash
npm run dev
```

Check:
- Page loads without TypeScript errors
- KPI cards show 4 values (or skeleton while loading)
- Vehicle attention panel shows list with signal chips
- Right column shows mini chart + fornecedor ranking
- Clicking OS trigger opens Sheet with table
- Clicking a vehicle row opens Sheet pre-filtered to that vehicle
- No console errors

- [ ] **Step 4: Fix any TypeScript errors**

```bash
npx tsc --noEmit
```

Fix any reported errors before committing.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Manutencao.tsx
git commit -m "feat(manutencao): reescreve página completa — layout alert-first"
```

---

## Self-Review

**Spec coverage:**
- ✅ 4 KPI cards (Custo Total, Veículos em Atenção, OS em Andamento, Custo Médio/OS)
- ✅ Vehicle attention panel with 5 analytical signals
- ✅ Sort by signal count desc → cost desc
- ✅ Right col: mini chart + fornecedor ranking top-7
- ✅ OS Sheet with search + filters + table
- ✅ Sheet pre-filtered when opened from vehicle row
- ✅ shadcn Card everywhere, palette on data elements only
- ✅ No score number or score bar

**Type consistency:**
- `OrdemAgregada`, `VehicleSignal`, `ManutencaoKpis`, `FornecedorItem`, `DailyCost` all defined in Task 1 and referenced by exact name in Tasks 2–6 ✅
- `aggregateOrdens`, `computeVehicleSignals`, `computeKpis`, `computeFornecedorRanking`, `computeDailyCosts` all named consistently ✅

**No placeholders:** All steps contain actual code ✅
