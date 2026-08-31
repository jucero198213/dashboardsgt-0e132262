import {
  ResponsiveContainer, ComposedChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid,
  Cell, ReferenceLine, Line, PieChart, Pie,
} from "recharts";
import { DollarSign, Wrench, Package, ClipboardList, TrendingUp, Target } from "lucide-react";
import { fetchManutencao, type ManutencaoRow } from "@/lib/dwApi";
import {
  computeKpisExecutivo,
  computeTipoOS,
  computeTopClassificacao,
  computeTopVeiculos,
  computeTopFornecedores,
  type TipoOsItem,
  type TopCatItem,
} from "@/lib/manutencaoUtils_executivo";
import { KpiCard } from "@/components/indicators/KpiCard";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useMemo, useState, useEffect } from "react";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ── Paleta ────────────────────────────────────────────────────────────────────
const C_AMBER  = "#F5A623";
const C_BLUE   = "#4A9EFF";
const C_GREEN  = "#22C97A";
const C_GRID   = "rgba(143,163,187,0.07)";
const C_CURSOR = "rgba(245,166,35,0.06)";
const OS_COLORS = [C_AMBER, C_BLUE];

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtK(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmtBRL(v);
}
function tickK(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}k`;
  return String(v);
}

// ── Estilos de eixo compartilhados ────────────────────────────────────────────
const TICK = { fill: "var(--sgt-text-muted)", fontSize: 9, fontFamily: "inherit" } as const;
const AX   = { axisLine: false as const, tickLine: false as const };

// ── Gauge ─────────────────────────────────────────────────────────────────────
function Gauge({ real, meta }: { real: number; meta: number }) {
  const color =
    real <= meta              ? C_GREEN
    : real <= meta * 1.1      ? C_AMBER
    :                           "#E94848";
  const pctN  = Math.min(100, (real / Math.max(meta * 1.5, 0.01)) * 100);
  const angle = -135 + (pctN / 100) * 270;
  const arc   = (pctN / 100) * 119.4;

  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-xl border h-full"
      style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)", padding: "10px 8px" }}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-center leading-tight"
        style={{ color: "var(--sgt-text-muted)" }}>
        Indicador<br />Manutenção
      </span>

      <div style={{ position: "relative", width: 88, height: 50 }}>
        <svg viewBox="0 0 100 56" width="88" height="50">
          <defs>
            <filter id="g-glow">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path d="M12,50 A38,38 0 0,1 88,50" fill="none"
            stroke="var(--sgt-border-subtle)" strokeWidth="8" strokeLinecap="round"/>
          <path d="M12,50 A38,38 0 0,1 88,50" fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${arc} 119.4`} filter="url(#g-glow)"/>
          <g transform={`rotate(${angle},50,50)`}>
            <line x1="50" y1="50" x2="50" y2="19"
              stroke={color} strokeWidth="2" strokeLinecap="round" opacity={0.85}/>
            <circle cx="50" cy="50" r="4.5" fill={color}/>
            <circle cx="50" cy="50" r="2.2" fill="var(--sgt-bg-card)"/>
          </g>
        </svg>
        <span style={{
          position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)",
          fontSize: 13, fontWeight: 900, color, fontVariantNumeric: "tabular-nums", lineHeight: 1,
        }}>
          {real.toFixed(1)}%
        </span>
      </div>

      <span className="text-[9px] text-center" style={{ color: "var(--sgt-text-muted)" }}>
        meta {meta}%
      </span>
    </div>
  );
}

// ── Tooltip área/linha ────────────────────────────────────────────────────────
function AreaTip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--sgt-menu-bg)", border: "1px solid var(--sgt-border-medium)",
      borderRadius: 10, padding: "8px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
    }}>
      <p style={{ fontSize: 9, color: "var(--sgt-text-muted)", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ fontSize: 16, fontWeight: 900, color: C_AMBER,
        letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
        {fmtBRL(payload[0].value)}
      </p>
    </div>
  );
}

