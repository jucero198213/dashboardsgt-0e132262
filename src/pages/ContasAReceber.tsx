import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  CheckCircle, AlertTriangle, Download,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  LayoutDashboard, CalendarClock, AlertOctagon, Zap, Percent, Construction,
} from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { KpiCard } from "@/components/indicators/KpiCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { UpdateButton } from "@/components/shared/UpdateButton";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import sgtLogo from "@/assets/sgt-logo.png";
import { GooeyInput } from "@/components/ui/gooey-input";

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtK = (v: number) => v >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v/1e3).toFixed(0)}k` : fmtBRL(v);
const fmtData = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const PAGE_SIZE = 50;

// ─── Visões do Contas a Receber ────────────────────────────────────────────
type ViewMode = "executivo" | "a_vencer" | "vencidos" | "liberado_antecipar";

const VIEWS: { id: ViewMode; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "executivo",           label: "Executivo",              icon: LayoutDashboard },
  { id: "a_vencer",            label: "A Vencer",                icon: CalendarClock   },
  { id: "vencidos",            label: "Vencidos",                icon: AlertOctagon    },
  { id: "liberado_antecipar",  label: "Liberado p/ Antecipar",   icon: Zap             },
];

// ─── Agrupamento por mês de emissão (Card 1 e drill-down) ──────────────────
const MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const monthKey   = (iso: string) => (iso ?? "").slice(0, 7); // "YYYY-MM"
const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  const idx = parseInt(m, 10) - 1;
  return `${MESES_PT[idx] ?? "?"}/${(y ?? "").slice(2)}`;
};

function groupByEmissionMonth(rows: { dataEmissao: string; valor: number }[]) {
  const map = new Map<string, { value: number; count: number }>();
  rows.forEach((c) => {
    const key = monthKey(c.dataEmissao);
    if (!key) return;
    const cur = map.get(key) ?? { value: 0, count: 0 };
    map.set(key, { value: cur.value + c.valor, count: cur.count + 1 });
  });
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ label: monthLabel(key), value: v.value, count: v.count, color: "#06b6d4" }));
}

// ─── Popup de títulos vencidos (KPI 4 e Card "Clientes que Concentram o Vencido") ──
interface VencidoDoc {
  documento: string;
  cliente: string;
  grupoCliente: string;
  vencimento: string; // "YYYY-MM-DD"
  diasAtraso: number;
  valor: number;
  valorPago: number;
  saldo: number;
}

function exportarVencidosExcel(docs: VencidoDoc[], grupo: string | null) {
  const header = ["Documento", "Cliente", "Grupo", "Vencimento", "Dias em Atraso", "Valor Original (R$)", "Valor Pago (R$)", "Saldo Vencido (R$)"];
  const rows = docs.map(d => [
    d.documento, d.cliente, d.grupoCliente, fmtData(d.vencimento), d.diasAtraso, d.valor, d.valorPago, d.saldo,
  ]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, "Vencidos");
  const date = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  const suffix = grupo ? `-${grupo.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_")}` : "";
  XLSX.writeFile(wb, `titulos-vencidos${suffix}-${date}.xlsx`);
}

