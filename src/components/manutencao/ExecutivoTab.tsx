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
import { useFinancialData } from "@/contexts/FinancialDataContext";
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

// ── Gauge SVG — mesma lógica da tela de Indicadores ──────────────────────────
function IndicadorCard({ percentualReal, percentualEsperado }: {
  percentualReal: number;
  percentualEsperado: number;
}) {
  const clamped = Math.min(150, Math.max(0, percentualReal));
  // verde < meta, amarelo até 110% da meta, vermelho acima
  const color = percentualReal <= percentualEsperado
    ? "#22c55e"
    : percentualReal <= percentualEsperado * 1.1
    ? C_AMBER
    : "#ef4444";

  // Agulha gira de -135° (0%) a +135° (100% da escala normalizada)
  const pctNorm = Math.min(100, (percentualReal / Math.max(percentualEsperado * 1.5, 0.01)) * 100);
  const angle   = -135 + (pctNorm / 100) * 270;

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

      <div className="relative flex items-center justify-center" style={{ width: 88, height: 52 }}>
        <svg viewBox="0 0 100 58" width="88" height="52">
          {/* Track */}
          <path d="M12,52 A38,38 0 0,1 88,52" fill="none"
            stroke="var(--sgt-border-subtle)" strokeWidth="9" strokeLinecap="round" />
          {/* Fill proporcional */}
          <path d="M12,52 A38,38 0 0,1 88,52" fill="none"
            stroke={color} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${(pctNorm / 100) * 119.4} 119.4`} />
          {/* Agulha */}
          <g transform={`rotate(${angle}, 50, 52)`}>
            <line x1="50" y1="52" x2="50" y2="20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="50" cy="52" r="4" fill={color} />
          </g>
        </svg>
        <span className="absolute font-black text-sm tabular-nums"
          style={{ color, bottom: -2, position: "absolute" }}>
          {percentualReal.toFixed(1)}%
        </span>
      </div>

      <span className="text-[9px] text-center" style={{ color: "var(--sgt-text-muted)" }}>
        meta {percentualEsperado}% • real/faturamento
      </span>
    </div>
  );
}

// ── Tooltip customizado ───────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
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
function SectionCard({ title, children, className = "" }: {
  title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-2 p-3 sm:p-4 rounded-xl border ${className}`}
      style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
    >
      <h3 className="text-[9px] font-bold uppercase tracking-[0.28em] shrink-0"
        style={{ color: "var(--sgt-text-muted)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Tick truncado para eixo Y horizontal ──────────────────────────────────────
function TruncTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const raw   = payload?.value ?? "";
  const label = raw.length > 16 ? raw.slice(0, 14) + "…" : raw;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={9}
      fill="var(--sgt-text-muted)" style={{ fontFamily: "inherit" }}>
      {label}
    </text>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface Props { rows: ManutencaoRow[]; }

export function ExecutivoTab({ rows }: Props) {
  const { indicadores } = useFinancialData();

  // Indicador de Manutenção vem da tela de Indicadores (mesma fonte)
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

  const DONUT_COLORS = [C_AMBER, C_INDIGO];

  const pctPeca = kpis.custoTotal > 0 ? kpis.custoPeca / kpis.custoTotal * 100 : 0;
  const pctMO   = kpis.custoTotal > 0 ? kpis.custoMO   / kpis.custoTotal * 100 : 0;

  // Top 10 em formato compatível com Recharts (barras horizontais)
  const top10Chart = useMemo(
    () => [...top10Cat].reverse(), // Recharts layout=vertical renderiza de baixo pra cima
    [top10Cat]
  );

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 min-h-0">

      {/* ── Row 1: KPI cards — altura uniforme via row com h fixo ── */}
      <div
        className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5 shrink-0 sgt-stagger"
        style={{ gridAutoRows: "1fr" }}  /* força células de mesma altura */
      >
        {[
          <KpiCard key="total"
            label="Custo Total"
            value={fmtK(kpis.custoTotal)}
            rawValue={kpis.custoTotal}
            subtitle="período selecionado"
            icon={DollarSign}
            tone="amber"
            compact
          />,
          <KpiCard key="peca"
            label="Custo Peça"
            value={fmtK(kpis.custoPeca)}
            rawValue={kpis.custoPeca}
            subtitle={`${pctPeca.toFixed(1)}% do total`}
            icon={Package}
            tone="emerald"
            compact
          />,
          <KpiCard key="mo"
            label="Custo Mão de Obra"
            value={fmtK(kpis.custoMO)}
            rawValue={kpis.custoMO}
            subtitle={`${pctMO.toFixed(1)}% do total`}
            icon={Wrench}
            tone="blue"
            compact
          />,
          <KpiCard key="plano"
            label="Custo Plano Manut."
            value={fmtK(kpis.custoPlano)}
            rawValue={kpis.custoPlano}
            subtitle="tipo PLANOMANUTENCAO"
            icon={ClipboardList}
            tone="violet"
            compact
          />,
        ].map((card, i) => (
          <AnimatedCard key={i} delay={i * 40} className="flex flex-col">
            <div className="flex-1">{card}</div>
          </AnimatedCard>
        ))}

        {/* Gauge — mesma célula do grid, altura controlada pelo gridAutoRows */}
        <AnimatedCard delay={160} className="flex flex-col">
          <IndicadorCard
            percentualReal={indManut?.percentualReal ?? 0}
            percentualEsperado={indManut?.percentualEsperado ?? 15}
          />
        </AnimatedCard>
      </div>

      {/* ── Rows 2+3 crescem para preencher o espaço restante ── */}
      <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 min-h-0">

        {/* Row 2: Mês a mês (2/3) + Tipo OS (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 flex-1 min-h-0">

          <AnimatedCard delay={200} className="lg:col-span-2 min-h-0 flex flex-col">
            <SectionCard title="Total Mês a Mês" className="flex-1 min-h-0">
              <div className="flex-1 min-h-0" style={{ minHeight: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid vertical={false} stroke={C_MUTED} />
                    <XAxis dataKey="mes" tick={{ fill: "var(--sgt-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fill: "var(--sgt-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
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
                    <Pie data={tipoOS} dataKey="custo" nameKey="tipo"
                      cx="50%" cy="50%" innerRadius="42%" outerRadius="68%" paddingAngle={2}>
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

        {/* Row 3: Top 10 (chart) + Top 5 veículos + Top 5 fornecedores */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 flex-1 min-h-0">

          {/* Top 10 — gráfico de barras horizontais (usa todo o espaço disponível) */}
          <AnimatedCard delay={280} className="min-h-0 flex flex-col">
            <SectionCard title="Custo Total — Top 10" className="flex-1 min-h-0">
              <div className="flex-1 min-h-0" style={{ minHeight: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={top10Chart}
                    layout="vertical"
                    margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
                    barCategoryGap="18%"
                  >
                    <CartesianGrid horizontal={false} stroke={C_MUTED} />
                    <XAxis
                      type="number"
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fill: "var(--sgt-text-muted)", fontSize: 8 }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="cat"
                      width={90}
                      tick={<TruncTick />}
                      axisLine={false} tickLine={false}
                    />
                    <ReTooltip
                      formatter={(v: number) => fmtBRL(v)}
                      contentStyle={{ background: "var(--sgt-menu-bg)", border: "1px solid var(--sgt-border-medium)", borderRadius: 12, fontSize: 11 }}
                      itemStyle={{ color: "var(--sgt-text-primary)" }}
                      labelStyle={{ color: "var(--sgt-text-muted)", fontWeight: 600, marginBottom: 4 }}
                    />
                    <Bar dataKey="custo" name="Custo" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      {top10Chart.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={C_AMBER}
                          opacity={1 - i * 0.065}  /* gradiente visual de cima pra baixo */
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </AnimatedCard>

          {/* Top 5 veículos */}
          <AnimatedCard delay={320} className="min-h-0 flex flex-col">
            <SectionCard title="Top 5 Veículos — Peça e Mão de Obra" className="flex-1 min-h-0">
              <div className="flex-1 min-h-0" style={{ minHeight: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top5Vei} layout="vertical"
                    margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barCategoryGap="25%">
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
                  <BarChart data={top5Forn} layout="vertical"
                    margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barCategoryGap="25%">
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
