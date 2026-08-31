import { DollarSign, Wrench, Package, ClipboardList, Target } from "lucide-react";
import { fetchManutencao, type ManutencaoRow } from "@/lib/dwApi";
import {
  computeKpisExecutivo,
  computeTipoOS,
  computeTopVeiculos,
  computeTopFornecedores,
  type TipoOsItem,
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
const OS_COLORS = [C_AMBER, C_BLUE, C_GREEN, "#8B5CF6", "#F43F5E"];

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtK(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmtBRL(v);
}

// ── Breakdown classificação ───────────────────────────────────────────────────
interface CatBreakdown { cat: string; fullName: string; peca: number; mo: number; total: number; }
function computeClassifBreakdown(rows: ManutencaoRow[], n = 7): CatBreakdown[] {
  const map = new Map<string, { peca: number; mo: number }>();
  for (const r of rows) {
    const key = r.classificacao?.trim() || "Não classificado";
    if (!map.has(key)) map.set(key, { peca: 0, mo: 0 });
    const e = map.get(key)!;
    e.peca += (r.valorpc ?? 0) + (r.valorpc2 ?? 0);
    e.mo   += (r.valormo ?? 0) + (r.valormo2 ?? 0);
  }
  return Array.from(map.entries())
    .map(([fullName, v]) => ({
      cat: fullName.length > 9 ? fullName.slice(0, 8) + "…" : fullName,
      fullName, peca: v.peca, mo: v.mo, total: v.peca + v.mo,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

// ── HBar item ─────────────────────────────────────────────────────────────────
interface HBarItem { label: string; peca: number; mo: number; }

// ── Card wrapper ──────────────────────────────────────────────────────────────
function ChartCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border flex flex-col p-3 ${className}`}
      style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
    >
      {children}
    </div>
  );
}

// ── Header interno (estilo CustoMiniChart) ────────────────────────────────────
function ChartHeader({ dot = C_AMBER, label, value }: { dot?: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between shrink-0 mb-2">
      <div className="flex items-center gap-2 min-w-0 mr-2">
        <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: dot }} />
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.28em",
          textTransform: "uppercase", color: "var(--sgt-text-muted)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {label}
        </span>
      </div>
      <span style={{
        fontSize: 15, fontWeight: 900, fontVariantNumeric: "tabular-nums",
        color: "var(--sgt-text-primary)", letterSpacing: "-0.03em", flexShrink: 0,
      }}>
        {value}
      </span>
    </div>
  );
}

// ── Tooltip flutuante acima da barra ─────────────────────────────────────────
function FloatTip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)",
      background: `${C_AMBER}F5`, color: "#1A0F00", borderRadius: 6,
      padding: "2px 8px", fontSize: 9, fontWeight: 700, whiteSpace: "nowrap",
      boxShadow: `0 4px 12px ${C_AMBER}60`, pointerEvents: "none", zIndex: 10,
    }}>
      {children}
    </div>
  );
}

// ── 1. Comparativo Mensal — barras mensais estilo CustoMiniChart ──────────────
function MonthlyBarChart({ data }: { data: { mes: string; custo: number }[] }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const maxV = Math.max(...data.map(d => d.custo), 1);
  const totalAnual = data.reduce((s, d) => s + d.custo, 0);
  const displayVal  = hovIdx !== null ? (data[hovIdx]?.custo ?? 0) : totalAnual;
  const displayLabel = hovIdx !== null ? (data[hovIdx]?.mes ?? "") : "custo anual";

  if (!data.length) {
    return (
      <div className="flex-1 flex items-center justify-center"
        style={{ color: "var(--sgt-text-muted)", fontSize: 11 }}>
        Sem dados
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <ChartHeader label={displayLabel} value={fmtK(displayVal)} />
      <div
        className="flex items-end gap-1 flex-1 min-h-0"
        onMouseLeave={() => setHovIdx(null)}
      >
        {data.map((item, i) => {
          const h = Math.max((item.custo / maxV) * 100, item.custo > 0 ? 3 : 1);
          const isHov      = hovIdx === i;
          const anyHov     = hovIdx !== null;
          const isNeighbor = hovIdx !== null && Math.abs(i - hovIdx) === 1;
          return (
            <div
              key={item.mes}
              className="relative flex-1 flex flex-col items-center justify-end h-full"
              onMouseEnter={() => setHovIdx(i)}
            >
              {isHov && <FloatTip>{fmtK(item.custo)}</FloatTip>}
              <div style={{
                width: "100%",
                maxWidth: 38,
                borderRadius: 99,
                cursor: "pointer",
                height: `${h}%`,
                background: isHov
                  ? C_AMBER
                  : isNeighbor
                    ? `${C_AMBER}5C`
                    : anyHov
                      ? `${C_AMBER}1A`
                      : `${C_AMBER}4D`,
                transform: isHov
                  ? "scaleX(1.15) scaleY(1.02)"
                  : isNeighbor
                    ? "scaleX(1.05)"
                    : "scaleX(1)",
                transition: "all 0.25s ease",
                boxShadow: isHov ? `0 0 14px ${C_AMBER}80` : "none",
                transformOrigin: "bottom",
              }} />
              <span style={{
                fontSize: 8.5,
                marginTop: 5,
                color: isHov ? "var(--sgt-text-primary)" : "var(--sgt-text-muted)",
                fontWeight: isHov ? 700 : 400,
                transition: "color 0.2s",
              }}>
                {item.mes}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 2. Custo por Classificação — barras verticais empilhadas, estilo CustoMiniChart ──
function ClassifStackedBars({ rows }: { rows: ManutencaoRow[] }) {
  const data   = useMemo(() => computeClassifBreakdown(rows), [rows]);
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const maxV = Math.max(...data.map(d => d.total), 1);
  const hov  = hovIdx !== null ? data[hovIdx] : null;

  if (!data.length) {
    return (
      <div className="flex-1 flex items-center justify-center"
        style={{ color: "var(--sgt-text-muted)", fontSize: 11 }}>
        Sem dados
      </div>
    );
  }

  const label = hov ? hov.fullName : "top categorias";

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      {/* Header — linha 1: label + total */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0 mr-2">
          <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: C_AMBER }} />
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.28em",
            textTransform: "uppercase", color: "var(--sgt-text-muted)",
            lineHeight: 1.3,
          }}>
            {label}
          </span>
        </div>
        <span style={{
          fontSize: 15, fontWeight: 900, fontVariantNumeric: "tabular-nums",
          color: C_AMBER, letterSpacing: "-0.03em", flexShrink: 0,
          opacity: hov ? 1 : 0, transition: "opacity 0.2s",
        }}>
          {hov ? fmtK(hov.total) : "—"}
        </span>
      </div>
      {/* Breakdown inline — aparece no header ao hover, sem tooltip flutuante */}
      <div style={{
        display: "flex", gap: 12, height: hov ? 18 : 0,
        overflow: "hidden", transition: "height 0.2s ease", shrink: 0,
      }}>
        {hov && hov.peca > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: C_AMBER, flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: "var(--sgt-text-muted)" }}>Peça</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: C_AMBER, fontVariantNumeric: "tabular-nums" }}>{fmtK(hov.peca)}</span>
          </div>
        )}
        {hov && hov.mo > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: C_BLUE, flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: "var(--sgt-text-muted)" }}>M.O.</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: C_BLUE, fontVariantNumeric: "tabular-nums" }}>{fmtK(hov.mo)}</span>
          </div>
        )}
      </div>

      {/* Barras */}
      <div
        className="flex items-end gap-1 flex-1 min-h-0"
        onMouseLeave={() => setHovIdx(null)}
      >
        {data.map((item, i) => {
          const totalH   = Math.max((item.total / maxV) * 100, 3);
          const pecaPct  = item.total > 0 ? (item.peca / item.total) * 100 : 50;
          const isHov      = hovIdx === i;
          const anyHov     = hovIdx !== null;
          const isNeighbor = hovIdx !== null && Math.abs(i - hovIdx) === 1;
          const opacity    = isHov ? 1 : isNeighbor ? 0.45 : anyHov ? 0.1 : 0.7;

          return (
            <div
              key={item.cat}
              className="relative flex-1 flex flex-col items-center justify-end h-full"
              onMouseEnter={() => setHovIdx(i)}
            >
              {/* Barra empilhada */}
              <div style={{
                width: "100%",
                maxWidth: 46,
                height: `${totalH}%`,
                borderRadius: "99px 99px 8px 8px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                opacity,
                transition: "all 0.25s ease",
                transform: isHov
                  ? "scaleX(1.15) scaleY(1.02)"
                  : isNeighbor
                    ? "scaleX(1.05)"
                    : "scaleX(1)",
                boxShadow: isHov
                  ? `0 0 16px ${C_AMBER}70, 0 0 16px ${C_BLUE}50`
                  : "none",
                transformOrigin: "bottom",
                cursor: "pointer",
              }}>
                {/* Peça — topo (amber) */}
                {item.peca > 0 && (
                  <div style={{ height: `${pecaPct}%`, background: C_AMBER, flexShrink: 0 }} />
                )}
                {/* MO — base (blue) */}
                {item.mo > 0 && (
                  <div style={{ flex: 1, background: C_BLUE }} />
                )}
              </div>

              <span style={{
                fontSize: 8, marginTop: 5,
                color: isHov ? "var(--sgt-text-secondary)" : "var(--sgt-text-muted)",
                fontWeight: isHov ? 600 : 400,
                transition: "color 0.2s",
                textAlign: "center",
              }}>
                {item.cat}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex justify-center gap-3 shrink-0">
        {([{ c: C_AMBER, l: "Peça" }, { c: C_BLUE, l: "M.O." }]).map(({ c, l }) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 3, borderRadius: 99, background: c, display: "inline-block" }} />
            <span style={{ fontSize: 8, color: "var(--sgt-text-muted)" }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 3. Tipo de OS — Donut SVG ─────────────────────────────────────────────────
function DonutOS({ data }: { data: TipoOsItem[] }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.custo, 0);
  const hov   = hovIdx !== null ? data[hovIdx] : null;

  if (!data.length) {
    return (
      <div className="flex-1 flex items-center justify-center"
        style={{ color: "var(--sgt-text-muted)", fontSize: 11 }}>
        Sem dados
      </div>
    );
  }

  // Arcos do donut
  const R = 42, ri = 27, cx = 50, cy = 50, GAP = 0.04;
  let cumulative = 0;
  const arcs = data.map((item) => {
    const fraction   = item.custo / total;
    const startAngle = cumulative * Math.PI * 2 - Math.PI / 2 + GAP / 2;
    const endAngle   = (cumulative + fraction) * Math.PI * 2 - Math.PI / 2 - GAP / 2;
    cumulative += fraction;
    const x1 = cx + R  * Math.cos(startAngle);
    const y1 = cy + R  * Math.sin(startAngle);
    const x2 = cx + R  * Math.cos(endAngle);
    const y2 = cy + R  * Math.sin(endAngle);
    const ix1 = cx + ri * Math.cos(startAngle);
    const iy1 = cy + ri * Math.sin(startAngle);
    const ix2 = cx + ri * Math.cos(endAngle);
    const iy2 = cy + ri * Math.sin(endAngle);
    const large = fraction > 0.5 ? 1 : 0;
    const d = [
      `M${x1.toFixed(2)},${y1.toFixed(2)}`,
      `A${R},${R} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)}`,
      `L${ix2.toFixed(2)},${iy2.toFixed(2)}`,
      `A${ri},${ri} 0 ${large},0 ${ix1.toFixed(2)},${iy1.toFixed(2)}`,
      "Z",
    ].join(" ");
    return { d, item, fraction };
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <ChartHeader
        label={hov ? hov.tipo.slice(0, 14) : "tipo de os"}
        value={fmtK(hov ? hov.custo : total)}
      />

      <div className="flex-1 min-h-0 relative" style={{ minHeight: 80 }}>
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
          {arcs.map((arc, i) => (
            <path
              key={i}
              d={arc.d}
              fill={OS_COLORS[i % OS_COLORS.length]}
              opacity={hovIdx === null || hovIdx === i ? 1 : 0.12}
              style={{
                transition: "opacity 0.2s, transform 0.2s",
                cursor: "pointer",
                transformOrigin: "50px 50px",
                transform: hovIdx === i ? "scale(1.06)" : "scale(1)",
              }}
              onMouseEnter={() => setHovIdx(i)}
              onMouseLeave={() => setHovIdx(null)}
            />
          ))}
          {/* Centro */}
          <text x="50" y="46" textAnchor="middle" fontSize="9" fontWeight="800"
            fill="var(--sgt-text-primary)" fontFamily="inherit">
            {hov ? `${hov.pct.toFixed(0)}%` : fmtK(total)}
          </text>
          <text x="50" y="56" textAnchor="middle" fontSize="4.5"
            fill="var(--sgt-text-muted)" fontFamily="inherit" fontWeight="600"
            letterSpacing="0.08em">
            {hov ? hov.tipo.slice(0, 11).toUpperCase() : "TOTAL"}
          </text>
        </svg>
      </div>

      {/* Legenda */}
      <div className="flex flex-col gap-1.5 shrink-0">
        {data.map((item, i) => (
          <div
            key={item.tipo}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              opacity: hovIdx === null || hovIdx === i ? 1 : 0.25,
              transition: "opacity 0.2s", cursor: "pointer",
            }}
            onMouseEnter={() => setHovIdx(i)}
            onMouseLeave={() => setHovIdx(null)}
          >
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: OS_COLORS[i % OS_COLORS.length], flexShrink: 0,
            }} />
            <span style={{
              flex: 1, fontSize: 10, color: "var(--sgt-text-secondary)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {item.tipo}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: "var(--sgt-text-primary)",
              fontVariantNumeric: "tabular-nums", flexShrink: 0,
            }}>
              {item.pct.toFixed(0)}%
            </span>
            <span style={{
              fontSize: 9, color: "var(--sgt-text-muted)",
              fontVariantNumeric: "tabular-nums", flexShrink: 0, marginLeft: 2,
            }}>
              {fmtK(item.custo)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. Barras Horizontais — Top 5 estilo CustoMiniChart ──────────────────────
function HorizontalBars({ items, title }: { items: HBarItem[]; title: string }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const maxV = Math.max(...items.map(d => d.peca + d.mo), 1);
  const hov  = hovIdx !== null ? items[hovIdx] : null;

  if (!items.length) {
    return (
      <div className="flex-1 flex items-center justify-center"
        style={{ color: "var(--sgt-text-muted)", fontSize: 11 }}>
        Sem dados
      </div>
    );
  }

  const displayLabel = hov
    ? (hov.label.length > 14 ? hov.label.slice(0, 13) + "…" : hov.label)
    : title;
  const displayVal = hov ? fmtK(hov.peca + hov.mo) : "";

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0 mr-2">
          <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: C_AMBER }} />
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.28em",
            textTransform: "uppercase", color: "var(--sgt-text-muted)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {displayLabel}
          </span>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 900, fontVariantNumeric: "tabular-nums",
          color: C_AMBER, letterSpacing: "-0.03em", flexShrink: 0,
          opacity: hov ? 1 : 0, transition: "opacity 0.2s",
        }}>
          {displayVal || "—"}
        </span>
      </div>

      <div
        className="flex flex-col flex-1 min-h-0 gap-1.5"
        onMouseLeave={() => setHovIdx(null)}
      >
        {items.map((item, i) => {
          const totalV     = item.peca + item.mo;
          const totalW     = (totalV / maxV) * 100;
          const pecaW      = totalV > 0 ? (item.peca / totalV) * 100 : 50;
          const isHov      = hovIdx === i;
          const anyHov     = hovIdx !== null;
          const isNeighbor = hovIdx !== null && Math.abs(i - hovIdx) === 1;
          const opacity    = isHov ? 1 : isNeighbor ? 0.45 : anyHov ? 0.12 : 0.65;

          return (
            <div
              key={item.label}
              className="flex items-center gap-2 flex-1 min-h-0"
              onMouseEnter={() => setHovIdx(i)}
              style={{ cursor: "pointer" }}
            >
              {/* Label */}
              <span style={{
                width: 62, flexShrink: 0,
                fontSize: 9.5, textAlign: "right",
                color: isHov ? "var(--sgt-text-primary)" : "var(--sgt-text-muted)",
                fontWeight: isHov ? 700 : 400,
                transition: "color 0.2s",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {item.label.length > 9 ? item.label.slice(0, 8) + "…" : item.label}
              </span>

              {/* Track + barra */}
              <div style={{
                flex: 1, height: 13, borderRadius: 99, position: "relative",
                background: "rgba(255,255,255,0.04)",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, height: "100%",
                  width: `${totalW}%`, borderRadius: 99,
                  display: "flex", overflow: "hidden",
                  opacity, transition: "all 0.25s ease",
                  boxShadow: isHov ? `0 0 10px ${C_AMBER}70` : "none",
                  transform: isHov ? "scaleY(1.2)" : "scaleY(1)",
                  transformOrigin: "center",
                }}>
                  {item.peca > 0 && (
                    <div style={{ width: `${pecaW}%`, background: C_AMBER, flexShrink: 0 }} />
                  )}
                  {item.mo > 0 && (
                    <div style={{ flex: 1, background: C_BLUE }} />
                  )}
                </div>
              </div>

              {/* Valor */}
              <span style={{
                width: 40, flexShrink: 0, fontSize: 9,
                textAlign: "right",
                color: isHov ? "var(--sgt-text-secondary)" : "var(--sgt-text-muted)",
                fontVariantNumeric: "tabular-nums",
                fontWeight: isHov ? 700 : 400,
                transition: "color 0.2s",
              }}>
                {fmtK(totalV)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex justify-center gap-3 shrink-0">
        {([{ c: C_AMBER, l: "Peça" }, { c: C_BLUE, l: "M.O." }]).map(({ c, l }) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 3, borderRadius: 99, background: c, display: "inline-block" }} />
            <span style={{ fontSize: 8, color: "var(--sgt-text-muted)" }}>{l}</span>
          </div>
        ))}
      </div>
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

  // ── Dados do ano inteiro para o comparativo mensal ──────────────────────────
  const [yearRows, setYearRows] = useState<ManutencaoRow[]>([]);
  useEffect(() => {
    const jan1 = `${selectedYear}-01-01`;
    const now  = new Date();
    const end  = selectedYear < now.getFullYear()
      ? `${selectedYear}-12-31`
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    fetchManutencao({ dataInicio: jan1, dataFim: end, filial: dwFilter.filial ?? null })
      .then(res => setYearRows(res.data ?? []))
      .catch(() => setYearRows([]));
  }, [selectedYear, dwFilter.filial]);

  // ── Série mensal: Jan até mês atual ─────────────────────────────────────────
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

  // ── Derivados do período filtrado ───────────────────────────────────────────
  const kpis     = useMemo(() => computeKpisExecutivo(rows),        [rows]);
  const tipoOS   = useMemo(() => computeTipoOS(rows),               [rows]);
  const top5Vei  = useMemo(() => computeTopVeiculos(rows, 5),       [rows]);
  const top5Forn = useMemo(() => computeTopFornecedores(rows, 5),   [rows]);

  const pctPeca = kpis.custoTotal > 0 ? (kpis.custoPeca / kpis.custoTotal) * 100 : 0;
  const pctMO   = kpis.custoTotal > 0 ? (kpis.custoMO   / kpis.custoTotal) * 100 : 0;

  const periodoLabel = useMemo(() => {
    const fmt = (s: string) => {
      const d = new Date(s + "T00:00:00");
      return isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    };
    return `${fmt(dwFilter.dataInicio)} – ${fmt(dwFilter.dataFim)}`;
  }, [dwFilter.dataInicio, dwFilter.dataFim]);

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

  // Mapeia top5 para HBarItem
  const veiItems: HBarItem[]  = top5Vei.map(v => ({ label: v.veiculo,    peca: v.peca, mo: v.mo }));
  const fornItems: HBarItem[] = top5Forn.map(f => ({ label: f.fornecedor, peca: f.peca, mo: f.mo }));

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">

      {/* ── Row 1: KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 shrink-0 sgt-stagger"
        style={{ gridAutoRows: "1fr" }}>
        {([
          <KpiCard key="tot"  label="Custo Total"          value={kpis.custoTotal > 0 ? fmtK(kpis.custoTotal) : "—"} rawValue={kpis.custoTotal}  subtitle={periodoLabel}                      icon={DollarSign}    tone="amber"   compact />,
          <KpiCard key="peca" label="Custo Peça"           value={kpis.custoPeca > 0  ? fmtK(kpis.custoPeca)  : "—"} rawValue={kpis.custoPeca}   subtitle={`${pctPeca.toFixed(1)}% do total`} icon={Package}       tone="emerald" compact />,
          <KpiCard key="mo"   label="Mão de Obra"          value={kpis.custoMO > 0    ? fmtK(kpis.custoMO)    : "—"} rawValue={kpis.custoMO}     subtitle={`${pctMO.toFixed(1)}% do total`}   icon={Wrench}        tone="blue"    compact />,
          <KpiCard key="plan" label="Custo Plano Manut."   value={kpis.custoPlano > 0 ? fmtK(kpis.custoPlano) : "—"} rawValue={kpis.custoPlano}  subtitle="PLANOMANUTENCAO"                   icon={ClipboardList} tone="violet"  compact />,
          <KpiCard key="ind"  label="Indicador Manutenção" value={`${indReal.toFixed(1)}%`}                                               rawValue={indReal}           subtitle={`meta ${indMeta}%`}                icon={Target}        tone={indTone} compact />,
        ] as React.ReactNode[]).map((c, i) => (
          <AnimatedCard key={i} delay={i * 45} className="flex flex-col">
            <div className="flex-1">{c}</div>
          </AnimatedCard>
        ))}
      </div>

      {/* ── Row 2: Comparativo (3/5) + Classificação (2/5) ──────────────── */}
      <div className="grid lg:grid-cols-5 gap-2 min-h-0" style={{ flex: "1.3" }}>
        <AnimatedCard delay={220} className="lg:col-span-3 min-h-0 flex flex-col">
          <ChartCard className="flex-1 min-h-0">
            <MonthlyBarChart data={monthly} />
          </ChartCard>
        </AnimatedCard>
        <AnimatedCard delay={260} className="lg:col-span-2 min-h-0 flex flex-col">
          <ChartCard className="flex-1 min-h-0">
            <ClassifStackedBars rows={rows} />
          </ChartCard>
        </AnimatedCard>
      </div>

      {/* ── Row 3: Tipo OS + Top 5 Veículos + Top 5 Fornecedores ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 min-h-0">
        <AnimatedCard delay={300} className="min-h-0 flex flex-col">
          <ChartCard className="flex-1 min-h-0">
            <DonutOS data={tipoOS} />
          </ChartCard>
        </AnimatedCard>
        <AnimatedCard delay={340} className="min-h-0 flex flex-col">
          <ChartCard className="flex-1 min-h-0">
            <HorizontalBars items={veiItems} title="top 5 veículos" />
          </ChartCard>
        </AnimatedCard>
        <AnimatedCard delay={380} className="min-h-0 flex flex-col">
          <ChartCard className="flex-1 min-h-0">
            <HorizontalBars items={fornItems} title="top 5 fornecedores" />
          </ChartCard>
        </AnimatedCard>
      </div>

    </div>
  );
}
