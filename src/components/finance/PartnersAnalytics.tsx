import { useState, useMemo } from "react";
import {
  Search, AlertTriangle, TrendingUp, TrendingDown, Clock, Eye, Send,
  Download, ArrowUpDown, X, LayoutGrid, List, BarChart3, Building2,
  Users, ChevronRight, Activity, Zap,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface PartnerRow {
  documento: string;
  parcela: string | null;
  emissao: string | null;
  vencimento: string | null;
  pagamento: string | null;
  valor: number;
  valorPago: number;
  pago: boolean;
  diasAtraso: number; // > 0 if late & not paid
}

export interface Partner {
  cod: string;
  nome: string;
  volume: number;
  emAberto: number;
  vencido: number;
  qtdTitulos: number;
  qtdAbertos: number;
  qtdVencidos: number;
  prazoMedio: number;
  ultimaMov: string | null;
  rows: PartnerRow[];
}

interface Props {
  kind: "fornecedor" | "cliente";
  partners: Partner[];
  isLoading: boolean;
  emptyHint?: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}k` : fmtBRL(v);
const fmtDateBR = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

function calcScore(p: Partner): number {
  const pctVenc = p.volume > 0 ? Math.min(100, (p.vencido / p.volume) * 100) : 0;
  const ratioQ = p.qtdAbertos > 0 ? (p.qtdVencidos / p.qtdAbertos) * 100 : 0;
  const prazoPen = Math.max(0, Math.min(100, ((p.prazoMedio - 30) / 60) * 100));
  return Math.round(pctVenc * 0.6 + ratioQ * 0.25 + prazoPen * 0.15);
}
type Bucket = "saudavel" | "atencao" | "critico";
function riskBucket(score: number): Bucket {
  return score < 30 ? "saudavel" : score < 70 ? "atencao" : "critico";
}
const RISK = {
  saudavel: { dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/25", bar: "bg-emerald-400/70", label: "Saudável", hex: "#34d399" },
  atencao:  { dot: "bg-amber-400",   text: "text-amber-300",   bg: "bg-amber-400/10 border-amber-400/25",   bar: "bg-amber-400/70",   label: "Atenção",  hex: "#fbbf24" },
  critico:  { dot: "bg-rose-400",    text: "text-rose-300",    bg: "bg-rose-400/10 border-rose-400/25",     bar: "bg-rose-400/70",    label: "Crítico",  hex: "#fb7185" },
} as const;

// ─── SCORE BADGE ──────────────────────────────────────────────────────────────
function ScoreBadge({ score, compact = false }: { score: number; compact?: boolean }) {
  const r = RISK[riskBucket(score)];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${r.bg} ${r.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />
      {compact ? score : `${r.label} · ${score}`}
    </span>
  );
}

// ─── INSIGHTS ─────────────────────────────────────────────────────────────────
function buildInsights(partners: Partner[], kind: "fornecedor" | "cliente") {
  if (partners.length === 0) return [];
  const totalVencido = partners.reduce((s, p) => s + p.vencido, 0);
  const totalVolume = partners.reduce((s, p) => s + p.volume, 0);
  const criticos = partners.filter(p => riskBucket(calcScore(p)) === "critico");
  const sortedByVencido = [...partners].sort((a, b) => b.vencido - a.vencido);
  const top5Venc = sortedByVencido.slice(0, 5).reduce((s, p) => s + p.vencido, 0);
  const concentracaoTop5 = totalVolume > 0
    ? (sortedByVencido.slice(0, 5).reduce((s, p) => s + p.volume, 0) / totalVolume) * 100
    : 0;
  const prazoMedio = partners.length > 0
    ? partners.reduce((s, p) => s + p.prazoMedio, 0) / partners.length
    : 0;

  const noun = kind === "fornecedor" ? "fornecedores" : "clientes";
  const insights: { type: "alert" | "warn" | "info" | "ok"; text: string }[] = [];

  if (criticos.length > 0) {
    insights.push({
      type: "alert",
      text: `${criticos.length} ${noun} em estado crítico — concentram ${fmtK(criticos.reduce((s, p) => s + p.vencido, 0))} em vencidos.`,
    });
  }
  if (totalVencido > 0 && top5Venc > 0) {
    const pct = (top5Venc / totalVencido) * 100;
    insights.push({
      type: pct > 60 ? "warn" : "info",
      text: `Top 5 ${noun} concentram ${pct.toFixed(0)}% do volume vencido (${fmtK(top5Venc)}).`,
    });
  }
  if (concentracaoTop5 > 50) {
    insights.push({
      type: "warn",
      text: `Carteira concentrada: top 5 representam ${concentracaoTop5.toFixed(0)}% do volume total.`,
    });
  }
  if (prazoMedio > 0) {
    insights.push({
      type: prazoMedio > 45 ? "warn" : "ok",
      text: `Prazo médio da carteira: ${prazoMedio.toFixed(0)} dias.`,
    });
  }
  return insights.slice(0, 4);
}

const INSIGHT_STYLES = {
  alert: { bg: "border-rose-400/25 bg-rose-400/5", text: "text-rose-300", icon: AlertTriangle },
  warn:  { bg: "border-amber-400/25 bg-amber-400/5", text: "text-amber-300", icon: TrendingUp },
  info:  { bg: "border-cyan-400/25 bg-cyan-400/5", text: "text-cyan-300", icon: Activity },
  ok:    { bg: "border-emerald-400/25 bg-emerald-400/5", text: "text-emerald-300", icon: Zap },
};

function InsightsBar({ insights }: { insights: ReturnType<typeof buildInsights> }) {
  if (insights.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      {insights.map((ins, i) => {
        const s = INSIGHT_STYLES[ins.type];
        const Icon = s.icon;
        return (
          <div key={i} className={`flex items-start gap-2 rounded-[12px] border px-3 py-2.5 ${s.bg}`}>
            <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${s.text}`} />
            <p className={`text-[11px] leading-snug ${s.text}`}>{ins.text}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── AGING ────────────────────────────────────────────────────────────────────
