import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Package, DollarSign, AlertTriangle, Zap, Clock } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { UpdateButton } from "@/components/shared/UpdateButton";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { InsightsSection } from "@/components/shared/InsightsSection";
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

// ─── Gráfico Acumulado ────────────────────────────────────────────────────────
interface GraficoAcumuladoProps {
  faturamentoMensal: number[];
  faturamentoMensalAnterior: number[];
  isFetchingCharts: boolean;
  dataFim: string | null;
}

function GraficoAcumulado({ faturamentoMensal, faturamentoMensalAnterior, isFetchingCharts, dataFim }: GraficoAcumuladoProps) {
  const [hover, setHover] = useState<{ x: number; idx: number } | null>(null);

  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const anoAtual = dataFim ? new Date(dataFim).getFullYear() : new Date().getFullYear();
  const anoAnt   = anoAtual - 1;
  const mesFiltro = dataFim ? new Date(dataFim).getMonth() : 11;

  const acumAtual = useMemo<(number | null)[]>(() => {
    const arr: (number | null)[] = [];
    let soma = 0;
    for (let i = 0; i < 12; i++) {
      if (i <= mesFiltro) { soma += faturamentoMensal[i] ?? 0; arr.push(soma); }
      else arr.push(null);
    }
    return arr;
  }, [faturamentoMensal, mesFiltro]);

  const acumAnt = useMemo<number[]>(() => {
    const arr: number[] = [];
    let soma = 0;
    for (let i = 0; i < 12; i++) { soma += faturamentoMensalAnterior[i] ?? 0; arr.push(soma); }
    return arr;
  }, [faturamentoMensalAnterior]);

  const W = 480, H = 220, padL = 52, padR = 8, padT = 16, padB = 28;
  const validAtual = acumAtual.filter((v): v is number => v !== null);
  const maxVal = Math.max(...validAtual, ...acumAnt, 1);

  const toX = (i: number) => padL + (i / 11) * (W - padL - padR);
  const toY = (v: number) => padT + (H - padT - padB) - (v / maxVal) * (H - padT - padB);
  const fmtY    = (v: number) => v >= 1e6 ? `R$ ${(v/1e6).toFixed(1).replace(".",",")}M` : v >= 1e3 ? `R$ ${(v/1e3).toFixed(0)}k` : "R$ 0";
  const fmtFull = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const buildPath = (data: (number | null)[]) => {
    const pts = data.map((v, i) => v !== null ? { x: toX(i), y: toY(v) } : null);
    const valid = pts.filter((p): p is { x: number; y: number } => p !== null);
    if (valid.length === 0) return "";
    let d = `M${valid[0].x},${valid[0].y}`;
    for (let i = 1; i < valid.length; i++) {
      const p0 = valid[i-1], p1 = valid[i];
      d += ` C${p0.x+(p1.x-p0.x)*0.3},${p0.y} ${p1.x-(p1.x-p0.x)*0.3},${p1.y} ${p1.x},${p1.y}`;
    }
    return d;
  };

  const pathAtual = buildPath(acumAtual);
  const pathAnt   = buildPath(acumAnt);
  const areaPath  = pathAtual ? `${pathAtual} L${toX(mesFiltro)},${toY(0)} L${toX(0)},${toY(0)} Z` : "";

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * W;
    const raw = (px - padL) / (W - padL - padR) * 11;
    const idx = Math.max(0, Math.min(11, Math.round(raw)));
    setHover({ x: toX(idx), idx });
  };

  return (
    <AnimatedCard delay={280}>
      <div className="relative overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] p-4 flex flex-col gap-3 h-full">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400/50 to-transparent" />
        <div className="flex items-center justify-between shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: "var(--sgt-text-muted)" }}>
            Faturamento Acumulado — {anoAtual} vs {anoAnt}
          </span>
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
                <div className="h-40 w-full rounded-md animate-pulse" style={{ background: "var(--sgt-skeleton-bg)" }} />
                <p className="text-[10px] text-center text-slate-500">Carregando dados mensais...</p>
              </>
            ) : (
              <p className="text-[12px] text-center text-slate-500 py-8">Sem dados — clique em Atualizar</p>
            )}
          </div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
            className="w-full flex-1 cursor-crosshair" style={{ minHeight: 160 }}
            onMouseMove={handleMouseMove} onMouseLeave={() => setHover(null)}>
            <defs>
              <linearGradient id="fatGradAcum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.18"/>
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/>
              </linearGradient>
              <clipPath id="yc-clip"><rect x={padL} y={padT} width={W-padL-padR} height={H-padT-padB}/></clipPath>
            </defs>

            {[0.25,0.5,0.75,1].map(f => (
              <line key={f} x1={padL} y1={toY(maxVal*f)} x2={W-padR} y2={toY(maxVal*f)}
                stroke="var(--sgt-border-subtle)" strokeWidth={0.5} strokeDasharray="4,4"/>
            ))}
            {[0.25,0.5,0.75,1].map(f => (
              <text key={f} x={padL-4} y={toY(maxVal*f)+3} textAnchor="end"
                fontSize={7.5} fill="var(--sgt-text-muted)" fontFamily="system-ui">{fmtY(maxVal*f)}</text>
            ))}

            {areaPath && <path d={areaPath} fill="url(#fatGradAcum)" clipPath="url(#yc-clip)"/>}
            <path d={pathAnt}   fill="none" stroke="#64748b" strokeWidth={1.2} strokeDasharray="5,4" opacity={0.4} clipPath="url(#yc-clip)"/>
            <path d={pathAtual} fill="none" stroke="#fbbf24" strokeWidth={2}   clipPath="url(#yc-clip)"/>

            {acumAtual[mesFiltro] !== null && (
              <circle cx={toX(mesFiltro)} cy={toY(acumAtual[mesFiltro] as number)}
                r={3.5} fill="#fbbf24" stroke="var(--sgt-bg-card)" strokeWidth={1.5}/>
            )}

            {months.map((m,i) => (
              <text key={m} x={toX(i)} y={H-4} textAnchor="middle" fontSize={8}
                fill={i === mesFiltro ? "#fbbf24" : "var(--sgt-text-muted)"}
                fontWeight={i === mesFiltro ? "700" : "400"}
                fontFamily="system-ui">{m}</text>
            ))}

            {hover && (
              <line x1={hover.x} y1={padT} x2={hover.x} y2={H-padB}
                stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="3,3"/>
            )}
            {hover && acumAtual[hover.idx] !== null && (
              <circle cx={hover.x} cy={toY(acumAtual[hover.idx] as number)}
                r={4} fill="#fbbf24" stroke="var(--sgt-bg-card)" strokeWidth={1.5}/>
            )}
            {hover && (
              <circle cx={hover.x} cy={toY(acumAnt[hover.idx])}
                r={3} fill="#94a3b8" stroke="var(--sgt-bg-card)" strokeWidth={1.5} opacity={0.6}/>
            )}

            {hover && (() => {
              const vAtual = acumAtual[hover.idx];
              const vAnt   = acumAnt[hover.idx];
              const delta  = vAtual !== null && vAnt > 0 ? ((vAtual - vAnt) / vAnt) * 100 : null;
              const tw = 160, th = vAtual !== null ? 70 : 52;
              const tx = hover.x + 10 + tw > W - padR ? hover.x - tw - 10 : hover.x + 10;
              const ty = padT + 8;
              return (
                <g>
                  <rect x={tx} y={ty} width={tw} height={th} rx={6}
                    fill="var(--sgt-bg-section)" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5}/>
                  <text x={tx+10} y={ty+14} fontSize={9} fontWeight="700"
                    fill="rgba(255,255,255,0.9)" fontFamily="system-ui">{months[hover.idx]}</text>
                  {delta !== null && (
                    <text x={tx+tw-8} y={ty+14} textAnchor="end" fontSize={8} fontWeight="700"
                      fill={delta >= 0 ? "#4ade80" : "#f87171"} fontFamily="system-ui">
                      {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
                    </text>
                  )}
                  {vAtual !== null && (
                    <>
                      <circle cx={tx+9} cy={ty+27} r={3} fill="#fbbf24"/>
                      <text x={tx+17} y={ty+31} fontSize={8.5} fill="#fbbf24" fontFamily="system-ui" fontWeight="600">
                        {anoAtual}: {fmtFull(vAtual)}
                      </text>
                    </>
                  )}
                  <circle cx={tx+9} cy={ty+(vAtual !== null ? 45 : 28)} r={2.5} fill="#94a3b8" opacity={0.6}/>
                  <text x={tx+17} y={ty+(vAtual !== null ? 49 : 32)} fontSize={8.5}
                    fill="rgba(148,163,184,0.6)" fontFamily="system-ui">
                    {anoAnt}: {fmtFull(vAnt)}
                  </text>
                </g>
              );
            })()}
          </svg>
        )}
      </div>
    </AnimatedCard>
  );
}

