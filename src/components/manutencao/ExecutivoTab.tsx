import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as ReTooltip, CartesianGrid, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { DollarSign, Wrench, Package, ClipboardList, Gauge } from "lucide-react";
import type { ManutencaoRow } from "@/lib/dwApi";
import {
  computeKpisExecutivo,
  computeMonthlyCosts,
  computeTipoOS,
  computeTopClassificacao,
  computeTopVeiculos,
  computeTopFornecedores,
} from "@/lib/manutencaoUtils_executivo";
import { useMemo } from "react";

// ── Paleta (validada contra o design system SGT) ──────────────────────────────
const C_AMBER  = "#F59E0B";
const C_AMBER2 = "#FCD34D";
const C_INDIGO = "#6366F1";
const C_MUTED  = "rgba(255,255,255,0.07)";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtK(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1).replace(".", ",")}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}
function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(v: number) { return `${v.toFixed(1)}%`; }

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, color,
}: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div
      className="flex flex-col gap-2 p-3 sm:p-4 rounded-xl border"
      style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest leading-tight" style={{ color: "var(--sgt-text-muted)" }}>
          {label}
        </span>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}18` }}>
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
      </div>
      <span className="text-xl sm:text-2xl font-black tracking-tight leading-none" style={{ color: "var(--sgt-text-primary)" }}>
        {value}
      </span>
      {sub && <span className="text-[11px]" style={{ color: "var(--sgt-text-muted)" }}>{sub}</span>}
    </div>
  );
}

// ── Gauge do indicador ────────────────────────────────────────────────────────
function IndicadorGauge({ pct: value }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  const angle   = -135 + (clamped / 100) * 270;
  const color   = clamped < 20 ? "#22c55e" : clamped < 50 ? C_AMBER : "#ef4444";
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl border"
      style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)" }}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--sgt-text-muted)" }}>
        Indicador Manutenção
      </span>
      <div className="relative flex items-center justify-center" style={{ width: 100, height: 60 }}>
        <svg viewBox="0 0 100 55" width="100" height="55">
          {/* Track */}
          <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="var(--sgt-border-subtle)" strokeWidth="8" strokeLinecap="round"/>
          {/* Fill */}
          <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${(clamped / 100) * 125.6} 125.6`}/>
          {/* Needle */}
          <g transform={`rotate(${angle}, 50, 50)`}>
            <line x1="50" y1="50" x2="50" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="50" cy="50" r="3" fill={color}/>
          </g>
        </svg>
        <span
          className="absolute bottom-0 text-lg font-black"
          style={{ color, bottom: -4 }}
        >{pct(clamped)}</span>
      </div>
      <span className="text-[10px] text-center" style={{ color: "var(--sgt-text-muted)" }}>
        % custo plano / total
      </span>
    </div>
  );
}