function buildAging(rows: PartnerRow[]) {
  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  rows.forEach(r => {
    if (r.pago || r.diasAtraso <= 0) return;
    const aberto = Math.max(0, r.valor - r.valorPago);
    if (r.diasAtraso <= 30) buckets["0-30"] += aberto;
    else if (r.diasAtraso <= 60) buckets["31-60"] += aberto;
    else if (r.diasAtraso <= 90) buckets["61-90"] += aberto;
    else buckets["90+"] += aberto;
  });
  return Object.entries(buckets).map(([faixa, valor]) => ({ faixa, valor }));
}

// ─── DRAWER ───────────────────────────────────────────────────────────────────
function PartnerDrawer({ partner, kind, open, onClose }: { partner: Partner | null; kind: "fornecedor" | "cliente"; open: boolean; onClose: () => void }) {
  if (!partner) return null;
  const score = calcScore(partner);
  const r = RISK[riskBucket(score)];
  const aging = buildAging(partner.rows);
  const sortedRows = [...partner.rows].sort((a, b) => (b.diasAtraso) - (a.diasAtraso));

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] border-l border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-page)] p-0 overflow-y-auto">
        <SheetHeader className="border-b border-[var(--sgt-border-subtle)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-[15px] font-semibold text-slate-100 truncate">{partner.nome}</SheetTitle>
              <p className="text-[10px] text-slate-500 mt-1">Cód. {partner.cod || "—"} · {kind === "fornecedor" ? "Fornecedor" : "Cliente"}</p>
            </div>
            <ScoreBadge score={score} />
          </div>
        </SheetHeader>

        <div className="p-5 space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Volume", value: fmtK(partner.volume), clr: "text-slate-200" },
              { label: "Em aberto", value: fmtK(partner.emAberto), clr: "text-amber-300" },
              { label: "Vencido", value: fmtK(partner.vencido), clr: "text-rose-300" },
              { label: "Prazo médio", value: partner.prazoMedio > 0 ? `${partner.prazoMedio}d` : "—", clr: "text-slate-200" },
              { label: "Títulos abertos", value: String(partner.qtdAbertos), clr: "text-slate-200" },
              { label: "Vencidos (qtd)", value: String(partner.qtdVencidos), clr: partner.qtdVencidos > 0 ? "text-rose-300" : "text-slate-200" },
            ].map(s => (
              <div key={s.label} className="rounded-[10px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-table-head)] px-3 py-2">
                <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">{s.label}</p>
                <p className={`text-[13px] font-semibold mt-1 ${s.clr}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Aging */}
          {partner.qtdVencidos > 0 && (
            <div className="rounded-[12px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-3">Aging de vencidos</p>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aging}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="faixa" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} width={40} />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ background: "#0b1020", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [fmtBRL(v), "Em aberto"]} />
                    <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                      {aging.map((_, i) => <Cell key={i} fill={i === 0 ? "#fbbf24" : i === 1 ? "#fb923c" : i === 2 ? "#f87171" : "#dc2626"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] px-3 py-2 text-[11px] font-medium text-slate-300 hover:border-[var(--sgt-border-medium)] hover:text-slate-100 transition-colors">
              <Send className="h-3.5 w-3.5" /> {kind === "fornecedor" ? "Renegociar" : "Cobrar"}
            </button>
            <button onClick={() => exportPartnerCsv(partner)} className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] px-3 py-2 text-[11px] font-medium text-slate-300 hover:border-[var(--sgt-border-medium)] hover:text-slate-100 transition-colors">
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </button>
          </div>

          {/* Títulos */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-2">Títulos ({sortedRows.length})</p>
            <div className="rounded-[12px] border border-[var(--sgt-border-subtle)] overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[var(--sgt-table-head)] text-slate-500">
                    <th className="px-3 py-2 text-left font-medium">Documento</th>
                    <th className="px-3 py-2 text-left font-medium">Vencimento</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-3 py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.slice(0, 50).map((row, i) => {
                    const aberto = Math.max(0, row.valor - row.valorPago);
                    const isVenc = !row.pago && row.diasAtraso > 0;
                    return (
                      <tr key={i} className="border-t border-[var(--sgt-divider)]">
                        <td className="px-3 py-2 text-slate-300">{row.documento}{row.parcela ? `/${row.parcela}` : ""}</td>
                        <td className="px-3 py-2 text-slate-400">{fmtDateBR(row.vencimento)}</td>
                        <td className="px-3 py-2 text-right text-slate-200 font-medium">{fmtBRL(row.pago ? row.valor : aberto)}</td>
                        <td className="px-3 py-2 text-right">
                          {row.pago ? (
                            <span className="text-emerald-300 text-[10px] font-semibold">Pago</span>
                          ) : isVenc ? (
                            <span className="text-rose-300 text-[10px] font-semibold">+{row.diasAtraso}d</span>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-semibold">Em aberto</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sortedRows.length > 50 && (
                <p className="text-center text-[10px] text-slate-500 py-2 border-t border-[var(--sgt-divider)]">+{sortedRows.length - 50} títulos não exibidos</p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function exportPartnerCsv(p: Partner) {
  const header = ["Documento", "Parcela", "Emissão", "Vencimento", "Pagamento", "Valor", "Pago", "DiasAtraso"];
  const lines = [header.join(";")];
  p.rows.forEach(r => {
    lines.push([
      r.documento,
      r.parcela ?? "",
      fmtDateBR(r.emissao),
      fmtDateBR(r.vencimento),
      fmtDateBR(r.pagamento),
      String(r.valor).replace(".", ","),
      String(r.valorPago).replace(".", ","),
      r.diasAtraso > 0 ? String(r.diasAtraso) : "",
    ].join(";"));
  });
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${p.nome}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
type Mode = "tabela" | "cards" | "analytics";
type SortKey = "nome" | "volume" | "emAberto" | "vencido" | "qtdVencidos" | "prazoMedio" | "score";

export function PartnersAnalytics({ kind, partners, isLoading, emptyHint }: Props) {
  const [mode, setMode] = useState<Mode>("tabela");
  const [search, setSearch] = useState("");
  const [filtroRisco, setFiltroRisco] = useState<"todos" | Bucket>("todos");
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Partner | null>(null);

  const enriched = useMemo(() => partners.map(p => ({ ...p, _score: calcScore(p) })), [partners]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let arr = enriched.filter(p => {
      const matchQ = !q || p.nome.toLowerCase().includes(q) || p.cod.toLowerCase().includes(q);
      const matchR = filtroRisco === "todos" || riskBucket(p._score) === filtroRisco;
      return matchQ && matchR;
    });
    arr.sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      switch (sortKey) {
        case "nome": av = a.nome; bv = b.nome; break;
        case "volume": av = a.volume; bv = b.volume; break;
        case "emAberto": av = a.emAberto; bv = b.emAberto; break;
        case "vencido": av = a.vencido; bv = b.vencido; break;
        case "qtdVencidos": av = a.qtdVencidos; bv = b.qtdVencidos; break;
        case "prazoMedio": av = a.prazoMedio; bv = b.prazoMedio; break;
        case "score": av = a._score; bv = b._score; break;
      }
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [enriched, search, filtroRisco, sortKey, sortDir]);

  // KPIs do header
  const totalVolume = partners.reduce((s, p) => s + p.volume, 0);
  const totalVencido = partners.reduce((s, p) => s + p.vencido, 0);
  const totalAbertos = partners.reduce((s, p) => s + p.qtdAbertos, 0);
  const criticos = enriched.filter(p => riskBucket(p._score) === "critico").length;
  const insights = useMemo(() => buildInsights(partners, kind), [partners, kind]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-600">
        <div className="h-8 w-8 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
        <p className="text-[12px] font-medium">Carregando {kind === "fornecedor" ? "fornecedores" : "clientes"}...</p>
      </div>
    );
  }
  if (partners.length === 0) {
    const Icon = kind === "fornecedor" ? Building2 : Users;
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
        <Icon className="h-10 w-10 opacity-30" />
        <p className="text-[13px]">{emptyHint ?? `Nenhum ${kind} no período. Clique em Atualizar.`}</p>
      </div>
    );
  }

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  const noun = kind === "fornecedor" ? "fornecedores" : "clientes";

  return (
    <div className="flex flex-col gap-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { label: `Total de ${noun}`, value: String(partners.length), sub: `${criticos} em estado crítico`, icon: kind === "fornecedor" ? Building2 : Users, stripe: "from-cyan-400/60 to-cyan-700/20", iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]", iconTxt: "text-cyan-300", glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]" },
          { label: "Volume", value: fmtK(totalVolume), sub: "no período", icon: BarChart3, stripe: "from-violet-400/60 to-violet-700/20", iconBg: "bg-violet-400/[0.08] border border-violet-400/[0.15]", iconTxt: "text-violet-300", glow: "hover:shadow-[0_4px_40px_rgba(139,92,246,0.18)]" },
          { label: "Em aberto (qtd)", value: String(totalAbertos), sub: "títulos pendentes", icon: Clock, stripe: "from-amber-400/60 to-amber-700/20", iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]", iconTxt: "text-amber-300", glow: "hover:shadow-[0_4px_40px_rgba(251,191,36,0.18)]" },
          { label: "Vencido", value: fmtK(totalVencido), sub: `${partners.filter(p => p.vencido > 0).length} ${noun}`, icon: AlertTriangle, stripe: "from-rose-400/60 to-rose-700/20", iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]", iconTxt: "text-rose-300", glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]" },
        ] as const).map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`group relative flex min-h-[120px] flex-col overflow-hidden rounded-[14px] border border-white/[0.07] bg-[var(--sgt-bg-card)] p-4 transition-all duration-300 hover:-translate-y-[3px] ${k.glow} shadow-[0_2px_20px_rgba(0,0,0,0.35)]`}>
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${k.stripe}`} />
              <div className="flex items-start justify-between gap-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-500 leading-tight">{k.label}</p>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${k.iconBg} ${k.iconTxt}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="mt-auto pt-2 font-black leading-none tracking-[-0.05em] text-white text-[clamp(1.3rem,2.2vw,1.7rem)] overflow-hidden text-ellipsis whitespace-nowrap">{k.value}</p>
              <p className="mt-2 text-[10px] font-medium tracking-[0.1em] text-slate-500">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Insights */}
      <InsightsBar insights={insights} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] px-3 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Buscar ${noun}...`}
          className="flex-1 min-w-[160px] bg-transparent text-[12px] text-slate-300 placeholder:text-slate-600 outline-none"
        />
        <div className="h-4 w-px bg-[var(--sgt-divider)]" />
        <select
          value={filtroRisco}
          onChange={e => setFiltroRisco(e.target.value as "todos" | Bucket)}
          className="rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2 py-1 text-[11px] text-slate-300 outline-none"
        >
          <option value="todos">Risco: Todos</option>
          <option value="critico">Crítico</option>
          <option value="atencao">Atenção</option>
          <option value="saudavel">Saudável</option>
        </select>
        <span className="text-[11px] text-slate-600">{filtered.length} {noun}</span>

        <div className="ml-auto flex items-center gap-1 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] p-0.5">
          {[
            { id: "tabela" as Mode, icon: List, label: "Tabela" },
            { id: "cards" as Mode, icon: LayoutGrid, label: "Cards" },
            { id: "analytics" as Mode, icon: BarChart3, label: "Analytics" },
          ].map(t => {
            const Icon = t.icon;
            const active = mode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${active ? "bg-amber-400/15 text-amber-200" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Icon className="h-3 w-3" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body by mode */}
      {mode === "tabela" && (
        <TableMode
          partners={filtered}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          onSelect={p => setSelected(p)}
        />
      )}
      {mode === "cards" && <CardsMode partners={filtered} onSelect={p => setSelected(p)} />}
      {mode === "analytics" && <AnalyticsMode partners={filtered} kind={kind} />}

      <PartnerDrawer partner={selected} kind={kind} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ─── TABLE MODE ───────────────────────────────────────────────────────────────
function TableMode({ partners, sortKey, sortDir, onSort, onSelect }: {
  partners: (Partner & { _score: number })[];
  sortKey: SortKey; sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  onSelect: (p: Partner) => void;
}) {
  const SortHeader = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 bg-[var(--sgt-table-head)] ${className}`}>
      <button onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-slate-300 transition-colors">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? "text-amber-300" : "opacity-40"}`} />
      </button>
    </th>
  );

  return (
    <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] overflow-hidden">
      <div className="overflow-x-auto max-h-[640px]">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr>
              <SortHeader k="nome" className="text-left">Nome</SortHeader>
              <SortHeader k="volume" className="text-right">Volume</SortHeader>
              <SortHeader k="emAberto" className="text-right">Em aberto</SortHeader>
              <SortHeader k="vencido" className="text-right">Vencido</SortHeader>
              <SortHeader k="qtdVencidos" className="text-right">Qtd venc.</SortHeader>
              <SortHeader k="prazoMedio" className="text-right">Prazo</SortHeader>
              <SortHeader k="score" className="text-center">Risco</SortHeader>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 bg-[var(--sgt-table-head)] text-right">Concentração</th>
              <th className="w-8 bg-[var(--sgt-table-head)]"></th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p, i) => {
              const r = RISK[riskBucket(p._score)];
              const concentracao = p.volume > 0 ? (p.vencido / p.volume) * 100 : 0;
              return (
                <tr
                  key={p.cod || p.nome}
                  onClick={() => onSelect(p)}
                  className="border-t border-[var(--sgt-divider)] hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-slate-600 font-mono w-6 text-right">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-slate-200 truncate max-w-[280px]">{p.nome}</p>
                        <p className="text-[9px] text-slate-600 mt-0.5">Cód. {p.cod || "—"} · {p.qtdTitulos} títulos</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12px] text-slate-200 font-semibold tabular-nums">{fmtK(p.volume)}</td>
                  <td className="px-3 py-2.5 text-right text-[12px] tabular-nums">
                    <span className={p.emAberto > 0 ? "text-amber-200" : "text-slate-500"}>{fmtK(p.emAberto)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12px] tabular-nums">
                    <span className={p.vencido > 0 ? "text-rose-300 font-semibold" : "text-slate-600"}>{p.vencido > 0 ? fmtK(p.vencido) : "—"}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12px] tabular-nums">
                    <span className={p.qtdVencidos > 0 ? "text-rose-300" : "text-slate-600"}>{p.qtdVencidos}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12px] text-slate-300 tabular-nums">{p.prazoMedio > 0 ? `${p.prazoMedio}d` : "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums ${r.bg} ${r.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />
                        {p._score}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="h-1.5 w-20 rounded-full bg-white/[0.05] overflow-hidden">
                        <div className={`h-full ${r.bar}`} style={{ width: `${Math.min(100, concentracao)}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500 tabular-nums w-8 text-right">{concentracao.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-slate-600">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {partners.length === 0 && (
          <div className="py-12 text-center text-[12px] text-slate-600">Nenhum resultado para o filtro atual.</div>
        )}
      </div>
    </div>
  );
}

// ─── CARDS MODE ───────────────────────────────────────────────────────────────
function CardsMode({ partners, onSelect }: { partners: (Partner & { _score: number })[]; onSelect: (p: Partner) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {partners.map(p => {
        const r = RISK[riskBucket(p._score)];
        const concentracao = p.volume > 0 ? (p.vencido / p.volume) * 100 : 0;
        const isCritico = riskBucket(p._score) === "critico";
        return (
          <button
            key={p.cod || p.nome}
            onClick={() => onSelect(p)}
            className={`group text-left flex flex-col gap-3 rounded-[14px] border bg-[var(--sgt-bg-card)] p-4 transition-all hover:-translate-y-[2px] ${isCritico ? "border-rose-400/35 hover:border-rose-400/55" : "border-[var(--sgt-border-subtle)] hover:border-[var(--sgt-border-medium)]"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-slate-200 truncate">{p.nome}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Cód. {p.cod || "—"}</p>
              </div>
              <ScoreBadge score={p._score} compact />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Volume</p>
              <p className="text-[18px] font-bold text-slate-100 tabular-nums leading-tight mt-0.5">{fmtK(p.volume)}</p>
            </div>
            {p.vencido > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500">Vencido</span>
                  <span className="text-[10px] text-rose-300 font-semibold tabular-nums">{fmtK(p.vencido)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
                  <div className={`h-full ${r.bar}`} style={{ width: `${Math.min(100, concentracao)}%` }} />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>{p.qtdAbertos} abertos · {p.qtdVencidos} venc.</span>
              <span>{p.prazoMedio > 0 ? `${p.prazoMedio}d` : "—"}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── ANALYTICS MODE ───────────────────────────────────────────────────────────
function AnalyticsMode({ partners, kind }: { partners: (Partner & { _score: number })[]; kind: "fornecedor" | "cliente" }) {
  const top10Volume = [...partners].sort((a, b) => b.volume - a.volume).slice(0, 10).map(p => ({
    nome: p.nome.length > 18 ? p.nome.slice(0, 18) + "…" : p.nome, valor: p.volume, score: p._score,
  }));
  const top10Vencido = [...partners].filter(p => p.vencido > 0).sort((a, b) => b.vencido - a.vencido).slice(0, 10).map(p => ({
    nome: p.nome.length > 18 ? p.nome.slice(0, 18) + "…" : p.nome, valor: p.vencido,
  }));

  // Aging consolidado
  const allRows: PartnerRow[] = partners.flatMap(p => p.rows);
  const aging = buildAging(allRows);

  // Distribuição por risco
  const riskDist = ["saudavel", "atencao", "critico"].map(b => ({
    bucket: RISK[b as Bucket].label,
    qtd: partners.filter(p => riskBucket(p._score) === b).length,
    color: RISK[b as Bucket].hex,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Top 10 Volume */}
      <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-3">Top 10 por volume</p>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10Volume} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="nome" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={130} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ background: "#0b1020", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [fmtBRL(v), "Volume"]} />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                {top10Volume.map((d, i) => <Cell key={i} fill={RISK[riskBucket(d.score)].hex} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 Vencido */}
      <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-3">Top 10 — vencido</p>
        {top10Vencido.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-[12px] text-slate-600">Sem vencidos no período</div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10Vencido} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nome" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={130} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ background: "#0b1020", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [fmtBRL(v), "Vencido"]} />
                <Bar dataKey="valor" fill="#fb7185" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Aging consolidado */}
      <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-3">Aging consolidado de vencidos</p>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aging}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="faixa" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1000).toFixed(0)}k`} width={48} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ background: "#0b1020", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [fmtBRL(v), "Em aberto"]} />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                {aging.map((_, i) => <Cell key={i} fill={i === 0 ? "#fbbf24" : i === 1 ? "#fb923c" : i === 2 ? "#f87171" : "#dc2626"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribuição por risco */}
      <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-3">Distribuição por risco</p>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={riskDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ background: "#0b1020", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`${v} ${kind === "fornecedor" ? "fornecedores" : "clientes"}`, ""]} />
              <Bar dataKey="qtd" radius={[6, 6, 0, 0]}>
                {riskDist.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
