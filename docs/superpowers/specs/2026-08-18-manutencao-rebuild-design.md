# Manutenção Page — Rebuild Design Spec

**Date:** 2026-08-18  
**Branch:** feat/manutencao-shadcn-wig-refactor  
**Status:** Approved for implementation

---

## 1. Goal

Replace the current Manutenção page with a new design that answers two questions at a glance:

1. **Quais veículos precisam de atenção agora?**
2. **Onde estou gastando mais dinheiro?**

The OS detail table becomes a secondary surface (Sheet lateral), not the hero.

---

## 2. Design Constraints

- **Design system:** shadcn `Card` (`bg-card`, `border-border`, `rounded-xl`), zero custom card surfaces.
- **Palette:** violet (#7B6EF5), indigo/blue (#8BA4F5), amber (#F5A623), rose (#E94848), emerald (#22C97A) — only for data elements (icons, badges, signal chips). Background stays `bg-background` / `bg-card`.
- **Typography:** existing Tailwind scale. Eyebrow labels: `text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground`. Values: `font-black tracking-tight`. Body: `text-sm text-muted-foreground`.
- **Data source:** unchanged — `fetchManutencao()` returning `ManutencaoRow[]`. Period default: 1st of current month → today.
- **No new API fields.** All derived signals computed client-side from existing fields.

---

## 3. Layout — Approach A (Alert-first)

```
┌─────────────────────────────────────────────────────────┐
│  NAVBAR: título · período · filial · [Sofia IA]         │
├───────────┬───────────┬───────────┬─────────────────────┤
│ Custo     │ Veículos  │ OS em     │ Custo Médio         │
│ Total     │ em Atenção│ Andamento │ / OS                │
├───────────────────────────────┬─────────────────────────┤
│ Veículos que precisam de      │ Custo Mensal (mini      │
│ atenção — lista ordenada por  │ chart barras)           │
│ score composto com sinais     ├─────────────────────────┤
│ coloridos                     │ Ranking Fornecedores     │
│                               │ (top 7, barra proporcio-│
│                               │ nal)                    │
├───────────────────────────────┴─────────────────────────┤
│ [→ Detalhamento de Ordens de Serviço   N OS]            │
└─────────────────────────────────────────────────────────┘
```

Everything above fits within the viewport without vertical scroll (typical 1280×800 desktop). The Sheet with the OS table opens on click of the bottom trigger.

---

## 4. KPI Cards (top row, 4 cards)

| Card | Value | Tone | Subtitle |
|------|-------|------|----------|
| Custo Total | `formatBRL(totalCusto)` | violet | "período atual" |
| Veículos em Atenção | count of vehicles with score > 0 | rose | "com algum sinal ativo" |
| OS em Andamento | count of `situacao === "ANDAMENTO"` | amber | "ordens abertas" |
| Custo Médio / OS | `totalCusto / totalOrdens` | emerald | `base: N ordens` |

Uses the existing `KpiCard` component from `src/components/indicators/KpiCard.tsx`.

---

## 5. Vehicle Attention Panel

### 5a. Score computation (per vehicle, from filtered `ManutencaoRow[]`)

Group all non-cancelled rows by `veiculo`. For each vehicle compute:

| Signal | Condition | Score points |
|--------|-----------|-------------|
| `cost` | vehicle cost is in top 30% across all vehicles | +3 |
| `stuck` | has any OS with `situacao === "ANDAMENTO"` and `diasAberto > 15` | +2 per qualifying OS (capped at +4) |
| `repeat` | count of OS where `classificacao?.toUpperCase().includes("CORRET")` ≥ 2 | +2 |

**diasAberto** = `Math.floor((today - new Date(dataordem)) / 86_400_000)`.

A vehicle is included in the attention list only if its total score > 0. Sort descending by score, then by total cost as tiebreaker. Show top 10 vehicles.

### 5b. Signal chips (per vehicle row)

- `💰 Custo alto` (amber) — shown when `cost` signal triggered
- `⏱ OS travada Xd` (rose) — shown when `stuck` signal triggered; X = max `diasAberto` of stuck OS for that vehicle
- `🔄 N corretivas` (indigo) — shown when `repeat` signal triggered; N = count of corrective OS

### 5c. Score bar

Mini 3px horizontal bar, width proportional to score / maxScore across visible vehicles.
Colors: score ≥ 7 → `from-rose-500 to-amber-500`; score 4–6 → `from-amber-500 to-indigo-400`; score < 4 → `text-indigo-400` solid.

### 5d. Row content

```
[rank]  [vehicle name]                         [total cost]
        [signal chips]                         [N OS]
                                               [score bar]
```

Clicking a row opens the OS Sheet pre-filtered to that vehicle.

---

## 6. Right Column

### 6a. Monthly cost mini-chart

- Recharts `BarChart` (or shadcn `Chart` wrapper), height 72px, no axes, no legend, no tooltip.
- One bar per day in the period, colored `fill-violet-500/60`.
- Big number above: total cost in period.
- Eyebrow: "Custo mensal".

### 6b. Fornecedor ranking

- Top 7 fornecedores by total cost in period.
- Each row: rank number · name (truncated) · proportional bar · formatted cost.
- Bar: `bg-gradient-to-r from-indigo-600 to-indigo-400`, 3px height, width = cost / maxCost * 100%.
- Uses shadcn `Card` wrapper, `panel-header` pattern with eyebrow + count badge.

---

## 7. OS Sheet (secondary surface)

Trigger: full-width Card at the bottom with arrow icon and total OS count badge. Clicking opens a shadcn `Sheet` (side=`right`, width `min(90vw, 860px)`).

Sheet contents:
- Search input (`Input` from shadcn)
- Filters: situação, tipo, classificação (`Select`)
- Full OS table (same columns as current: ordem, veículo, data, tipo, situação, classificação, fornecedor, custo)
- If opened from a vehicle row click → pre-filter `veiculo` filter

Uses existing OS table rendering logic, extracted into a component `<OsSheet>`.

---

## 8. Files touched

| File | Action |
|------|--------|
| `src/pages/Manutencao.tsx` | Full rewrite (keep same exports/routing) |
| `src/components/manutencao/VehicleAttentionPanel.tsx` | New — vehicle list with score logic |
| `src/components/manutencao/OsSheet.tsx` | New — Sheet with search + table |
| `src/components/manutencao/FornecedorRanking.tsx` | New — right panel ranking |
| `src/components/manutencao/CustoMiniChart.tsx` | New — mini bar chart |

No changes to `KpiCard`, `fetchManutencao`, API, or any other page.

---

## 9. State management

All state local to `Manutencao.tsx`. No new context or store.

```ts
// period (same as today)
const [inicio, setInicio] = useState<string>(startOfMonth)
const [fim, setFim]       = useState<string>(today)

// raw data
const [dados, setDados] = useState<ManutencaoRow[]>([])
const [loading, setLoading] = useState(true)

// Sheet
const [sheetOpen, setSheetOpen] = useState(false)
const [sheetVeiculo, setSheetVeiculo] = useState<string | null>(null)
```

Derived values (KPIs, attention list, rankings) are `useMemo` from `dados`.

---

## 10. Out of scope

- "O que pode parar nos próximos dias" — discarded (data not available).
- Per-vehicle detail page — not in this spec.
- Predictive maintenance — not in this spec.
- Mobile layout — follows existing responsive conventions; not a primary target.
