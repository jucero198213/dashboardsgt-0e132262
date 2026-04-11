import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, DollarSign, Percent, Target, TrendingUp, TrendingDown,
  ChevronRight, BarChart3, RefreshCw,
} from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { formatCurrency } from "@/data/mockData";
import { KpiCard } from "@/components/indicators/KpiCard";
import { InsightsBlock } from "@/components/indicators/InsightsBlock";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { KpiCardSkeleton } from "@/components/shared/CardSkeleton";
import { useCallback, useMemo, useState } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from "recharts";

// ─── Config por indicador ────────────────────────────────────────────────────
const INDICATOR_CODCUS: Record<string, string[]> = {
  "Compra de Ativo": ["26"],
  "Óleo Diesel":     ["21"],
  "Folha":           ["9"],
  "Imposto":         ["23"],
  "Pedágio":         ["24"],
  "Administrativo":  ["3"],
  "Manutenção":      ["4", "5", "6", "7", "25"],
};

const SUBTITLES: Record<string, string> = {
  "Compra de Ativo": "Investimentos em ativos fixos e equipamentos da empresa",
  "Óleo Diesel":     "Gastos com combustível diesel para operação da frota",
  "Folha":           "Despesas com pessoal, salários e encargos trabalhistas",
  "Imposto":         "Tributos, impostos e contribuições fiscais do período",
  "Pedágio":         "Custos com pedágios nas rotas operacionais",
  "Administrativo":  "Despesas administrativas gerais e de escritório",
  "Manutenção":      "Manutenção preventiva e corretiva de veículos e equipamentos",
};

const PAGE_SIZE_COMP = 8;
const PAGE_SIZE_DOCS = 50;

