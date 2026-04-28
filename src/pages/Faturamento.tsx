import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { UpdateButton } from "@/components/shared/UpdateButton";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import sgtLogo from "@/assets/sgt-logo.png";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtBRL  = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK    = (v: number) => v >= 1e6 ? `R$ ${(v/1e6).toFixed(1).replace(".",",")}M` : v >= 1e3 ? `R$ ${(v/1e3).toFixed(0)}k` : fmtBRL(v);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skel = ({ h = "h-4", w = "w-full" }: { h?: string; w?: string }) => (
  <div className={`${h} ${w} rounded-md animate-pulse`} style={{ background: "var(--sgt-skeleton-bg)" }} />
);

// ─── Helpers de dias úteis (sábado = útil, remove só domingo) ─────────────────
function countWorkdays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const fin = new Date(end);
  fin.setHours(0, 0, 0, 0);
  while (cur <= fin) {
    if (cur.getDay() !== 0) count++; // 0 = domingo
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  // aceita YYYY-MM-DD e DD/MM/YYYY
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2])-1, Number(iso[3]));
  const br  = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br)  return new Date(Number(br[3]), Number(br[2])-1, Number(br[1]));
  return null;
}

export default function Faturamento() {
  const navigate = useNavigate();
  const { faturamento, faturamentoMensal, faturamentoMensalAnterior, isFetchingDw, isFetchingCharts, isProcessed, dwFilter, setDwFilter, fetchFromDW, filiais, empresas, dwError } = useFinancialData();
  const [progress, setProgress]       = useState(0);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [sortDir, setSortDir]           = useState<"desc" | "asc">("desc");
  const [search, setSearch]             = useState("");

  const filiaisFiltradas = filiais.filter(f => !dwFilter.empresa || f.empresa === dwFilter.empresa);

  // ── Progress mock ──
  const handleUpdate = async () => {
    setProgress(0); setLoadingPhase("Conectando ao DW...");
    let cur = 0;
    const phases = [{ at: 20, label: "Consultando faturamento..." }, { at: 60, label: "Calculando participações..." }, { at: 85, label: "Finalizando..." }];
    const iv = window.setInterval(() => {
      const spd = cur < 30 ? 3 + Math.random()*4 : cur < 70 ? 2 + Math.random()*3 : 0.5 + Math.random()*0.8;
      cur = Math.min(cur + spd, 95);
      const p = [...phases].reverse().find(ph => cur >= ph.at);
      if (p) setLoadingPhase(p.label);
      setProgress(Math.round(cur));
    }, 120);
    try { await fetchFromDW(); } finally { clearInterval(iv); setProgress(100); setLoadingPhase(""); }
  };

  // ── Derived data ──
  const totalFaturado = useMemo(() => faturamento.reduce((s, r) => s + (r.FRETE_TOTAL ?? 0), 0), [faturamento]);

  // ── Dias úteis, média e provisão ──
  const { diasUteis, mediaDiaUtil, diasUteisRestantes, provisao } = useMemo(() => {
    const inicio = parseDate(dwFilter.dataInicio);
    const fim    = parseDate(dwFilter.dataFim);
    if (!inicio || !fim || totalFaturado === 0) {
      return { diasUteis: 0, mediaDiaUtil: 0, diasUteisRestantes: 0, provisao: 0 };
    }

    // Dias úteis no período filtrado
    const diasUteis = countWorkdays(inicio, fim);

    // Média por dia útil
    const mediaDiaUtil = diasUteis > 0 ? totalFaturado / diasUteis : 0;

    // Dias úteis restantes: do dia seguinte ao fim do filtro até o último dia do mês de fim
    const ultimoDiaMes = new Date(fim.getFullYear(), fim.getMonth() + 1, 0); // último dia do mês
    const amanha = new Date(fim);
    amanha.setDate(amanha.getDate() + 1);
    const diasUteisRestantes = amanha <= ultimoDiaMes ? countWorkdays(amanha, ultimoDiaMes) : 0;

    // Provisão = média × dias úteis restantes
    const provisao = mediaDiaUtil * diasUteisRestantes;

    return { diasUteis, mediaDiaUtil, diasUteisRestantes, provisao };
  }, [dwFilter.dataInicio, dwFilter.dataFim, totalFaturado]);

  const rows = useMemo(() => {
    let data = faturamento
      .filter(r => (r.DESCRI ?? "").toLowerCase().includes(search.toLowerCase()))
      .map(r => ({ descri: r.DESCRI ?? "Sem descrição", total: r.FRETE_TOTAL ?? 0, pct: r.PERCENTUAL ?? 0 }));
    data.sort((a, b) => sortDir === "desc" ? b.total - a.total : a.total - b.total);
    return data;
  }, [faturamento, sortDir, search]);

  const top5 = useMemo(() => [...rows].sort((a,b) => b.total - a.total).slice(0, 5), [rows]);
  const maxTotal = top5[0]?.total ?? 1;
  const COLORS = ["#2dd4bf","#f87171","#a78bfa","#fbbf24","#34d399","#94a3b8"];

  return (
    <div className="flex flex-col transition-all duration-300 min-h-[100dvh] xl:h-[100dvh] overflow-auto xl:overflow-hidden px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}>

      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(245,158,11,0.12),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_50%_40%_at_100%_105%,rgba(16,185,129,0.06),transparent_60%)]" />

      <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden w-full">
        <section className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto xl:overflow-hidden"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}>

          {/* Barra de progresso */}
          <div className="h-[3px] w-full overflow-hidden rounded-t-[24px] bg-transparent shrink-0">
            <div className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400 shadow-[0_0_12px_rgba(251,191,36,0.5)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, opacity: isFetchingDw ? 1 : 0 }} />
          </div>

          {/* ── NAVBAR DESKTOP ── */}
          <div className="hidden sm:flex items-center gap-2 md:gap-3 p-3 lg:p-4 py-3">
            <div className="flex shrink-0 items-center gap-3">
              <img src={sgtLogo} alt="SGT" className="block h-8 w-auto shrink-0 object-contain" />
              <div className="h-6 w-px" style={{ background: "var(--sgt-border-medium)" }} />
              <div className="flex flex-col leading-none">
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
                <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">Faturamento</span>
              </div>
            </div>

            {/* Badge tempo real */}
            <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-3">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Tempo real</span>
            </div>

            <div className="h-6 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

            {/* Filtros */}
            <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
              <DatePickerInput value={dwFilter.dataInicio} onChange={v => setDwFilter("dataInicio", v)} placeholder="Data início" />
              <DatePickerInput value={dwFilter.dataFim}    onChange={v => setDwFilter("dataFim", v)}    placeholder="Data fim" />
              <div className="h-4 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />
              <Select value={dwFilter.empresa ?? "__all__"} onValueChange={v => setDwFilter("empresa", v === "__all__" ? null : v)}>
                <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[130px] rounded-lg text-[12px] transition-all"><SelectValue placeholder="Empresa" /></SelectTrigger>
                <SelectContent><SelectItem value="__all__">Todas</SelectItem>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={dwFilter.filial ?? "__all__"} onValueChange={v => setDwFilter("filial", v === "__all__" ? null : v)}>
                <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[140px] rounded-lg text-[12px] transition-all"><SelectValue placeholder="Filial" /></SelectTrigger>
                <SelectContent><SelectItem value="__all__">Todas</SelectItem>{filiaisFiltradas.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
              </Select>
              <UpdateButton onClick={handleUpdate} isFetching={isFetchingDw} loadingPhase={loadingPhase} progress={progress} />
            </div>
            <HomeButton />
          </div>

          {/* ── NAVBAR MOBILE ── */}
          <div className="flex sm:hidden flex-col gap-2 p-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={sgtLogo} alt="SGT" className="block h-7 w-auto shrink-0 object-contain" />
                <div className="h-5 w-px shrink-0" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">Workspace</span>
                  <span className="text-[15px] font-black tracking-[-0.03em] dark:text-white text-slate-800 truncate">Faturamento</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <HomeButton />
                <MobileNav />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <DatePickerInput value={dwFilter.dataInicio} onChange={v => setDwFilter("dataInicio", v)} placeholder="Início" />
              <DatePickerInput value={dwFilter.dataFim}    onChange={v => setDwFilter("dataFim", v)}    placeholder="Fim" />
              <UpdateButton onClick={handleUpdate} isFetching={isFetchingDw} loadingPhase={loadingPhase} progress={progress} />
            </div>
          </div>

          <div className="h-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

          {/* ── ERROR ── */}
          {dwError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300 mx-3 mt-2 shrink-0">
              {dwError}
            </div>
          )}

          {/* ── CONTEÚDO ── */}
          <div className="flex flex-col flex-1 min-h-0 gap-3 p-3 xl:p-4 overflow-auto xl:overflow-hidden xl:grid xl:grid-rows-[auto_minmax(0,1fr)_minmax(0,1.1fr)]">

            {/* KPIs linha 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-fr items-stretch">

              {/* KPI Total */}
              <AnimatedCard delay={0}>
                <div className="relative overflow-hidden rounded-[14px] border border-amber-500/[0.18] bg-[var(--sgt-bg-card)] p-4 xl:p-5 flex flex-col gap-3 h-full">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.10),transparent_55%)]" />
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/70 to-amber-700/20" />
                  <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36"
                    style={{ background: "radial-gradient(circle at 100% 100%, rgba(245,158,11,0.10), transparent 65%)" }} />
                  <div className="relative flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.32em] text-amber-400">Faturamento Total</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/[0.08] border border-amber-400/[0.15]">
                      <TrendingUp className="h-3 w-3 text-amber-300" />
                    </div>
                  </div>
                  {!isProcessed ? <Skel h="h-9" w="w-3/4" /> : (
                    <p className="relative font-black leading-none tracking-[-0.05em] dark:text-white text-slate-800" style={{ fontSize: "clamp(1.3rem, 2.4vw, 2rem)" }}>
                      {fmtBRL(totalFaturado)}
                    </p>
                  )}
                  <p className="relative text-[10px] uppercase tracking-[0.2em] text-amber-500/80 font-semibold">Receita consolidada</p>
                  <div className="h-px relative" style={{ background: "var(--sgt-divider)" }} />
                  <div className="relative flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{diasUteis} dias úteis no período</span>
                    <span className="text-[13px] font-extrabold dark:text-white text-slate-700">{faturamento.length} clientes</span>
                  </div>
                </div>
              </AnimatedCard>

              {/* Média por dia útil */}
              <AnimatedCard delay={60}>
                <div className="relative overflow-hidden rounded-[14px] border border-cyan-500/[0.18] bg-[var(--sgt-bg-card)] p-4 xl:p-5 flex flex-col gap-3 h-full">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.08),transparent_55%)]" />
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-400/70 to-cyan-700/20" />
                  <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36"
                    style={{ background: "radial-gradient(circle at 100% 100%, rgba(6,182,212,0.08), transparent 65%)" }} />
                  <div className="relative flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.32em] text-cyan-400">Média / Dia Útil</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/[0.08] border border-cyan-400/[0.15]">
                      <ArrowUp className="h-3 w-3 text-cyan-300" />
                    </div>
                  </div>
                  {!isProcessed ? <Skel h="h-9" w="w-3/4" /> : (
                    <p className="relative font-black leading-none tracking-[-0.05em] dark:text-white text-slate-800" style={{ fontSize: "clamp(1.1rem, 2vw, 1.7rem)" }}>
                      {mediaDiaUtil > 0 ? fmtK(mediaDiaUtil) : "—"}
                    </p>
                  )}
                  <p className="relative text-[10px] uppercase tracking-[0.2em] text-cyan-500/80 font-semibold">Por dia útil (sáb. incluso)</p>
                  <div className="h-px relative" style={{ background: "var(--sgt-divider)" }} />
                  <div className="relative">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {fmtBRL(totalFaturado)} ÷ {diasUteis} dias úteis
                    </span>
                  </div>
                </div>
              </AnimatedCard>

              {/* Provisão */}
              <AnimatedCard delay={120}>
                <div className="relative overflow-hidden rounded-[14px] border border-emerald-500/[0.18] bg-[var(--sgt-bg-card)] p-4 xl:p-5 flex flex-col gap-3 h-full">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_55%)]" />
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-400/70 to-emerald-700/20" />
                  <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36"
                    style={{ background: "radial-gradient(circle at 100% 100%, rgba(16,185,129,0.08), transparent 65%)" }} />
                  <div className="relative flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.32em] text-emerald-400">Faturamento Projetado</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/[0.08] border border-emerald-400/[0.15]">
                      <TrendingUp className="h-3 w-3 text-emerald-300" />
                    </div>
                  </div>
                  {!isProcessed ? <Skel h="h-9" w="w-3/4" /> : (
                    <p className="relative font-black leading-none tracking-[-0.05em] dark:text-white text-slate-800" style={{ fontSize: "clamp(1.1rem, 2vw, 1.7rem)" }}>
                      {provisao > 0 ? fmtBRL(provisao) : diasUteisRestantes === 0 ? "Mês completo" : "—"}
                    </p>
                  )}
                  <p className="relative text-[10px] uppercase tracking-[0.2em] text-emerald-500/80 font-semibold">Projeção até fim do mês</p>
                  <div className="h-px relative" style={{ background: "var(--sgt-divider)" }} />
                  <div className="relative">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {diasUteisRestantes > 0 ? `${diasUteisRestantes} dias úteis restantes` : "Sem dias úteis restantes"}
                    </span>
                  </div>
                </div>
              </AnimatedCard>

            </div>

            {/* Top 5 + Tabela lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 auto-rows-fr items-stretch xl:min-h-0">

              {/* Top 5 */}
              <AnimatedCard delay={180} className="h-full">
                <div className="relative overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4 xl:p-5 flex flex-col gap-3 h-full min-h-[260px] xl:min-h-0">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/40 to-transparent" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: "var(--sgt-text-muted)" }}>Top 5 clientes</span>
                  {!isProcessed ? (
                    <div className="flex flex-col gap-2">{[...Array(5)].map((_,i) => <Skel key={i} h="h-6" />)}</div>
                  ) : top5.length === 0 ? (
                    <p className="text-[12px] text-slate-500 my-auto">Sem dados no período</p>
                  ) : (
                    <div className="flex flex-col gap-2.5 flex-1 justify-around">
                      {top5.map((r, i) => (
                        <div key={r.descri} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold shrink-0 w-4 text-right" style={{ color: COLORS[i] }}>{i+1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-[11px] font-semibold truncate dark:text-slate-200 text-slate-700">{r.descri}</span>
                              <span className="text-[10px] font-bold shrink-0 dark:text-slate-300 text-slate-600">{fmtK(r.total)}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(r.total/maxTotal)*100}%`, background: COLORS[i] }} />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold shrink-0 w-10 text-right" style={{ color: COLORS[i] }}>{r.pct.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>


              </AnimatedCard>

              {/* Tabela */}
              <AnimatedCard delay={220} className="flex flex-col h-full min-h-0">
              <div className="relative flex flex-col overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] h-full min-h-[260px] xl:min-h-0">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/30 to-transparent" />

                {/* Tabela header */}
                <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--sgt-border-subtle)", background: "var(--sgt-table-head)" }}>
                  <span className="text-[9px] font-bold uppercase tracking-[0.28em] mr-auto" style={{ color: "var(--sgt-text-muted)" }}>
                    Faturamento por cliente / grupo
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-7 rounded-lg border px-2.5 text-[11px] outline-none transition-all w-36"
                    style={{ background: "var(--sgt-input-bg)", borderColor: "var(--sgt-input-border)", color: "var(--sgt-text-primary)" }}
                  />
                  <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition-all hover:opacity-80"
                    style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-secondary)", background: "var(--sgt-input-bg)" }}>
                    {sortDir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                    {sortDir === "desc" ? "Maior" : "Menor"}
                  </button>
                </div>

                {/* Cabeçalho colunas */}
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(7.5rem,9rem)_3.75rem] gap-3 px-4 py-2 shrink-0 text-[9px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: "var(--sgt-text-faint)", borderBottom: "1px solid var(--sgt-divider)" }}>
                  <span>Cliente / Grupo</span>
                  <span className="text-right">Faturamento</span>
                  <span className="text-right">Part. %</span>
                </div>

                {/* Linhas */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {!isProcessed ? (
                    <div className="flex flex-col gap-2 p-4">
                      {[...Array(8)].map((_,i) => <Skel key={i} h="h-8" />)}
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                      <TrendingUp className="h-10 w-10 text-amber-400/30" />
                      <p className="text-[13px]" style={{ color: "var(--sgt-text-muted)" }}>Sem dados no período selecionado</p>
                      <p className="text-[11px]" style={{ color: "var(--sgt-text-faint)" }}>Selecione um período e clique em Atualizar</p>
                    </div>
                  ) : (
                    rows.map((r, i) => (
                      <div key={`${r.descri}-${i}`}
                        className="grid grid-cols-[minmax(0,1fr)_minmax(7.5rem,9rem)_3.75rem] gap-3 px-4 py-2.5 items-center transition-colors"
                        style={{
                          borderBottom: "1px solid var(--sgt-divider)",
                          background: i % 2 === 1 ? "var(--sgt-row-alt)" : "transparent",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--sgt-row-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? "var(--sgt-row-alt)" : "transparent")}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold shrink-0 w-5 text-right tabular-nums" style={{ color: "var(--sgt-text-faint)" }}>{i+1}</span>
                          <span className="text-[12px] font-medium min-w-0 flex-[0_1_42%] truncate" style={{ color: "var(--sgt-text-primary)" }}>{r.descri}</span>
                          <div className="flex-1 h-1.5 overflow-hidden rounded-full mx-1 min-w-[36px]" style={{ background: "var(--sgt-progress-track)" }}>
                            <div className="h-full rounded-full bg-amber-400/70 transition-all duration-700" style={{ width: `${Math.min(r.pct, 100)}%` }} />
                          </div>
                        </div>
                        <span className="text-[12px] font-bold tabular-nums text-right dark:text-amber-200 text-amber-700">{fmtBRL(r.total)}</span>
                        <span className="text-[11px] font-bold tabular-nums text-right dark:text-slate-300 text-slate-600">{r.pct.toFixed(1)}%</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Rodapé */}
                {rows.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 shrink-0"
                    style={{ borderTop: "1px solid var(--sgt-border-subtle)", background: "var(--sgt-table-head)" }}>
                    <span className="text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>{rows.length} clientes/grupos</span>
                    <span className="text-[11px] font-bold dark:text-amber-200 text-amber-700">{fmtBRL(totalFaturado)}</span>
                  </div>
                )}
              </div>
            </AnimatedCard>


            </div>

            {/* Gráficos mensais */}
            {(() => {
              const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
              const anoAtual = dwFilter.dataFim ? new Date(dwFilter.dataFim).getFullYear() : new Date().getFullYear();
              const anoAnt   = anoAtual - 1;
              const maxVal   = Math.max(...faturamentoMensal, ...faturamentoMensalAnterior, 1);
              const fmtY = (v: number) => v >= 1e6 ? `R$ ${(v/1e6).toFixed(1).replace(".",",")}M` : v >= 1e3 ? `R$ ${(v/1e3).toFixed(0)}k` : "0";
              const buildPath = (data: number[], w: number, h: number, padL: number, padR: number, padT: number, padB: number) => {
                const toX = (i: number) => padL + (i / 11) * (w - padL - padR);
                const toY = (v: number) => padT + (h - padT - padB) - (v / maxVal) * (h - padT - padB);
                let d = `M${toX(0)},${toY(data[0])}`;
                for (let i = 1; i < 12; i++) {
                  const x0 = toX(i-1), y0 = toY(data[i-1]), x1 = toX(i), y1 = toY(data[i]);
                  d += ` C${x0+(x1-x0)*0.3},${y0} ${x1-(x1-x0)*0.3},${y1} ${x1},${y1}`;
                }
                return d;
              };
              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 auto-rows-fr items-stretch xl:min-h-0 xl:h-full">
                  {/* Gráfico 1 — Linha: Ano atual vs Ano anterior */}
                  <AnimatedCard delay={280} className="h-full">
                    <div className="relative overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4 flex flex-col gap-2 h-full min-h-[320px] xl:min-h-0">
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/50 to-transparent" />
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: "var(--sgt-text-muted)" }}>Faturamento Mensal — {anoAtual} vs {anoAnt}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="h-[2px] w-4 rounded-full bg-amber-400 inline-block" />
                            <span className="text-[9px] font-semibold text-amber-400">{anoAtual}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,3"/></svg>
                            <span className="text-[9px] font-semibold text-slate-400">{anoAnt}</span>
                          </div>
                        </div>
                      </div>
                      {isFetchingCharts || faturamentoMensal.every(v => v === 0) ? (
                        <div className="flex flex-col gap-2 flex-1 justify-center py-4">
                          {isFetchingCharts ? (
                            <>
                              <Skel h="h-28" />
                              <div className="flex justify-center gap-1">
                                {[...Array(3)].map((_,i) => <div key={i} className="h-1.5 w-1.5 rounded-full animate-pulse bg-amber-400/50" style={{ animationDelay: `${i*150}ms` }} />)}
                              </div>
                              <p className="text-[10px] text-center text-slate-500">Carregando dados mensais...</p>
                            </>
                          ) : (
                            <p className="text-[12px] text-center text-slate-500 py-8">Sem dados — clique em Atualizar</p>
                          )}
                        </div>
                      ) : (
                        <svg viewBox="0 0 480 260" preserveAspectRatio="xMidYMid meet" className="w-full flex-1 min-h-[180px]">
                        <defs>
                          <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.25"/>
                            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        {[0.25,0.5,0.75,1].map(f => (
                          <line key={f} x1={48} y1={16+(260-16-28)*(1-f)} x2={472} y2={16+(260-16-28)*(1-f)} stroke="var(--sgt-border-subtle)" strokeWidth={0.5} strokeDasharray="4,4"/>
                        ))}
                        {[0.25,0.5,0.75,1].map(f => (
                          <text key={f} x={44} y={16+(260-16-28)*(1-f)+4} textAnchor="end" fontSize={8} fill="var(--sgt-text-muted)" fontFamily="system-ui">{fmtY(maxVal*f)}</text>
                        ))}
                        <path d={`${buildPath(faturamentoMensal,480,260,48,8,16,28)} L472,232 L48,232 Z`} fill="url(#fatGrad)"/>
                        <path d={buildPath(faturamentoMensalAnterior,480,260,48,8,16,28)} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.6}/>
                        <path d={buildPath(faturamentoMensal,480,260,48,8,16,28)} fill="none" stroke="#fbbf24" strokeWidth={2.5}/>
                        {months.map((m,i) => (
                          <text key={m} x={48+(i/11)*424} y={255} textAnchor="middle" fontSize={8.5} fill="var(--sgt-text-muted)" fontFamily="system-ui">{m}</text>
                        ))}
                      </svg>
                      )}
                    </div>
                  </AnimatedCard>
                  {/* Gráfico 2 — Barras: Evolução mensal */}
                  <AnimatedCard delay={340} className="h-full">
                    <div className="relative overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4 flex flex-col gap-2 h-full min-h-[320px] xl:min-h-0">
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-400/50 to-transparent" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: "var(--sgt-text-muted)" }}>Evolução Mensal — {anoAtual}</span>
                      {isFetchingCharts || faturamentoMensal.every(v => v === 0) ? (
                        <div className="flex flex-col gap-2 flex-1 justify-center py-4">
                          {isFetchingCharts ? (
                            <>
                              <div className="flex items-end gap-1.5 h-24 px-1">
                                {[...Array(12)].map((_,i) => (
                                  <div key={i} className="flex-1 rounded-t-sm animate-pulse" style={{ height: `${20+Math.random()*60}%`, background: "var(--sgt-skeleton-bg)", animationDelay: `${i*50}ms` }} />
                                ))}
                              </div>
                              <p className="text-[10px] text-center text-slate-500">Carregando dados mensais...</p>
                            </>
                          ) : (
                            <p className="text-[12px] text-center text-slate-500 py-8">Sem dados — clique em Atualizar</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-end gap-1 sm:gap-1.5 flex-1 min-h-[180px] px-1 pt-4">
                          {faturamentoMensal.map((v, i) => {
                            const pct = maxVal > 0 ? (v / maxVal) * 100 : 0;
                            const isMax = v > 0 && v === Math.max(...faturamentoMensal);
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                                <span className="text-[7px] font-bold tabular-nums opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#22d3ee" }}>{fmtY(v)}</span>
                                <div className="w-full rounded-t-[3px] transition-all duration-700"
                                  style={{ height: `${Math.max(pct, v > 0 ? 2 : 0)}%`, background: isMax ? "linear-gradient(180deg,#22d3ee,#0891b2)" : "linear-gradient(180deg,rgba(34,211,238,0.6),rgba(8,145,178,0.4))", boxShadow: isMax ? "0 0 10px rgba(34,211,238,0.3)" : "none" }} />
                                <span className="text-[7.5px] font-medium" style={{ color: "var(--sgt-text-muted)" }}>{months[i]}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </AnimatedCard>
                </div>
              );
            })()}

          </div>
        </section>
      </div>
    </div>
  );
}
