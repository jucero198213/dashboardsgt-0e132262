import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, AlertTriangle, XCircle, Search, FileText,
  ChevronDown, ChevronUp, Filter, Download, ShieldCheck,
} from "lucide-react";
import { HomeButton } from "@/components/shared/HomeButton";
import { KpiCard } from "@/components/indicators/KpiCard";
import { MobileNav } from "@/components/shared/MobileNav";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { UpdateButton } from "@/components/shared/UpdateButton";
import {
  fetchConsultaNfe, clearDwCache,
  type ConsultaNfeRow, type ConsultaNfeResumo,
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

const hoje = new Date();
const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  .toISOString().slice(0, 10);
const hojeISO = hoje.toISOString().slice(0, 10);

function StatusBadge({ status }: { status: StatusNota }) {
  const cfg = {
    OK:          { icon: CheckCircle2,  label: "Conferida",   cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
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

function OrigemBadge({ origem }: { origem: ConsultaNfeRow["ORIGEM"] }) {
  if (!origem) return null;
  const label = origem === "COMPRA" ? "Compra" : "Contas a pagar";
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold bg-sky-400/10 text-sky-300">
      {label}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Fiscal() {
  const [notas, setNotas]     = useState<ConsultaNfeRow[]>([]);
  const [resumo, setResumo]   = useState<ConsultaNfeResumo | null>(null);
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes);
  const [dataFim, setDataFim]       = useState(hojeISO);
  const [search, setSearch]         = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusNota>("todos");
  const [isLoading, setIsLoading]   = useState(false);
  const [erro, setErro]             = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [jaBuscou, setJaBuscou]     = useState(false);

  // ── Busca no endpoint /dw-consulta-nfe ─────────────────────────────────────
  const buscarNotas = useCallback(async (forcarAtualizacao = false) => {
    setIsLoading(true);
    setErro(null);
    try {
      if (forcarAtualizacao) clearDwCache("consulta-nfe");
      const res = await fetchConsultaNfe({ dataInicio, dataFim, limite: 5000 });
      setNotas(res.data ?? []);
      setResumo(res.resumo ?? null);
      setJaBuscou(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao buscar notas");
      setNotas([]);
      setResumo(null);
    } finally {
      setIsLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => { buscarNotas(); }, [buscarNotas]);

  // ── Métricas derivadas ─────────────────────────────────────────────────────
  const total        = resumo?.total ?? notas.length;
  const conferidas   = resumo?.ok ?? 0;
  const divergencias = resumo?.divergentes ?? 0;
  const naoLancadas  = resumo?.nao_lancadas ?? 0;

  const valorNaoLancado = notas
    .filter(n => n.SITUACAO === "NAO_LANCADA")
    .reduce((s, n) => s + Number(n.VALOR_NOTA ?? 0), 0);
  const valorDivergente = notas
    .filter(n => n.SITUACAO === "DIVERGENTE")
    .reduce((s, n) => s + Number(n.VALOR_NOTA ?? 0), 0);

  // ── Filtro + busca ─────────────────────────────────────────────────────────
  const notasFiltradas = notas.filter(n => {
    const matchSearch = !search ||
      (n.NUMERO_NOTA ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (n.RAZAO_SOCIAL ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (n.CNPJ ?? "").includes(search);
    const matchStatus = filtroStatus === "todos" || n.SITUACAO === filtroStatus;
    return matchSearch && matchStatus;
  });

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
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">SEFAZ × Sistema</span>
              </div>

              {/* Filtro de período */}
              <div className="flex items-center gap-1.5 ml-2">
                <input
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  className="h-7 rounded-lg px-2 text-[11px] bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:border-amber-400/40"
                />
                <span className="text-[10px] text-slate-600">até</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  className="h-7 rounded-lg px-2 text-[11px] bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:border-amber-400/40"
                />
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

            {/* ── Período (mobile) ── */}
            <div className="flex sm:hidden items-center gap-1.5">
              <input
                type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="h-8 flex-1 rounded-lg px-2 text-[11px] bg-white/5 border border-white/10 text-slate-300 focus:outline-none"
              />
              <span className="text-[10px] text-slate-600">até</span>
              <input
                type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="h-8 flex-1 rounded-lg px-2 text-[11px] bg-white/5 border border-white/10 text-slate-300 focus:outline-none"
              />
            </div>

            {/* ── Erro ── */}
            {erro && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-2.5">
                <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <p className="text-[12px] text-rose-300">{erro}</p>
              </div>
            )}

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <AnimatedCard delay={0}>
                <KpiCard label="Notas contra o CNPJ" value={String(total || "—")} subtitle="Registradas na SEFAZ" icon={FileText} tone="cyan" />
              </AnimatedCard>
              <AnimatedCard delay={60}>
                <KpiCard label="Conferidas" value={String(conferidas || "—")} subtitle={total ? `${((conferidas / total) * 100).toFixed(0)}% lançadas e batendo` : "Aguardando dados"} icon={CheckCircle2} tone="emerald" />
              </AnimatedCard>
              <AnimatedCard delay={120}>
                <KpiCard label="Divergências" value={String(divergencias || "—")} subtitle={divergencias ? `${fmtBRL(valorDivergente)} em notas` : "Nenhuma encontrada"} icon={AlertTriangle} tone="amber" />
              </AnimatedCard>
              <AnimatedCard delay={180}>
                <KpiCard label="Não lançadas" value={String(naoLancadas || "—")} subtitle={naoLancadas ? `${fmtBRL(valorNaoLancado)} sem lançamento` : "Tudo lançado"} icon={XCircle} tone="rose" />
              </AnimatedCard>
            </div>

            {/* ── ÁREA PRINCIPAL ── */}
            <div className="flex flex-col xl:flex-row gap-2 flex-1 min-h-0">

              {/* ── COLUNA ESQUERDA — tabela ── */}
              <div className="flex flex-col flex-1 min-h-0 gap-2">
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
                      <span className="text-[13px] font-bold dark:text-white text-slate-800">Conferência de Notas</span>

                      <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0 ml-2">
                        {/* Busca */}
                        <div className="relative flex items-center">
                          <Search className="absolute left-2.5 h-3 w-3 text-slate-500 pointer-events-none" />
                          <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar NF, fornecedor, CNPJ..."
                            className="h-7 rounded-lg pl-7 pr-3 text-[11px] bg-white/5 border border-white/10 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/40 w-[180px]"
                          />
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
                            <option value="OK">Conferidas</option>
                            <option value="DIVERGENTE">Divergentes</option>
                            <option value="NAO_LANCADA">Não lançadas</option>
                          </select>
                        </div>
                      </div>

                      {notas.length > 0 && (
                        <button
                          onClick={exportarCsv}
                          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-300 transition-colors ml-auto"
                        >
                          <Download className="h-3 w-3" />
                          Exportar CSV
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
                        <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/8 border border-amber-400/15">
                            <Search className="h-6 w-6 text-amber-400/60" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold dark:text-slate-300 text-slate-600">
                              {jaBuscou ? "Nenhuma nota no filtro atual" : "Escolha o período e aguarde a conferência"}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {jaBuscou ? "Ajuste a busca, o status ou o período" : "As notas da SEFAZ serão cruzadas com o sistema automaticamente"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Cabeçalho colunas */}
                          <div
                            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600 border-b sticky top-0 z-10"
                            style={{ borderColor: "var(--sgt-divider)", background: "var(--sgt-bg-card)" }}
                          >
                            <span>Fornecedor / Nº</span>
                            <span className="text-right">Valor nota</span>
                            <span className="text-right hidden md:block">Valor lançado</span>
                            <span className="hidden sm:block">Emissão</span>
                            <span>Status</span>
                          </div>

                          {/* Linhas */}
                          {notasFiltradas.map(n => {
                            const rowId = n.CHAVE ?? `${n.CNPJ}-${n.NUMERO_NOTA}`;
                            return (
                              <div key={rowId}>
                                <button
                                  type="button"
                                  onClick={() => setExpandedRow(expandedRow === rowId ? null : rowId)}
                                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 w-full px-4 py-3 text-left border-b hover:bg-white/[0.03] transition-colors"
                                  style={{ borderColor: "var(--sgt-divider)" }}
                                >
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[12px] font-semibold dark:text-slate-200 text-slate-700 truncate">{n.RAZAO_SOCIAL ?? "—"}</span>
                                    <span className="text-[10px] text-slate-500">Nº {n.NUMERO_NOTA ?? "—"} · Série {n.SERIE_NOTA ?? "—"}</span>
                                  </div>

                                  <span className="text-[12px] font-bold tabular-nums dark:text-slate-200 text-slate-700 self-center text-right">
                                    {fmtBRL(n.VALOR_NOTA)}
                                  </span>

                                  <span className={`text-[12px] font-bold tabular-nums self-center text-right hidden md:block ${
                                    n.SITUACAO === "DIVERGENTE" ? "text-amber-300" : "dark:text-slate-400 text-slate-500"
                                  }`}>
                                    {fmtBRL(n.VALOR_LANCADO)}
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
                                    className="px-4 py-3 border-b"
                                    style={{ borderColor: "var(--sgt-divider)", background: "var(--sgt-row-hover)" }}
                                  >
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                                      <div>
                                        <p className="text-slate-500 mb-0.5">CNPJ do fornecedor</p>
                                        <p className="font-mono text-[10px] dark:text-slate-300 text-slate-600">{n.CNPJ ?? "—"}</p>
                                      </div>
                                      <div>
                                        <p className="text-slate-500 mb-0.5">Lançada como</p>
                                        <p className="font-semibold dark:text-slate-300 text-slate-600">
                                          {n.ORIGEM ? <OrigemBadge origem={n.ORIGEM} /> : "—"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-slate-500 mb-0.5">Filial · Recebida em</p>
                                        <p className="font-semibold dark:text-slate-300 text-slate-600">
                                          {n.FILIAL ?? "—"} · {fmtData(n.DATA_RECEBIMENTO)}
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
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Resumo da conferência</p>

                    <div className="flex flex-col gap-2">
                      {[
                        { label: "Conferidas",   value: conferidas,   color: "bg-emerald-400", pctColor: "text-emerald-300" },
                        { label: "Divergências", value: divergencias, color: "bg-amber-400",   pctColor: "text-amber-300"   },
                        { label: "Não lançadas", value: naoLancadas,  color: "bg-rose-400",    pctColor: "text-rose-300"    },
                      ].map(row => {
                        const pct = total > 0 ? (row.value / total) * 100 : 0;
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
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Valores em risco</p>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">Não lançado</span>
                        <span className="text-[12px] font-bold text-rose-300 tabular-nums">{total ? fmtBRL(valorNaoLancado) : "—"}</span>
                      </div>
                      <div className="h-px" style={{ background: "var(--sgt-divider)" }} />
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">Em divergência</span>
                        <span className="text-[12px] font-bold text-amber-300 tabular-nums">{total ? fmtBRL(valorDivergente) : "—"}</span>
                      </div>
                    </div>
                  </div>
                </AnimatedCard>

                {/* Origem dos lançamentos */}
                {resumo && (
                  <AnimatedCard delay={170} hover={false}>
                    <div
                      className="rounded-[16px] border p-4"
                      style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Origem dos lançamentos</p>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-slate-400">Compras (estoque)</span>
                          <span className="text-[12px] font-bold text-sky-300 tabular-nums">{resumo.por_origem.compra}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-slate-400">Contas a pagar</span>
                          <span className="text-[12px] font-bold text-sky-300 tabular-nums">{resumo.por_origem.contas_pagar}</span>
                        </div>
                      </div>
                    </div>
                  </AnimatedCard>
                )}

                {/* Como funciona */}
                <AnimatedCard delay={200} hover={false}>
                  <div
                    className="rounded-[16px] border border-amber-400/15 p-4"
                    style={{ background: "rgba(251,191,36,0.03)" }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-400/70" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400/70">Como funciona</p>
                    </div>
                    <ol className="flex flex-col gap-2">
                      {[
                        "Busca na SEFAZ todas as NF-e emitidas contra o CNPJ da SGT no período",
                        "Cruza com os lançamentos do sistema (compras e contas a pagar)",
                        "Aponta o que não foi lançado e o que foi lançado com valor diferente",
                        "Exporte o CSV para tratar as pendências",
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
