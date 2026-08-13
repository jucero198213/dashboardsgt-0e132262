import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CheckCircle2, AlertTriangle, XCircle, Search, FileText,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Download, EyeOff,
  TrendingUp, Building2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip as ReTooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { HomeButton } from "@/components/shared/HomeButton";
import { KpiCard } from "@/components/indicators/KpiCard";
import { MobileNav } from "@/components/shared/MobileNav";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { UpdateButton } from "@/components/shared/UpdateButton";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { RAW } from "@/lib/theme";
import {
  fetchConsultaNfe, fetchConsultaNfeTendencia, fetchDanfe, clearDwCache,
  type ConsultaNfeRow, type TendenciaNfeRow,
} from "@/lib/dwApi";
import { GooeyInput } from "@/components/ui/gooey-input";

// ─── Tipos / helpers ──────────────────────────────────────────────────────────

type StatusNota = "OK" | "DIVERGENTE" | "NAO_LANCADA";

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(2).replace(".", ",")}M`
    : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(1).replace(".", ",")}k`
      : fmtBRL(v);

const fmtData = (d: string | null | undefined) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-BR");
};

const isEntrada        = (n: ConsultaNfeRow) => String(n.TPNF) === "0";
const isDesconsiderado = (n: ConsultaNfeRow) => n.DESCONSIDERADO === 1;

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mesLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return `${MESES_ABREV[Number(mm) - 1] ?? mm}/${(y ?? "").slice(2)}`;
};

const hoje = new Date();
const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
const hojeISO = hoje.toISOString().slice(0, 10);

const COR = { ok: RAW.accent.emerald, nao: RAW.accent.rose, div: RAW.accent.amber, total: RAW.accent.cyan };

const tooltipStyle = {
  contentStyle: { background: "#0b0e1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#e5e7eb", fontWeight: 600 },
  itemStyle: { color: "#cbd5e1" },
  cursor: { fill: "rgba(255,255,255,0.03)" },
};