// ── Tooltip customizado ───────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: {name: string; value: number; color: string}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border px-3 py-2 text-xs shadow-xl"
      style={{ background: "var(--sgt-menu-bg)", borderColor: "var(--sgt-border-medium)", color: "var(--sgt-text-primary)" }}>
      {label && <p className="font-bold mb-1">{label}</p>}
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmtBRL(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Seção com título ──────────────────────────────────────────────────────────
function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col gap-3 p-3 sm:p-4 rounded-xl border ${className}`}
      style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)" }}
    >
      <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--sgt-text-muted)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface Props { rows: ManutencaoRow[]; }

export function ExecutivoTab({ rows }: Props) {
  const kpis      = useMemo(() => computeKpisExecutivo(rows),          [rows]);
  const monthly   = useMemo(() => computeMonthlyCosts(rows),           [rows]);
  const tipoOS    = useMemo(() => computeTipoOS(rows),                 [rows]);
  const top10Cat  = useMemo(() => computeTopClassificacao(rows, 10),   [rows]);
  const top5Vei   = useMemo(() => computeTopVeiculos(rows, 5),         [rows]);
  const top5Forn  = useMemo(() => computeTopFornecedores(rows, 5),     [rows]);

  const DONUT_COLORS = [C_AMBER, C_INDIGO];

  return (
    <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0 pb-2">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 shrink-0">
        <KpiCard label="Custo Total"         value={fmtK(kpis.custoTotal)} sub="período selecionado" icon={DollarSign}   color={C_AMBER}  />
        <KpiCard label="Custo Peça"          value={fmtK(kpis.custoPeca)}  sub={pct(kpis.custoTotal > 0 ? kpis.custoPeca / kpis.custoTotal * 100 : 0) + " do total"} icon={Package}     color="#22c55e" />
        <KpiCard label="Custo Mão de Obra"   value={fmtK(kpis.custoMO)}   sub={pct(kpis.custoTotal > 0 ? kpis.custoMO   / kpis.custoTotal * 100 : 0) + " do total"} icon={Wrench}      color={C_INDIGO} />
        <KpiCard label="Custo Plano Manut."  value={fmtK(kpis.custoPlano)} sub="tipo PLANOMANUTENCAO" icon={ClipboardList} color="#8b5cf6" />
        <IndicadorGauge pct={kpis.indicador} />
      </div>

      {/* ── Linha 2: Mês a mês + Tipo OS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0" style={{ minHeight: 260 }}>

        {/* Mês a mês (2/3) */}
        <Section title="Total Mês a Mês" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={C_MUTED} />
              <XAxis dataKey="mes" tick={{ fill: "var(--sgt-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fill: "var(--sgt-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
              <ReTooltip content={<CustomTooltip />} cursor={{ fill: C_MUTED }} />
              <Bar dataKey="custo" name="Custo" fill={C_AMBER} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* Tipo OS (1/3) */}
        <Section title="Tipo Ordem de Serviço">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={tipoOS}
                dataKey="custo"
                nameKey="tipo"
                cx="50%" cy="55%"
                innerRadius="45%"
                outerRadius="70%"
                paddingAngle={2}
              >
                {tipoOS.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <ReTooltip
                formatter={(v: number) => fmtBRL(v)}
                contentStyle={{ background: "var(--sgt-menu-bg)", border: "1px solid var(--sgt-border-medium)", borderRadius: 12, fontSize: 12 }}
                itemStyle={{ color: "var(--sgt-text-primary)" }}
              />
              <Legend
                formatter={(v) => <span style={{ color: "var(--sgt-text-muted)", fontSize: 11 }}>{v}</span>}
                iconType="circle" iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* ── Linha 3: Top 10 cat + Top 5 veículos + Top 5 fornecedores ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0">

        {/* Top 10 classificação — barras horizontais */}
        <Section title="Custo Total — Top 10">
          <div className="flex flex-col gap-1.5">
            {top10Cat.map((item) => (
              <div key={item.cat} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] truncate max-w-[60%]" style={{ color: "var(--sgt-text-secondary)" }}>
                    {item.cat} <span style={{ color: "var(--sgt-text-muted)" }}>({pct(item.pct)})</span>
                  </span>
                  <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: C_AMBER }}>
                    {fmtK(item.custo)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--sgt-border-subtle)" }}>
                  <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: C_AMBER }} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Top 5 veículos */}
        <Section title="Top 5 Veículos — Peça e Mão de Obra">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={top5Vei} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
              <CartesianGrid horizontal={false} stroke={C_MUTED} />
              <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}k`}
                tick={{ fill: "var(--sgt-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="veiculo" width={64}
                tick={{ fill: "var(--sgt-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <ReTooltip content={<CustomTooltip />} cursor={{ fill: C_MUTED }} />
              <Legend formatter={v => <span style={{ color: "var(--sgt-text-muted)", fontSize: 10 }}>{v}</span>} iconSize={8} />
              <Bar dataKey="peca" name="Custo Peça"        fill={C_AMBER}  radius={[0, 4, 4, 0]} maxBarSize={14} />
              <Bar dataKey="mo"   name="Custo Mão de Obra" fill={C_INDIGO} radius={[0, 4, 4, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* Top 5 fornecedores */}
        <Section title="Top 5 Fornecedores — Peça e Mão de Obra">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={top5Forn} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
              <CartesianGrid horizontal={false} stroke={C_MUTED} />
              <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}k`}
                tick={{ fill: "var(--sgt-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="fornecedor" width={80}
                tick={{ fill: "var(--sgt-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <ReTooltip content={<CustomTooltip />} cursor={{ fill: C_MUTED }} />
              <Legend formatter={v => <span style={{ color: "var(--sgt-text-muted)", fontSize: 10 }}>{v}</span>} iconSize={8} />
              <Bar dataKey="peca" name="Custo Peça"        fill={C_AMBER}  radius={[0, 4, 4, 0]} maxBarSize={14} />
              <Bar dataKey="mo"   name="Custo Mão de Obra" fill={C_INDIGO} radius={[0, 4, 4, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>
    </div>
  );
}
