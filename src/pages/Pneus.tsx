import { useState, useMemo } from "react";
import {
  CircleDot, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Search, TrendingDown, Gauge, DollarSign,
  BarChart3, ChevronUp, ChevronDown, Filter, FlaskConical,
} from "lucide-react";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { AnimatedCard } from "@/components/shared/AnimatedCard";

// ── Tipos ──────────────────────────────────────────────────────────────────────
type StatusPneu = "bom" | "atencao" | "critico" | "recapado";

interface Pneu {
  id: string;
  veiculo: string;
  placa: string;
  posicao: string;
  marca: string;
  modelo: string;
  dot: string;
  kmInicial: number;
  kmAtual: number;
  kmVida: number;
  status: StatusPneu;
  ultimaTroca: string;
  valor: number;
}

// ── Dados mockados ─────────────────────────────────────────────────────────────
const PNEUS_MOCK: Pneu[] = [
  { id:"P001", veiculo:"Bi-trem 001", placa:"ABC-1A23", posicao:"Dianteiro E",   marca:"Bridgestone", modelo:"R150",   dot:"2321", kmInicial:0,      kmAtual:87400, kmVida:120000, status:"bom",      ultimaTroca:"2024-03-10", valor:1850 },
  { id:"P002", veiculo:"Bi-trem 001", placa:"ABC-1A23", posicao:"Dianteiro D",   marca:"Bridgestone", modelo:"R150",   dot:"2321", kmInicial:0,      kmAtual:87400, kmVida:120000, status:"bom",      ultimaTroca:"2024-03-10", valor:1850 },
  { id:"P003", veiculo:"Bi-trem 001", placa:"ABC-1A23", posicao:"Tração E-int",  marca:"Michelin",    modelo:"XZE2+", dot:"1820", kmInicial:12000,  kmAtual:109200, kmVida:120000, status:"atencao",  ultimaTroca:"2023-11-04", valor:2100 },
  { id:"P004", veiculo:"Bi-trem 001", placa:"ABC-1A23", posicao:"Tração E-ext",  marca:"Michelin",    modelo:"XZE2+", dot:"1820", kmInicial:12000,  kmAtual:109200, kmVida:120000, status:"atencao",  ultimaTroca:"2023-11-04", valor:2100 },
  { id:"P005", veiculo:"Bi-trem 001", placa:"ABC-1A23", posicao:"Tração D-int",  marca:"Michelin",    modelo:"XZE2+", dot:"0919", kmInicial:5000,   kmAtual:118700, kmVida:120000, status:"critico",  ultimaTroca:"2023-07-22", valor:2100 },
  { id:"P006", veiculo:"Bi-trem 001", placa:"ABC-1A23", posicao:"Tração D-ext",  marca:"Michelin",    modelo:"XZE2+", dot:"0919", kmInicial:5000,   kmAtual:118700, kmVida:120000, status:"critico",  ultimaTroca:"2023-07-22", valor:2100 },
  { id:"P007", veiculo:"Carreta 002",  placa:"DEF-2B34", posicao:"Dianteiro E",   marca:"Goodyear",   modelo:"G291",  dot:"3022", kmInicial:0,      kmAtual:43200, kmVida:100000, status:"bom",      ultimaTroca:"2024-08-15", valor:1780 },
  { id:"P008", veiculo:"Carreta 002",  placa:"DEF-2B34", posicao:"Dianteiro D",   marca:"Goodyear",   modelo:"G291",  dot:"3022", kmInicial:0,      kmAtual:43200, kmVida:100000, status:"bom",      ultimaTroca:"2024-08-15", valor:1780 },
  { id:"P009", veiculo:"Carreta 002",  placa:"DEF-2B34", posicao:"Tração E-int",  marca:"Pirelli",    modelo:"TR01",  dot:"2221", kmInicial:18000,  kmAtual:72400, kmVida:100000, status:"bom",      ultimaTroca:"2024-01-10", valor:1960 },
  { id:"P010", veiculo:"Carreta 002",  placa:"DEF-2B34", posicao:"Tração E-ext",  marca:"Pirelli",    modelo:"TR01",  dot:"2221", kmInicial:18000,  kmAtual:72400, kmVida:100000, status:"bom",      ultimaTroca:"2024-01-10", valor:1960 },
  { id:"P011", veiculo:"Carreta 002",  placa:"DEF-2B34", posicao:"Tração D-int",  marca:"Recap RD",   modelo:"R-7",   dot:"1119", kmInicial:60000,  kmAtual:92800, kmVida:100000, status:"recapado", ultimaTroca:"2023-04-01", valor:780  },
  { id:"P012", veiculo:"Carreta 002",  placa:"DEF-2B34", posicao:"Tração D-ext",  marca:"Recap RD",   modelo:"R-7",   dot:"1119", kmInicial:60000,  kmAtual:92800, kmVida:100000, status:"recapado", ultimaTroca:"2023-04-01", valor:780  },
  { id:"P013", veiculo:"Truck 003",    placa:"GHI-3C45", posicao:"Dianteiro E",   marca:"Continental","modelo":"HSU", dot:"4423", kmInicial:0,      kmAtual:21300, kmVida:90000,  status:"bom",      ultimaTroca:"2024-10-20", valor:1650 },
  { id:"P014", veiculo:"Truck 003",    placa:"GHI-3C45", posicao:"Dianteiro D",   marca:"Continental","modelo":"HSU", dot:"4423", kmInicial:0,      kmAtual:21300, kmVida:90000,  status:"bom",      ultimaTroca:"2024-10-20", valor:1650 },
  { id:"P015", veiculo:"Truck 003",    placa:"GHI-3C45", posicao:"Traseiro E-int", marca:"Bridgestone","modelo":"M729",dot:"0822",kmInicial:9000,   kmAtual:78600, kmVida:90000,  status:"atencao",  ultimaTroca:"2023-08-05", valor:1900 },
  { id:"P016", veiculo:"Truck 003",    placa:"GHI-3C45", posicao:"Traseiro E-ext", marca:"Bridgestone","modelo":"M729",dot:"0822",kmInicial:9000,   kmAtual:78600, kmVida:90000,  status:"atencao",  ultimaTroca:"2023-08-05", valor:1900 },
  { id:"P017", veiculo:"Bi-trem 004",  placa:"JKL-4D56", posicao:"Dianteiro E",   marca:"Goodyear",   modelo:"G291",  dot:"1124", kmInicial:0,      kmAtual:8700,  kmVida:100000, status:"bom",      ultimaTroca:"2025-01-08", valor:1780 },
  { id:"P018", veiculo:"Bi-trem 004",  placa:"JKL-4D56", posicao:"Dianteiro D",   marca:"Goodyear",   modelo:"G291",  dot:"1124", kmInicial:0,      kmAtual:8700,  kmVida:100000, status:"bom",      ultimaTroca:"2025-01-08", valor:1780 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<StatusPneu, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  bom:      { label:"Bom",      color:"#22c55e", bg:"rgba(34,197,94,0.1)",   icon: CheckCircle2 },
  atencao:  { label:"Atenção",  color:"#f59e0b", bg:"rgba(245,158,11,0.1)",  icon: AlertTriangle },
  critico:  { label:"Crítico",  color:"#ef4444", bg:"rgba(239,68,68,0.1)",   icon: XCircle },
  recapado: { label:"Recapado", color:"#8b5cf6", bg:"rgba(139,92,246,0.1)",  icon: RefreshCw },
};

function pctVida(p: Pneu) {
  return Math.min(100, Math.round(((p.kmAtual - p.kmInicial) / p.kmVida) * 100));
}

function fmtKm(v: number) {
  return v.toLocaleString("pt-BR") + " km";
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

type SortKey = "veiculo" | "posicao" | "kmAtual" | "status" | "pct";
type SortDir = "asc" | "desc";

// ── KPI card simples ────────────────────────────────────────────────────────────
function KpiSimples({
  label, value, sub, icon: Icon, color,
}: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div
      className="flex flex-col gap-2 p-4 rounded-xl border"
      style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--sgt-text-muted)" }}>
          {label}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}18` }}>
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
      </div>
      <span className="text-2xl font-black tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>{value}</span>
      {sub && <span className="text-[11px]" style={{ color: "var(--sgt-text-muted)" }}>{sub}</span>}
    </div>
  );
}

// ── Barra de vida do pneu ───────────────────────────────────────────────────────
function VidaBar({ pct, status }: { pct: number; status: StatusPneu }) {
  const color = STATUS_CFG[status].color;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--sgt-border-subtle)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────────
export default function Pneus() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusPneu | "todos">("todos");
  const [sortKey, setSortKey] = useState<SortKey>("veiculo");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const dados = useMemo(() => {
    let list = [...PNEUS_MOCK];
    if (filtroStatus !== "todos") list = list.filter(p => p.status === filtroStatus);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter(p =>
        p.veiculo.toLowerCase().includes(q) ||
        p.placa.toLowerCase().includes(q) ||
        p.posicao.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sortKey === "pct")      { va = pctVida(a); vb = pctVida(b); }
      else if (sortKey === "kmAtual") { va = a.kmAtual; vb = b.kmAtual; }
      else if (sortKey === "status")  { va = a.status; vb = b.status; }
      else if (sortKey === "posicao") { va = a.posicao; vb = b.posicao; }
      else                            { va = a.veiculo; vb = b.veiculo; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [busca, filtroStatus, sortKey, sortDir]);

  // KPIs
  const total    = PNEUS_MOCK.length;
  const criticos = PNEUS_MOCK.filter(p => p.status === "critico").length;
  const atencao  = PNEUS_MOCK.filter(p => p.status === "atencao").length;
  const custoTotal = PNEUS_MOCK.reduce((s, p) => s + p.valor, 0);
  const kmMedio  = Math.round(PNEUS_MOCK.reduce((s, p) => s + p.kmAtual, 0) / total);

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp className="h-3 w-3 opacity-20" />;
    return sortDir === "asc"
      ? <ChevronUp   className="h-3 w-3" style={{ color: "#f59e0b" }} />
      : <ChevronDown className="h-3 w-3" style={{ color: "#f59e0b" }} />;
  }

  return (
    <div
      className="flex flex-col transition-all duration-300 h-[100dvh] overflow-hidden px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* Gradientes de fundo */}
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(99,102,241,0.15),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_50%_40%_at_100%_105%,rgba(34,197,94,0.06),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:opacity-100" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.68) 100%)" }} />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px]"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          <div className="relative flex flex-col flex-1 min-h-0 p-2 sm:p-3 lg:p-4 gap-3">

            {/* ── Header ── */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex sm:hidden">
                <MobileNav />
              </div>

              <div className="flex flex-col leading-none">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Frota</span>
                <span className="text-[15px] sm:text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">Pneus</span>
              </div>

              {/* Badge dados mockados */}
              <div
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: "rgba(99,102,241,0.12)",
                  border: "1px solid rgba(99,102,241,0.35)",
                  color: "#818cf8",
                }}
              >
                <FlaskConical className="h-3 w-3 shrink-0" />
                <span className="hidden xs:inline">Dados de demonstração</span>
                <span className="xs:hidden">Demo</span>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <HomeButton />
              </div>
            </div>

            {/* ── KPI grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 shrink-0">
              <KpiSimples label="Total de Pneus"  value={String(total)}     sub="na frota ativa"           icon={CircleDot}    color="#6366f1" />
              <KpiSimples label="Críticos"         value={String(criticos)}  sub={`+ ${atencao} em atenção`} icon={AlertTriangle} color="#ef4444" />
              <KpiSimples label="Km Médio/Pneu"   value={fmtKm(kmMedio)}    sub="vida acumulada"           icon={Gauge}        color="#f59e0b" />
              <KpiSimples label="Custo Total"      value={fmtBRL(custoTotal)} sub="valor de estoque"        icon={DollarSign}   color="#22c55e" />
            </div>

            {/* ── Filtros ── */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Busca */}
              <div
                className="flex items-center gap-2 rounded-lg border px-3 py-1.5 flex-1 min-w-[160px] max-w-xs"
                style={{ background: "var(--sgt-input-bg)", borderColor: "var(--sgt-input-border)" }}
              >
                <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--sgt-text-muted)" }} />
                <input
                  className="bg-transparent text-xs outline-none w-full placeholder:text-[var(--sgt-text-muted)]"
                  style={{ color: "var(--sgt-text-primary)" }}
                  placeholder="Veículo, placa, posição…"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                />
              </div>

              {/* Filtro status */}
              <div className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" style={{ color: "var(--sgt-text-muted)" }} />
                {(["todos","bom","atencao","critico","recapado"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setFiltroStatus(s)}
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all"
                    style={
                      filtroStatus === s
                        ? s === "todos"
                          ? { background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44" }
                          : { background: STATUS_CFG[s].bg, color: STATUS_CFG[s].color, border: `1px solid ${STATUS_CFG[s].color}44` }
                        : { background: "transparent", color: "var(--sgt-text-muted)", border: "1px solid var(--sgt-border-subtle)" }
                    }
                  >
                    {s === "todos" ? "Todos" : STATUS_CFG[s].label}
                  </button>
                ))}
              </div>

              <span className="ml-auto text-[11px]" style={{ color: "var(--sgt-text-muted)" }}>
                {dados.length} pneu{dados.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* ── Tabela ── */}
            <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border" style={{ borderColor: "var(--sgt-border-subtle)" }}>
              <table className="w-full text-xs border-collapse min-w-[640px]">
                <thead>
                  <tr style={{ background: "var(--sgt-bg-base)", position: "sticky", top: 0, zIndex: 1 }}>
                    {[
                      { key: "veiculo"  as SortKey, label: "Veículo / Placa", cls: "text-left pl-4" },
                      { key: "posicao"  as SortKey, label: "Posição",          cls: "text-left" },
                      { key: null,                   label: "Marca / Modelo",   cls: "text-left hidden md:table-cell" },
                      { key: null,                   label: "DOT",              cls: "text-center hidden lg:table-cell" },
                      { key: "kmAtual"  as SortKey, label: "KM Atual",          cls: "text-right" },
                      { key: "pct"      as SortKey, label: "Vida do Pneu",      cls: "text-left hidden sm:table-cell" },
                      { key: "status"   as SortKey, label: "Status",            cls: "text-center pr-4" },
                    ].map(({ key, label, cls }) => (
                      <th
                        key={label}
                        className={`py-2.5 font-bold uppercase tracking-wider ${cls} ${key ? "cursor-pointer select-none hover:opacity-70" : ""}`}
                        style={{ color: "var(--sgt-text-muted)", fontSize: 10, borderBottom: "1px solid var(--sgt-border-subtle)" }}
                        onClick={() => key && toggleSort(key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {key && <SortIcon k={key} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.map((p, i) => {
                    const cfg = STATUS_CFG[p.status];
                    const StatusIcon = cfg.icon;
                    const pct = pctVida(p);
                    const isFirst = i === 0 || dados[i - 1].veiculo !== p.veiculo;
                    return (
                      <tr
                        key={p.id}
                        className="transition-colors"
                        style={{
                          borderTop: isFirst && i !== 0 ? "1px solid var(--sgt-border-subtle)" : "none",
                          background: i % 2 === 0 ? "transparent" : "var(--sgt-row-alt, rgba(255,255,255,0.012))",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--sgt-row-hover, rgba(255,255,255,0.04))")}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "var(--sgt-row-alt, rgba(255,255,255,0.012))")}
                      >
                        {/* Veículo */}
                        <td className="py-2.5 pl-4">
                          <div className="font-semibold" style={{ color: "var(--sgt-text-primary)" }}>{p.veiculo}</div>
                          <div className="text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>{p.placa}</div>
                        </td>
                        {/* Posição */}
                        <td className="py-2.5" style={{ color: "var(--sgt-text-secondary)" }}>{p.posicao}</td>
                        {/* Marca/Modelo */}
                        <td className="py-2.5 hidden md:table-cell">
                          <div style={{ color: "var(--sgt-text-secondary)" }}>{p.marca}</div>
                          <div className="text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>{p.modelo}</div>
                        </td>
                        {/* DOT */}
                        <td className="py-2.5 text-center hidden lg:table-cell">
                          <span
                            className="font-mono text-[11px] px-1.5 py-0.5 rounded"
                            style={{ background: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" }}
                          >
                            {p.dot}
                          </span>
                        </td>
                        {/* KM */}
                        <td className="py-2.5 text-right tabular-nums" style={{ color: "var(--sgt-text-secondary)" }}>
                          {p.kmAtual.toLocaleString("pt-BR")}
                        </td>
                        {/* Barra de vida */}
                        <td className="py-2.5 hidden sm:table-cell px-4" style={{ minWidth: 120 }}>
                          <VidaBar pct={pct} status={p.status} />
                        </td>
                        {/* Status */}
                        <td className="py-2.5 text-center pr-4">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                            style={{ background: cfg.bg, color: cfg.color }}
                          >
                            <StatusIcon className="h-3 w-3 shrink-0" />
                            <span className="hidden sm:inline">{cfg.label}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {dados.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm" style={{ color: "var(--sgt-text-muted)" }}>
                        Nenhum pneu encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Rodapé legend ── */}
            <div className="flex flex-wrap items-center gap-3 shrink-0 pt-1">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-3 w-3" style={{ color: "var(--sgt-text-muted)" }} />
                <span className="text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>Vida do pneu = KM rodado / KM estimado de vida</span>
              </div>
              {(Object.entries(STATUS_CFG) as [StatusPneu, typeof STATUS_CFG[StatusPneu]][]).map(([k, v]) => {
                const LIcon = v.icon;
                return (
                  <div key={k} className="flex items-center gap-1">
                    <LIcon className="h-3 w-3" style={{ color: v.color }} />
                    <span className="text-[10px] font-semibold" style={{ color: v.color }}>{v.label}</span>
                  </div>
                );
              })}
              <div
                className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}
              >
                <FlaskConical className="h-2.5 w-2.5" />
                Dados fictícios — não refletem a frota real
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}
