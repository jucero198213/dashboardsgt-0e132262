import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, AlertTriangle, XCircle, Search, FileText,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Download, EyeOff,
} from "lucide-react";
import { HomeButton } from "@/components/shared/HomeButton";
import { KpiCard } from "@/components/indicators/KpiCard";
import { MobileNav } from "@/components/shared/MobileNav";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { UpdateButton } from "@/components/shared/UpdateButton";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  fetchConsultaNfe, fetchConsultaNfeTendencia, clearDwCache,
  type ConsultaNfeRow, type TendenciaNfeRow,
} from "@/lib/dwApi";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusNota = "OK" | "DIVERGENTE" | "NAO_LANCADA";

// ─── Utilitários ──────────────────────────────────────────────────────────────

const fmtBRL = (v: number | null | undefined) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const fmtData = (d: string | null | undefined) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-BR");
};

// Marcações pra os filtros
const isEntrada        = (n: ConsultaNfeRow) => String(n.TPNF) === "0";
const isDesconsiderado = (n: ConsultaNfeRow) => n.DESCONSIDERADO === 1;

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mesLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return `${MESES_ABREV[Number(mm) - 1] ?? mm}/${(y ?? "").slice(2)}`;
};

const hoje = new Date();
const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  .toISOString().slice(0, 10);
const hojeISO = hoje.toISOString().slice(0, 10);