// ── Tooltip genérico ──────────────────────────────────────────────────────────
function Tip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--sgt-menu-bg)", border: "1px solid var(--sgt-border-medium)",
      borderRadius: 10, padding: "8px 12px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      minWidth: 150,
    }}>
      {label && <p style={{ fontSize: 9, color: "var(--sgt-text-muted)", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{label}</p>}
      {payload.map(p => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0,
            boxShadow: `0 0 5px ${p.color}80` }} />
          <span style={{ flex: 1, fontSize: 10, color: "var(--sgt-text-secondary)" }}>{p.name}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sgt-text-primary)",
            fontVariantNumeric: "tabular-nums" }}>{fmtBRL(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Card de seção ─────────────────────────────────────────────────────────────
function Panel({ title, aside, children, className = "" }: {
  title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border ${className}`}
      style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)", padding: "12px 14px 10px" }}
    >
      <div className="flex items-center justify-between shrink-0 mb-2">
        <h3 style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.28em", color: "var(--sgt-text-muted)", margin: 0 }}>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

// ── Tick truncado para eixo Y ─────────────────────────────────────────────────
function TruncTick({ x, y, payload, maxChars = 10 }: {
  x?: number; y?: number; payload?: { value: string }; maxChars?: number;
}) {
  const v = payload?.value ?? "";
  const s = v.length > maxChars ? v.slice(0, maxChars - 1) + "…" : v;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={9}
      fill="var(--sgt-text-muted)" style={{ fontFamily: "inherit" }}>
      {s}
    </text>
  );
}

// ── Painel de split Tipo OS ───────────────────────────────────────────────────
function TipoOSSplit({ data }: { data: TipoOsItem[] }) {
  if (!data.length) {
    return <div className="flex-1 flex items-center justify-center"
      style={{ color: "var(--sgt-text-muted)", fontSize: 11 }}>Sem dados</div>;
  }
  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {data.map((item, i) => {
        const accent = OS_COLORS[i % OS_COLORS.length];
        return (
          <div key={item.tipo} className="flex-1 flex flex-col justify-between rounded-lg"
            style={{
              background: "var(--sgt-bg-surface)",
              border: `1px solid ${accent}22`,
              padding: "10px 12px",
              minHeight: 0,
            }}>
            {/* Tipo */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%",
                background: accent, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: "var(--sgt-text-muted)",
                textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700 }}>
                {item.tipo}
              </span>
            </div>
            {/* Valor e % */}
            <div style={{ marginTop: 6 }}>
              <p style={{ fontSize: "clamp(1.15rem, 2vw, 1.5rem)", fontWeight: 900,
                color: accent, letterSpacing: "-0.04em", lineHeight: 1, margin: 0,
                fontVariantNumeric: "tabular-nums" }}>
                {item.pct.toFixed(0)}<span style={{ fontSize: "0.55em", fontWeight: 600, marginLeft: 2 }}>%</span>
              </p>
              <p style={{ fontSize: 10, color: "var(--sgt-text-secondary)",
                fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
                {fmtBRL(item.custo)}
              </p>
            </div>
            {/* Fill bar */}
            <div style={{ marginTop: 8, height: 3,
              background: "var(--sgt-progress-track)", borderRadius: 99 }}>
              <div style={{
                height: "100%", width: `${item.pct}%`,
                background: accent, borderRadius: 99,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tooltip do PieChart Tipo OS ────────────────────────────────────────────────
function PieTip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { pct: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{
      background: "var(--sgt-menu-bg)", border: "1px solid var(--sgt-border-medium)",
      borderRadius: 10, padding: "8px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
    }}>
      <p style={{ fontSize: 9, color: "var(--sgt-text-muted)", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
        {p.name}
      </p>
      <p style={{ fontSize: 15, fontWeight: 900, color: C_AMBER,
        letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", margin: 0 }}>
        {p.payload.pct.toFixed(1)}%
      </p>
      <p style={{ fontSize: 10, color: "var(--sgt-text-secondary)", marginTop: 2 }}>
        {fmtBRL(p.value)}
      </p>
    </div>
  );
}

// ── Tooltip do Glow Bar ───────────────────────────────────────────────────────
function GlowBarTip({ active, payload }: {
  active?: boolean;
  payload?: { payload: { fullName: string; custo: number; pct: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "var(--sgt-menu-bg)", border: "1px solid var(--sgt-border-medium)",
      borderRadius: 10, padding: "8px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
      maxWidth: 220,
    }}>
      <p style={{ fontSize: 9, color: "var(--sgt-text-muted)", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4,
        wordBreak: "break-word" }}>
        {d.fullName}
      </p>
      <p style={{ fontSize: 15, fontWeight: 900, color: C_AMBER,
        letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", margin: 0 }}>
        {fmtK(d.custo)}
      </p>
      <p style={{ fontSize: 10, color: "var(--sgt-text-secondary)", marginTop: 2 }}>
        {d.pct.toFixed(1)}% do total
      </p>
    </div>
  );
}

// ── Barra com glow SVG ────────────────────────────────────────────────────────
function GlowBar(props: React.SVGProps<SVGRectElement> & {
  activeIdx?: number | null; index?: number;
}) {
  const { fill, x, y, width, height, activeIdx, index } = props;
  const isHot = activeIdx === null || activeIdx === undefined || activeIdx === index;
  return (
    <>
      <defs>
        <filter id={`glow-classif-${index}`} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <rect
        x={x} y={y} rx={4}
        width={width} height={height}
        fill={fill ?? C_AMBER}
        opacity={isHot ? 1 : 0.11}
        filter={activeIdx === index ? `url(#glow-classif-${index})` : undefined}
      />
    </>
  );
}

// ── Classificação: Glowing Bar Chart — top categorias com glow no hover ───────
function ClassifBarGlowChart({ items }: { items: TopCatItem[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!items.length) {
    return (
      <div className="flex-1 flex items-center justify-center"
        style={{ color: "var(--sgt-text-muted)", fontSize: 11 }}>
        Sem dados
      </div>
    );
  }

  const top = items.slice(0, 8);
  const data = top.map((item, i) => ({
    cat: item.cat.length > 10 ? item.cat.slice(0, 9) + "…" : item.cat,
    custo: item.custo,
    fullName: item.cat,
    pct: item.pct,
    idx: i,
  }));

  return (
    <div className="flex-1 min-h-0" style={{ minHeight: 100 }}
      onMouseLeave={() => setActiveIdx(null)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: 4, bottom: 36 }}
          barCategoryGap="30%"
        >
          <XAxis
            dataKey="cat"
            {...AX}
            tick={{ fill: "var(--sgt-text-muted)", fontSize: 8, fontFamily: "inherit" }}
            angle={-35}
            textAnchor="end"
            interval={0}
            dy={4}
          />
          <YAxis hide />
          <ReTooltip content={<GlowBarTip />} cursor={false} />
          <Bar
            dataKey="custo"
            fill={C_AMBER}
            radius={4}
            maxBarSize={22}
            background={{ fill: `${C_AMBER}12`, radius: 4 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => (
              <GlowBar {...props} activeIdx={activeIdx} />
            )}
            onMouseEnter={(_: unknown, index: number) => setActiveIdx(index)}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Lista editorial Top 10 ────────────────────────────────────────────────────
function RankedList({ items }: { items: TopCatItem[] }) {
  const max = items[0]?.custo ?? 1;
  return (
    <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto pr-0.5">
      {items.map((item, i) => (
        <div key={item.cat} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Rank */}
          <span style={{
            width: 18, flexShrink: 0, fontSize: 9, fontWeight: 800,
            letterSpacing: "0.04em", textAlign: "right", fontVariantNumeric: "tabular-nums",
            color: i < 3 ? C_AMBER : "var(--sgt-text-faint)",
          }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          {/* Bar + texto */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "baseline", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: "var(--sgt-text-secondary)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                flex: 1, minWidth: 0 }}>
                {item.cat}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--sgt-text-primary)",
                fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                {fmtK(item.custo)}
              </span>
            </div>
            {/* CSS fill bar — sem SVG, sem url() */}
            <div style={{ height: 2.5, background: "var(--sgt-progress-track)", borderRadius: 99 }}>
              <div style={{
                height: "100%",
                width: `${(item.custo / max) * 100}%`,
                background: `linear-gradient(to right, ${C_AMBER}, ${C_AMBER}70)`,
                borderRadius: 99,
                opacity: Math.max(0.4, 1 - i * 0.06),
              }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Legenda pill ──────────────────────────────────────────────────────────────
function PillLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex justify-center gap-3 shrink-0 pt-1">
      {items.map(({ label, color }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 3, borderRadius: 99,
            background: color, display: "inline-block" }} />
          <span style={{ fontSize: 9, color: "var(--sgt-text-muted)" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface Props { rows: ManutencaoRow[]; }

export function ExecutivoTab({ rows }: Props) {
  const { indicadores, faturamento, dwFilter } = useFinancialData();

  const indManut = useMemo(
    () => indicadores.find(i => i.nome === "Manutenção"),
    [indicadores]
  );

  // ── Ano selecionado ─────────────────────────────────────────────────────────
  const selectedYear = useMemo(() => {
    const d = new Date(dwFilter.dataInicio + "T00:00:00");
    return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  }, [dwFilter.dataInicio]);

  // ── Dados do ano inteiro para o gráfico comparativo ──────────────────────────
  const [yearRows, setYearRows] = useState<ManutencaoRow[]>([]);
  useEffect(() => {
    const jan1 = `${selectedYear}-01-01`;
    const now = new Date();
    const end = selectedYear < now.getFullYear()
      ? `${selectedYear}-12-31`
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    fetchManutencao({ dataInicio: jan1, dataFim: end, filial: dwFilter.filial ?? null })
      .then(res => setYearRows(res.data ?? []))
      .catch(() => setYearRows([]));
  }, [selectedYear, dwFilter.filial]);

  // ── Série mensal completa: Jan até mês atual do ano selecionado ───────────────
  const monthly = useMemo(() => {
    const now = new Date();
    const lastMonthIdx = selectedYear < now.getFullYear() ? 11 : now.getMonth();
    const map = new Map<number, number>();
    for (const r of yearRows) {
      if (!r.dataordem || !r.custo) continue;
      const d = new Date(r.dataordem);
      if (isNaN(d.getTime()) || d.getFullYear() !== selectedYear) continue;
      const m = d.getMonth();
      map.set(m, (map.get(m) ?? 0) + r.custo);
    }
    return Array.from({ length: lastMonthIdx + 1 }, (_, m) => ({
      mes: MESES[m],
      custo: map.get(m) ?? 0,
    }));
  }, [yearRows, selectedYear]);

  const kpis     = useMemo(() => computeKpisExecutivo(rows),        [rows]);
  const tipoOS   = useMemo(() => computeTipoOS(rows),               [rows]);
  const top10Cat = useMemo(() => computeTopClassificacao(rows, 10), [rows]);
  const top5Vei  = useMemo(() => computeTopVeiculos(rows, 5),       [rows]);
  const top5Forn = useMemo(() => computeTopFornecedores(rows, 5),   [rows]);

  const avgMonthly = useMemo(() => {
    if (!monthly.length) return 0;
    return monthly.reduce((s, m) => s + m.custo, 0) / monthly.length;
  }, [monthly]);

  const maxMonthly = useMemo(() => Math.max(...monthly.map(m => m.custo), 0), [monthly]);

  const pctPeca = kpis.custoTotal > 0 ? (kpis.custoPeca / kpis.custoTotal) * 100 : 0;
  const pctMO   = kpis.custoTotal > 0 ? (kpis.custoMO   / kpis.custoTotal) * 100 : 0;

  const totalFatInd = useMemo(
    () => faturamento.reduce((s, r) => s + (r.FRETE_TOTAL ?? 0), 0),
    [faturamento]
  );
  const indReal = useMemo(() => {
    if (!indManut) return 0;
    if (totalFatInd > 0)
      return Math.round((indManut.valorAbsoluto / totalFatInd) * 1000) / 10;
    return indManut.percentualReal;
  }, [indManut, totalFatInd]);
  const indMeta = indManut?.percentualEsperado ?? 15;
  const indTone = indReal <= indMeta         ? "emerald" as const
    : indReal <= indMeta * 1.1               ? "amber"   as const
    :                                          "rose"    as const;

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">

      {/* ── Row 1: KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 shrink-0 sgt-stagger"
        style={{ gridAutoRows: "1fr" }}>
        {([
          <KpiCard key="tot"   label="Custo Total"          value={fmtK(kpis.custoTotal)} rawValue={kpis.custoTotal}  subtitle="período selecionado"               icon={DollarSign}    tone="amber"   compact />,
          <KpiCard key="peca"  label="Custo Peça"           value={fmtK(kpis.custoPeca)}  rawValue={kpis.custoPeca}   subtitle={`${pctPeca.toFixed(1)}% do total`} icon={Package}       tone="emerald" compact />,
          <KpiCard key="mo"    label="Mão de Obra"          value={fmtK(kpis.custoMO)}    rawValue={kpis.custoMO}     subtitle={`${pctMO.toFixed(1)}% do total`}   icon={Wrench}        tone="blue"    compact />,
          <KpiCard key="plan"  label="Custo Plano Manut."   value={fmtK(kpis.custoPlano)} rawValue={kpis.custoPlano}  subtitle="PLANOMANUTENCAO"                   icon={ClipboardList} tone="violet"  compact />,
          <KpiCard key="ind"   label="Indicador Manutenção" value={`${indReal.toFixed(1)}%`} rawValue={indReal}       subtitle={`meta ${indMeta}%`}                icon={Target}        tone={indTone} compact />,
        ] as React.ReactNode[]).map((c, i) => (
          <AnimatedCard key={i} delay={i * 45} className="flex flex-col">
            <div className="flex-1">{c}</div>
          </AnimatedCard>
        ))}
      </div>

      {/* ── Rows 2+3: crescem para preencher o restante ─────────────────── */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">

        {/* ── Row 2: Comparativo Mensal + Custo por Classificação + Tipo OS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 min-h-0">

          {/* ── 1. Comparativo Mensal — ComposedChart Line + Area ─────────── */}
          <AnimatedCard delay={220} className="min-h-0 flex flex-col">
            <Panel
              title="Comparativo Mensal"
              className="flex-1 min-h-0"
              aside={avgMonthly > 0 ? (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: C_AMBER,
                  background: `${C_AMBER}18`, borderRadius: 6,
                  padding: "2px 7px", letterSpacing: "0.04em",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <TrendingUp size={9} />
                  média {fmtK(avgMonthly)}
                </span>
              ) : undefined}
            >
              <div className="flex-1 min-h-0" style={{ minHeight: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthly} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="comp-amber" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={C_AMBER} stopOpacity={0.30} />
                        <stop offset="100%" stopColor={C_AMBER} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    {/* Grid pontilhado igual à referência */}
                    <CartesianGrid
                      strokeDasharray="4 4"
                      stroke="var(--sgt-border-subtle)"
                      strokeOpacity={1}
                      horizontal vertical={false}
                    />
                    <XAxis dataKey="mes" tick={TICK} {...AX} dy={5} tickMargin={12} />
                    <YAxis tickFormatter={tickK} tick={TICK} {...AX} width={38} tickMargin={12} />
                    <ReTooltip
                      content={<AreaTip />}
                      cursor={{
                        stroke: "var(--sgt-border-subtle)",
                        strokeWidth: 1,
                        strokeDasharray: "none",
                      }}
                    />
                    {avgMonthly > 0 && (
                      <ReferenceLine
                        y={avgMonthly}
                        stroke={C_AMBER} strokeDasharray="4 4"
                        strokeOpacity={0.5} strokeWidth={1}
                      />
                    )}
                    {/* Área de gradiente sob a linha */}
                    <Area
                      type="linear"
                      dataKey="custo"
                      stroke="transparent"
                      fill="url(#comp-amber)"
                      strokeWidth={0}
                      dot={false}
                    />
                    {/* Linha principal — dots ocos grandes (r=6) como na referência */}
                    <Line
                      type="linear"
                      dataKey="custo"
                      name="Custo"
                      stroke={C_AMBER}
                      strokeWidth={2}
                      dot={{
                        fill: "var(--sgt-bg-card)",
                        strokeWidth: 2,
                        r: 6,
                        stroke: C_AMBER,
                      }}
                      activeDot={{ r: 7, fill: C_AMBER,
                        stroke: "var(--sgt-bg-card)", strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </AnimatedCard>

          {/* ── 2. Custo por Classificação — ranked horizontal bars ───────── */}
          <AnimatedCard delay={250} className="min-h-0 flex flex-col">
            <Panel title="Custo por Classificação" className="flex-1 min-h-0">
              <ClassifBarGlowChart items={top10Cat} />
            </Panel>
          </AnimatedCard>

          {/* ── 3. Tipo de Ordem de Serviço — PieChart donut ─────────────── */}
          <AnimatedCard delay={280} className="min-h-0 flex flex-col">
            <Panel title="Tipo de Ordem de Serviço" className="flex-1 min-h-0">
              {tipoOS.length === 0 ? (
                <div className="flex-1 flex items-center justify-center"
                  style={{ color: "var(--sgt-text-muted)", fontSize: 11 }}>
                  Sem dados
                </div>
              ) : (
                <div className="flex flex-col flex-1 min-h-0">
                  {/* PieChart simples (sem donut), aspecto quadrado — referência Prompt 3 */}
                  <div className="flex-1 min-h-0 mx-auto w-full" style={{ minHeight: 90, maxHeight: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <ReTooltip content={<PieTip />} cursor={false} />
                        <Pie
                          data={tipoOS}
                          dataKey="custo"
                          nameKey="tipo"
                          strokeWidth={2}
                          stroke="var(--sgt-bg-card)"
                        >
                          {tipoOS.map((_, i) => (
                            <Cell key={i} fill={OS_COLORS[i % OS_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legenda */}
                  <div className="shrink-0 flex flex-col gap-1.5 pt-2">
                    {tipoOS.map((item, i) => (
                      <div key={item.tipo} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: OS_COLORS[i % OS_COLORS.length],
                          flexShrink: 0,
                        }} />
                        <span style={{ flex: 1, fontSize: 10,
                          color: "var(--sgt-text-secondary)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.tipo}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: "var(--sgt-text-primary)", flexShrink: 0 }}>
                          {item.pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          </AnimatedCard>
        </div>

        {/* ── Row 3: Top 10 + Top 5 veículos + Top 5 fornecedores ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 min-h-0">

          {/* ── Top 10 — lista editorial ──────────────────────────────────── */}
          <AnimatedCard delay={300} className="min-h-0 flex flex-col">
            <Panel title="Custo por Classificação — Top 10" className="flex-1 min-h-0">
              <RankedList items={top10Cat} />
            </Panel>
          </AnimatedCard>

          {/* ── Top 5 Veículos ────────────────────────────────────────────── */}
          <AnimatedCard delay={340} className="min-h-0 flex flex-col">
            <Panel title="Top 5 Veículos" className="flex-1 min-h-0">
              <div className="flex-1 min-h-0" style={{ minHeight: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top5Vei} layout="vertical"
                    margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid horizontal={false} stroke={C_GRID} />
                    <XAxis type="number" tickFormatter={tickK} tick={TICK} {...AX} />
                    <YAxis type="category" dataKey="veiculo" width={60}
                      tick={<TruncTick maxChars={9} />} {...AX} />
                    <ReTooltip content={<Tip />} cursor={{ fill: C_CURSOR, rx: 3 }} />
                    <Bar dataKey="peca" name="Peça"        fill={C_AMBER} radius={[0, 3, 3, 0]} maxBarSize={11} />
                    <Bar dataKey="mo"   name="Mão de Obra" fill={C_BLUE}  radius={[0, 3, 3, 0]} maxBarSize={11} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <PillLegend items={[{ label: "Peça", color: C_AMBER }, { label: "M.O.", color: C_BLUE }]} />
            </Panel>
          </AnimatedCard>

          {/* ── Top 5 Fornecedores ────────────────────────────────────────── */}
          <AnimatedCard delay={380} className="min-h-0 flex flex-col">
            <Panel title="Top 5 Fornecedores" className="flex-1 min-h-0">
              <div className="flex-1 min-h-0" style={{ minHeight: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top5Forn} layout="vertical"
                    margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid horizontal={false} stroke={C_GRID} />
                    <XAxis type="number" tickFormatter={tickK} tick={TICK} {...AX} />
                    <YAxis type="category" dataKey="fornecedor" width={72}
                      tick={<TruncTick maxChars={11} />} {...AX} />
                    <ReTooltip content={<Tip />} cursor={{ fill: C_CURSOR, rx: 3 }} />
                    <Bar dataKey="peca" name="Peça"        fill={C_AMBER} radius={[0, 3, 3, 0]} maxBarSize={11} />
                    <Bar dataKey="mo"   name="Mão de Obra" fill={C_BLUE}  radius={[0, 3, 3, 0]} maxBarSize={11} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <PillLegend items={[{ label: "Peça", color: C_AMBER }, { label: "M.O.", color: C_BLUE }]} />
            </Panel>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
}