// ─── Modal — Detalhamento de Títulos Vencidos (KPI 4 e Card 3) ────────────────
// `docs` é sempre a base completa (mesma usada no KPI "Vencido Acumulado") —
// busca e filtros aqui dentro só recortam a visualização, nunca mudam a
// população em si, então o total sem filtro bate exatamente com o KPI.
const VencidosModal = ({
  open, onOpenChange, docs, initialGrupo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docs: VencidoDoc[];
  initialGrupo: string | null;
}) => {
  const [search, setSearch] = useState("");
  const [grupoFiltro, setGrupoFiltro] = useState<string>("__all__");
  const [atrasoFiltro, setAtrasoFiltro] = useState<string>("__all__");

  // Reabre sempre com busca limpa e o grupo de origem (se veio de um clique
  // no Card "Clientes que Concentram o Vencido") pré-selecionado.
  useEffect(() => {
    if (open) {
      setSearch("");
      setGrupoFiltro(initialGrupo ?? "__all__");
      setAtrasoFiltro("__all__");
    }
  }, [open, initialGrupo]);

  const grupos = useMemo(() => [...new Set(docs.map(d => d.grupoCliente))].sort((a, b) => a.localeCompare(b, "pt-BR")), [docs]);

  const faixaAtraso = (dias: number) => dias <= 30 ? "1-30" : dias <= 60 ? "31-60" : dias <= 90 ? "61-90" : "90+";

  const filtered = useMemo(() => {
    let list = docs;
    if (grupoFiltro !== "__all__") list = list.filter(d => d.grupoCliente === grupoFiltro);
    if (atrasoFiltro !== "__all__") list = list.filter(d => faixaAtraso(d.diasAtraso) === atrasoFiltro);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.documento.toLowerCase().includes(q) ||
        d.cliente.toLowerCase().includes(q) ||
        d.grupoCliente.toLowerCase().includes(q)
      );
    }
    return list;
  }, [docs, grupoFiltro, atrasoFiltro, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col gap-3"
        style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
      >
        <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 pr-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">Detalhamento</p>
            <DialogTitle style={{ color: "var(--sgt-text-primary)" }}>Títulos Vencidos</DialogTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-medium text-slate-500 tabular-nums whitespace-nowrap">
              {filtered.length}/{docs.length} título{docs.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => exportarVencidosExcel(filtered, grupoFiltro !== "__all__" ? grupoFiltro : null)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: "rgba(16,185,129,0.35)", color: "#10b981", background: "rgba(16,185,129,0.08)" }}
            >
              <Download className="h-3.5 w-3.5" />
              Exportar Excel
            </button>
          </div>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Lista de títulos vencidos e ainda não liquidados, com busca e filtros por grupo de cliente e faixa de atraso.
        </DialogDescription>

        {/* Busca + filtros */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <GooeyInput
            placeholder="Buscar por documento, cliente ou grupo..."
            value={search}
            onValueChange={setSearch}
          />
          <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
            <SelectTrigger className="h-9 w-full min-w-[140px] max-w-[220px] rounded-lg text-[12px] transition-all">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os grupos</SelectItem>
              {grupos.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={atrasoFiltro} onValueChange={setAtrasoFiltro}>
            <SelectTrigger className="h-9 w-full min-w-[130px] max-w-[170px] rounded-lg text-[12px] transition-all">
              <SelectValue placeholder="Atraso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todo atraso</SelectItem>
              <SelectItem value="1-30">1–30 dias</SelectItem>
              <SelectItem value="31-60">31–60 dias</SelectItem>
              <SelectItem value="61-90">61–90 dias</SelectItem>
              <SelectItem value="90+">90+ dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-h-0 overflow-auto rounded-[10px] border" style={{ borderColor: "var(--sgt-border-subtle)" }}>
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-10" style={{ background: "var(--sgt-table-head)" }}>
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Documento</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Cliente</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Grupo</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Vencimento</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Dias Atraso</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Valor Original</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Valor Pago</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Saldo Vencido</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={`${d.documento}-${i}`} className="border-t transition-colors hover:bg-white/[0.02]" style={{ borderColor: "var(--sgt-divider)" }}>
                  <td className="px-3 py-2 font-medium" style={{ color: "var(--sgt-text-primary)" }}>{d.documento}</td>
                  <td className="px-3 py-2" style={{ color: "var(--sgt-text-secondary)" }}>{d.cliente}</td>
                  <td className="px-3 py-2 text-slate-500">{d.grupoCliente}</td>
                  <td className="px-3 py-2 text-slate-400">{fmtData(d.vencimento)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-rose-300">{d.diasAtraso}</td>
                  <td className="px-3 py-2 text-right" style={{ color: "var(--sgt-text-secondary)" }}>{fmtBRL(d.valor)}</td>
                  <td className="px-3 py-2 text-right text-emerald-300">{fmtBRL(d.valorPago)}</td>
                  <td className="px-3 py-2 text-right font-bold text-rose-300">{fmtBRL(d.saldo)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[12px] text-slate-600">
                    {docs.length === 0 ? "Nenhum título vencido" : "Nenhum título encontrado com esses filtros"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  GRÁFICOS PREMIUM
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Barras Verticais genéricas (aging, composição mensal etc.) ───────────────
const VerticalBarChart = ({ data }: { data: any[] }) => {
  const [hover, setHover] = useState<number | null>(null);
  
  const svgW = 520; const svgH = 300;
  const padL = 60; const padR = 25; const padTop = 25; const padBot = 38;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padTop - padBot;
  
  const maxVal = Math.max(...data.map(d => d.value), 1) * 1.15;
  const barW = (chartW - (data.length - 1) * 16) / data.length;
  
  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-full w-full" onMouseLeave={() => setHover(null)}>
      <defs>
        {data.map((d, i) => (
          <linearGradient key={i} id={`aging-g-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={d.color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={d.color} stopOpacity="0.7" />
          </linearGradient>
        ))}
      </defs>
      
      {/* Grid */}
      {[0, 0.5, 1].map(frac => {
        const y = padTop + chartH * (1 - frac);
        return (
          <g key={frac}>
            <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            {frac > 0 && (
              <text x={padL - 6} y={y + 3} fill="#64748b" fontSize="9" fontWeight="500" textAnchor="end">
                {fmtK(maxVal * frac)}
              </text>
            )}
          </g>
        );
      })}
      
      {/* Barras */}
      {data.map((d, i) => {
        const x = padL + i * (barW + 16);
        const h = (d.value / maxVal) * chartH;
        const y = padTop + chartH - h;
        const isHover = hover === i;
        
        return (
          <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: "pointer" }}>
            <rect x={x} y={y} width={barW} height={h} rx="4"
              fill={`url(#aging-g-${i})`} opacity={isHover ? 1 : 0.88}
              stroke={isHover ? d.color : "none"} strokeWidth="2"
              style={{ transition: "all 0.2s" }} />
            
            <text x={x + barW / 2} y={svgH - padBot + 18} fill="#94a3b8" fontSize="9" fontWeight="600" textAnchor="middle">
              {d.label}
            </text>
            
            {isHover && (
              <>
                <rect x={x + barW / 2 - 50} y={y - 34} width="100" height="24" rx="4"
                  fill="rgba(2,6,23,0.96)" stroke={`${d.color}60`} strokeWidth="1" />
                <text x={x + barW / 2} y={y - 20} fill={d.color} fontSize="8" fontWeight="500" textAnchor="middle">
                  {d.count} docs
                </text>
                <text x={x + barW / 2} y={y - 12} fill="white" fontSize="10" fontWeight="700" textAnchor="middle">
                  {fmtBRL(d.value)}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─── Lista ranqueada (grupo/cliente) — barra de participação + drill-down ─────
const RankedList = ({
  data, color = "#f59e0b", onRowClick, emptyMessage = "Sem dados no período selecionado",
}: {
  data: { nome: string; valor: number }[];
  color?: string;
  onRowClick?: (nome: string) => void;
  emptyMessage?: string;
}) => {
  const total = data.reduce((s, d) => s + d.valor, 0);

  if (data.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-10 text-center text-[12px] text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      {data.map((r, i) => {
        const barW = total > 0 ? Math.min((r.valor / total) * 100, 100) : 0;
        const pct = total > 0 ? (r.valor / total) * 100 : 0;
        return (
          <button
            key={r.nome}
            type="button"
            onClick={onRowClick ? () => onRowClick(r.nome) : undefined}
            disabled={!onRowClick}
            className={`grid grid-cols-[minmax(0,1fr)_5.5rem_3rem] gap-3 px-3.5 py-2.5 items-center border-b border-[var(--sgt-divider)] last:border-0 text-left w-full transition-colors ${
              onRowClick ? "cursor-pointer hover:bg-white/[0.03]" : "cursor-default"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[10px] font-bold shrink-0 w-4 text-right tabular-nums text-slate-600">{i + 1}</span>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-[12px] font-semibold truncate text-[var(--sgt-text-primary)]">{r.nome}</span>
                <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barW}%`, background: color }} />
                </div>
              </div>
            </div>
            <span className="text-[12px] font-bold tabular-nums text-right text-[var(--sgt-text-primary)]">{fmtK(r.valor)}</span>
            <span className="text-[11px] font-bold tabular-nums text-right text-slate-500">{pct.toFixed(0)}%</span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Gráfico de linha — % Realização por Mês ──────────────────────────────────
const LineChartPercent = ({ data }: { data: { label: string; pct: number }[] }) => {
  const [hover, setHover] = useState<number | null>(null);

  const svgW = 900; const svgH = 300;
  const padL = 50; const padR = 25; const padTop = 25; const padBot = 38;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padTop - padBot;

  const maxVal = Math.max(100, Math.ceil(Math.max(...data.map(d => d.pct), 0) / 10) * 10);
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;
  const pts = data.map((d, i) => ({
    x: padL + (data.length > 1 ? i * stepX : chartW / 2),
    y: padTop + chartH - (Math.max(0, Math.min(d.pct, maxVal)) / maxVal) * chartH,
  }));
  const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = pts.length > 0
    ? `${lineD} L ${pts[pts.length - 1].x} ${padTop + chartH} L ${pts[0].x} ${padTop + chartH} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-full w-full" onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="linha-realizacao-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const y = padTop + chartH * (1 - frac);
        return (
          <g key={frac}>
            <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={padL - 6} y={y + 3} fill="#64748b" fontSize="9" fontWeight="500" textAnchor="end">
              {Math.round(maxVal * frac)}%
            </text>
          </g>
        );
      })}

      {/* Área sob a linha */}
      {areaD && <path d={areaD} fill="url(#linha-realizacao-area)" />}

      {/* Linha */}
      {lineD && <path d={lineD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

      {/* Pontos + labels + hover */}
      {pts.map((p, i) => {
        const isHover = hover === i;
        return (
          <g key={i}>
            <rect x={p.x - (stepX || chartW) / 2} y={padTop} width={stepX || chartW} height={chartH}
              fill="transparent" onMouseEnter={() => setHover(i)} style={{ cursor: "pointer" }} />
            <circle cx={p.x} cy={p.y} r={isHover ? 5 : 3.5} fill="#10b981" stroke="#0a0f1e" strokeWidth="2" />
            <text x={p.x} y={svgH - padBot + 18} fill="#94a3b8" fontSize="9" fontWeight="600" textAnchor="middle">
              {data[i].label}
            </text>
            {isHover && (
              <>
                <rect x={p.x - 26} y={p.y - 30} width="52" height="20" rx="4"
                  fill="rgba(2,6,23,0.96)" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
                <text x={p.x} y={p.y - 16} fill="#10b981" fontSize="10" fontWeight="700" textAnchor="middle">
                  {data[i].pct.toFixed(1)}%
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─── Gauge semicircular — Taxa de Inadimplência ────────────────────────────────
const InadimplenciaGauge = ({ percent }: { percent: number }) => {
  const p = Math.max(0, Math.min(percent, 100));
  const cx = 110, cy = 98, r = 80;
  const pt = (pct: number) => {
    const a = Math.PI - (pct / 100) * Math.PI;
    return { x: +(cx + r * Math.cos(a)).toFixed(2), y: +(cy - r * Math.sin(a)).toFixed(2) };
  };
  const end = pt(p);
  // O arco desenhado é sempre um sub-arco do semicírculo superior (≤180°),
  // então a flag "large-arc" do SVG deve ser sempre 0 — nunca a alternativa
  // "grande arco" (que passaria pela metade de baixo do círculo, invisível/
  // torta). Antes isso alternava com p>50, deformando o gauge acima de 50%.
  const largeArc = 0;
  const color = p >= 60 ? "#f43f5e" : p >= 30 ? "#f59e0b" : "#10b981";
  const label = p >= 60 ? "Crítico" : p >= 30 ? "Atenção" : "Saudável";
  const gradId = "gauge-inadimplencia-grad";

  return (
    <div className="flex flex-col items-center justify-center gap-2.5 h-full w-full">
      <svg viewBox="0 0 220 128" className="w-full h-full max-w-[260px]">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" strokeLinecap="round" />
        {p > 0 && (
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`}
            fill="none" stroke={`url(#${gradId})`} strokeWidth="18" strokeLinecap="round"
            style={{ transition: "d 0.5s ease" }} />
        )}
        <text x={cx} y={cy - 18} textAnchor="middle" fill="white" fontSize="34" fontWeight="900">{p.toFixed(1)}%</text>
        <text x={cx} y={cy + 4} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="700" letterSpacing="1">
          NÃO REALIZADO NO PERÍODO
        </text>
        <text x={cx - r + 4} y={cy + 22} fill="rgba(255,255,255,0.28)" fontSize="10" textAnchor="start">0%</text>
        <text x={cx + r - 4} y={cy + 22} fill="rgba(255,255,255,0.28)" fontSize="10" textAnchor="end">100%</text>
      </svg>
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ background: `${color}1A`, color, border: `1px solid ${color}40` }}
      >
        {label}
      </span>
    </div>
  );
};

// ─── Card 2 — Detalhamento por Cliente e Mês de Emissão (drill-down) ──────────
const ClienteDrilldownCard = ({ contas }: { contas: { grupoCliente: string; cliente: string; dataEmissao: string; valor: number }[] }) => {
  const [grupo, setGrupo] = useState<string | null>(null);
  const [cliente, setCliente] = useState<string | null>(null);

  const porGrupo = useMemo(() => {
    const map = new Map<string, number>();
    contas.forEach((c) => map.set(c.grupoCliente, (map.get(c.grupoCliente) ?? 0) + c.valor));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([nome, valor]) => ({ nome, valor }));
  }, [contas]);

  const porCliente = useMemo(() => {
    if (!grupo) return [];
    const map = new Map<string, number>();
    contas.filter((c) => c.grupoCliente === grupo).forEach((c) => map.set(c.cliente, (map.get(c.cliente) ?? 0) + c.valor));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([nome, valor]) => ({ nome, valor }));
  }, [contas, grupo]);

  const porMes = useMemo(() => {
    if (!grupo || !cliente) return [];
    return groupByEmissionMonth(contas.filter((c) => c.grupoCliente === grupo && c.cliente === cliente));
  }, [contas, grupo, cliente]);

  const nivel = !grupo ? 0 : !cliente ? 1 : 2;

  return (
    <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 shrink-0 border-b border-[var(--sgt-border-subtle)]" style={{ background: "var(--sgt-table-head)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Detalhamento por Cliente e Mês de Emissão
        </p>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 py-2 shrink-0 border-b border-[var(--sgt-divider)] text-[11px] overflow-x-auto">
        <button
          type="button"
          onClick={() => { setGrupo(null); setCliente(null); }}
          className={`font-semibold whitespace-nowrap transition-colors ${!grupo ? "text-amber-300" : "text-slate-500 hover:text-white"}`}
        >
          Grupos de cliente
        </button>
        {grupo && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" />
            <button
              type="button"
              onClick={() => setCliente(null)}
              className={`font-semibold whitespace-nowrap truncate max-w-[140px] transition-colors ${!cliente ? "text-amber-300" : "text-slate-500 hover:text-white"}`}
            >
              {grupo}
            </button>
          </>
        )}
        {cliente && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" />
            <span className="font-semibold text-amber-300 whitespace-nowrap truncate max-w-[140px]">{cliente}</span>
          </>
        )}
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        {nivel === 0 && <RankedList data={porGrupo} color="#f59e0b" onRowClick={setGrupo} />}
        {nivel === 1 && <RankedList data={porCliente} color="#06b6d4" onRowClick={setCliente} />}
        {nivel === 2 && (
          <div className="flex-1 min-h-0 p-3">
            {porMes.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[12px] text-slate-600">Sem dados no período</div>
            ) : (
              <VerticalBarChart data={porMes} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Placeholder — visões ainda não implementadas ──────────────────────────────
const PlaceholderView = ({ view }: { view: ViewMode }) => {
  const meta: Record<Exclude<ViewMode, "executivo">, { titulo: string; desc: string }> = {
    a_vencer: {
      titulo: "A Vencer",
      desc: "Visão dedicada aos títulos ainda não vencidos, com projeção de fluxo de caixa por vencimento.",
    },
    vencidos: {
      titulo: "Vencidos",
      desc: "Visão dedicada à régua de cobrança e ao detalhamento dos títulos em atraso.",
    },
    liberado_antecipar: {
      titulo: "Liberado p/ Antecipar",
      desc: "Visão dedicada aos títulos elegíveis para antecipação/factoring.",
    },
  };
  const m = meta[view as Exclude<ViewMode, "executivo">];

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/[0.06]">
          <div className="absolute inset-0 rounded-2xl animate-pulse bg-amber-400/[0.04]" />
          <Construction className="h-7 w-7 text-amber-400/70 relative" />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-3 py-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Em desenvolvimento</span>
        </div>
        <h2 className="text-[18px] font-black tracking-[-0.02em] dark:text-white text-slate-800">{m.titulo}</h2>
        <p className="text-[12px] leading-relaxed text-slate-500">{m.desc}</p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function ContasAReceber() {
  const navigate = useNavigate();
  const { contasReceber, resumo, dwChartData, chartReceber, isFetchingDw, dwFilter, setDwFilter, filiais, empresas, fetchFromDW, loadingPhase, progress } = useFinancialData();
  const { contasReceber: resumoReceber } = resumo;

  const [view, setView] = useState<ViewMode>("executivo");
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const filiaisFiltradas = filiais.filter(f => !dwFilter.empresa || f.empresa === dwFilter.empresa);

  // ── Atualização com progresso ──────────────────────────────────────────────
  const handleUpdate = async () => {
    try {
      await fetchFromDW();
    } catch (err) {
      console.error("Erro ao atualizar dados:", err);
    }
  };

  // ── Filtros e ordenação ────────────────────────────────────────────────────
  const contasFiltradas = useMemo(() => {
    let list = contasReceber;
    
    if (filtroStatus !== "todos") {
      list = list.filter(c => c.status === filtroStatus);
    }
    
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.documento.toLowerCase().includes(q) ||
        c.cliente.toLowerCase().includes(q)
      );
    }
    
    if (sortCol) {
      list = [...list].sort((a, b) => {
        const va = (a as any)[sortCol] ?? "";
        const vb = (b as any)[sortCol] ?? "";
        const cmp = typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "pt-BR");
        return sortAsc ? cmp : -cmp;
      });
    }
    
    return list;
  }, [contasReceber, filtroStatus, search, sortCol, sortAsc]);

  const totalPaginas = Math.max(1, Math.ceil(contasFiltradas.length / PAGE_SIZE));
  const inicio = (page - 1) * PAGE_SIZE;
  const paginados = contasFiltradas.slice(inicio, inicio + PAGE_SIZE);

  function toggleSort(col: string) {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  }

  // ── KPIs Executivo ───────────────────────────────────────────────────────────
  // KPI 1: Vencimentos no Período — tudo cujo VENCIMENTO cai no filtro, independente da situação
  //         (já é exatamente o que resumoReceber.valorAReceber representa — ver FinancialDataContext)
  const vencimentosNoPeriodo = resumoReceber.valorAReceber;
  // KPI 3: Realizado no Período — recebido cujo vencimento estava no período (resumoReceber.valorRecebido)
  const realizadoNoPeriodo = resumoReceber.valorRecebido;
  // KPI 2: % Realização = Realizado / Vencimentos no período
  const percentualRealizacao = vencimentosNoPeriodo > 0 ? (realizadoNoPeriodo / vencimentosNoPeriodo) * 100 : 0;
  // Card 4 (gauge): Taxa de Inadimplência = complemento do % Realização —
  // "quanto do que venceu no período ainda não foi recebido". Fica sempre
  // consistente com os 3 KPIs acima (ex.: 14,1 a receber, 2,5 recebido,
  // 18% de realização ⇒ 82% não realizado), em vez de comparar com uma
  // base anual que não aparece na tela.
  const taxaInadimplencia = vencimentosNoPeriodo > 0 ? 100 - percentualRealizacao : 0;

  // KPI 4: Vencido Acumulado — estoque de títulos vencidos e não liquidados
  // (independente do período do filtro). Usa dwChartData (CR do ano do
  // filtro, buscado em background pelo contexto p/ os gráficos anuais) em
  // vez de contasReceber: contasReceber só traz linhas cujo VENCIMENTO OU
  // RECEBIMENTO caem dentro da janela de dias do filtro principal, então um
  // título vencido há meses (fora dessa janela, sem recebimento) nunca
  // aparece ali — subestimando o vencido acumulado.
  // Situação "P" conta o saldo residual (VLR_PARCELA − VLR_PAGO), não o valor
  // cheio — mesma regra já usada no saldo "Contas a Receber" no contexto.
  const vencidoDocsDetalhados = useMemo(() => {
    const n = (v: number | null | undefined) => v ?? 0;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const docs: {
      documento: string; cliente: string; grupoCliente: string;
      vencimento: string; diasAtraso: number; valor: number; valorPago: number; saldo: number;
    }[] = [];

    dwChartData.forEach((r: any) => {
      if (r.ORIGEM !== "CR") return;
      const sit = String(r.SITUACAO ?? "").trim().toUpperCase();
      if (sit !== "P" && sit !== "D") return; // "L" = liquidado, não é vencido
      if (!r.DATA_VENCIMENTO) return;
      const venc = new Date(r.DATA_VENCIMENTO);
      if (venc >= hoje) return;

      const valor    = n(r.VLR_PAR_RAW) > 0 ? n(r.VLR_PAR_RAW) : n(r.VLR_PARCELA);
      const valorPago = n(r.VLR_REC_RAW) > 0 ? n(r.VLR_REC_RAW) : n(r.VLR_PAGO);
      const saldo = Math.max(0, valor - valorPago);
      if (saldo <= 0) return;

      docs.push({
        documento: r.DOCUMENTO ?? "—",
        cliente: r.NOME_PARCEIRO ?? "N/A",
        grupoCliente: r.GRUPO_CLIENTE ?? "Sem grupo",
        vencimento: String(r.DATA_VENCIMENTO).split("T")[0],
        diasAtraso: Math.floor((hoje.getTime() - venc.getTime()) / 86_400_000),
        valor,
        valorPago,
        saldo,
      });
    });

    return docs.sort((a, b) => b.saldo - a.saldo);
  }, [dwChartData]);

  const vencidoAcumulado = useMemo(
    () => Math.round(vencidoDocsDetalhados.reduce((s, d) => s + d.saldo, 0) * 100) / 100,
    [vencidoDocsDetalhados]
  );

  // ── Popup de títulos vencidos (KPI 4 e Card "Clientes que Concentram o Vencido") ──
  const [vencidosModalOpen, setVencidosModalOpen] = useState(false);
  const [vencidosModalGrupoInicial, setVencidosModalGrupoInicial] = useState<string | null>(null);
  const abrirVencidosModal = (grupo: string | null) => { setVencidosModalGrupoInicial(grupo); setVencidosModalOpen(true); };

  const kpisExecutivo = [
    { label: "Vencimentos no Período", value: fmtK(vencimentosNoPeriodo), subtitle: "Tudo que vence no período (recebido + a vencer + vencido)", icon: CalendarClock, tone: "cyan"    as const },
    { label: "% Realização",           value: `${percentualRealizacao.toFixed(1)}%`, subtitle: "Realizado ÷ Vencimentos no período", icon: Percent, tone: "emerald" as const },
    { label: "Realizado no Período",   value: fmtK(realizadoNoPeriodo), subtitle: "Efetivamente recebido no período", icon: CheckCircle, tone: "blue" as const },
    { label: "Vencido Acumulado",      value: fmtK(vencidoAcumulado), subtitle: `${vencidoDocsDetalhados.length} títulos vencidos · clique para ver a lista`, icon: AlertTriangle, tone: "rose" as const, onClick: () => abrirVencidosModal(null) },
  ];

  // ── Dados para gráficos (visão Executivo) ────────────────────────────────────
  // Mesma população do KPI 1 (vencimento dentro do filtro de período) — usada nos
  // Cards 1 e 2 para "compor" o Contas a Receber vigente pelo mês de EMISSÃO.
  const contasNoPeriodo = useMemo(() =>
    contasReceber.filter(c => c.vencimento >= dwFilter.dataInicio && c.vencimento <= dwFilter.dataFim),
    [contasReceber, dwFilter.dataInicio, dwFilter.dataFim]
  );

  // Card 1 — Composição por Mês de Emissão, ordenado por valor decrescente
  const composicaoMesEmissao = useMemo(
    () => [...groupByEmissionMonth(contasNoPeriodo)].sort((a, b) => b.value - a.value),
    [contasNoPeriodo]
  );

  // Card 3 — Clientes que Concentram o Vencido (agrupado por grupo de cliente)
  // Mesma base do KPI 4 (vencidoDocsDetalhados) — garante que o total batendo
  // aqui é exatamente o mesmo "Vencido Acumulado" do topo, só quebrado por grupo.
  const vencidoPorGrupo = useMemo(() => {
    const map = new Map<string, number>();
    vencidoDocsDetalhados.forEach(d => map.set(d.grupoCliente, (map.get(d.grupoCliente) ?? 0) + d.saldo));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([nome, valor]) => ({ nome, valor }));
  }, [vencidoDocsDetalhados]);

  // % Realização por Mês — ano completo (Jan–Dez do ano do filtro), usando
  // dwChartData (mesma fonte do gráfico anual do dashboard) em vez da janela
  // de dias do filtro principal.
  const realizacaoPorMes = useMemo(() => {
    const n = (v: number | null | undefined) => v ?? 0;
    const buckets = Array.from({ length: 12 }, () => ({ vencimento: 0, realizado: 0 }));

    dwChartData.forEach((r: any) => {
      if (r.ORIGEM !== "CR") return;
      const sit = String(r.SITUACAO ?? "").trim().toUpperCase();
      if (!["L", "P", "D"].includes(sit)) return;
      if (!r.DATA_VENCIMENTO) return;
      const mi = parseInt(String(r.DATA_VENCIMENTO).slice(5, 7), 10) - 1;
      if (mi < 0 || mi > 11) return;

      const valor = n(r.VLR_PAR_RAW) > 0 ? n(r.VLR_PAR_RAW) : n(r.VLR_PARCELA);
      buckets[mi].vencimento += valor;

      const temPag = r.DATA_PAGAMENTO !== null && r.DATA_PAGAMENTO !== undefined && r.DATA_PAGAMENTO !== "";
      if ((sit === "L" || sit === "P") && temPag) {
        const recebido = n(r.VLR_REC_RAW) > 0 ? n(r.VLR_REC_RAW) : n(r.VLR_PAGO);
        buckets[mi].realizado += recebido;
      }
    });

    const ano = chartReceber.ano || dwFilter.dataInicio.slice(0, 4);
    return buckets.map((b, i) => ({
      label: `${MESES_PT[i]}/${ano.slice(2)}`,
      pct: b.vencimento > 0 ? (b.realizado / b.vencimento) * 100 : 0,
    }));
  }, [dwChartData, chartReceber.ano, dwFilter.dataInicio]);

  return (
    <div 
      className="flex flex-col min-h-[100dvh] xl:h-[100dvh] overflow-auto xl:overflow-hidden px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      <BackgroundEffects />

      {/* ════════ BARRA DE PROGRESSO TOPO ════════ */}
      {isFetchingDw && (
        <div className="fixed inset-x-0 top-0 z-50">
          <div className="h-[3px] w-full overflow-hidden bg-transparent">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto xl:overflow-hidden"
          style={{
            background: "var(--sgt-bg-section)",
            borderColor: "var(--sgt-border-subtle)",
            boxShadow: "var(--sgt-section-shadow)",
          }}
        >
          <div className="relative flex flex-col flex-1 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 w-full">
            
            {/* Container com scroll */}
            <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 overflow-hidden w-full">
        
        {/* ════════ HEADER ════════ */}
        <div className="hidden sm:flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col leading-none">
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
              <span className="text-[17px] font-black tracking-[-0.03em] text-white">Contas a Receber</span>
            </div>
          </div>

          <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Tempo real</span>
          </div>

          <div className="h-6 w-px shrink-0 bg-[var(--sgt-divider)]" />

          {/* Filtros */}
          <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
            <DatePickerInput value={dwFilter.dataInicio} onChange={v => setDwFilter("dataInicio", v)} placeholder="Data início" />
            <DatePickerInput value={dwFilter.dataFim} onChange={v => setDwFilter("dataFim", v)} placeholder="Data fim" />
            <div className="h-4 w-px shrink-0 bg-[var(--sgt-divider)]" />
            <Select value={dwFilter.empresa ?? "__all__"} onValueChange={v => setDwFilter("empresa", v === "__all__" ? null : v)}>
              <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[130px] rounded-lg text-[12px] transition-all">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dwFilter.filial ?? "__all__"} onValueChange={v => setDwFilter("filial", v === "__all__" ? null : v)}>
              <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[140px] rounded-lg text-[12px] transition-all">
                <SelectValue placeholder="Filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {filiaisFiltradas.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <UpdateButton onClick={handleUpdate} isFetching={isFetchingDw} progress={progress} loadingPhase={loadingPhase} />
          </div>

          <HomeButton />
        </div>

        {/* Mobile header */}
        <div className="flex sm:hidden items-center gap-2">
          <MobileNav />
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img src={sgtLogo} alt="SGT" className="h-7 w-auto" />
            <div className="h-5 w-px bg-[var(--sgt-border-medium)]" />
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">Workspace</span>
              <span className="text-[15px] font-black tracking-[-0.03em] text-white truncate">Contas a Receber</span>
            </div>
          </div>
          <UpdateButton onClick={() => {}} isFetching={isFetchingDw} progress={0} compact />
          <HomeButton />
        </div>

        {/* ════════ SELETOR DE VISÕES ════════ */}
        <div className="flex items-center gap-1 self-start rounded-xl p-0.5 shrink-0 overflow-x-auto"
          style={{ background: "var(--sgt-skeleton-bg)", border: "1px solid var(--sgt-border-subtle)" }}>
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 whitespace-nowrap"
              style={
                view === v.id
                  ? { background: "#F59E0B", color: "#000", boxShadow: "0 1px 6px rgba(245,158,11,0.35)" }
                  : { color: "var(--sgt-text-muted)" }
              }
            >
              <v.icon className="h-3 w-3" />
              {v.label}
            </button>
          ))}
        </div>

        {view === "executivo" && (
        <>
        {/* ════════ KPIs ════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {kpisExecutivo.map((k, i) => (
            <AnimatedCard key={k.label} delay={i * 60}>
              <KpiCard label={k.label} value={k.value} subtitle={k.subtitle} icon={k.icon} tone={k.tone} loading={isFetchingDw} onClick={(k as any).onClick} />
            </AnimatedCard>
          ))}
        </div>
        {/* ════════ ÁREA ANALÍTICA ════════ */}
        {/* Linha 1 — três cards do mesmo tamanho: Composição | Detalhamento (drill-down) | Clientes que Concentram o Vencido */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
          <div className="h-[380px]">
            <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] flex flex-col h-full overflow-hidden">
              <div className="px-4 py-3 shrink-0 border-b border-[var(--sgt-border-subtle)]" style={{ background: "var(--sgt-table-head)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Composição por Mês de Emissão
                </p>
              </div>
              <div className="flex-1 min-h-0 p-3">
                {composicaoMesEmissao.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[12px] text-slate-600">
                    Sem dados no período selecionado
                  </div>
                ) : (
                  <VerticalBarChart data={composicaoMesEmissao} />
                )}
              </div>
            </div>
          </div>

          <div className="h-[380px]">
            <ClienteDrilldownCard contas={contasNoPeriodo} />
          </div>

          <div className="h-[380px]">
            <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] flex flex-col h-full overflow-hidden">
              <div className="px-4 py-3 shrink-0 border-b border-[var(--sgt-border-subtle)]" style={{ background: "var(--sgt-table-head)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Clientes que Concentram o Vencido
                </p>
              </div>
              <RankedList data={vencidoPorGrupo} color="#f43f5e" emptyMessage="Nenhum título vencido no momento" onRowClick={abrirVencidosModal} />
            </div>
          </div>
        </div>

        {/* Linha 2 — % Realização por Mês (mesma largura dos 2 primeiros cards) | Taxa de Inadimplência */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
          <div className="h-[300px] lg:col-span-2">
            <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] flex flex-col h-full overflow-hidden">
              <div className="px-4 py-3 shrink-0 border-b border-[var(--sgt-border-subtle)]" style={{ background: "var(--sgt-table-head)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  % Realização por Mês
                </p>
              </div>
              <div className="flex-1 min-h-0 p-3">
                {realizacaoPorMes.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[12px] text-slate-600">
                    Sem dados no período selecionado
                  </div>
                ) : (
                  <LineChartPercent data={realizacaoPorMes} />
                )}
              </div>
            </div>
          </div>

          <div className="h-[300px] lg:col-span-1">
            <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] flex flex-col h-full overflow-hidden">
              <div className="px-4 py-3 shrink-0 border-b border-[var(--sgt-border-subtle)]" style={{ background: "var(--sgt-table-head)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Taxa de Inadimplência
                </p>
              </div>
              <div className="flex flex-1 items-center justify-center p-3">
                <InadimplenciaGauge percent={taxaInadimplencia} />
              </div>
            </div>
          </div>
        </div>

        {/* ════════ FILTROS ════════ */}
        <div className="flex flex-wrap items-center gap-2">
          <GooeyInput
            placeholder="Buscar por documento ou cliente..."
            value={search}
            onValueChange={(v) => setSearch(v)}
          />
          <div className="flex gap-2 overflow-x-auto">
            {["todos", "Em Aberto", "Vencido", "Parcial", "Recebido"].map((status) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className={`h-9 rounded-lg border px-4 text-[11px] font-semibold uppercase tracking-[0.08em] transition-all whitespace-nowrap ${
                  filtroStatus === status
                    ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                    : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400 hover:border-[var(--sgt-border-medium)] hover:text-white"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* ════════ TABELA ════════ */}
        <div className="overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--sgt-border-subtle)", background: "var(--sgt-table-head)" }}>
                  <th className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort("documento")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                      Documento
                      {sortCol === "documento" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left hidden sm:table-cell">
                    <button onClick={() => toggleSort("cliente")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                      Cliente
                      {sortCol === "cliente" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left hidden sm:table-cell">
                    <button onClick={() => toggleSort("vencimento")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                      Vencimento
                      {sortCol === "vencimento" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right">
                    <button onClick={() => toggleSort("valor")} className="flex items-center gap-1 ml-auto text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                      Valor
                      {sortCol === "valor" ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Status</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginados.map((conta, i) => (
                  <tr key={i} className="border-b border-[var(--sgt-border-subtle)] transition-colors hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5 text-[13px] font-medium text-white">{conta.documento}</td>
                    <td className="px-3 py-2.5 text-[13px] text-slate-300 hidden sm:table-cell">{conta.cliente}</td>
                    <td className="px-3 py-2.5 text-[13px] text-slate-400 hidden sm:table-cell">{fmtData(conta.vencimento)}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] font-semibold text-white">{fmtBRL(conta.valor)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        (conta.status as string) === "Recebido" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-400/20" :
                        conta.status === "Vencido" ? "bg-rose-500/10 text-rose-300 border border-rose-400/20" :
                        conta.status === "Parcial" ? "bg-amber-500/10 text-amber-300 border border-amber-400/20" :
                        "bg-cyan-500/10 text-cyan-300 border border-cyan-400/20"
                      }`}>
                        {conta.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {paginados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[12px] text-slate-600">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--sgt-border-subtle)] px-4 py-3">
              <div className="text-[11px] text-slate-500">
                Mostrando {inicio + 1} a {Math.min(inicio + PAGE_SIZE, contasFiltradas.length)} de {contasFiltradas.length}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] text-slate-400 transition-all hover:border-amber-400/30 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  let p: number;
                  if (totalPaginas <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPaginas - 2) p = totalPaginas - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-semibold transition-all ${page === p ? "border border-amber-400/40 bg-amber-500/[0.15] text-amber-300" : "border border-white/[0.06] text-slate-500 hover:border-amber-400/20 hover:text-amber-300"}`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPaginas, page + 1))}
                  disabled={page === totalPaginas}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] text-slate-400 transition-all hover:border-amber-400/30 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          
          </div> {/* Fecha TABELA */}

        {/* ════════ POPUP — Títulos Vencidos ════════ */}
        <VencidosModal
          open={vencidosModalOpen}
          onOpenChange={setVencidosModalOpen}
          docs={vencidoDocsDetalhados}
          initialGrupo={vencidosModalGrupoInicial}
        />
        </>
        )}

        {view !== "executivo" && <PlaceholderView view={view} />}

        </div> {/* Fecha container com scroll */}
        </div>
      </section>
      </div>
    </div>
  );
}
