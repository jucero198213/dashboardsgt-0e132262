import { useState, useRef, useCallback } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  XCircle, Search, RefreshCw, FileText, ChevronDown,
  ChevronUp, Filter, Download,
} from "lucide-react";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { UpdateButton } from "@/components/shared/UpdateButton";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoNF = "NF-e" | "NFS-e";

type StatusComparacao = "ok" | "divergencia" | "nao_encontrada" | "pendente";

interface NotaFiscal {
  id:         string;
  numero:     string;
  tipo:       TipoNF;
  emitente:   string;
  destinatario: string;
  valor:      number;
  dataEmissao: string;
  chave?:     string;
  status:     StatusComparacao;
  divergencia?: string; // descrição da divergência se houver
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const fmtData = (d: string) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR");
};

function StatusBadge({ status, divergencia }: { status: StatusComparacao; divergencia?: string }) {
  const cfg = {
    ok:            { icon: CheckCircle2, label: "Conferido",      cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
    divergencia:   { icon: AlertTriangle, label: divergencia ?? "Divergência", cls: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
    nao_encontrada:{ icon: XCircle,       label: "Não encontrada", cls: "text-rose-300 bg-rose-400/10 border-rose-400/20" },
    pendente:      { icon: RefreshCw,     label: "Pendente",       cls: "text-slate-300 bg-slate-400/10 border-slate-400/20" },
  }[status];

  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string;
  color: "emerald" | "amber" | "rose" | "slate";
}) {
  const cls = {
    emerald: { val: "text-emerald-300", border: "border-emerald-400/15", dot: "bg-emerald-400" },
    amber:   { val: "text-amber-300",   border: "border-amber-400/15",   dot: "bg-amber-400"   },
    rose:    { val: "text-rose-300",    border: "border-rose-400/15",    dot: "bg-rose-400"    },
    slate:   { val: "text-slate-300",   border: "border-slate-500/15",   dot: "bg-slate-400"   },
  }[color];

  return (
    <div
      className={`flex flex-col gap-1 rounded-[14px] border p-4 min-h-[120px] ${cls.border}`}
      style={{ background: "var(--sgt-bg-card)" }}
    >
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${cls.dot}`} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      </div>
      <p className={`mt-auto pt-2 text-[28px] font-black tabular-nums leading-none tracking-tight ${cls.val}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Fiscal() {
  const [notas, setNotas]           = useState<NotaFiscal[]>([]);
  const [planilhaCarregada, setPlanilhaCarregada] = useState(false);
  const [planilhaNome, setPlanilhaNome]           = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [search, setSearch]         = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoNF>("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusComparacao>("todos");
  const [isLoading, setIsLoading]   = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Métricas derivadas ─────────────────────────────────────────────────────
  const total          = notas.length;
  const conferidas     = notas.filter(n => n.status === "ok").length;
  const divergencias   = notas.filter(n => n.status === "divergencia").length;
  const naoEncontradas = notas.filter(n => n.status === "nao_encontrada").length;

  const totalValorOK   = notas.filter(n => n.status === "ok").reduce((s, n) => s + n.valor, 0);
  const totalValorDiv  = notas.filter(n => n.status === "divergencia").reduce((s, n) => s + n.valor, 0);

  // ── Filtro + busca ─────────────────────────────────────────────────────────
  const notasFiltradas = notas.filter(n => {
    const matchSearch = !search ||
      n.numero.toLowerCase().includes(search.toLowerCase()) ||
      n.emitente.toLowerCase().includes(search.toLowerCase()) ||
      n.destinatario.toLowerCase().includes(search.toLowerCase());
    const matchTipo   = filtroTipo === "todos" || n.tipo === filtroTipo;
    const matchStatus = filtroStatus === "todos" || n.status === filtroStatus;
    return matchSearch && matchTipo && matchStatus;
  });

  // ── Upload de planilha ─────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      alert("Formato inválido. Aceito: .xlsx, .xls, .csv");
      return;
    }
    setPlanilhaNome(file.name);
    setPlanilhaCarregada(true);
    // TODO: parsear planilha e disparar comparação com endpoint NF
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ── Buscar NFs do endpoint ─────────────────────────────────────────────────
  const buscarNotas = async () => {
    setIsLoading(true);
    try {
      // TODO: substituir pela chamada real ao endpoint
      // const res = await fetch("/api/fiscal/notas");
      // const data = await res.json();
      // setNotas(data);
      await new Promise(r => setTimeout(r, 800)); // simula latência
      setNotas([]); // endpoint ainda não implementado
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col transition-all duration-300 min-h-[100dvh] xl:h-[100dvh] overflow-auto xl:overflow-hidden px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      <BackgroundEffects />

      <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto xl:overflow-hidden"
          style={{
            background: "var(--sgt-bg-section)",
            borderColor: "var(--sgt-border-subtle)",
            boxShadow: "var(--sgt-section-shadow)",
          }}
        >
          {/* Barra de progresso */}
          <div className="h-[3px] w-full overflow-hidden rounded-t-[24px] bg-transparent shrink-0">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)] transition-all duration-500 ease-out"
              style={{ width: isLoading ? "70%" : "0%", opacity: isLoading ? 1 : 0 }}
            />
          </div>

          <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 overflow-y-auto w-full">

            {/* ── NAVBAR ── */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              <div className="flex shrink-0 items-center gap-3">
                <HomeButton />
                <div className="h-6 w-px" style={{ background: "var(--sgt-divider)" }} />
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
                  <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">Fiscal</span>
                </div>
              </div>

              {/* Badge */}
              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">NF-e · NFS-e</span>
              </div>

              <div className="flex-1" />

              <UpdateButton onClick={buscarNotas} isFetching={isLoading} />
            </div>

            {/* ── MOBILE NAV ── */}
            <div className="flex sm:hidden items-center gap-2 py-1">
              <MobileNav />
              <span className="flex-1 text-[15px] font-black dark:text-white text-slate-800">Fiscal</span>
              <HomeButton />
            </div>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <AnimatedCard delay={0}>
                <KpiCard label="Total de NFs" value={total || "—"} sub="NF-e + NFS-e" color="slate" />
              </AnimatedCard>
              <AnimatedCard delay={60}>
                <KpiCard label="Conferidas" value={conferidas || "—"} sub={total ? `${((conferidas/total)*100).toFixed(0)}% do total` : "Aguardando dados"} color="emerald" />
              </AnimatedCard>
              <AnimatedCard delay={120}>
                <KpiCard label="Divergências" value={divergencias || "—"} sub={divergencias ? fmtBRL(totalValorDiv) : "Nenhuma encontrada"} color="amber" />
              </AnimatedCard>
              <AnimatedCard delay={180}>
                <KpiCard label="Não encontradas" value={naoEncontradas || "—"} sub="Constam na planilha, sem NF" color="rose" />
              </AnimatedCard>
            </div>

            {/* ── ÁREA PRINCIPAL ── */}
            <div className="flex flex-col xl:flex-row gap-2 flex-1 min-h-0">

              {/* ── COLUNA ESQUERDA — Upload + tabela ── */}
              <div className="flex flex-col flex-1 min-h-0 gap-2">

                {/* Upload de planilha */}
                <AnimatedCard delay={60} hover={false}>
                  <div
                    className="rounded-[16px] border p-4"
                    style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-amber-400" />
                        <span className="text-[13px] font-bold dark:text-white text-slate-800">Planilha de referência</span>
                      </div>
                      {planilhaCarregada && (
                        <button
                          onClick={() => { setPlanilhaCarregada(false); setPlanilhaNome(""); }}
                          className="text-[10px] text-slate-500 hover:text-rose-300 transition-colors"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    {planilhaCarregada ? (
                      <div
                        className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3"
                      >
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-emerald-300 truncate">{planilhaNome}</p>
                          <p className="text-[10px] text-slate-500">Planilha carregada — pronto para comparar</p>
                        </div>
                        <button
                          onClick={buscarNotas}
                          className="ml-auto shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-400/25 px-3 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25 transition-colors"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Comparar
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-8 px-4 cursor-pointer transition-all duration-200 ${
                          isDragging
                            ? "border-amber-400/60 bg-amber-400/5"
                            : "border-white/10 hover:border-amber-400/30 hover:bg-amber-400/[0.03]"
                        }`}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/20">
                          <Upload className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-[13px] font-semibold dark:text-slate-200 text-slate-700">
                            Arraste a planilha aqui
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            ou clique para selecionar · .xlsx, .xls, .csv
                          </p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          onChange={onFileChange}
                        />
                      </div>
                    )}
                  </div>
                </AnimatedCard>

                {/* Filtros + tabela */}
                <AnimatedCard delay={120} hover={false} className="flex-1 min-h-0">
                  <div
                    className="flex flex-col h-full rounded-[16px] border overflow-hidden"
                    style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
                  >
                    {/* Header tabela */}
                    <div
                      className="flex flex-wrap items-center gap-2 px-4 py-3 border-b shrink-0"
                      style={{ borderColor: "var(--sgt-divider)" }}
                    >
                      <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="text-[13px] font-bold dark:text-white text-slate-800">Notas Fiscais</span>

                      <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0 ml-2">
                        {/* Busca */}
                        <div className="relative flex items-center">
                          <Search className="absolute left-2.5 h-3 w-3 text-slate-500 pointer-events-none" />
                          <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar NF, emitente..."
                            className="h-7 rounded-lg pl-7 pr-3 text-[11px] bg-white/5 border border-white/10 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/40 w-[160px]"
                          />
                        </div>

                        {/* Filtro tipo */}
                        <div className="flex items-center gap-1">
                          {(["todos", "NF-e", "NFS-e"] as const).map(t => (
                            <button
                              key={t}
                              onClick={() => setFiltroTipo(t)}
                              className={`h-7 rounded-lg px-2.5 text-[10px] font-semibold transition-colors ${
                                filtroTipo === t
                                  ? "bg-amber-400/15 border border-amber-400/30 text-amber-300"
                                  : "text-slate-500 hover:text-slate-300 border border-transparent"
                              }`}
                            >
                              {t === "todos" ? "Todos" : t}
                            </button>
                          ))}
                        </div>

                        {/* Filtro status */}
                        <div className="flex items-center gap-1 ml-1">
                          <Filter className="h-3 w-3 text-slate-600" />
                          <select
                            value={filtroStatus}
                            onChange={e => setFiltroStatus(e.target.value as typeof filtroStatus)}
                            className="h-7 rounded-lg px-2 text-[10px] bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:border-amber-400/40"
                          >
                            <option value="todos">Todos status</option>
                            <option value="ok">Conferidas</option>
                            <option value="divergencia">Divergências</option>
                            <option value="nao_encontrada">Não encontradas</option>
                            <option value="pendente">Pendentes</option>
                          </select>
                        </div>
                      </div>

                      {notas.length > 0 && (
                        <button className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-300 transition-colors ml-auto">
                          <Download className="h-3 w-3" />
                          Exportar
                        </button>
                      )}
                    </div>

                    {/* Corpo da tabela */}
                    <div className="flex-1 overflow-y-auto">
                      {isLoading ? (
                        <div className="flex flex-col gap-1 p-3">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
                          ))}
                        </div>
                      ) : notasFiltradas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
                          {!planilhaCarregada ? (
                            <>
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/8 border border-amber-400/15">
                                <FileSpreadsheet className="h-6 w-6 text-amber-400/60" />
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold dark:text-slate-300 text-slate-600">Nenhuma planilha carregada</p>
                                <p className="text-[11px] text-slate-500 mt-1">Importe a planilha de referência para iniciar a comparação com as NFs</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-400/8 border border-slate-400/15">
                                <Search className="h-6 w-6 text-slate-500" />
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold dark:text-slate-300 text-slate-600">Nenhuma nota encontrada</p>
                                <p className="text-[11px] text-slate-500 mt-1">Verifique os filtros ou clique em Comparar</p>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Cabeçalho colunas */}
                          <div
                            className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600 border-b sticky top-0"
                            style={{ borderColor: "var(--sgt-divider)", background: "var(--sgt-bg-card)" }}
                          >
                            <span>Tipo</span>
                            <span>Emitente / Nº</span>
                            <span className="text-right">Valor</span>
                            <span>Emissão</span>
                            <span>Status</span>
                          </div>

                          {/* Linhas */}
                          {notasFiltradas.map(n => (
                            <div key={n.id}>
                              <button
                                type="button"
                                onClick={() => setExpandedRow(expandedRow === n.id ? null : n.id)}
                                className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 w-full px-4 py-3 text-left border-b hover:bg-white/[0.03] transition-colors"
                                style={{ borderColor: "var(--sgt-divider)" }}
                              >
                                <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 self-center ${
                                  n.tipo === "NF-e"
                                    ? "bg-amber-400/10 text-amber-300"
                                    : "bg-violet-400/10 text-violet-300"
                                }`}>{n.tipo}</span>

                                <div className="flex flex-col min-w-0">
                                  <span className="text-[12px] font-semibold dark:text-slate-200 text-slate-700 truncate">{n.emitente}</span>
                                  <span className="text-[10px] text-slate-500">Nº {n.numero}</span>
                                </div>

                                <span className="text-[12px] font-bold tabular-nums dark:text-slate-200 text-slate-700 self-center text-right">{fmtBRL(n.valor)}</span>
                                <span className="text-[11px] text-slate-500 self-center">{fmtData(n.dataEmissao)}</span>
                                <div className="self-center flex items-center gap-1">
                                  <StatusBadge status={n.status} divergencia={n.divergencia} />
                                  {expandedRow === n.id
                                    ? <ChevronUp className="h-3 w-3 text-slate-600" />
                                    : <ChevronDown className="h-3 w-3 text-slate-600" />
                                  }
                                </div>
                              </button>

                              {/* Linha expandida */}
                              {expandedRow === n.id && (
                                <div
                                  className="px-4 py-3 border-b"
                                  style={{ borderColor: "var(--sgt-divider)", background: "var(--sgt-row-hover)" }}
                                >
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                                    <div>
                                      <p className="text-slate-500 mb-0.5">Destinatário</p>
                                      <p className="font-semibold dark:text-slate-300 text-slate-600">{n.destinatario || "—"}</p>
                                    </div>
                                    {n.chave && (
                                      <div className="col-span-2">
                                        <p className="text-slate-500 mb-0.5">Chave de acesso</p>
                                        <p className="font-mono text-[9px] dark:text-slate-400 text-slate-500 break-all">{n.chave}</p>
                                      </div>
                                    )}
                                    {n.divergencia && (
                                      <div>
                                        <p className="text-slate-500 mb-0.5">Divergência</p>
                                        <p className="font-semibold text-amber-300">{n.divergencia}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </AnimatedCard>
              </div>

              {/* ── COLUNA DIREITA — Resumo ── */}
              <div className="w-full xl:w-[280px] shrink-0 flex flex-col gap-2">
                <AnimatedCard delay={80} hover={false}>
                  <div
                    className="rounded-[16px] border p-4"
                    style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Resumo da comparação</p>

                    <div className="flex flex-col gap-2">
                      {[
                        { label: "Conferidas",      value: conferidas,     total, color: "bg-emerald-400",  pctColor: "text-emerald-300" },
                        { label: "Divergências",     value: divergencias,   total, color: "bg-amber-400",    pctColor: "text-amber-300"   },
                        { label: "Não encontradas",  value: naoEncontradas, total, color: "bg-rose-400",     pctColor: "text-rose-300"    },
                        { label: "Pendentes",        value: total - conferidas - divergencias - naoEncontradas, total, color: "bg-slate-500", pctColor: "text-slate-400" },
                      ].map(row => {
                        const pct = total > 0 ? (row.value / row.total) * 100 : 0;
                        return (
                          <div key={row.label}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] text-slate-400">{row.label}</span>
                              <span className={`text-[11px] font-bold tabular-nums ${row.pctColor}`}>
                                {row.value} <span className="text-slate-600 font-normal">({pct.toFixed(0)}%)</span>
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--sgt-progress-track)" }}>
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${row.color}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </AnimatedCard>

                {/* Totais financeiros */}
                <AnimatedCard delay={140} hover={false}>
                  <div
                    className="rounded-[16px] border p-4"
                    style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Totais financeiros</p>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">Valor conferido</span>
                        <span className="text-[12px] font-bold text-emerald-300 tabular-nums">{total ? fmtBRL(totalValorOK) : "—"}</span>
                      </div>
                      <div className="h-px" style={{ background: "var(--sgt-divider)" }} />
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">Valor em divergência</span>
                        <span className="text-[12px] font-bold text-amber-300 tabular-nums">{total ? fmtBRL(totalValorDiv) : "—"}</span>
                      </div>
                    </div>
                  </div>
                </AnimatedCard>

                {/* Instrução / próximos passos */}
                <AnimatedCard delay={200} hover={false}>
                  <div
                    className="rounded-[16px] border border-amber-400/15 p-4"
                    style={{ background: "rgba(251,191,36,0.03)" }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400/70 mb-2">Como usar</p>
                    <ol className="flex flex-col gap-2">
                      {[
                        "Importe a planilha de referência (.xlsx / .csv)",
                        "Clique em Comparar para buscar as NF-e e NFS-e",
                        "Revise as divergências na tabela",
                        "Exporte o relatório para o contador",
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-[9px] font-bold text-amber-400 mt-0.5">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </AnimatedCard>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
