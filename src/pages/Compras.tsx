import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  FileText,
  Users,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchCompras, ComprasRow } from "@/lib/dwApi";
import { UserMenu } from "@/components/auth/UserMenu";

// ─── Utilitários ──────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  if (n == null) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtQtd(n: number | null | undefined) {
  if (n == null) return "0";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("pt-BR");
}

function totalRow(r: ComprasRow) {
  return (r.quantidade ?? 0) * (r.valor_un ?? 0);
}

// ─── Paginação ────────────────────────────────────────────────────────────────

function CompactPagination({
  page,
  total,
  perPage,
  onChange,
}: {
  page: number;
  total: number;
  perPage: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-2 text-[12px] text-[var(--sgt-text-muted)]">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="rounded-lg border border-[var(--sgt-border)] p-1.5 disabled:opacity-30 hover:border-amber-400/40 transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span>
        {page} / {pages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === pages}
        className="rounded-lg border border-[var(--sgt-border)] p-1.5 disabled:opacity-30 hover:border-amber-400/40 transition-colors"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Tipos de ordenação ───────────────────────────────────────────────────────

type SortDir = "asc" | "desc";
type SortCol =
  | "data_compra"
  | "fornecedor"
  | "produto"
  | "grupo"
  | "quantidade"
  | "valor_un"
  | "total";

function SortIcon({ col, active, dir }: { col: string; active: string; dir: SortDir }) {
  if (col !== active) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return dir === "asc"
    ? <ArrowUp className="h-3 w-3 text-amber-400" />
    : <ArrowDown className="h-3 w-3 text-amber-400" />;
}

const thBtn = "flex items-center gap-1 whitespace-nowrap hover:text-amber-300 transition-colors cursor-pointer select-none";

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tone: "amber" | "cyan" | "violet" | "emerald";
}) {
  const palettes = {
    amber:   { border: "border-amber-400/20",   iconBg: "bg-amber-400/10 border-amber-400/20",   iconTxt: "text-amber-300",   glow: "rgba(245,158,11,0.12)"   },
    cyan:    { border: "border-cyan-400/20",    iconBg: "bg-cyan-400/10 border-cyan-400/20",    iconTxt: "text-cyan-300",    glow: "rgba(6,182,212,0.12)"    },
    violet:  { border: "border-violet-400/20",  iconBg: "bg-violet-400/10 border-violet-400/20",  iconTxt: "text-violet-300",  glow: "rgba(139,92,246,0.12)"  },
    emerald: { border: "border-emerald-400/20", iconBg: "bg-emerald-400/10 border-emerald-400/20", iconTxt: "text-emerald-300", glow: "rgba(16,185,129,0.12)" },
  };
  const p = palettes[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${p.border} p-5 flex flex-col gap-3`}
      style={{
        background: "var(--sgt-bg-card)",
        boxShadow: `0 0 24px ${p.glow}`,
      }}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${p.iconBg} ${p.iconTxt}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--sgt-text-muted)]">{label}</p>
        <p className="mt-1 text-[22px] font-black tracking-tight sgt-text">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-[var(--sgt-text-faint)]">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Progress bar item ────────────────────────────────────────────────────────

function BarItem({ label, value, max, pct }: { label: string; value: number; max: number; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="truncate max-w-[55%] text-[var(--sgt-text-primary)]">{label || "—"}</span>
        <span className="text-[var(--sgt-text-muted)]">{fmt(value)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--sgt-border)]">
        <div
          className="h-1.5 rounded-full bg-amber-400/70"
          style={{ width: `${Math.round((value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function Compras() {
  const navigate = useNavigate();

  const [dataInicio, setDataInicio] = useState(iso(firstOfMonth));
  const [dataFim, setDataFim] = useState(iso(today));
  const [busca, setBusca] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("TODOS");
  const [filtroFornecedor, setFiltroFornecedor] = useState("TODOS");
  const [sortCol, setSortCol] = useState<SortCol>("data_compra");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["compras", dataInicio, dataFim],
    queryFn: () => fetchCompras({ dataInicio, dataFim }),
    staleTime: 5 * 60_000,
  });

  const rows: ComprasRow[] = data?.data ?? [];

  // ── Opções de filtro ──
  const grupos = useMemo(() => {
    const s = new Set(rows.map((r) => r.grupo ?? "—"));
    return ["TODOS", ...Array.from(s).sort()];
  }, [rows]);

  const fornecedores = useMemo(() => {
    const s = new Set(rows.map((r) => r.fornecedor ?? "—"));
    return ["TODOS", ...Array.from(s).sort()];
  }, [rows]);

  // ── Filtragem e ordenação ──
  const filtered = useMemo(() => {
    const q = busca.toLowerCase();
    return rows
      .filter((r) => {
        const matchBusca =
          !q ||
          (r.produto ?? "").toLowerCase().includes(q) ||
          (r.fornecedor ?? "").toLowerCase().includes(q) ||
          String(r.nota_fiscal ?? "").toLowerCase().includes(q) ||
          String(r.pedido ?? "").toLowerCase().includes(q);
        const matchGrupo = filtroGrupo === "TODOS" || (r.grupo ?? "—") === filtroGrupo;
        const matchFornecedor = filtroFornecedor === "TODOS" || (r.fornecedor ?? "—") === filtroFornecedor;
        return matchBusca && matchGrupo && matchFornecedor;
      })
      .sort((a, b) => {
        let va: string | number = 0;
        let vb: string | number = 0;
        if (sortCol === "data_compra") { va = a.data_compra ?? ""; vb = b.data_compra ?? ""; }
        else if (sortCol === "fornecedor") { va = a.fornecedor ?? ""; vb = b.fornecedor ?? ""; }
        else if (sortCol === "produto") { va = a.produto ?? ""; vb = b.produto ?? ""; }
        else if (sortCol === "grupo") { va = a.grupo ?? ""; vb = b.grupo ?? ""; }
        else if (sortCol === "quantidade") { va = a.quantidade ?? 0; vb = b.quantidade ?? 0; }
        else if (sortCol === "valor_un") { va = a.valor_un ?? 0; vb = b.valor_un ?? 0; }
        else if (sortCol === "total") { va = totalRow(a); vb = totalRow(b); }
        const cmp = typeof va === "string" ? va.localeCompare(vb as string, "pt-BR") : (va as number) - (vb as number);
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [rows, busca, filtroGrupo, filtroFornecedor, sortCol, sortDir]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const totalValor = filtered.reduce((s, r) => s + totalRow(r), 0);
    const totalNFs = new Set(filtered.map((r) => String(r.nota_fiscal ?? ""))).size;
    const totalFornecedores = new Set(filtered.map((r) => r.fornecedor ?? "")).size;
    const totalProdutos = new Set(filtered.map((r) => String(r.codprod ?? ""))).size;
    return { totalValor, totalNFs, totalFornecedores, totalProdutos };
  }, [filtered]);

  // ── Top Grupos ──
  const topGrupos = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const k = r.grupo ?? "—";
      map.set(k, (map.get(k) ?? 0) + totalRow(r));
    });
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = sorted[0]?.[1] ?? 1;
    return sorted.map(([label, value]) => ({ label, value, max, pct: value / max }));
  }, [filtered]);

  // ── Top Fornecedores ──
  const topFornecedores = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const k = r.fornecedor ?? "—";
      map.set(k, (map.get(k) ?? 0) + totalRow(r));
    });
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted[0]?.[1] ?? 1;
    return sorted.map(([label, value]) => ({ label, value, max, pct: value / max }));
  }, [filtered]);

  // ── Top Centro de Custo ──
  const topCentros = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const k = r.centro_custo ?? "—";
      map.set(k, (map.get(k) ?? 0) + totalRow(r));
    });
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted[0]?.[1] ?? 1;
    return sorted.map(([label, value]) => ({ label, value, max, pct: value / max }));
  }, [filtered]);

  // ── Paginação ──
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  // ── Sort handler ──
  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  }

  // ── CSV export ──
  function exportCSV() {
    const headers = ["Data", "NF", "Pedido", "Fornecedor", "Produto", "Grupo", "Sub-grupo", "Centro de Custo", "Qtd", "Vlr Unit", "Total"];
    const lines = filtered.map((r) => [
      fmtDate(r.data_compra),
      r.nota_fiscal ?? "",
      r.pedido ?? "",
      r.fornecedor ?? "",
      r.produto ?? "",
      r.grupo ?? "",
      r.sub_grupo ?? "",
      r.centro_custo ?? "",
      fmtQtd(r.quantidade),
      (r.valor_un ?? 0).toFixed(2).replace(".", ","),
      totalRow(r).toFixed(2).replace(".", ","),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    const bom = "﻿";
    const csv = bom + [headers.join(";"), ...lines].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "compras.csv";
    a.click();
  }

  // ── Aplica filtro de período ──
  function aplicar() {
    setPage(1);
    refetch();
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col min-h-[100dvh] px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* Atmosfera */}
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_75%_50%_at_50%_-8%,rgba(180,110,4,0.20),transparent_58%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_55%_50%_at_85%_110%,rgba(139,92,246,0.07),transparent_60%)]" />

      <section
        className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto"
        style={{
          background: "var(--sgt-bg-section)",
          borderColor: "var(--sgt-border-subtle)",
          boxShadow: "var(--sgt-section-shadow)",
        }}
      >
        <div className="relative flex flex-col flex-1 min-h-0 gap-4 p-3 sm:p-4 lg:p-5 w-full">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--sgt-text-muted)] hover:text-amber-300 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
              <div className="h-4 w-px bg-[var(--sgt-border)]" />
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h1 className="text-[16px] font-black tracking-tight sgt-text leading-tight">Compras</h1>
                  <p className="text-[11px] text-[var(--sgt-text-muted)]">Notas fiscais de entrada por período</p>
                </div>
              </div>
            </div>
            <UserMenu />
          </div>

          {/* ── Filtros de período ── */}
          <div
            className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--sgt-border)] p-3"
            style={{ background: "var(--sgt-bg-card)" }}
          >
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sgt-text-muted)]">De</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="rounded-lg border border-[var(--sgt-border)] bg-[var(--sgt-input-bg)] px-3 py-1.5 text-[13px] sgt-text focus:outline-none focus:border-amber-400/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sgt-text-muted)]">Até</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="rounded-lg border border-[var(--sgt-border)] bg-[var(--sgt-input-bg)] px-3 py-1.5 text-[13px] sgt-text focus:outline-none focus:border-amber-400/50"
              />
            </div>
            <button
              onClick={aplicar}
              className="h-[34px] rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-amber-300 hover:bg-amber-400/20 transition-colors"
            >
              Aplicar
            </button>
          </div>

          {/* ── Estado de loading / erro ── */}
          {isLoading && (
            <div className="flex flex-1 items-center justify-center gap-3 py-20 text-[var(--sgt-text-muted)]">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
              <span className="text-[13px]">Carregando dados de compras…</span>
            </div>
          )}

          {isError && (
            <div className="flex flex-1 items-center justify-center gap-3 py-20 text-rose-400">
              <AlertCircle className="h-5 w-5" />
              <span className="text-[13px]">Falha ao carregar dados. Verifique a conexão com a API.</span>
            </div>
          )}

          {!isLoading && !isError && (
            <>
              {/* ── KPIs ── */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard
                  icon={ShoppingCart}
                  label="Total comprado"
                  value={fmt(kpis.totalValor)}
                  sub={`${filtered.length} itens no período`}
                  tone="amber"
                />
                <KpiCard
                  icon={FileText}
                  label="Notas fiscais"
                  value={String(kpis.totalNFs)}
                  sub="NFs distintas"
                  tone="cyan"
                />
                <KpiCard
                  icon={Users}
                  label="Fornecedores"
                  value={String(kpis.totalFornecedores)}
                  sub="fornecedores ativos"
                  tone="violet"
                />
                <KpiCard
                  icon={Package}
                  label="Produtos"
                  value={String(kpis.totalProdutos)}
                  sub="SKUs distintos"
                  tone="emerald"
                />
              </div>

              {/* ── Analytics — 3 colunas ── */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Top Grupos */}
                <div
                  className="rounded-2xl border border-[var(--sgt-border)] p-4 space-y-3"
                  style={{ background: "var(--sgt-bg-card)" }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400/80">Top grupos</p>
                  {topGrupos.length === 0
                    ? <p className="text-[12px] text-[var(--sgt-text-faint)]">Sem dados</p>
                    : topGrupos.map((g) => (
                      <BarItem key={g.label} label={g.label} value={g.value} max={g.max} pct={g.pct} />
                    ))
                  }
                </div>

                {/* Top Fornecedores */}
                <div
                  className="rounded-2xl border border-[var(--sgt-border)] p-4 space-y-3"
                  style={{ background: "var(--sgt-bg-card)" }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400/80">Top fornecedores</p>
                  {topFornecedores.length === 0
                    ? <p className="text-[12px] text-[var(--sgt-text-faint)]">Sem dados</p>
                    : topFornecedores.map((f) => (
                      <BarItem key={f.label} label={f.label} value={f.value} max={f.max} pct={f.pct} />
                    ))
                  }
                </div>

                {/* Top Centro de Custo */}
                <div
                  className="rounded-2xl border border-[var(--sgt-border)] p-4 space-y-3"
                  style={{ background: "var(--sgt-bg-card)" }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400/80">Top centro de custo</p>
                  {topCentros.length === 0
                    ? <p className="text-[12px] text-[var(--sgt-text-faint)]">Sem dados</p>
                    : topCentros.map((c) => (
                      <BarItem key={c.label} label={c.label} value={c.value} max={c.max} pct={c.pct} />
                    ))
                  }
                </div>
              </div>

              {/* ── Controles da tabela ── */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Busca */}
                <div className="relative flex-1 min-w-[200px] max-w-[360px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sgt-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Buscar produto, fornecedor, NF, pedido…"
                    value={busca}
                    onChange={(e) => { setBusca(e.target.value); setPage(1); }}
                    className="w-full rounded-xl border border-[var(--sgt-border)] bg-[var(--sgt-input-bg)] py-2 pl-8 pr-3 text-[13px] sgt-text placeholder:text-[var(--sgt-text-faint)] focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                {/* Filtro grupo */}
                <select
                  value={filtroGrupo}
                  onChange={(e) => { setFiltroGrupo(e.target.value); setPage(1); }}
                  className="rounded-xl border border-[var(--sgt-border)] bg-[var(--sgt-input-bg)] px-3 py-2 text-[12px] sgt-text focus:outline-none focus:border-amber-400/50"
                >
                  {grupos.map((g) => (
                    <option key={g} value={g}>{g === "TODOS" ? "Todos os grupos" : g}</option>
                  ))}
                </select>

                {/* Filtro fornecedor */}
                <select
                  value={filtroFornecedor}
                  onChange={(e) => { setFiltroFornecedor(e.target.value); setPage(1); }}
                  className="rounded-xl border border-[var(--sgt-border)] bg-[var(--sgt-input-bg)] px-3 py-2 text-[12px] sgt-text focus:outline-none focus:border-amber-400/50 max-w-[220px]"
                >
                  {fornecedores.map((f) => (
                    <option key={f} value={f}>{f === "TODOS" ? "Todos os fornecedores" : f}</option>
                  ))}
                </select>

                <div className="ml-auto flex items-center gap-3">
                  <span className="text-[11px] text-[var(--sgt-text-muted)]">
                    {filtered.length} {filtered.length === 1 ? "item" : "itens"}
                  </span>
                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--sgt-border)] bg-[var(--sgt-input-bg)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sgt-text-muted)] hover:border-amber-400/40 hover:text-amber-300 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exportar
                  </button>
                </div>
              </div>

              {/* ── Tabela ── */}
              <div
                className="rounded-2xl border border-[var(--sgt-border)] overflow-hidden"
                style={{ background: "var(--sgt-bg-card)" }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr
                        className="border-b border-[var(--sgt-border)] text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--sgt-text-muted)]"
                        style={{ background: "var(--sgt-bg-table-header)" }}
                      >
                        <th className="px-4 py-3 text-left">
                          <button className={thBtn} onClick={() => handleSort("data_compra")}>
                            Data <SortIcon col="data_compra" active={sortCol} dir={sortDir} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">NF</th>
                        <th className="px-4 py-3 text-left">Pedido</th>
                        <th className="px-4 py-3 text-left">
                          <button className={thBtn} onClick={() => handleSort("fornecedor")}>
                            Fornecedor <SortIcon col="fornecedor" active={sortCol} dir={sortDir} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button className={thBtn} onClick={() => handleSort("produto")}>
                            Produto <SortIcon col="produto" active={sortCol} dir={sortDir} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button className={thBtn} onClick={() => handleSort("grupo")}>
                            Grupo <SortIcon col="grupo" active={sortCol} dir={sortDir} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">Sub-grupo</th>
                        <th className="px-4 py-3 text-left">C. Custo</th>
                        <th className="px-4 py-3 text-right">
                          <button className={thBtn + " ml-auto"} onClick={() => handleSort("quantidade")}>
                            Qtd <SortIcon col="quantidade" active={sortCol} dir={sortDir} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right">
                          <button className={thBtn + " ml-auto"} onClick={() => handleSort("valor_un")}>
                            Vlr Unit <SortIcon col="valor_un" active={sortCol} dir={sortDir} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right">
                          <button className={thBtn + " ml-auto"} onClick={() => handleSort("total")}>
                            Total <SortIcon col="total" active={sortCol} dir={sortDir} />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-12 text-center text-[var(--sgt-text-faint)]">
                            Nenhum item encontrado para os filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        paginated.map((r, i) => (
                          <tr
                            key={i}
                            className="border-b border-[var(--sgt-border-subtle)] hover:bg-amber-400/[0.03] transition-colors"
                          >
                            <td className="px-4 py-2.5 text-[var(--sgt-text-muted)] whitespace-nowrap">
                              {fmtDate(r.data_compra)}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[var(--sgt-text-primary)]">
                              {r.nota_fiscal ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-[var(--sgt-text-muted)]">
                              {r.pedido ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 max-w-[180px] truncate sgt-text font-medium">
                              {r.fornecedor ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 max-w-[200px] truncate text-[var(--sgt-text-primary)]">
                              {r.produto ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-[var(--sgt-text-muted)]">
                              {r.grupo ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-[var(--sgt-text-muted)]">
                              {r.sub_grupo ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 max-w-[140px] truncate text-[var(--sgt-text-muted)]">
                              {r.centro_custo ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-[var(--sgt-text-primary)]">
                              {fmtQtd(r.quantidade)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-[var(--sgt-text-muted)]">
                              {fmt(r.valor_un)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-amber-300">
                              {fmt(totalRow(r))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer da tabela */}
                <div className="flex items-center justify-between gap-4 border-t border-[var(--sgt-border)] px-4 py-3">
                  <p className="text-[11px] text-[var(--sgt-text-muted)]">
                    Exibindo {paginated.length} de {filtered.length} itens
                  </p>
                  <CompactPagination
                    page={page}
                    total={filtered.length}
                    perPage={PAGE_SIZE}
                    onChange={setPage}
                  />
                  <p className="text-[12px] font-semibold text-amber-300 tabular-nums">
                    {fmt(filtered.reduce((s, r) => s + totalRow(r), 0))}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
