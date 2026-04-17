import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  ArrowLeft, Truck, Upload, FileSpreadsheet, X,
  DollarSign, CreditCard, AlertCircle, TrendingDown,
  ChevronUp, ChevronDown, Search, Filter
} from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { AnimatedCard } from "@/components/shared/AnimatedCard";

interface Financiamento {
  "N CONTRATO": string | number;
  BANCO: string;
  PLACA: string;
  "ANO FAB.": number;
  "ANO MODELO": number;
  "TIPO VEICULO": string;
  "TOTAL PARCELA": number;
  "PARCELA ATUAL": number;
  "PARCELAS PENDENTES": number;
  "VALOR PARCELA": number;
  "SALDO DEVEDOR": number;
}

const fmt = (v: number) =>
  v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "—";

const BANCO_COLORS: Record<string, { color: string; rgb: string }> = {
  SCANIA:    { color: "#60a5fa", rgb: "96,165,250" },
  BRADESCO:  { color: "#f472b6", rgb: "244,114,182" },
  ITAU:      { color: "#fbbf24", rgb: "251,191,36" },
  SANTANDER: { color: "#f87171", rgb: "248,113,113" },
  BB:        { color: "#34d399", rgb: "52,211,153" },
  CEF:       { color: "#a78bfa", rgb: "167,139,250" },
  SICOOB:    { color: "#22d3ee", rgb: "34,211,238" },
};

function getBancoColor(banco: string) {
  const key = Object.keys(BANCO_COLORS).find(k => banco?.toUpperCase().includes(k));
  return key ? BANCO_COLORS[key] : { color: "#94a3b8", rgb: "148,163,184" };
}

