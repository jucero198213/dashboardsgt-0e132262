import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as ReTooltip, CartesianGrid, Cell,
  PieChart, Pie, Legend,
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
import { useMemo } from "react";

const C_AMBER  = "#F59E0B";
const C_INDIGO = "#6366F1";
const C_MUTED  = "rgba(255,255,255,0.05)";

function fmtK(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1).replace(".", ",")}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}
function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(v: number) { return `${v.toFixed(1)}%`; }

// ── Gauge SVG do indicador ─────────────────────────────────────────────────────
function IndicadorCard({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  const angle   = -135 + (clamped / 100) * 270;
  const color   = clamped < 20 ? "#22c55e" : clamped < 50 ? C_AMBER : "#ef4444";
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border h-full"
      style={{
        background: "var(--sgt-bg-card)",
        borderColor: "var(--sgt-border-subtle)",
        minHeight: 92,
      }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-center"
        style={{ color: "var(--sgt-text-muted)" }}>
        Indicador Manutenção
      </span>
      <div className="relative flex items-center justify-center" style={{ width: 88, height: 50 }}>
        <svg viewBox="0 0 100 58" width="88" height="50">
          <path d="M12,52 A38,38 0 0,1 88,52" fill="none" stroke="var(--sgt-border-subtle)" strokeWidth="9" strokeLinecap="round" />
          <path d="M12,52 A38,38 0 0,1 88,52" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${(clamped / 100) * 119.4} 119.4`} />
          <g transform={`rotate(${angle}, 50, 52)`}>
            <line x1="50" y1="52" x2="50" y2="20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="50" cy="52" r="4" fill={color} />
          </g>
        </svg>
        <span className="absolute font-black text-base tabular-nums" style={{ color, bottom: -2, position: "absolute" }}>
          {pct(clamped)}
        </span>
      </div>
      <span className="text-[9px] text-center" style={{ color: "var(--sgt-text-muted)" }}>
        % custo plano / total
      </span>
    </div>
  );
}

// ── Tooltip customizado ───────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border px-3 py-2 text-xs shadow-xl"
      style={{ background: "var(--sgt-menu-bg)", borderColor: "var(--sgt-border-medium)", color: "var(--sgt-text-primary)" }}>
      {label && <p className="font-bold mb-1">{label}</p>}
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmtBRL(p.value)}</p>
      ))}
    </div>
  );
}

// ── Card de seção ─────────────────────────────────────────────────────────────
function SectionCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col gap-2 p-3 sm:p-4 rounded-xl border ${className}`}
      style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
    >
      <h3 className="text-[9px] font-bold uppercase tracking-[0.28em] shrink-0" style={{ color: "var(--sgt-text-muted)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface Props { rows: ManutencaoRow[]; }

export function ExecutivoTab({ rows }: Props) {
  const kpis     = useMemo(() => computeKpisExecutivo(rows),        [rows]);
  const monthly  = useMemo(() => computeMonthlyCosts(rows),         [rows]);
  const tipoOS   = useMemo(() => computeTipoOS(rows),               [rows]);
  const top10Cat = useMemo(() => computeTopClassificacao(rows, 10), [rows]);
  const top5Vei  = useMemo(() => computeTopVeiculos(rows, 5),       [rows]);
  const top5Forn = useMemo(() => computeTopFornecedores(rows, 5),   [rows]);

  const DONUT_COLORS = [C_AMBER, C_INDIGO];

  const pctPeca = kpis.custoTotal > 0 ? kpis.custoPeca / kpis.custoTotal * 100 : 0;
  const pctMO   = kpis.custoTotal > 0 ? kpis.custoMO   / kpis.custoTotal * 100 : 0;

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 min-h-0">

      {/* ── Row 1: KPI cards (altura fixa) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5 shrink-0 sgt-stagger">
        <AnimatedCard delay={0}>
          <KpiCard
            label="Custo Total"
            value={fmtK(kpis.custoTotal)}
            rawValue={kpis.custoTotal}
            subtitle="período selecionado"
            icon={DollarSign}
            tone="amber"
            compact
          />
        </AnimatedCard>
        <AnimatedCard delay={40}>
          <KpiCard
            label="Custo Peça"
            value={fmtK(kpis.custoPeca)}
            rawValue={kpis.custoPeca}
            subtitle={`${pct(pctPeca)} do total`}
            icon={Package}
            tone="emerald"
            compact
          />
        </AnimatedCard>
        <AnimatedCard delay={80}>
          <KpiCard
            label="Custo Mão de Obra"
            value={fmtK(kpis.custoMO)}
            rawValue={kpis.custoMO}
            subtitle={`${pct(pctMO)} do total`}
            icon={Wrench}
            tone="blue"
            compact
          />
        </AnimatedCard>
        <AnimatedCard delay={120}>
          <KpiCard
            label="Custo Plano Manut."
            value={fmtK(kpis.custoPlano)}
            rawValue={kpis.custoPlano}
            subtitle="tipo PLANOMANUTENCAO"
            icon={ClipboardList}
            tone="violet"
            compact
          />
        </AnimatedCard>
        <AnimatedCard delay={160}>
          <IndicadorCard value={kpis.indicador} />
        </AnimatedCard>
      </div>

      {/* ── Rows 2+3 preenchem o espaço restante ── */}
      <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 min-h-0">

        {/* Row 2: Mês a mês + Tipo OS — cresce para preencher metade */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 flex-1 min-h-0">

          <AnimatedCard delay={200} className="lg:col-span-2 min-h-0 flex flex-col">
            <SectionCard title="Total Mês a Mês" className="flex-1 min-h-0">
              <div className="flex-1 min-h-0" style={{ minHeight: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid vertical={false} stroke={C_MUTED} />
                    <XAxis dataKey="mes" tick={{ fill: "var(--sgt-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fill: "var(--sgt-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
                    <ReTooltip content={<CustomTooltip />} cursor={{ fill: C_MUTED }} />
                    <Bar dataKey="custo" name="Custo" fill={C_AMBER} radius={[4, 4, 0, 0]} maxBarSize={52} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </AnimatedCard>

          <AnimatedCard delay={240} className="min-h-0 flex flex-col">
            <SectionCard title="Tipo Ordem de Serviço" className="flex-1 min-h-0">
              <div className="flex-1 min-h-0" style={{ minHeight: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tipoOS} dataKey="custo" nameKey="tipo"
                      cx="50%" cy="50%" innerRadius="42%" outerRadius="68%" paddingAngle={2}
                    >
                      {tipoOS.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <ReTooltip
                      formatter={(v: number) => fmtBRL(v)}
                      contentStyle={{ background: "var(--sgt-menu-bg)", border: "1px solid var(--sgt-border-medium)", borderRadius: 12, fontSize: 11 }}
                      itemStyle={{ color: "var(--sgt-text-primary)" }}
                    />
                    <Legend
                      formatter={v => <span style={{ color: "var(--sgt-text-muted)", fontSize: 10 }}>{v}</span>}
                      iconType="circle" iconSize={7}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </AnimatedCard>
        </div>

        {/* Row 3: Top 10 + Top 5 veículos + Top 5 fornecedores — cresce para preencher o resto */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 flex-1 min-h-0">

          {/* Top 10 classificação — barras tipo progress */}
          <AnimatedCard delay={280} className="min-h-0 flex flex-col">
            <SectionCard title="Custo Total — Top 10" className="flex-1 min-h-0 overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                {top10Cat.map((item) => (
                  <div key={item.cat} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] truncate" style={{ color: "var(--sgt-text-secondary)", maxWidth: "60%" }}>
                        {item.cat}
                        <span className="ml-1" style={{ color: "var(--sgt-text-muted)" }}>({pct(item.pct)})</span>
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
            </SectionCard>
          </AnimatedCard>

          {/* Top 5 veículos */}
          <AnimatedCard delay={320} className="min-h-0 flex flex-col">
            <SectionCard title="Top 5 Veículos — Peça e Mão de Obra" className="flex-1 min-h-0">
              <div className="flex-1 min-h-0" style={{ minHeight: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top5Vei} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barCategoryGap="25%">
                    <CartesianGrid horizontal={false} stroke={C_MUTED} />
                    <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fill: "var(--sgt-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="veiculo" width={60}
                      tick={{ fill: "var(--sgt-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <ReTooltip content={<CustomTooltip />} cursor={{ fill: C_MUTED }} />
                    <Legend formatter={v => <span style={{ color: "var(--sgt-text-muted)", fontSize: 9 }}>{v}</span>} iconSize={7} />
                    <Bar dataKey="peca" name="Custo Peça"        fill={C_AMBER}  radius={[0, 3, 3, 0]} maxBarSize={13} />
                    <Bar dataKey="mo"   name="Custo Mão de Obra" fill={C_INDIGO} radius={[0, 3, 3, 0]} maxBarSize={13} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </AnimatedCard>

          {/* Top 5 fornecedores */}
          <AnimatedCard delay={360} className="min-h-0 flex flex-col">
            <SectionCard title="Top 5 Fornecedores — Peça e Mão de Obra" className="flex-1 min-h-0">
              <div className="flex-1 min-h-0" style={{ minHeight: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top5Forn} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barCategoryGap="25%">
                    <CartesianGrid horizontal={false} stroke={C_MUTED} />
                    <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fill: "var(--sgt-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="fornecedor" width={72}
                      tick={{ fill: "var(--sgt-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <ReTooltip content={<CustomTooltip />} cursor={{ fill: C_MUTED }} />
                    <Legend formatter={v => <span style={{ color: "var(--sgt-text-muted)", fontSize: 9 }}>{v}</span>} iconSize={7} />
                    <Bar dataKey="peca" name="Custo Peça"        fill={C_AMBER}  radius={[0, 3, 3, 0]} maxBarSize={13} />
                    <Bar dataKey="mo"   name="Custo Mão de Obra" fill={C_INDIGO} radius={[0, 3, 3, 0]} maxBarSize={13} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
}
