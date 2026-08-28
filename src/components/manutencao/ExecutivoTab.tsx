import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as ReTooltip, CartesianGrid, Cell,
  PieChart, Pie, Label as RLabel, LabelList,
  ReferenceLine,
} from "recharts";
import { DollarSign, Wrench, Package, ClipboardList } from "lucide-react";
import type { ManutencaoRow } from "@/lib/dwApi";
import {
  computeKpisExecutivo,
  computeMonthlyCosts,
  computeTipoOS,
  computeTopClassificacao,
  computeTopVeiculos,
  computeTopFornecedores,
} from "@/lib/manutencaoUtils_executivo";
import { KpiCard } from "@/components/indicators/KpiCard";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useMemo } from "react";

// ── Paleta SGT ────────────────────────────────────────────────────────────────
const C_AMBER  = "#F5A623";  // --sgt-accent
const C_BLUE   = "#4A9EFF";  // --sgt-info
const C_GRID   = "rgba(143,163,187,0.07)";
const C_CURSOR = "rgba(143,163,187,0.05)";

const DONUT_PALETTE = ["#F5A623", "#4A9EFF", "#22C97A", "#A78BFA", "#F472B6"];

// ── Formatters ─────────────────────────────────────────────────────────────────
function fmtK(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0).replace(".", ",")}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}
function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function tickK(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

// Aliases de cor (confiáveis em qualquer SVG — sem url(#id) cross-SVG)
const C_AMBER_SOLID = C_AMBER;  // #F5A623
const C_BLUE_SOLID  = C_BLUE;   // #4A9EFF

// ── Gauge ─────────────────────────────────────────────────────────────────────
function IndicadorCard({ percentualReal, percentualEsperado }: {
  percentualReal: number;
  percentualEsperado: number;
}) {
  const color = percentualReal <= percentualEsperado
    ? "#22C97A"
    : percentualReal <= percentualEsperado * 1.1
    ? C_AMBER
    : "#E94848";
  const pctNorm = Math.min(100, (percentualReal / Math.max(percentualEsperado * 1.5, 0.01)) * 100);
  const angle   = -135 + (pctNorm / 100) * 270;
  const arcLen  = (pctNorm / 100) * 119.4;

  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-xl border"
      style={{
        background: "var(--sgt-bg-card)",
        borderColor: "var(--sgt-border-subtle)",
        padding: "12px 8px",
        height: "100%",
      }}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.26em] text-center leading-tight"
        style={{ color: "var(--sgt-text-muted)" }}>
        Indicador Manutenção
      </span>

      <div className="relative flex items-center justify-center" style={{ width: 92, height: 54 }}>
        <svg viewBox="0 0 100 58" width="92" height="54">
          <defs>
            <filter id="gauge-glow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Trilha */}
          <path d="M12,52 A38,38 0 0,1 88,52" fill="none"
            stroke="var(--sgt-border-subtle)" strokeWidth="8" strokeLinecap="round" />
          {/* Faixas de cor: verde / amarela / vermelha */}
          <path d="M12,52 A38,38 0 0,1 88,52" fill="none"
            stroke="rgba(34,201,122,0.15)" strokeWidth="8" strokeLinecap="round" />
          {/* Fill */}
          <path d="M12,52 A38,38 0 0,1 88,52" fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${arcLen} 119.4`}
            filter="url(#gauge-glow)"
          />
          {/* Agulha */}
          <g transform={`rotate(${angle}, 50, 52)`}>
            <line x1="50" y1="52" x2="50" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={0.8} />
            <circle cx="50" cy="52" r="4.5" fill={color} />
            <circle cx="50" cy="52" r="2.5" fill="var(--sgt-bg-card)" />
          </g>
        </svg>
        <span className="absolute font-black text-sm tabular-nums leading-none"
          style={{ color, bottom: -4, position: "absolute" }}>
          {percentualReal.toFixed(1)}%
        </span>
      </div>

      <span className="text-[9px] text-center leading-tight" style={{ color: "var(--sgt-text-muted)" }}>
        meta {percentualEsperado}% • custo/faturamento
      </span>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--sgt-menu-bg)",
      border: "1px solid var(--sgt-border-medium)",
      borderRadius: 10,
      padding: "8px 12px",
      fontSize: 11,
      color: "var(--sgt-text-primary)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      minWidth: 140,
    }}>
      {label && (
        <p style={{ color: "var(--sgt-text-muted)", fontWeight: 600, fontSize: 10, marginBottom: 6, letterSpacing: "0.05em" }}>
          {label}
        </p>
      )}
      {payload.map(p => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: p.color, flexShrink: 0,
            boxShadow: `0 0 6px ${p.color}60`,
          }} />
          <span style={{ color: "var(--sgt-text-secondary)", flex: 1 }}>{p.name}</span>
          <span style={{ color: "var(--sgt-text-primary)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {fmtBRL(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Card de seção ─────────────────────────────────────────────────────────────
function SectionCard({ title, badge, children, className = "" }: {
  title: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-2 p-3 sm:p-4 rounded-xl border ${className}`}
      style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
    >
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-[9px] font-bold uppercase tracking-[0.28em]"
          style={{ color: "var(--sgt-text-muted)" }}>
          {title}
        </h3>
        {badge && (
          <span className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
            style={{ background: "var(--sgt-accent-soft)", color: "var(--sgt-accent-text)" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Tick truncado para eixo Y ─────────────────────────────────────────────────
function TruncTick({ x, y, payload, width = 90 }: {
  x?: number; y?: number; payload?: { value: string }; width?: number;
}) {
  const raw   = payload?.value ?? "";
  const max   = Math.floor(width / 6.5);
  const label = raw.length > max ? raw.slice(0, max - 1) + "…" : raw;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={9}
      fill="var(--sgt-text-muted)" style={{ fontFamily: "inherit" }}>
      {label}
    </text>
  );
}

// ── Tick de eixo X ────────────────────────────────────────────────────────────
const TICK_STYLE = { fill: "var(--sgt-text-muted)", fontSize: 9, fontFamily: "inherit" };
const AXIS_PROPS = { axisLine: false as const, tickLine: false as const };

// ── Legenda customizada (donut) ───────────────────────────────────────────────
function DonutLegend({ data }: { data: { tipo: string; custo: number; pct: number }[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-1">
      {data.map((item, i) => (
        <div key={item.tipo} className="flex items-center gap-1.5">
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: DONUT_PALETTE[i % DONUT_PALETTE.length],
            display: "inline-block", flexShrink: 0,
          }} />
          <span style={{ color: "var(--sgt-text-muted)", fontSize: 9 }}>{item.tipo}</span>
          <span style={{ color: "var(--sgt-text-secondary)", fontSize: 9, fontWeight: 600 }}>
            {item.pct.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Label central do donut ────────────────────────────────────────────────────
function DonutCenter({ viewBox, total }: { viewBox?: { cx: number; cy: number }; total: number }) {
  if (!viewBox) return null;
  const { cx, cy } = viewBox;
  return (
    <>
      <text x={cx} y={cy - 7} textAnchor="middle" dominantBaseline="middle"
        fill="var(--sgt-text-muted)" fontSize={8} fontFamily="inherit"
        fontWeight={600} letterSpacing="0.12em">
        TOTAL
      </text>
      <text x={cx} y={cy + 9} textAnchor="middle" dominantBaseline="middle"
        fill="var(--sgt-text-primary)" fontSize={11} fontFamily="inherit" fontWeight={700}>
        {fmtK(total)}
      </text>
    </>
  );
}

// ── Legenda inline compartilhada (Peça + M.O.) ───────────────────────────────
function ChartLegend() {
  return (
    <div className="flex justify-center gap-4 shrink-0 mt-0.5">
      {([["Peça", C_AMBER_SOLID], ["Mão de Obra", C_BLUE_SOLID]] as [string, string][]).map(([label, color]) => (
        <div key={label} className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 4, borderRadius: 2, background: color, display: "inline-block" }} />
          <span style={{ color: "var(--sgt-text-muted)", fontSize: 9 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface Props { rows: ManutencaoRow[]; }

export function ExecutivoTab({ rows }: Props) {
  const { indicadores } = useFinancialData();

  const indManut = useMemo(
    () => indicadores.find(i => i.nome === "Manutenção"),
    [indicadores]
  );

  const kpis     = useMemo(() => computeKpisExecutivo(rows),        [rows]);
  const monthly  = useMemo(() => computeMonthlyCosts(rows),         [rows]);
  const tipoOS   = useMemo(() => computeTipoOS(rows),               [rows]);
  const top10Cat = useMemo(() => computeTopClassificacao(rows, 10), [rows]);
  const top5Vei  = useMemo(() => computeTopVeiculos(rows, 5),       [rows]);
  const top5Forn = useMemo(() => computeTopFornecedores(rows, 5),   [rows]);

  const pctPeca = kpis.custoTotal > 0 ? kpis.custoPeca / kpis.custoTotal * 100 : 0;
  const pctMO   = kpis.custoTotal > 0 ? kpis.custoMO   / kpis.custoTotal * 100 : 0;

  // Média mensal para ReferenceLine
  const avgMonthly = useMemo(() => {
    if (!monthly.length) return 0;
    return monthly.reduce((s, m) => s + m.custo, 0) / monthly.length;
  }, [monthly]);

  // Top 10 invertido (Recharts layout=vertical vai de baixo pra cima)
  const top10Chart = useMemo(() => [...top10Cat].reverse(), [top10Cat]);

  const tipoOSTotal = useMemo(() => tipoOS.reduce((s, t) => s + t.custo, 0), [tipoOS]);

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 min-h-0">

      {/* ── Row 1: KPI cards ── */}
      <div
        className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5 shrink-0 sgt-stagger"
        style={{ gridAutoRows: "1fr" }}
      >
        {([
          <KpiCard key="total"  label="Custo Total"       value={fmtK(kpis.custoTotal)} rawValue={kpis.custoTotal} subtitle="período selecionado"                icon={DollarSign}   tone="amber"  compact />,
          <KpiCard key="peca"   label="Custo Peça"        value={fmtK(kpis.custoPeca)}  rawValue={kpis.custoPeca}  subtitle={`${pctPeca.toFixed(1)}% do total`}  icon={Package}      tone="emerald" compact />,
          <KpiCard key="mo"     label="Custo Mão de Obra" value={fmtK(kpis.custoMO)}    rawValue={kpis.custoMO}    subtitle={`${pctMO.toFixed(1)}% do total`}    icon={Wrench}       tone="blue"   compact />,
          <KpiCard key="plano"  label="Custo Plano Manut." value={fmtK(kpis.custoPlano)} rawValue={kpis.custoPlano} subtitle="tipo PLANOMANUTENCAO"               icon={ClipboardList} tone="violet" compact />,
        ] as React.ReactNode[]).map((card, i) => (
          <AnimatedCard key={i} delay={i * 40} className="flex flex-col">
            <div className="flex-1">{card}</div>
          </AnimatedCard>
        ))}
        <AnimatedCard delay={160} className="flex flex-col">
          <IndicadorCard
            percentualReal={indManut?.percentualReal ?? 0}
            percentualEsperado={indManut?.percentualEsperado ?? 15}
          />
        </AnimatedCard>
      </div>

      {/* ── Rows 2+3 ── */}
      <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 min-h-0">

        {/* Row 2: Mensal (2/3) + Tipo OS (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 flex-1 min-h-0">

          {/* ── Mensal ─────────────────────────────────────────────────── */}
          <AnimatedCard delay={200} className="lg:col-span-2 min-h-0 flex flex-col">
            <SectionCard
              title="Total Mês a Mês"
              badge={avgMonthly > 0 ? `média ${fmtK(avgMonthly)}` : undefined}
              className="flex-1 min-h-0"
            >
              <div className="flex-1 min-h-0" style={{ minHeight: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 16, right: 4, left: 0, bottom: 0 }} barCategoryGap="32%">
                    <CartesianGrid vertical={false} stroke={C_GRID} />
                    <XAxis dataKey="mes" tick={TICK_STYLE} {...AXIS_PROPS} />
                    <YAxis tickFormatter={tickK} tick={TICK_STYLE} {...AXIS_PROPS} width={36} />
                    <ReTooltip content={<Tip />} cursor={{ fill: C_CURSOR, rx: 4 }} />
                    {avgMonthly > 0 && (
                      <ReferenceLine
                        y={avgMonthly}
                        stroke={C_AMBER}
                        strokeDasharray="4 3"
                        strokeOpacity={0.45}
                        strokeWidth={1}
                        label={{
                          value: `↔ média`,
                          position: "insideTopRight",
                          fill: C_AMBER,
                          fontSize: 8,
                          opacity: 0.7,
                          fontFamily: "inherit",
                        }}
                      />
                    )}
                    <Bar dataKey="custo" name="Custo" fill={C_AMBER_SOLID} radius={[4, 4, 0, 0]} maxBarSize={56}>
                      <LabelList
                        dataKey="custo"
                        position="top"
                        formatter={(v: number) => v === Math.max(...monthly.map(m => m.custo)) ? fmtK(v) : ""}
                        style={{ fill: C_AMBER, fontSize: 9, fontFamily: "inherit", fontWeight: 700 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </AnimatedCard>

          {/* ── Tipo OS (donut) ─────────────────────────────────────────── */}
          <AnimatedCard delay={240} className="min-h-0 flex flex-col">
            <SectionCard title="Tipo Ordem de Serviço" className="flex-1 min-h-0">
              <div className="flex flex-col flex-1 min-h-0" style={{ minHeight: 140 }}>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tipoOS}
                        dataKey="custo"
                        nameKey="tipo"
                        cx="50%" cy="50%"
                        innerRadius="52%"
                        outerRadius="76%"
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {tipoOS.map((_, i) => (
                          <Cell key={i}
                            fill={DONUT_PALETTE[i % DONUT_PALETTE.length]}
                            opacity={0.92}
                          />
                        ))}
                        <RLabel content={(props) => <DonutCenter viewBox={props.viewBox as { cx: number; cy: number }} total={tipoOSTotal} />} position="center" />
                      </Pie>
                      <ReTooltip
                        formatter={(v: number) => fmtBRL(v)}
                        contentStyle={{
                          background: "var(--sgt-menu-bg)",
                          border: "1px solid var(--sgt-border-medium)",
                          borderRadius: 10, fontSize: 11,
                          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                        }}
                        itemStyle={{ color: "var(--sgt-text-primary)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <DonutLegend data={tipoOS} />
              </div>
            </SectionCard>
          </AnimatedCard>
        </div>

        {/* Row 3: Top 10 + Top 5 veículos + Top 5 fornecedores */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 flex-1 min-h-0">

          {/* ── Top 10 ─────────────────────────────────────────────────── */}
          <AnimatedCard delay={280} className="min-h-0 flex flex-col">
            <SectionCard title="Custo Total — Top 10" className="flex-1 min-h-0">
              <div className="flex-1 min-h-0" style={{ minHeight: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={top10Chart}
                    layout="vertical"
                    margin={{ top: 0, right: 52, left: 0, bottom: 0 }}
                    barCategoryGap="16%"
                  >
                    <CartesianGrid horizontal={false} stroke={C_GRID} />
                    <XAxis type="number" tickFormatter={tickK}
                      tick={TICK_STYLE} {...AXIS_PROPS} />
                    <YAxis type="category" dataKey="cat" width={92}
                      tick={<TruncTick width={92} />} {...AXIS_PROPS} />
                    <ReTooltip
                      formatter={(v: number) => fmtBRL(v)}
                      contentStyle={{
                        background: "var(--sgt-menu-bg)", border: "1px solid var(--sgt-border-medium)",
                        borderRadius: 10, fontSize: 11, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                      }}
                      itemStyle={{ color: "var(--sgt-text-primary)" }}
                      labelStyle={{ color: "var(--sgt-text-muted)", fontWeight: 600, marginBottom: 4, fontSize: 10 }}
                      cursor={{ fill: C_CURSOR, rx: 3 }}
                    />
                    <Bar dataKey="custo" name="Custo" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      {top10Chart.map((_, i) => (
                        <Cell key={i} fill={C_AMBER_SOLID} opacity={1 - i * 0.06} />
                      ))}
                      <LabelList
                        dataKey="custo"
                        position="right"
                        formatter={(v: number) => fmtK(v)}
                        style={{ fill: "var(--sgt-text-secondary)", fontSize: 8, fontFamily: "inherit" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </AnimatedCard>

          {/* ── Top 5 Veículos ──────────────────────────────────────────── */}
          <AnimatedCard delay={320} className="min-h-0 flex flex-col">
            <SectionCard title="Top 5 Veículos — Peça e M.O." className="flex-1 min-h-0">
              <div className="flex-1 min-h-0" style={{ minHeight: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top5Vei} layout="vertical"
                    margin={{ top: 0, right: 4, left: 0, bottom: 20 }} barCategoryGap="22%">
                    <CartesianGrid horizontal={false} stroke={C_GRID} />
                    <XAxis type="number" tickFormatter={tickK} tick={TICK_STYLE} {...AXIS_PROPS} />
                    <YAxis type="category" dataKey="veiculo" width={62}
                      tick={<TruncTick width={62} />} {...AXIS_PROPS} />
                    <ReTooltip content={<Tip />} cursor={{ fill: C_CURSOR, rx: 3 }} />
                    <Bar dataKey="peca" name="Peça"        fill={C_AMBER_SOLID} radius={[0, 3, 3, 0]} maxBarSize={12} />
                    <Bar dataKey="mo"   name="Mão de Obra" fill={C_BLUE_SOLID}  radius={[0, 3, 3, 0]} maxBarSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend />
            </SectionCard>
          </AnimatedCard>

          {/* ── Top 5 Fornecedores ──────────────────────────────────────── */}
          <AnimatedCard delay={360} className="min-h-0 flex flex-col">
            <SectionCard title="Top 5 Fornecedores — Peça e M.O." className="flex-1 min-h-0">
              <div className="flex-1 min-h-0" style={{ minHeight: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top5Forn} layout="vertical"
                    margin={{ top: 0, right: 4, left: 0, bottom: 20 }} barCategoryGap="22%">
                    <CartesianGrid horizontal={false} stroke={C_GRID} />
                    <XAxis type="number" tickFormatter={tickK} tick={TICK_STYLE} {...AXIS_PROPS} />
                    <YAxis type="category" dataKey="fornecedor" width={74}
                      tick={<TruncTick width={74} />} {...AXIS_PROPS} />
                    <ReTooltip content={<Tip />} cursor={{ fill: C_CURSOR, rx: 3 }} />
                    <Bar dataKey="peca" name="Peça"        fill={C_AMBER_SOLID} radius={[0, 3, 3, 0]} maxBarSize={12} />
                    <Bar dataKey="mo"   name="Mão de Obra" fill={C_BLUE_SOLID}  radius={[0, 3, 3, 0]} maxBarSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend />
            </SectionCard>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
}