function StatusBadge({ status }: { status: StatusNota }) {
  const cfg = {
    OK:          { icon: CheckCircle2,  label: "Lançada",     cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
    DIVERGENTE:  { icon: AlertTriangle, label: "Divergente",  cls: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
    NAO_LANCADA: { icon: XCircle,       label: "Não lançada", cls: "text-rose-300 bg-rose-400/10 border-rose-400/20" },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      <Icon className="h-2.5 w-2.5" />{cfg.label}
    </span>
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Fiscal() {
  const [notas, setNotas]           = useState<ConsultaNfeRow[]>([]);
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
  const [danfeLoading, setDanfeLoading] = useState<string | null>(null);
  const [danfeErro, setDanfeErro]   = useState<Record<string, string>>({});
  const [abaClassif, setAbaClassif] = useState<string>("todas");
  const tabelaRef = useRef<HTMLDivElement>(null);

  const gerarDanfe = useCallback(async (chave: string) => {
    setDanfeLoading(chave);
    setDanfeErro((e) => ({ ...e, [chave]: "" }));
    try {
      const r = await fetchDanfe(chave);
      if (!r?.pdf_base64) throw new Error("PDF não retornado.");
      const bytes = Uint8Array.from(atob(r.pdf_base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setDanfeErro((e) => ({ ...e, [chave]: (err as Error)?.message || "Falha ao gerar o DANFE." }));
    } finally {
      setDanfeLoading(null);
    }
  }, []);

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
    fetchConsultaNfeTendencia({ meses: 6 }).then(r => setTendencia(r.data ?? [])).catch(() => setTendencia([]));
  }, []);

  // ── Toggles + base ──────────────────────────────────────────────────────────
  const qtdEntrada        = notas.filter(isEntrada).length;
  const qtdDesconsiderado = notas.filter(isDesconsiderado).length;
  const notasPreClassif = useMemo(() => notas.filter(n =>
    !(ocultarEntrada && isEntrada(n)) && !(ocultarDesconsiderados && isDesconsiderado(n))
  ), [notas, ocultarEntrada, ocultarDesconsiderados]);

  const classificacoes = useMemo(() => {
    const set = new Set<string>();
    notasPreClassif.forEach(n => {
      if (n.CLASSIFICACAO_FORNECEDOR) set.add(n.CLASSIFICACAO_FORNECEDOR);
    });
    return Array.from(set).sort();
  }, [notasPreClassif]);

  const notasBase = useMemo(() => {
    if (abaClassif === "todas") return notasPreClassif;
    if (abaClassif === "sem_classificacao") return notasPreClassif.filter(n => !n.CLASSIFICACAO_FORNECEDOR);
    if (abaClassif === "entrada") return notasPreClassif.filter(n => String(n.TPNF) === "0");
    return notasPreClassif.filter(n => n.CLASSIFICACAO_FORNECEDOR === abaClassif);
  }, [notasPreClassif, abaClassif]);

  const total       = notasBase.length;
  const lancadas    = notasBase.filter(n => n.SITUACAO === "OK").length;
  const naoLancadas = notasBase.filter(n => n.SITUACAO === "NAO_LANCADA").length;
  const divergentes = notasBase.filter(n => n.SITUACAO === "DIVERGENTE").length;
  const pctConferido = total > 0 ? (lancadas / total) * 100 : 0;

  const valorNaoLancado = notasBase.filter(n => n.SITUACAO === "NAO_LANCADA").reduce((s, n) => s + Number(n.VALOR_NOTA ?? 0), 0);
  const valorDivergente = notasBase.filter(n => n.SITUACAO === "DIVERGENTE").reduce((s, n) => s + Number(n.VALOR_NOTA ?? 0), 0);

  // ── Dados dos gráficos ──────────────────────────────────────────────────────
  const donut = useMemo(() => [
    { name: "Lançadas",     value: lancadas,    fill: COR.ok },
    { name: "Não lançadas", value: naoLancadas, fill: COR.nao },
    { name: "Divergentes",  value: divergentes, fill: COR.div },
  ].filter(d => d.value > 0), [lancadas, naoLancadas, divergentes]);

  const serie = useMemo(() => tendencia.map(t => ({ ...t, label: mesLabel(t.mes) })), [tendencia]);

  const topFornecedores = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notasBase.filter(x => x.SITUACAO === "NAO_LANCADA")) {
      const f = (n.RAZAO_SOCIAL ?? "—").slice(0, 26);
      m.set(f, (m.get(f) ?? 0) + Number(n.VALOR_NOTA ?? 0));
    }
    return [...m.entries()].map(([nome, valor]) => ({ nome, valor: Math.round(valor * 100) / 100 }))
      .sort((a, b) => b.valor - a.valor).slice(0, 6).reverse();
  }, [notasBase]);

  // ── Busca + status + paginação ──────────────────────────────────────────────
  const notasFiltradas = useMemo(() => notasBase.filter(n => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      (n.NUMERO_NOTA ?? "").toLowerCase().includes(s) ||
      (n.RAZAO_SOCIAL ?? "").toLowerCase().includes(s) ||
      (n.CNPJ ?? "").includes(search);
    const matchStatus = filtroStatus === "todos" || n.SITUACAO === filtroStatus;
    return matchSearch && matchStatus;
  }), [notasBase, search, filtroStatus]);

  const POR_PAGINA   = 50;
  const totalPaginas = Math.max(1, Math.ceil(notasFiltradas.length / POR_PAGINA));
  const paginaAtual  = Math.min(pagina, totalPaginas);
  const notasPagina  = notasFiltradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);
  useEffect(() => { setPagina(1); }, [search, filtroStatus, ocultarEntrada, ocultarDesconsiderados, dataInicio, dataFim, abaClassif]);

  const exportarCsv = () => {
    const header = "situacao;fornecedor;cnpj;numero_nota;serie;valor_nota;valor_lancado;origem;data_emissao;chave";
    const linhas = notasFiltradas.map(n => [
      n.SITUACAO, `"${(n.RAZAO_SOCIAL ?? "").replace(/"/g, "'")}"`, n.CNPJ ?? "", n.NUMERO_NOTA ?? "", n.SERIE_NOTA ?? "",
      String(n.VALOR_NOTA ?? "").replace(".", ","), String(n.VALOR_LANCADO ?? "").replace(".", ","),
      n.ORIGEM ?? "", fmtData(n.DATA_EMISSAO), n.CHAVE ?? "",
    ].join(";"));
    const blob = new Blob(["﻿" + [header, ...linhas].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `conferencia_nfe_${dataInicio}_${dataFim}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const chipCls = (ativo: boolean) =>
    `inline-flex items-center gap-1.5 h-7 rounded-lg px-2.5 text-[10px] font-semibold transition-colors border ${
      ativo ? "bg-amber-400/15 border-amber-400/30 text-amber-300" : "border-white/10 text-slate-400 hover:text-slate-200"}`;

  const setStatus = (s: "todos" | StatusNota) => setFiltroStatus(cur => cur === s ? "todos" : s);

  return (
    <div
      className="flex flex-col transition-all duration-300 min-h-[100dvh] overflow-auto px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      <BackgroundEffects />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-hidden"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          <div className="h-[3px] w-full overflow-hidden rounded-t-[24px] shrink-0">
            <div className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)] transition-all duration-500 ease-out"
              style={{ width: isLoading ? "70%" : "0%", opacity: isLoading ? 1 : 0 }} />
          </div>

          <div className="relative flex flex-col flex-1 min-h-0 gap-3 p-2 sm:p-3 lg:p-4 overflow-y-auto w-full">

            {/* NAVBAR */}
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

            {/* MOBILE */}
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

            {erro && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-2.5">
                <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <p className="text-[12px] text-rose-300">{erro}</p>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <AnimatedCard delay={0}>
                <KpiCard label="Total de notas" value={String(total)} rawValue={total} subtitle="Emitidas contra o CNPJ" icon={FileText} tone="cyan" loading={isLoading} onClick={() => setStatus("todos")} />
              </AnimatedCard>
              <AnimatedCard delay={60}>
                <KpiCard label="Lançadas" value={String(lancadas)} rawValue={lancadas} subtitle={total ? `${pctConferido.toFixed(0)}% conferido` : "—"} icon={CheckCircle2} tone="emerald" loading={isLoading} onClick={() => setStatus("OK")} />
              </AnimatedCard>
              <AnimatedCard delay={120}>
                <KpiCard label="Não lançadas" value={String(naoLancadas)} rawValue={naoLancadas} subtitle={naoLancadas ? `${fmtK(valorNaoLancado)} em risco` : "Tudo lançado"} icon={XCircle} tone="rose" loading={isLoading} onClick={() => setStatus("NAO_LANCADA")} />
              </AnimatedCard>
              <AnimatedCard delay={180}>
                <KpiCard label="Divergências" value={String(divergentes)} rawValue={divergentes} subtitle={divergentes ? `${fmtK(valorDivergente)} em notas` : "Nenhuma"} icon={AlertTriangle} tone="amber" loading={isLoading} onClick={() => setStatus("DIVERGENTE")} />
              </AnimatedCard>
            </div>

            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3">
              {/* Rosca — status */}
              <AnimatedCard delay={60} hover={false}>
                <div className="rounded-[16px] border p-4 h-full" style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/70" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Situação das notas</span>
                  </div>
                  <div className="relative" style={{ height: 168 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={2} stroke="none">
                          {donut.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <ReTooltip {...tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[22px] font-black tabular-nums" style={{ color: COR.ok }}>{pctConferido.toFixed(0)}%</span>
                      <span className="text-[10px] text-slate-500">conferido</span>
                    </div>
                  </div>
                  <div className="flex justify-center gap-3 mt-1 flex-wrap">
                    {donut.map(d => (
                      <span key={d.name} className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span className="h-2 w-2 rounded-full" style={{ background: d.fill }} />{d.name} ({d.value})
                      </span>
                    ))}
                  </div>
                </div>
              </AnimatedCard>

              {/* Tendência — área */}
              <AnimatedCard delay={120} hover={false}>
                <div className="rounded-[16px] border p-4 h-full" style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-rose-400/70" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Não lançadas por mês</span>
                  </div>
                  <div style={{ height: 190 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={serie} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gNao" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COR.nao} stopOpacity={0.5} />
                            <stop offset="100%" stopColor={COR.nao} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gOk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COR.ok} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={COR.ok} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                        <ReTooltip {...tooltipStyle}
                          formatter={(v: number, n: string) => [v, n === "nao_lancadas" ? "Não lançadas" : "Lançadas"]} />
                        <Area type="monotone" dataKey="lancadas" name="lancadas" stroke={COR.ok} strokeWidth={1.5} fill="url(#gOk)" dot={false} />
                        <Area type="monotone" dataKey="nao_lancadas" name="nao_lancadas" stroke={COR.nao} strokeWidth={2.5} fill="url(#gNao)" dot={{ r: 2.5, fill: COR.nao }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </AnimatedCard>

              {/* Top fornecedores pendentes */}
              <AnimatedCard delay={180} hover={false}>
                <div className="rounded-[16px] border p-4 h-full" style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building2 className="h-3.5 w-3.5 text-amber-400/70" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Maiores pendências</span>
                  </div>
                  <div style={{ height: 190 }}>
                    {topFornecedores.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-[11px] text-slate-600">Sem pendências no período 🎉</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topFornecedores} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }} barSize={13}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="nome" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} width={112} />
                          <ReTooltip {...tooltipStyle} formatter={(v: number) => [fmtBRL(v), "Pendente"]} />
                          <Bar dataKey="valor" fill={COR.nao} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </AnimatedCard>
            </div>

            {/* ABAS POR CLASSIFICAÇÃO DO FORNECEDOR */}
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-0.5">
              <button
                onClick={() => setAbaClassif("todas")}
                className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                  abaClassif === "todas"
                    ? "bg-amber-400/15 text-amber-300"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                Todas
                <span className="text-[9px] tabular-nums opacity-60">{notasPreClassif.length}</span>
              </button>
              {classificacoes.map(c => {
                const qtd = notasPreClassif.filter(n => n.CLASSIFICACAO_FORNECEDOR === c).length;
                return (
                  <button
                    key={c}
                    onClick={() => setAbaClassif(abaClassif === c ? "todas" : c)}
                    className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                      abaClassif === c
                        ? "bg-amber-400/15 text-amber-300"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    {c}
                    <span className="text-[9px] tabular-nums opacity-60">{qtd}</span>
                  </button>
                );
              })}
              {notasPreClassif.some(n => !n.CLASSIFICACAO_FORNECEDOR) && (
                <button
                  onClick={() => setAbaClassif(abaClassif === "sem_classificacao" ? "todas" : "sem_classificacao")}
                  className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                    abaClassif === "sem_classificacao"
                      ? "bg-amber-400/15 text-amber-300"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  Sem classif.
                  <span className="text-[9px] tabular-nums opacity-60">{notasPreClassif.filter(n => !n.CLASSIFICACAO_FORNECEDOR).length}</span>
                </button>
              )}
              {notasPreClassif.some(n => String(n.TPNF) === "0") && (
                <>
                  <div className="h-4 w-px shrink-0 mx-0.5" style={{ background: "var(--sgt-divider)" }} />
                  <button
                    onClick={() => setAbaClassif(abaClassif === "entrada" ? "todas" : "entrada")}
                    className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                      abaClassif === "entrada"
                        ? "bg-cyan-400/15 text-cyan-300"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    Entrada
                    <span className="text-[9px] tabular-nums opacity-60">{notasPreClassif.filter(n => String(n.TPNF) === "0").length}</span>
                  </button>
                </>
              )}
            </div>

            {/* TABELA */}
            <AnimatedCard delay={240} hover={false}>
              <div ref={tabelaRef} className="flex flex-col rounded-[16px] border overflow-hidden" style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}>
                <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2.5 border-b shrink-0" style={{ borderColor: "var(--sgt-divider)" }}>
                  <GooeyInput
                    placeholder="Buscar nota, fornecedor, CNPJ..."
                    value={search}
                    onValueChange={(v) => setSearch(v)}
                  />
                  <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as typeof filtroStatus)}
                    className="h-7 rounded-lg px-2 text-[10px] bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:border-amber-400/40">
                    <option value="todos">Todos status</option>
                    <option value="OK">Lançadas</option>
                    <option value="NAO_LANCADA">Não lançadas</option>
                    <option value="DIVERGENTE">Divergentes</option>
                  </select>
                  {qtdEntrada > 0 && (
                    <button onClick={() => setOcultarEntrada(v => !v)} className={chipCls(ocultarEntrada)}>
                      <EyeOff className="h-3 w-3" />{ocultarEntrada ? "Entrada oculta" : "Ocultar entrada"} ({qtdEntrada})
                    </button>
                  )}
                  {qtdDesconsiderado > 0 && (
                    <button onClick={() => setOcultarDesconsiderados(v => !v)} className={chipCls(ocultarDesconsiderados)}>
                      <EyeOff className="h-3 w-3" />{ocultarDesconsiderados ? "Desconsid. ocultos" : "Ocultar desconsiderados"} ({qtdDesconsiderado})
                    </button>
                  )}
                  <div className="flex-1" />
                  <span className="text-[10px] text-slate-500">{notasFiltradas.length} nota(s)</span>
                  {notas.length > 0 && (
                    <button onClick={exportarCsv} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-300 transition-colors">
                      <Download className="h-3 w-3" />CSV
                    </button>
                  )}
                </div>

                <div>
                  {isLoading ? (
                    <div className="flex flex-col gap-1 p-3">
                      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />)}
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
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 sm:px-4 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600 border-b sticky top-0 z-10"
                        style={{ borderColor: "var(--sgt-divider)", background: "var(--sgt-bg-card)" }}>
                        <span>Fornecedor / Nº</span><span className="text-right">Valor</span><span className="hidden sm:block">Emissão</span><span>Status</span>
                      </div>
                      {notasPagina.map(n => {
                        const rowId = n.CHAVE ?? `${n.CNPJ}-${n.NUMERO_NOTA}`;
                        return (
                          <div key={rowId}>
                            <button type="button" onClick={() => setExpandedRow(expandedRow === rowId ? null : rowId)}
                              className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 w-full px-3 sm:px-4 py-2.5 text-left border-b hover:bg-white/[0.03] transition-colors" style={{ borderColor: "var(--sgt-divider)" }}>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[12px] font-semibold dark:text-slate-200 text-slate-700 truncate">{n.RAZAO_SOCIAL ?? "—"}</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                  Nº {n.NUMERO_NOTA ?? "—"} · Série {n.SERIE_NOTA ?? "—"}
                                  {isEntrada(n) && <span className="rounded px-1 py-0.5 text-[8px] font-bold bg-slate-400/15 text-slate-400">ENTRADA</span>}
                                  {isDesconsiderado(n) && <span className="rounded px-1 py-0.5 text-[8px] font-bold bg-purple-400/15 text-purple-300">DESCONSID.</span>}
                                  {n.SITUACAO === "NAO_LANCADA" && n.DIAS_PARADA != null && Number(n.DIAS_PARADA) > 0 && (
                                    <span className={`rounded px-1 py-0.5 text-[8px] font-bold ${Number(n.DIAS_PARADA) > 15 ? "bg-rose-400/15 text-rose-300" : "bg-amber-400/10 text-amber-300/80"}`}>PARADA HÁ {n.DIAS_PARADA}D</span>
                                  )}
                                </span>
                              </div>
                              <span className="text-[12px] font-bold tabular-nums dark:text-slate-200 text-slate-700 self-center text-right">{fmtBRL(n.VALOR_NOTA)}</span>
                              <span className="text-[11px] text-slate-500 self-center hidden sm:block">{fmtData(n.DATA_EMISSAO)}</span>
                              <div className="self-center flex items-center gap-1">
                                <StatusBadge status={n.SITUACAO} />
                                {expandedRow === rowId ? <ChevronUp className="h-3 w-3 text-slate-600" /> : <ChevronDown className="h-3 w-3 text-slate-600" />}
                              </div>
                            </button>
                            {expandedRow === rowId && (
                              <div className="px-3 sm:px-4 py-3 border-b" style={{ borderColor: "var(--sgt-divider)", background: "var(--sgt-row-hover)" }}>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                                  <div><p className="text-slate-500 mb-0.5">CNPJ</p><p className="font-mono text-[10px] dark:text-slate-300 text-slate-600">{n.CNPJ ?? "—"}</p></div>
                                  <div><p className="text-slate-500 mb-0.5">Lançada como</p><p className="font-semibold dark:text-slate-300 text-slate-600">{n.ORIGEM === "COMPRA" ? "Compra" : n.ORIGEM === "CONTAS_PAGAR" ? "Contas a pagar" : "—"}</p></div>
                                  {n.SITUACAO !== "NAO_LANCADA" && n.USUARIO_LANCAMENTO && (
                                    <div><p className="text-slate-500 mb-0.5">Lançada por</p><p className="font-semibold dark:text-slate-300 text-slate-600">{n.USUARIO_LANCAMENTO} · {fmtData(n.DATA_LANCAMENTO)}</p></div>
                                  )}
                                  <div><p className="text-slate-500 mb-0.5">Valor lançado</p><p className={`font-semibold tabular-nums ${n.SITUACAO === "DIVERGENTE" ? "text-amber-300" : "dark:text-slate-300 text-slate-600"}`}>{fmtBRL(n.VALOR_LANCADO)}</p></div>
                                  {n.SITUACAO === "DIVERGENTE" && (
                                    <div><p className="text-slate-500 mb-0.5">Diferença</p><p className="font-semibold text-amber-300 tabular-nums">{fmtBRL(Number(n.VALOR_NOTA ?? 0) - Number(n.VALOR_LANCADO ?? 0))}</p></div>
                                  )}
                                  {n.CHAVE && (
                                    <div className="col-span-2 sm:col-span-4">
                                      <p className="text-slate-500 mb-0.5">Chave de acesso</p>
                                      <p className="font-mono text-[9px] dark:text-slate-400 text-slate-500 break-all">{n.CHAVE}</p>
                                      <button onClick={() => gerarDanfe(n.CHAVE!)}
                                        disabled={danfeLoading === n.CHAVE}
                                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-bold text-amber-300 hover:bg-amber-400/20 transition-colors disabled:opacity-60 disabled:cursor-wait">
                                        <FileText className="h-3 w-3" />{danfeLoading === n.CHAVE ? "Gerando DANFE..." : "Gerar DANFE (PDF)"}
                                      </button>
                                      {danfeErro[n.CHAVE] ? (
                                        <p className="text-[9px] text-rose-400 mt-1">{danfeErro[n.CHAVE]}</p>
                                      ) : (
                                        <p className="text-[9px] text-slate-600 mt-1">Gera o PDF completo (com itens) na hora e abre numa nova aba.</p>
                                      )}
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

                {notasFiltradas.length > POR_PAGINA && (
                  <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-t shrink-0" style={{ borderColor: "var(--sgt-divider)" }}>
                    <span className="text-[10px] text-slate-500 tabular-nums">
                      {(paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, notasFiltradas.length)} de {notasFiltradas.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setPagina(p => Math.max(1, p - 1)); requestAnimationFrame(() => tabelaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }} disabled={paginaAtual === 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:text-slate-200 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed">
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-[10px] text-slate-400 tabular-nums px-1">pág. {paginaAtual}/{totalPaginas}</span>
                      <button onClick={() => { setPagina(p => Math.min(totalPaginas, p + 1)); requestAnimationFrame(() => tabelaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }} disabled={paginaAtual === totalPaginas}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:text-slate-200 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed">
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