export default function Faturamento() {
  const navigate = useNavigate();
  const { faturamento, faturamentoMensal, faturamentoMensalAnterior, isFetchingDw, isFetchingCharts, isProcessed, dwFilter, setDwFilter, fetchFromDW, filiais, empresas, dwError, manutencao, frota } = useFinancialData();
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
  const { diasUteis, mediaDiaUtil, diasUteisRestantes, diasUteisMes, provisao } = useMemo(() => {
    const inicio = parseDate(dwFilter.dataInicio);
    const fim    = parseDate(dwFilter.dataFim);
    if (!inicio || !fim || totalFaturado === 0) {
      return { diasUteis: 0, mediaDiaUtil: 0, diasUteisRestantes: 0, diasUteisMes: 0, provisao: 0 };
    }

    // Dias úteis no período filtrado
    const diasUteis = countWorkdays(inicio, fim);

    // Média por dia útil
    const mediaDiaUtil = diasUteis > 0 ? totalFaturado / diasUteis : 0;

    // Dias úteis restantes: do dia seguinte ao fim do filtro até o último dia do mês de fim
    const ultimoDiaMes = new Date(fim.getFullYear(), fim.getMonth() + 1, 0);
    const amanha = new Date(fim);
    amanha.setDate(amanha.getDate() + 1);
    const diasUteisRestantes = amanha <= ultimoDiaMes ? countWorkdays(amanha, ultimoDiaMes) : 0;

    // Total de dias úteis do mês inteiro (do dia 1 ao último dia do mês de fim)
    const primeiroDiaMes = new Date(fim.getFullYear(), fim.getMonth(), 1);
    const diasUteisMes = countWorkdays(primeiroDiaMes, ultimoDiaMes);

    // Projeção = média/dia útil × total de dias úteis do mês
    const provisao = mediaDiaUtil * diasUteisMes;

    return { diasUteis, mediaDiaUtil, diasUteisRestantes, diasUteisMes, provisao };
  }, [dwFilter.dataInicio, dwFilter.dataFim, totalFaturado]);

  const rows = useMemo(() => {
    let data = faturamento
      .filter(r => (r.DESCRI ?? "").toLowerCase().includes(search.toLowerCase()))
      .map(r => ({ descri: r.DESCRI ?? "Sem descrição", total: r.FRETE_TOTAL ?? 0, pct: r.PERCENTUAL ?? 0 }));
    data.sort((a, b) => sortDir === "desc" ? b.total - a.total : a.total - b.total);
    return data;
  }, [faturamento, sortDir, search]);

  const top5 = useMemo(() => [...rows].sort((a,b) => b.total - a.total).slice(0, 5), [rows]);

  // ── OS em ANDAMENTO (situação "A" no banco) ───────────────────────────────
  const osEmAndamento = useMemo(() => {
    const abertas = manutencao.filter(o => o.situacao === "ANDAMENTO");
    // Agrupa por veículo — cada veículo com pelo menos 1 OS aberta está imobilizado
    const veiculosMap = new Map<string, { ordens: number; custo: number; classificacoes: Set<string> }>();
    for (const o of abertas) {
      const vei = String(o.veiculo ?? "Indefinido");
      if (!veiculosMap.has(vei)) veiculosMap.set(vei, { ordens: 0, custo: 0, classificacoes: new Set() });
      const entry = veiculosMap.get(vei)!;
      entry.ordens += 1;
      entry.custo += (o.valorpc ?? 0) + (o.valorpc2 ?? 0) + (o.valormo ?? 0) + (o.valormo2 ?? 0);
      if (o.classificacao) entry.classificacoes.add(o.classificacao);
    }
    const veiculos = Array.from(veiculosMap.entries())
      .map(([veiculo, v]) => ({ veiculo, ordens: v.ordens, custo: v.custo, classificacoes: [...v.classificacoes] }))
      .sort((a, b) => b.ordens - a.ordens);
    return {
      totalOS: abertas.length,
      totalVeiculos: veiculos.length,
      custoPrevisto: abertas.reduce((s, o) => s + (o.valorpc ?? 0) + (o.valorpc2 ?? 0) + (o.valormo ?? 0) + (o.valormo2 ?? 0), 0),
      veiculos: veiculos.slice(0, 5),
    };
  }, [manutencao]);
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
          <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
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
          <div className="flex sm:hidden flex-col gap-2 py-1">
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
          <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 overflow-y-auto w-full">

            {/* KPIs linha 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-fr items-stretch sgt-stagger">

              {/* KPI Total */}
              <AnimatedCard delay={0}>
                <div className="sgt-kpi-card relative overflow-hidden rounded-[14px] border border-amber-500/[0.18] bg-[var(--sgt-bg-card)] p-4 xl:p-5 flex flex-col gap-3 h-full">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.10),transparent_55%)]" />
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400/70 to-amber-700/20" />
                  <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36"
                    style={{ background: "radial-gradient(circle at 100% 100%, rgba(245,158,11,0.10), transparent 65%)" }} />
                  <div className="relative flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Faturamento Total</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/[0.08] border border-amber-400/[0.15]">
                      <TrendingUp className="h-3 w-3 text-amber-300" />
                    </div>
                  </div>
                  {!isProcessed ? <Skel h="h-9" w="w-3/4" /> : (
                    <p className="relative font-black leading-none tracking-[-0.05em] dark:text-white text-slate-800 sgt-count-up sgt-pulse-glow" style={{ fontSize: "clamp(1.3rem, 2.4vw, 2rem)" }}>
                      {fmtBRL(totalFaturado)}
                    </p>
                  )}
                  <p className="relative text-[10px] uppercase tracking-[0.15em] text-slate-500 font-medium">Receita consolidada</p>
                  <div className="h-px relative" style={{ background: "var(--sgt-divider)" }} />
                  <div className="relative flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{diasUteis} dias úteis no período</span>
                    <span className="text-[13px] font-extrabold dark:text-white text-slate-700">{faturamento.length} clientes</span>
                  </div>
                </div>
              </AnimatedCard>

              {/* Média por dia útil */}
              <AnimatedCard delay={60}>
                <div className="sgt-kpi-card relative overflow-hidden rounded-[14px] border border-cyan-500/[0.18] bg-[var(--sgt-bg-card)] p-4 xl:p-5 flex flex-col gap-3 h-full">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.08),transparent_55%)]" />
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cyan-400/70 to-cyan-700/20" />
                  <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36"
                    style={{ background: "radial-gradient(circle at 100% 100%, rgba(6,182,212,0.08), transparent 65%)" }} />
                  <div className="relative flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Média / Dia Útil</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/[0.08] border border-cyan-400/[0.15]">
                      <ArrowUp className="h-3 w-3 text-cyan-300" />
                    </div>
                  </div>
                  {!isProcessed ? <Skel h="h-9" w="w-3/4" /> : (
                    <p className="relative font-black leading-none tracking-[-0.05em] dark:text-white text-slate-800 sgt-count-up" style={{ fontSize: "clamp(1.1rem, 2vw, 1.7rem)" }}>
                      {mediaDiaUtil > 0 ? fmtK(mediaDiaUtil) : "—"}
                    </p>
                  )}
                  <p className="relative text-[10px] uppercase tracking-[0.15em] text-slate-500 font-medium">Por dia útil (sáb. incluso)</p>
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
                <div className="sgt-kpi-card relative overflow-hidden rounded-[14px] border border-emerald-500/[0.18] bg-[var(--sgt-bg-card)] p-4 xl:p-5 flex flex-col gap-3 h-full">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_55%)]" />
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-400/70 to-emerald-700/20" />
                  <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36"
                    style={{ background: "radial-gradient(circle at 100% 100%, rgba(16,185,129,0.08), transparent 65%)" }} />
                  <div className="relative flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Faturamento Projetado</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/[0.08] border border-emerald-400/[0.15]">
                      <TrendingUp className="h-3 w-3 text-emerald-300" />
                    </div>
                  </div>
                  {!isProcessed ? <Skel h="h-9" w="w-3/4" /> : (
                    <p className="relative font-black leading-none tracking-[-0.05em] dark:text-white text-slate-800 sgt-count-up" style={{ fontSize: "clamp(1.1rem, 2vw, 1.7rem)" }}>
                      {provisao > 0 ? fmtBRL(provisao) : diasUteisMes === 0 ? "—" : "—"}
                    </p>
                  )}
                  <p className="relative text-[10px] uppercase tracking-[0.15em] text-slate-500 font-medium">Projeção até fim do mês</p>
                  <div className="h-px relative" style={{ background: "var(--sgt-divider)" }} />
                  <div className="relative">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {mediaDiaUtil > 0 && diasUteisMes > 0 ? `Média/dia × ${diasUteisMes} dias úteis no mês` : "Sem dados suficientes"}
                    </span>
                  </div>
                </div>
              </AnimatedCard>

            </div>

            {/* ── LINHA 2: Grupo de Cliente | Gráfico Acumulado ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">

            {/* ── CARD: Faturamento por Grupo de Cliente ── */}
            <AnimatedCard delay={160}>
              <div className="relative overflow-hidden rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-card)] flex flex-col h-full">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/50 to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0 border-b border-[var(--sgt-border-subtle)]"
                  style={{ background: "var(--sgt-table-head)" }}>
                  <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
                    Faturamento por Grupo de Cliente
                  </span>
                  {isProcessed && rows.length > 0 && (
                    <span className="text-[10px] font-medium text-slate-500">
                      {rows.length} {rows.length === 1 ? "grupo" : "grupos"}
                    </span>
                  )}
                </div>

                {/* Column headers */}
                {isProcessed && rows.length > 0 && (
                  <div className="grid grid-cols-[minmax(0,1fr)_11rem_4.5rem] gap-3 px-4 py-2 shrink-0 border-b border-[var(--sgt-divider)]">
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">Grupo</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600 text-right">Faturamento</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600 text-right">Part. %</span>
                  </div>
                )}

                {/* Rows */}
                <div className="flex flex-col overflow-y-auto sgt-stagger" style={{ maxHeight: 360 }}>
                  {!isProcessed ? (
                    <div className="flex flex-col gap-2 p-4">
                      {[...Array(5)].map((_, i) => <Skel key={i} h="h-9" />)}
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                      <TrendingUp className="h-8 w-8 text-amber-400/25" />
                      <p className="text-[12px] text-slate-500">Sem dados no período selecionado</p>
                      <p className="text-[11px] text-slate-600">Selecione um período e clique em Atualizar</p>
                    </div>
                  ) : (
                    rows.map((r, i) => {
                      const barW = totalFaturado > 0 ? Math.min((r.total / totalFaturado) * 100, 100) : 0;
                      const STRIPE_COLORS = ["#f59e0b","#22d3ee","#a78bfa","#34d399","#f87171","#fb923c","#60a5fa","#e879f9"];
                      const color = STRIPE_COLORS[i % STRIPE_COLORS.length];
                      return (
                        <div
                          key={`${r.descri}-${i}`}
                          className="grid grid-cols-[minmax(0,1fr)_11rem_4.5rem] gap-3 px-4 py-2.5 items-center transition-colors border-b border-[var(--sgt-divider)] last:border-0"
                          style={{ background: i % 2 === 1 ? "var(--sgt-row-alt)" : "transparent" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--sgt-row-hover)")}
                          onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? "var(--sgt-row-alt)" : "transparent")}
                        >
                          {/* Rank + nome + barra */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[10px] font-bold shrink-0 w-4 text-right tabular-nums" style={{ color: "var(--sgt-text-faint)" }}>
                              {i + 1}
                            </span>
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <span className="text-[12px] font-semibold truncate" style={{ color: "var(--sgt-text-primary)" }}>
                                {r.descri}
                              </span>
                              <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--sgt-progress-track)" }}>
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${barW}%`, background: color }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Valor */}
                          <span className="text-[12px] font-bold tabular-nums text-right" style={{ color }}>
                            {fmtBRL(r.total)}
                          </span>

                          {/* Participação */}
                          <span className="text-[11px] font-bold tabular-nums text-right text-slate-400">
                            {r.pct.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {isProcessed && rows.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--sgt-border-subtle)]"
                    style={{ background: "var(--sgt-table-head)" }}>
                    <span className="text-[10px] text-slate-500">{rows.length} {rows.length === 1 ? "grupo" : "grupos"}</span>
                    <span className="text-[12px] font-bold text-amber-300 tabular-nums">{fmtBRL(totalFaturado)}</span>
                  </div>
                )}
              </div>
            </AnimatedCard>



            {/* Gráfico acumulado */}
            <GraficoAcumulado
              faturamentoMensal={faturamentoMensal}
              faturamentoMensalAnterior={faturamentoMensalAnterior}
              isFetchingCharts={isFetchingCharts}
              dataFim={dwFilter.dataFim}
            />

            </div> {/* fim grid linha 2 */}

            <InsightsSection
              setor="faturamento"
              dados={{
                totalFaturado,
                mediaDiaUtil: Math.round(mediaDiaUtil),
                provisao: Math.round(provisao),
                diasUteis,
                diasUteisRestantes,
                diasUteisMes,
                qtdClientes: rows.length,
                top5Clientes: top5.map(r => ({ nome: r.descri, valor: Math.round(r.total), percentual: parseFloat(r.pct.toFixed(1)) })),
                // OS em andamento (situação A) — caminhões imobilizados
                osAndamento_totalOS: osEmAndamento.totalOS,
                osAndamento_totalVeiculos: osEmAndamento.totalVeiculos,
                osAndamento_custoPrevisto: Math.round(osEmAndamento.custoPrevisto),
                osAndamento_veiculos: osEmAndamento.veiculos,
                osAndamento_totalVeiculosAtivos: frota.filter(v => v.situacao === "ATIVO").length,
                osAndamento_receitaDiariaPerdida: (() => {
                  const veiculosAtivos = frota.filter(v => v.situacao === "ATIVO").length;
                  if (osEmAndamento.totalVeiculos === 0 || mediaDiaUtil === 0 || veiculosAtivos === 0) return 0;
                  // Receita perdida = proporção da frota parada × receita diária total
                  return Math.round((osEmAndamento.totalVeiculos / veiculosAtivos) * mediaDiaUtil);
                })(),
              }}
              periodo={`${dwFilter.dataInicio} a ${dwFilter.dataFim}`}
              autoGenerate={true}
            />

          </div>
        </section>
      </div>
    </div>
  );
}