export default function FinanciamentoFrota() {
  const navigate = useNavigate();
  const [data, setData] = useState<Financiamento[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [search, setSearch] = useState("");
  const [filterBanco, setFilterBanco] = useState("Todos");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [sortCol, setSortCol] = useState<keyof Financiamento>("BANCO");
  const [sortAsc, setSortAsc] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Financiamento>(ws);
      setData(rows);
      setFileName(file.name);
    };
    reader.readAsBinaryString(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) processFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // KPIs
  const totalContratos = data.length;
  const saldoDevedor = data.reduce((s, r) => s + (r["SALDO DEVEDOR"] ?? 0), 0);
  const totalParcelas = data.reduce((s, r) => s + (r["PARCELAS PENDENTES"] ?? 0), 0);
  const valorMensal = data.reduce((s, r) => s + (r["VALOR PARCELA"] ?? 0), 0);

  // Bancos únicos
  const bancos = ["Todos", ...Array.from(new Set(data.map(r => r.BANCO))).sort()];
  const tipos = ["Todos", ...Array.from(new Set(data.map(r => r["TIPO VEICULO"]))).sort()];

  // Filtro + sort
  const filtered = data
    .filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !q || Object.values(r).some(v => String(v).toLowerCase().includes(q));
      const matchBanco = filterBanco === "Todos" || r.BANCO === filterBanco;
      const matchTipo = filterTipo === "Todos" || r["TIPO VEICULO"] === filterTipo;
      return matchSearch && matchBanco && matchTipo;
    })
    .sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });

  // Saldo por banco
  const porBanco = Object.entries(
    data.reduce((acc, r) => {
      acc[r.BANCO] = (acc[r.BANCO] ?? 0) + (r["SALDO DEVEDOR"] ?? 0);
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  const maxBanco = porBanco[0]?.[1] ?? 1;

  const handleSort = (col: keyof Financiamento) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const COLS: { key: keyof Financiamento; label: string }[] = [
    { key: "N CONTRATO",         label: "Contrato" },
    { key: "BANCO",              label: "Banco" },
    { key: "PLACA",              label: "Placa" },
    { key: "TIPO VEICULO",       label: "Tipo" },
    { key: "ANO FAB.",           label: "Fab." },
    { key: "TOTAL PARCELA",      label: "Total Parc." },
    { key: "PARCELA ATUAL",      label: "Parc. Atual" },
    { key: "PARCELAS PENDENTES", label: "Pendentes" },
    { key: "VALOR PARCELA",      label: "Vlr. Parcela" },
    { key: "SALDO DEVEDOR",      label: "Saldo Devedor" },
  ];

  return (
    <div
      className="flex flex-col transition-all duration-300 min-h-[100dvh] xl:h-[100dvh] overflow-auto xl:overflow-hidden px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(160,100,4,0.22),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_50%_40%_at_100%_105%,rgba(6,182,212,0.07),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:opacity-100" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.68) 100%)" }} />

      <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto xl:overflow-hidden"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 overflow-hidden w-full">

            {/* NAVBAR */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10">
                  <svg className="h-4.5 w-4.5 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <span className="text-[17px] font-extrabold tracking-[-0.03em] dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-slate-400 dark:bg-clip-text dark:text-transparent text-slate-800">
                  SGT Dashboard
                </span>
              </div>

              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Tempo real</span>
              </div>

              <div className="h-6 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

              <div className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[12px] font-semibold text-amber-300 uppercase tracking-[0.18em]">Financiamento de Frota</span>
              </div>

              <div className="flex-1" />

              {/* Upload sutil — só aparece se já tem dados */}
              {data.length > 0 && (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-medium transition-all border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400 hover:border-[var(--sgt-border-medium)] hover:text-slate-200"
                >
                  <FileSpreadsheet className="h-3 w-3" />
                  {fileName ?? "Trocar planilha"}
                </button>
              )}

              <button
                onClick={() => navigate("/home")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3.5 text-[12px] font-semibold transition-all border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400 hover:border-[var(--sgt-border-medium)] hover:bg-[var(--sgt-input-hover)] hover:text-white hover:-translate-y-0.5"
              >
                <ArrowLeft className="h-3 w-3" />
                Voltar
              </button>

              <UserMenu />
            </div>

            <div className="h-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

            {/* CONTEÚDO */}
            {data.length === 0 ? (
              /* ── Estado vazio: área de upload ── */
              <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-6 max-w-md w-full">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/[0.06]">
                    <Truck className="h-7 w-7 text-amber-400/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-[18px] font-bold dark:text-slate-200 text-slate-700">Financiamento de Frota</p>
                    <p className="mt-1 text-[13px] dark:text-slate-500 text-slate-400">Importe sua planilha para visualizar o painel</p>
                  </div>

                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`w-full cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${dragging
                      ? "border-amber-400/50 bg-amber-400/[0.06]"
                      : "border-[var(--sgt-border-subtle)] hover:border-amber-400/30 hover:bg-amber-400/[0.03]"
                    }`}
                  >
                    <Upload className={`mx-auto h-6 w-6 mb-3 transition-colors ${dragging ? "text-amber-400" : "text-slate-600"}`} />
                    <p className="text-[13px] font-medium dark:text-slate-300 text-slate-500">
                      Arraste a planilha ou <span className="text-amber-400">clique para selecionar</span>
                    </p>
                    <p className="mt-1 text-[11px] dark:text-slate-600 text-slate-400">.xlsx ou .xls</p>
                  </div>

                  <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
                </div>
              </div>
            ) : (
              /* ── Painel com dados ── */
              <div className="flex flex-col flex-1 min-h-0 gap-3 overflow-auto">

                {/* KPI Cards */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 shrink-0">
                  {[
                    { label: "Contratos", value: String(totalContratos), sub: "financiamentos ativos", icon: FileSpreadsheet, color: "cyan", rgb: "6,182,212", stripe: "from-cyan-400/60 to-cyan-700/20", border: "border-cyan-400/[0.12]", glow: "hover:shadow-[0_4px_40px_rgba(6,182,212,0.18)]", iconBg: "bg-cyan-400/[0.08] border border-cyan-400/[0.15]", iconTxt: "text-cyan-300", sub2: "text-cyan-500/80" },
                    { label: "Saldo Devedor", value: fmt(saldoDevedor), sub: "total a pagar", icon: DollarSign, color: "rose", rgb: "244,63,94", stripe: "from-rose-400/60 to-rose-700/20", border: "border-rose-400/[0.12]", glow: "hover:shadow-[0_4px_40px_rgba(244,63,94,0.18)]", iconBg: "bg-rose-400/[0.08] border border-rose-400/[0.15]", iconTxt: "text-rose-300", sub2: "text-rose-500/80" },
                    { label: "Parcelas Pendentes", value: String(totalParcelas), sub: "parcelas em aberto", icon: AlertCircle, color: "amber", rgb: "245,158,11", stripe: "from-amber-400/60 to-amber-700/20", border: "border-amber-400/[0.12]", glow: "hover:shadow-[0_4px_40px_rgba(245,158,11,0.18)]", iconBg: "bg-amber-400/[0.08] border border-amber-400/[0.15]", iconTxt: "text-amber-300", sub2: "text-amber-500/80" },
                    { label: "Compromisso Mensal", value: fmt(valorMensal), sub: "valor total de parcelas", icon: CreditCard, color: "violet", rgb: "139,92,246", stripe: "from-violet-400/60 to-violet-700/20", border: "border-violet-400/[0.12]", glow: "hover:shadow-[0_4px_40px_rgba(139,92,246,0.18)]", iconBg: "bg-violet-400/[0.08] border border-violet-400/[0.15]", iconTxt: "text-violet-300", sub2: "text-violet-500/80" },
                  ].map((k, i) => (
                    <AnimatedCard key={k.label} delay={i * 60}>
                      <div className={`group relative flex min-h-[100px] flex-col overflow-hidden rounded-[14px] sm:rounded-[16px] border ${k.border} bg-[var(--sgt-bg-card)] transition-all duration-300 hover:-translate-y-[3px] ${k.glow} shadow-[0_2px_20px_rgba(0,0,0,0.4)] p-3 xl:p-4`}>
                        <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${k.stripe}`} />
                        <div className="pointer-events-none absolute bottom-0 right-0 h-28 w-28"
                          style={{ background: `radial-gradient(circle at 100% 100%, rgba(${k.rgb},0.10), transparent 65%)` }} />
                        <div className="relative flex h-full flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-600 leading-tight">{k.label}</p>
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${k.iconBg} ${k.iconTxt} transition-transform duration-300 group-hover:scale-110`}>
                              <k.icon className="h-3.5 w-3.5" />
                            </div>
                          </div>
                          <p className="mt-auto pt-2 font-black leading-none tracking-[-0.05em] text-white text-[clamp(1rem,2vw,1.6rem)] overflow-hidden text-ellipsis whitespace-nowrap">{k.value}</p>
                          <p className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${k.sub2}`}>{k.sub}</p>
                        </div>
                      </div>
                    </AnimatedCard>
                  ))}
                </div>

                {/* Gráfico por banco + filtros + tabela */}
                <div className="flex flex-1 min-h-0 gap-3">

                  {/* Saldo por banco */}
                  <div className="w-[260px] shrink-0 rounded-[16px] border flex flex-col p-4 gap-3"
                    style={{ borderColor: "var(--sgt-border-subtle)", background: "var(--sgt-bg-card)" }}>
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.28em] dark:text-slate-500 mb-1">Saldo por banco</p>
                      <p className="text-[16px] font-extrabold dark:text-white">Distribuição</p>
                    </div>
                    <div className="h-px" style={{ background: "var(--sgt-divider)" }} />
                    <div className="flex flex-col gap-3 flex-1 justify-between">
                      {porBanco.map(([banco, saldo]) => {
                        const { color, rgb } = getBancoColor(banco);
                        const pct = (saldo / saldoDevedor) * 100;
                        const barW = (saldo / maxBanco) * 100;
                        return (
                          <div key={banco} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-semibold truncate dark:text-slate-300" style={{ maxWidth: "60%" }}>{banco}</span>
                              <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{pct.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--sgt-progress-track)" }}>
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${barW}%`, background: color, boxShadow: `0 0 6px rgba(${rgb},0.5)` }} />
                            </div>
                            <span className="text-[10px] tabular-nums dark:text-slate-500">{fmt(saldo)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tabela */}
                  <div className="flex flex-col flex-1 min-w-0 min-h-0 rounded-[16px] border overflow-hidden"
                    style={{ borderColor: "var(--sgt-border-subtle)", background: "var(--sgt-bg-card)" }}>

                    {/* Filtros */}
                    <div className="flex items-center gap-2 p-3 shrink-0 border-b" style={{ borderColor: "var(--sgt-border-subtle)" }}>
                      <div className="relative flex-1 max-w-[220px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                        <input
                          value={search} onChange={e => setSearch(e.target.value)}
                          placeholder="Buscar..."
                          className="h-7 w-full rounded-lg pl-7 pr-3 text-[11px] outline-none border"
                          style={{ background: "var(--sgt-input-bg)", borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-primary)" }}
                        />
                      </div>
                      <Filter className="h-3 w-3 text-slate-500 shrink-0" />
                      <select value={filterBanco} onChange={e => setFilterBanco(e.target.value)}
                        className="h-7 rounded-lg px-2 text-[11px] outline-none border"
                        style={{ background: "var(--sgt-input-bg)", borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-primary)" }}>
                        {bancos.map(b => <option key={b}>{b}</option>)}
                      </select>
                      <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
                        className="h-7 rounded-lg px-2 text-[11px] outline-none border"
                        style={{ background: "var(--sgt-input-bg)", borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-primary)" }}>
                        {tipos.map(t => <option key={t}>{t}</option>)}
                      </select>
                      <span className="ml-auto text-[10px] dark:text-slate-500 shrink-0">{filtered.length} contratos</span>
                    </div>

                    {/* Tabela scroll */}
                    <div className="flex-1 overflow-auto min-h-0">
                      <table className="w-full text-[11px] border-collapse min-w-[900px]">
                        <thead className="sticky top-0 z-10" style={{ background: "var(--sgt-table-head)" }}>
                          <tr>
                            {COLS.map(c => (
                              <th key={c.key}
                                onClick={() => handleSort(c.key)}
                                className="px-3 py-2.5 text-left font-bold uppercase tracking-[0.15em] text-slate-500 cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap"
                              >
                                <div className="flex items-center gap-1">
                                  {c.label}
                                  {sortCol === c.key
                                    ? sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                    : <ChevronUp className="h-3 w-3 opacity-20" />}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((row, i) => {
                            const { color } = getBancoColor(row.BANCO);
                            const pct = ((row["PARCELA ATUAL"] ?? 0) / (row["TOTAL PARCELA"] ?? 1)) * 100;
                            return (
                              <tr key={i}
                                className="border-t transition-colors hover:bg-white/[0.03]"
                                style={{ borderColor: "var(--sgt-border-subtle)" }}>
                                <td className="px-3 py-2.5 font-mono tabular-nums dark:text-slate-300">{row["N CONTRATO"]}</td>
                                <td className="px-3 py-2.5">
                                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold border"
                                    style={{ color, borderColor: `${color}40`, background: `${color}12` }}>
                                    {row.BANCO}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 font-mono font-semibold dark:text-slate-200">{row.PLACA}</td>
                                <td className="px-3 py-2.5 dark:text-slate-400">{row["TIPO VEICULO"]}</td>
                                <td className="px-3 py-2.5 dark:text-slate-400 tabular-nums">{row["ANO FAB."]}</td>
                                <td className="px-3 py-2.5 tabular-nums dark:text-slate-300">{row["TOTAL PARCELA"]}</td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="tabular-nums dark:text-slate-300">{row["PARCELA ATUAL"]}</span>
                                    <div className="h-1 w-12 rounded-full overflow-hidden" style={{ background: "var(--sgt-progress-track)" }}>
                                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className={`tabular-nums font-semibold ${(row["PARCELAS PENDENTES"] ?? 0) > 10 ? "text-amber-400" : "dark:text-slate-300"}`}>
                                    {row["PARCELAS PENDENTES"]}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 tabular-nums dark:text-slate-300">{fmt(row["VALOR PARCELA"])}</td>
                                <td className="px-3 py-2.5 tabular-nums font-bold text-rose-400">{fmt(row["SALDO DEVEDOR"])}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Input oculto para trocar planilha */}
                <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