function StatusBadge({ status }: { status: StatusNota }) {
  const cfg = {
    OK:          { icon: CheckCircle2,  label: "Lançada",     cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
    DIVERGENTE:  { icon: AlertTriangle, label: "Divergente",  cls: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
    NAO_LANCADA: { icon: XCircle,       label: "Não lançada", cls: "text-rose-300 bg-rose-400/10 border-rose-400/20" },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Fiscal() {
  const [notas, setNotas]     = useState<ConsultaNfeRow[]>([]);
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes);
  const [dataFim, setDataFim]       = useState(hojeISO);
  const [search, setSearch]         = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusNota>("todos");
  const [ocultarEntrada, setOcultarEntrada] = useState(false);
  const [ocultarDesconsiderados, setOcultarDesconsiderados] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [erro, setErro]             = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [jaBuscou, setJaBuscou]     = useState(false);
  const [tendencia, setTendencia]   = useState<TendenciaNfeRow[]>([]);
  const [pagina, setPagina]         = useState(1);

  // ── Busca no endpoint ──────────────────────────────────────────────────────
  const buscarNotas = useCallback(async (forcar = false) => {
    setIsLoading(true);
    setErro(null);
    try {
      if (forcar) clearDwCache("consulta-nfe");
      const res = await fetchConsultaNfe({ dataInicio, dataFim, limite: 5000 });
      setNotas(res.data ?? []);
      setJaBuscou(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao buscar notas");
      setNotas([]);
    } finally {
      setIsLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => { buscarNotas(); }, [buscarNotas]);

  useEffect(() => {
    fetchConsultaNfeTendencia({ meses: 6 })
      .then(r => setTendencia(r.data ?? []))
      .catch(() => setTendencia([]));
  }, []);

  // ── Toggles: tudo aparece; usuário remove categorias por preferência ────────
  const qtdEntrada        = notas.filter(isEntrada).length;
  const qtdDesconsiderado = notas.filter(isDesconsiderado).length;

  const notasBase = notas.filter(n =>
    !(ocultarEntrada && isEntrada(n)) &&
    !(ocultarDesconsiderados && isDesconsiderado(n))
  );

  // ── KPIs (refletem os toggles) ──────────────────────────────────────────────
  const total        = notasBase.length;
  const lancadas      = notasBase.filter(n => n.SITUACAO === "OK").length;
  const naoLancadas   = notasBase.filter(n => n.SITUACAO === "NAO_LANCADA").length;
  const divergentes   = notasBase.filter(n => n.SITUACAO === "DIVERGENTE").length;

  const valorNaoLancado = notasBase
    .filter(n => n.SITUACAO === "NAO_LANCADA")
    .reduce((s, n) => s + Number(n.VALOR_NOTA ?? 0), 0);
  const valorDivergente = notasBase
    .filter(n => n.SITUACAO === "DIVERGENTE")
    .reduce((s, n) => s + Number(n.VALOR_NOTA ?? 0), 0);

  // ── Busca + status ──────────────────────────────────────────────────────────
  const notasFiltradas = notasBase.filter(n => {
    const matchSearch = !search ||
      (n.NUMERO_NOTA ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (n.RAZAO_SOCIAL ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (n.CNPJ ?? "").includes(search);
    const matchStatus = filtroStatus === "todos" || n.SITUACAO === filtroStatus;
    return matchSearch && matchStatus;
  });

  // ── Paginação (client-side) ──────────────────────────────────────────────────
  const POR_PAGINA   = 50;
  const totalPaginas = Math.max(1, Math.ceil(notasFiltradas.length / POR_PAGINA));
  const paginaAtual  = Math.min(pagina, totalPaginas);
  const notasPagina  = notasFiltradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  // Qualquer mudança de filtro/busca/período volta pra página 1
  useEffect(() => { setPagina(1); }, [search, filtroStatus, ocultarEntrada, ocultarDesconsiderados, dataInicio, dataFim]);

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const exportarCsv = () => {
    const header = "situacao;fornecedor;cnpj;numero_nota;serie;valor_nota;valor_lancado;origem;data_emissao;chave";
    const linhas = notasFiltradas.map(n => [
      n.SITUACAO,
      `"${(n.RAZAO_SOCIAL ?? "").replace(/"/g, "'")}"`,
      n.CNPJ ?? "",
      n.NUMERO_NOTA ?? "",
      n.SERIE_NOTA ?? "",
      String(n.VALOR_NOTA ?? "").replace(".", ","),
      String(n.VALOR_LANCADO ?? "").replace(".", ","),
      n.ORIGEM ?? "",
      fmtData(n.DATA_EMISSAO),
      n.CHAVE ?? "",
    ].join(";"));
    const blob = new Blob(["﻿" + [header, ...linhas].join("\n")], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `conferencia_nfe_${dataInicio}_${dataFim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chipCls = (ativo: boolean) =>
    `inline-flex items-center gap-1.5 h-7 rounded-lg px-2.5 text-[10px] font-semibold transition-colors border ${
      ativo
        ? "bg-amber-400/15 border-amber-400/30 text-amber-300"
        : "border-white/10 text-slate-400 hover:text-slate-200"
    }`;

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

          <div className="relative flex flex-col flex-1 min-h-0 gap-3 p-2 sm:p-3 lg:p-4 overflow-y-auto w-full">

            {/* ── NAVBAR ── */}
            <div className="hidden sm:flex items-center gap-3 py-1">
              <div className="flex shrink-0 items-center gap-3">
                <HomeButton />
                <div className="h-6 w-px" style={{ background: "var(--sgt-divider)" }} />
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
                  <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">Fiscal</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-2">
                <DatePickerInput value={dataInicio} onChange={setDataInicio} />
                <span className="text-[10px] text-slate-600">até</span>
                <DatePickerInput value={dataFim} onChange={setDataFim} />
              </div>

              <div className="flex-1" />
              <UpdateButton onClick={() => buscarNotas(true)} isFetching={isLoading} />
            </div>

            {/* ── MOBILE NAV ── */}
            <div className="flex sm:hidden items-center gap-2 py-1">
              <MobileNav />
              <span className="flex-1 text-[15px] font-black dark:text-white text-slate-800">Fiscal</span>
              <HomeButton />
            </div>
            <div className="flex sm:hidden items-center gap-1.5">
              <DatePickerInput value={dataInicio} onChange={setDataInicio} />
              <span className="text-[10px] text-slate-600">até</span>
              <DatePickerInput value={dataFim} onChange={setDataFim} />
            </div>

            {/* ── Erro ── */}
            {erro && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-2.5">
                <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <p className="text-[12px] text-rose-300">{erro}</p>
              </div>
            )}

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <AnimatedCard delay={0}>
                <KpiCard label="Total de notas" value={String(total || "—")} subtitle="Emitidas contra o CNPJ" icon={FileText} tone="cyan" />
              </AnimatedCard>
              <AnimatedCard delay={60}>
                <KpiCard label="Lançadas" value={String(lancadas || "—")} subtitle={total ? `${((lancadas / total) * 100).toFixed(0)}% do total` : "—"} icon={CheckCircle2} tone="emerald" />
              </AnimatedCard>
              <AnimatedCard delay={120}>
                <KpiCard label="Não lançadas" value={String(naoLancadas || "—")} subtitle={naoLancadas ? fmtBRL(valorNaoLancado) : "Tudo lançado"} icon={XCircle} tone="rose" />
              </AnimatedCard>
              <AnimatedCard delay={180}>
                <KpiCard label="Com divergência" value={String(divergentes || "—")} subtitle={divergentes ? fmtBRL(valorDivergente) : "Nenhuma"} icon={AlertTriangle} tone="amber" />
              </AnimatedCard>
            </div>

            {/* ── TENDÊNCIA ── */}
            {tendencia.length > 1 && (
              <AnimatedCard delay={210} hover={false}>
                <div
                  className="rounded-[16px] border p-3 sm:p-4"
                  style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Não lançadas por mês</span>
                    <span className="text-[10px] text-slate-600">· últimos {tendencia.length} meses (sem entrada/desconsiderados)</span>
                  </div>
                  <div style={{ height: 132 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={tendencia.map(t => ({ ...t, label: mesLabel(t.mes) }))}
                        margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                        barSize={24}
                      >
                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "#151922", border: "1px solid #23262d", borderRadius: 8, fontSize: 11 }}
                          labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
                          itemStyle={{ color: "#cbd5e1" }}
                          cursor={{ fill: "rgba(255,255,255,0.03)" }}
                          formatter={(v: number, n: string) => [v, n === "nao_lancadas" ? "Não lançadas" : "Lançadas"]}
                        />
                        <Bar dataKey="lancadas"     name="lancadas"     stackId="a" fill="#10b981" opacity={0.22} />
                        <Bar dataKey="nao_lancadas" name="nao_lancadas" stackId="a" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </AnimatedCard>
            )}

            {/* ── TABELA ── */}
            <AnimatedCard delay={220} hover={false} className="flex-1 min-h-0">
              <div
                className="flex flex-col h-full rounded-[16px] border overflow-hidden"
                style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
              >
                {/* Header tabela */}
                <div
                  className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2.5 border-b shrink-0"
                  style={{ borderColor: "var(--sgt-divider)" }}
                >
                  {/* Busca */}
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 h-3 w-3 text-slate-500 pointer-events-none" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar nota, fornecedor, CNPJ..."
                      className="h-7 rounded-lg pl-7 pr-3 text-[11px] bg-white/5 border border-white/10 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/40 w-[190px]"
                    />
                  </div>

                  {/* Filtro status */}
                  <select
                    value={filtroStatus}
                    onChange={e => setFiltroStatus(e.target.value as typeof filtroStatus)}
                    className="h-7 rounded-lg px-2 text-[10px] bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:border-amber-400/40"
                  >
                    <option value="todos">Todos status</option>
                    <option value="OK">Lançadas</option>
                    <option value="NAO_LANCADA">Não lançadas</option>
                    <option value="DIVERGENTE">Divergentes</option>
                  </select>

                  {/* Toggles de filtro */}
                  {qtdEntrada > 0 && (
                    <button onClick={() => setOcultarEntrada(v => !v)} className={chipCls(ocultarEntrada)}>
                      <EyeOff className="h-3 w-3" />
                      {ocultarEntrada ? "Entrada oculta" : "Ocultar entrada"} ({qtdEntrada})
                    </button>
                  )}
                  {qtdDesconsiderado > 0 && (
                    <button onClick={() => setOcultarDesconsiderados(v => !v)} className={chipCls(ocultarDesconsiderados)}>
                      <EyeOff className="h-3 w-3" />
                      {ocultarDesconsiderados ? "Desconsid. ocultos" : "Ocultar desconsiderados"} ({qtdDesconsiderado})
                    </button>
                  )}

                  <div className="flex-1" />

                  <span className="text-[10px] text-slate-500">{notasFiltradas.length} nota(s)</span>
                  {notas.length > 0 && (
                    <button onClick={exportarCsv} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-300 transition-colors">
                      <Download className="h-3 w-3" />
                      CSV
                    </button>
                  )}
                </div>

                {/* Corpo da tabela */}
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex flex-col gap-1 p-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
                      ))}
                    </div>
                  ) : notasFiltradas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/8 border border-amber-400/15">
                        <Search className="h-6 w-6 text-amber-400/60" />
                      </div>
                      <p className="text-[13px] font-semibold dark:text-slate-300 text-slate-600">
                        {jaBuscou ? "Nenhuma nota no filtro atual" : "Carregando a conferência..."}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Cabeçalho colunas */}
                      <div
                        className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 sm:px-4 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600 border-b sticky top-0 z-10"
                        style={{ borderColor: "var(--sgt-divider)", background: "var(--sgt-bg-card)" }}
                      >
                        <span>Fornecedor / Nº</span>
                        <span className="text-right">Valor</span>
                        <span className="hidden sm:block">Emissão</span>
                        <span>Status</span>
                      </div>

                      {/* Linhas (página atual) */}
                      {notasPagina.map(n => {
                        const rowId = n.CHAVE ?? `${n.CNPJ}-${n.NUMERO_NOTA}`;
                        return (
                          <div key={rowId}>
                            <button
                              type="button"
                              onClick={() => setExpandedRow(expandedRow === rowId ? null : rowId)}
                              className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 w-full px-3 sm:px-4 py-2.5 text-left border-b hover:bg-white/[0.03] transition-colors"
                              style={{ borderColor: "var(--sgt-divider)" }}
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="text-[12px] font-semibold dark:text-slate-200 text-slate-700 truncate">{n.RAZAO_SOCIAL ?? "—"}</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                  Nº {n.NUMERO_NOTA ?? "—"} · Série {n.SERIE_NOTA ?? "—"}
                                  {isEntrada(n) && <span className="rounded px-1 py-0.5 text-[8px] font-bold bg-slate-400/15 text-slate-400">ENTRADA</span>}
                                  {isDesconsiderado(n) && <span className="rounded px-1 py-0.5 text-[8px] font-bold bg-purple-400/15 text-purple-300">DESCONSID.</span>}
                                  {n.SITUACAO === "NAO_LANCADA" && n.DIAS_PARADA != null && Number(n.DIAS_PARADA) > 0 && (
                                    <span className={`rounded px-1 py-0.5 text-[8px] font-bold ${
                                      Number(n.DIAS_PARADA) > 15
                                        ? "bg-rose-400/15 text-rose-300"
                                        : "bg-amber-400/10 text-amber-300/80"
                                    }`}>
                                      PARADA HÁ {n.DIAS_PARADA}D
                                    </span>
                                  )}
                                </span>
                              </div>

                              <span className="text-[12px] font-bold tabular-nums dark:text-slate-200 text-slate-700 self-center text-right">
                                {fmtBRL(n.VALOR_NOTA)}
                              </span>

                              <span className="text-[11px] text-slate-500 self-center hidden sm:block">{fmtData(n.DATA_EMISSAO)}</span>

                              <div className="self-center flex items-center gap-1">
                                <StatusBadge status={n.SITUACAO} />
                                {expandedRow === rowId
                                  ? <ChevronUp className="h-3 w-3 text-slate-600" />
                                  : <ChevronDown className="h-3 w-3 text-slate-600" />
                                }
                              </div>
                            </button>

                            {/* Linha expandida */}
                            {expandedRow === rowId && (
                              <div
                                className="px-3 sm:px-4 py-3 border-b"
                                style={{ borderColor: "var(--sgt-divider)", background: "var(--sgt-row-hover)" }}
                              >
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                                  <div>
                                    <p className="text-slate-500 mb-0.5">CNPJ</p>
                                    <p className="font-mono text-[10px] dark:text-slate-300 text-slate-600">{n.CNPJ ?? "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 mb-0.5">Lançada como</p>
                                    <p className="font-semibold dark:text-slate-300 text-slate-600">
                                      {n.ORIGEM === "COMPRA" ? "Compra" : n.ORIGEM === "CONTAS_PAGAR" ? "Contas a pagar" : "—"}
                                    </p>
                                  </div>
                                  {n.SITUACAO !== "NAO_LANCADA" && n.USUARIO_LANCAMENTO && (
                                    <div>
                                      <p className="text-slate-500 mb-0.5">Lançada por</p>
                                      <p className="font-semibold dark:text-slate-300 text-slate-600">
                                        {n.USUARIO_LANCAMENTO} · {fmtData(n.DATA_LANCAMENTO)}
                                      </p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-slate-500 mb-0.5">Valor lançado</p>
                                    <p className={`font-semibold tabular-nums ${n.SITUACAO === "DIVERGENTE" ? "text-amber-300" : "dark:text-slate-300 text-slate-600"}`}>
                                      {fmtBRL(n.VALOR_LANCADO)}
                                    </p>
                                  </div>
                                  {n.SITUACAO === "DIVERGENTE" && (
                                    <div>
                                      <p className="text-slate-500 mb-0.5">Diferença</p>
                                      <p className="font-semibold text-amber-300 tabular-nums">
                                        {fmtBRL(Number(n.VALOR_NOTA ?? 0) - Number(n.VALOR_LANCADO ?? 0))}
                                      </p>
                                    </div>
                                  )}
                                  {n.CHAVE && (
                                    <div className="col-span-2 sm:col-span-4">
                                      <p className="text-slate-500 mb-0.5">Chave de acesso</p>
                                      <p className="font-mono text-[9px] dark:text-slate-400 text-slate-500 break-all">{n.CHAVE}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Rodapé — paginação */}
                {notasFiltradas.length > POR_PAGINA && (
                  <div
                    className="flex items-center justify-between px-3 sm:px-4 py-2 border-t shrink-0"
                    style={{ borderColor: "var(--sgt-divider)" }}
                  >
                    <span className="text-[10px] text-slate-500 tabular-nums">
                      {(paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, notasFiltradas.length)} de {notasFiltradas.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPagina(p => Math.max(1, p - 1))}
                        disabled={paginaAtual === 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:text-slate-200 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-[10px] text-slate-400 tabular-nums px-1">
                        pág. {paginaAtual}/{totalPaginas}
                      </span>
                      <button
                        onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                        disabled={paginaAtual === totalPaginas}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:text-slate-200 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedCard>
          </div>
        </section>
      </div>
    </div>
  );
}