// ─── Formata data (Date | string ISO | null) → DD/MM/AAAA ────────────────────
const fmt = (d: string | Date | null | undefined): string => {
  if (!d) return "—";
  if (d instanceof Date) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  const s = String(d).trim();
  if (!s || s.toLowerCase() === "null") return "—";
  const iso = s.split("T")[0];
  const parts = iso.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return s;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 shadow-xl">
      <p className="mb-2 text-xs font-semibold text-slate-400">Dia {label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────
export default function IndicadorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    indicadores, dwRawData, dwChartData, dwFilter, setDwFilter, fetchFromDW,
    filiais, empresas, isProcessed, isFetchingDw,
  } = useFinancialData();

  const [paginaComp, setPaginaComp] = useState(1);
  const [paginaDocs, setPaginaDocs] = useState(1);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [progress, setProgress]       = useState(0);

  const indicador    = indicadores.find((i) => i.id === id);
  const codcusList   = indicador ? (INDICATOR_CODCUS[indicador.nome] ?? []) : [];
  const di = dwFilter.dataInicio;
  const df = dwFilter.dataFim;

  // ── Botão Atualizar idêntico ao dashboard ───────────────────────────────────
  const handleUpdate = useCallback(async () => {
    setProgress(0);
    setLoadingPhase("Conectando...");
    let cur = 0;
    const phases = [
      { at: 20, label: "Buscando dados..." },
      { at: 60, label: "Processando..." },
      { at: 90, label: "Calculando..." },
    ];
    const interval = window.setInterval(() => {
      cur = Math.min(cur + 3, 95);
      setProgress(Math.floor(cur));
      const p = [...phases].reverse().find((ph) => cur >= ph.at);
      if (p) setLoadingPhase(p.label);
    }, 200);
    try {
      await fetchFromDW();
      window.clearInterval(interval);
      setLoadingPhase("Concluído!");
      setProgress(100);
    } catch {
      window.clearInterval(interval);
    } finally {
      window.setTimeout(() => { setProgress(0); setLoadingPhase(""); }, 800);
    }
  }, [fetchFromDW]);

  // ── Rows filtrados por CODCUS + DATA_EMISSAO no período ────────────────────
  const rowsFiltrados = useMemo(() => {
    if (!indicador || codcusList.length === 0) return [];
    return dwRawData.filter((r) => {
      if (r.ORIGEM !== "CP") return false;
      const cod = String(r.CODCUS ?? "").trim();
      if (!codcusList.includes(cod)) return false;
      const em = r.DATA_EMISSAO ? String(r.DATA_EMISSAO).split("T")[0] : null;
      if (!em) return false;
      return em >= di && em <= df;
    });
  }, [dwRawData, indicador, codcusList, di, df]);

  const totalValor = useMemo(
    () => rowsFiltrados.reduce((s, r) => s + (r.VLR_PARCELA ?? 0), 0),
    [rowsFiltrados]
  );

  // ── Composição por fornecedor ───────────────────────────────────────────────
  const composicaoAll = useMemo(() => {
    const map: Record<string, number> = {};
    rowsFiltrados.forEach((r) => {
      const k = r.NOME_PARCEIRO || "N/A";
      map[k] = (map[k] || 0) + (r.VLR_PARCELA ?? 0);
    });
    return Object.entries(map)
      .map(([nome, valor]) => ({ nome, valor, pct: totalValor > 0 ? (valor / totalValor) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor);
  }, [rowsFiltrados, totalValor]);

  const totalPaginasComp = Math.max(1, Math.ceil(composicaoAll.length / PAGE_SIZE_COMP));
  const composicaoPag    = composicaoAll.slice((paginaComp - 1) * PAGE_SIZE_COMP, paginaComp * PAGE_SIZE_COMP);

  // ── Evolução diária ─────────────────────────────────────────────────────────
  const evolucaoDiaria = useMemo(() => {
    const mesAtual  = di.substring(0, 7);
    const [ano, mes] = di.split("-").map(Number);
    const mesAntNum  = mes === 1 ? 12 : mes - 1;
    const anoAntNum  = mes === 1 ? ano - 1 : ano;
    const mesAnt     = `${anoAntNum}-${String(mesAntNum).padStart(2, "0")}`;

    const byDay = (source: typeof dwRawData, prefix: string) => {
      const map: Record<string, number> = {};
      source.forEach((r) => {
        if (r.ORIGEM !== "CP") return;
        const cod = String(r.CODCUS ?? "").trim();
        if (!codcusList.includes(cod)) return;
        const em = r.DATA_EMISSAO ? String(r.DATA_EMISSAO).split("T")[0] : null;
        if (!em || !em.startsWith(prefix)) return;
        const dia = em.split("-")[2];
        map[dia] = (map[dia] || 0) + (r.VLR_PARCELA ?? 0);
      });
      return map;
    };

    const atual    = byDay(dwRawData,   mesAtual);
    const anterior = byDay(dwChartData, mesAnt);
    const dias     = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

    return dias
      .filter((d) => atual[d] !== undefined || anterior[d] !== undefined)
      .map((d) => ({ dia: Number(d), mesAtual: atual[d] ?? 0, mesAnterior: anterior[d] ?? 0 }));
  }, [dwRawData, dwChartData, di, codcusList]);

  // ── Documentos paginados ────────────────────────────────────────────────────
  const totalPaginasDocs = Math.max(1, Math.ceil(rowsFiltrados.length / PAGE_SIZE_DOCS));
  const docsPaginados    = rowsFiltrados.slice((paginaDocs - 1) * PAGE_SIZE_DOCS, paginaDocs * PAGE_SIZE_DOCS);

  const diffPct    = indicador ? indicador.percentualReal - indicador.percentualEsperado : 0;
  const isPositive = diffPct <= 0;

  const insights = useMemo(() => {
    if (!indicador) return [];
    const diff    = indicador.percentualReal - indicador.percentualEsperado;
    const diffAbs = Math.abs(diff);
    if (diff > 3) return [{ type: "alert"    as const, text: `Este indicador está ${diffAbs.toFixed(1)}% acima do esperado. Recomenda-se análise detalhada.` }];
    if (diff < -3) return [{ type: "positive" as const, text: `Este indicador está ${diffAbs.toFixed(1)}% abaixo do esperado. Economia identificada no período.` }];
    return [{ type: "info" as const, text: `Indicador dentro da faixa esperada (diferença de ${diffAbs.toFixed(1)}%).` }];
  }, [indicador]);

  const filiaisFiltradas = dwFilter.empresa ? filiais.filter((f) => f.empresa === dwFilter.empresa) : filiais;

  // ── Paginação reutilizável ──────────────────────────────────────────────────
  const Paginacao = ({ atual, total, set }: { atual: number; total: number; set: (n: number) => void }) => {
    if (total <= 1) return null;
    return (
      <div className="flex items-center gap-1">
        <button onClick={() => set(Math.max(1, atual - 1))} disabled={atual === 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white disabled:opacity-30">
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
        </button>
        {Array.from({ length: total }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === total || Math.abs(p - atual) <= 1)
          .reduce<(number | "…")[]>((acc, p, idx, arr) => {
            if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
            acc.push(p); return acc;
          }, [])
          .map((p, i) => p === "…"
            ? <span key={`e${i}`} className="px-1 text-xs text-slate-600">…</span>
            : <button key={p} onClick={() => set(p as number)}
                className={`flex h-7 min-w-[28px] items-center justify-center rounded-lg border px-2 text-xs font-medium transition-all ${atual === p ? "border-amber-400/30 bg-amber-400/10 text-amber-300" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"}`}>
                {p}
              </button>
          )}
        <button onClick={() => set(Math.min(total, atual + 1))} disabled={atual === total}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white disabled:opacity-30">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  if (!indicador) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_26%)]" />
        <div className="relative text-center">
          <p className="text-lg text-slate-400">Indicador não encontrado</p>
          <button onClick={() => navigate("/")} className="mt-4 text-sm text-cyan-400 hover:underline">Voltar ao dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2">
      {/* Efeitos de background idênticos ao portal */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:88px_88px]" />

      <section className="relative flex-1 border border-white/10 bg-[linear-gradient(135deg,rgba(22,32,78,0.94)_0%,rgba(7,14,38,0.985)_54%,rgba(2,8,23,1)_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.48)] rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-y-auto">

        {/* Progress bar idêntica ao dashboard */}
        {isFetchingDw && (
          <div className="absolute inset-x-0 top-0 z-50">
            <div className="h-[3px] w-full overflow-hidden rounded-t-[24px] bg-transparent">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-400 shadow-[0_0_12px_rgba(34,211,238,0.5)] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

      <div className="relative mx-auto max-w-[1400px] space-y-5 px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8 animate-[fadeSlideIn_0.5s_ease-out]">

        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <button onClick={() => navigate("/")} className="transition-colors hover:text-white">Dashboard</button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white">{indicador.nome}</span>
          </div>
          <UserMenu />
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <button onClick={() => navigate("/")}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                <BarChart3 className="h-3 w-3" /> Indicador Estratégico
              </div>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">{indicador.nome}</h1>
            <p className="mt-2 text-sm text-slate-400">{SUBTITLES[indicador.nome] ?? "Detalhamento do indicador estratégico"}</p>
          </div>
        </div>

        {/* ── FILTROS (idênticos ao dashboard) ── */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <input type="date" value={dwFilter.dataInicio}
            onChange={(e) => { setDwFilter("dataInicio", e.target.value); setPaginaComp(1); setPaginaDocs(1); }}
            className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-cyan-500/50" />
          <input type="date" value={dwFilter.dataFim}
            onChange={(e) => { setDwFilter("dataFim", e.target.value); setPaginaComp(1); setPaginaDocs(1); }}
            className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-cyan-500/50" />
          <select value={dwFilter.empresa ?? ""} onChange={(e) => { setDwFilter("empresa", e.target.value || null); setDwFilter("filial", null); }}
            className="h-8 rounded-xl border border-white/10 bg-[#0f172a] px-3 text-sm text-white focus:outline-none focus:border-cyan-500/50">
            <option value="">Todas as empresas</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <select value={dwFilter.filial ?? ""} onChange={(e) => setDwFilter("filial", e.target.value || null)}
            className="h-8 rounded-xl border border-white/10 bg-[#0f172a] px-3 text-sm text-white focus:outline-none focus:border-cyan-500/50">
            <option value="">Todas as filiais</option>
            {filiaisFiltradas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>

          {/* Botão Atualizar — idêntico ao dashboard principal */}
          <button
            onClick={() => void handleUpdate()}
            disabled={isFetchingDw}
            className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-semibold transition-all sm:gap-2 sm:px-3.5 sm:text-xs ${
              isFetchingDw
                ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-200"
                : "border-cyan-400/20 bg-cyan-500/10 text-cyan-300 hover:border-cyan-300/30 hover:bg-cyan-400/15"
            } disabled:cursor-not-allowed`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetchingDw ? "animate-spin" : ""}`} />
            {isFetchingDw ? (
              <span className="flex items-center gap-2">
                <span className="hidden sm:inline">{loadingPhase}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                  {progress}%
                </span>
              </span>
            ) : "Atualizar"}
          </button>
        </div>

        {/* ── KPI CARDS ── */}
        {isFetchingDw && !isProcessed ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0,1,2,3].map(i => <KpiCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnimatedCard delay={0}>
              <KpiCard label="Valor Total" value={formatCurrency(totalValor)} rawValue={totalValor}
                subtitle="Soma por data de emissão no período" icon={DollarSign} tone="cyan" />
            </AnimatedCard>
            <AnimatedCard delay={80}>
              <KpiCard label="Percentual Real" value={`${indicador.percentualReal.toFixed(1)}%`} rawValue={indicador.percentualReal}
                subtitle="Do total de despesas" icon={Percent} tone={isPositive ? "emerald" : "amber"} />
            </AnimatedCard>
            <AnimatedCard delay={160}>
              <KpiCard label="Meta Esperada" value={`${indicador.percentualEsperado}%`} rawValue={indicador.percentualEsperado}
                subtitle="Definido pela diretoria" icon={Target} tone="violet" />
            </AnimatedCard>
            <AnimatedCard delay={240}>
              <KpiCard label="Diferença"
                value={`${diffPct > 0 ? "+" : ""}${diffPct.toFixed(1)}%`} rawValue={diffPct}
                subtitle={diffPct > 0 ? "Acima do esperado" : diffPct < 0 ? "Abaixo do esperado" : "Dentro do esperado"}
                icon={diffPct > 0 ? TrendingUp : TrendingDown}
                tone={isPositive ? "emerald" : "rose"} />
            </AnimatedCard>
          </div>
        )}

        {/* ── GRÁFICO + COMPOSIÇÃO ── */}
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">

          {/* Gráfico linha diária */}
          <AnimatedCard delay={320}>
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)] p-6">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Evolução Diária — Mês Atual vs Mês Anterior
                </p>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-6 rounded-full bg-cyan-400 inline-block" /> Mês atual</span>
                  <span className="flex items-center gap-1.5"><span className="h-[2px] w-6 rounded-full bg-slate-500 inline-block border-dashed" /> Mês anterior</span>
                </div>
              </div>
              {evolucaoDiaria.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolucaoDiaria} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="dia" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v/1_000).toFixed(0)}k` : String(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="mesAtual"    name="Mês Atual"    stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3, fill: "#06b6d4" }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="mesAnterior" name="Mês Anterior" stroke="rgba(148,163,184,0.5)" strokeWidth={1.5} strokeDasharray="5 4" dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
                  Sem dados no período selecionado
                </div>
              )}
            </div>
          </AnimatedCard>

          {/* Composição */}
          <AnimatedCard delay={360}>
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)] p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Composição</p>
                <span className="text-xs text-slate-500">{composicaoAll.length} fornecedor(es)</span>
              </div>
              {composicaoPag.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Sem dados no período</p>
              ) : (
                <div className="space-y-3.5">
                  {composicaoPag.map((item) => (
                    <div key={item.nome}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-[11px] font-medium text-slate-300 truncate flex-1 min-w-0">{item.nome}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-bold text-white">{formatCurrency(item.valor)}</span>
                          <span className="text-[10px] font-semibold text-cyan-400">{item.pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-[3px] overflow-hidden rounded-full bg-white/8">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-700"
                          style={{ width: `${Math.min(item.pct, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {totalPaginasComp > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                  <p className="text-xs text-slate-600">{composicaoAll.length} itens</p>
                  <Paginacao atual={paginaComp} total={totalPaginasComp} set={setPaginaComp} />
                </div>
              )}
            </div>
          </AnimatedCard>
        </div>

        {/* ── INSIGHTS ── */}
        {insights.length > 0 && (
          <AnimatedCard delay={400}>
            <InsightsBlock insights={insights} />
          </AnimatedCard>
        )}

        {/* ── DOCUMENTOS DETALHADOS ── */}
        <AnimatedCard delay={480}>
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)]">
            <div className="flex items-center justify-between px-6 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Documentos Detalhados</p>
              {rowsFiltrados.length > 0 && (
                <p className="text-xs text-slate-500">
                  {(paginaDocs - 1) * PAGE_SIZE_DOCS + 1}–{Math.min(paginaDocs * PAGE_SIZE_DOCS, rowsFiltrados.length)} de {rowsFiltrados.length}
                </p>
              )}
            </div>

            {!isProcessed || rowsFiltrados.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-slate-500">
                {isProcessed ? "Nenhum documento encontrado no período" : "Atualize os dados no dashboard"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 w-[90px]">Dt. Emissão</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 w-[90px]">Dt. Venc.</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 w-[90px]">Dt. Pag.</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 w-[110px]">Documento</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 w-[60px] text-center">Parcela</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Fornecedor</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 w-[110px]">C. Custo</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 w-[110px] text-right">Valor</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 w-[110px] text-right">Vl. Pago</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 w-[60px] text-center">Sit.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docsPaginados.map((r, i) => (
                      <TableRow key={i} className="border-white/5 hover:bg-white/[0.03]">
                        <TableCell className="text-sm text-slate-300 whitespace-nowrap">{fmt(r.DATA_EMISSAO)}</TableCell>
                        <TableCell className="text-sm text-slate-300 whitespace-nowrap">{fmt(r.DATA_VENCIMENTO)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {r.DATA_PAGAMENTO
                            ? <span className="text-amber-400">{fmt(r.DATA_PAGAMENTO)}</span>
                            : <span className="text-slate-600">—</span>}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-white whitespace-nowrap">{r.DOCUMENTO ?? "—"}</TableCell>
                        <TableCell className="text-sm text-slate-300 text-center">{r.PARCELA ?? "—"}</TableCell>
                        <TableCell className="text-sm text-slate-300 max-w-[200px] truncate">{r.NOME_PARCEIRO ?? "—"}</TableCell>
                        <TableCell className="text-sm text-slate-500 truncate max-w-[110px]">{r.CENTRO_CUSTO ?? r.CODCUS ?? "—"}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-white whitespace-nowrap">{formatCurrency(r.VLR_PARCELA ?? 0)}</TableCell>
                        <TableCell className="text-right text-sm whitespace-nowrap">
                          {(r.VLR_PAGO ?? 0) > 0
                            ? <span className="text-amber-300">{formatCurrency(r.VLR_PAGO ?? 0)}</span>
                            : <span className="text-slate-600">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            r.SITUACAO === "L" ? "bg-emerald-500/15 text-emerald-300" :
                            r.SITUACAO === "P" ? "bg-cyan-500/15 text-cyan-300" :
                            "bg-amber-500/15 text-amber-300"
                          }`}>
                            {r.SITUACAO ?? "—"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPaginasDocs > 1 && (
              <div className="flex items-center justify-between border-t border-white/5 px-6 py-3">
                <p className="text-xs text-slate-500">{rowsFiltrados.length} documento(s)</p>
                <Paginacao atual={paginaDocs} total={totalPaginasDocs} set={setPaginaDocs} />
              </div>
            )}
            {totalPaginasDocs <= 1 && rowsFiltrados.length > 0 && (
              <div className="border-t border-white/5 px-6 py-3">
                <p className="text-xs text-slate-500">{rowsFiltrados.length} documento(s)</p>
              </div>
            )}
          </div>
        </AnimatedCard>

      </div>
      </section>
    </div>
  );
}
