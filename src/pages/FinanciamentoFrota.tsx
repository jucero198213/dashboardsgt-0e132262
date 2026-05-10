// ─────────────────────────────────────────────────────────────────────────────
//  FinanciamentoFrota.tsx  –  Painel de financiamentos de veículos da frota
//  Dados vindos de /dw-financiamento-frota (cada linha = uma parcela de um contrato)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck, CreditCard, DollarSign, TrendingDown,
  Search, ChevronUp, ChevronDown, ChevronRight,
  FileText, Landmark, BarChart3,
} from "lucide-react";
import sgtLogo from "@/assets/sgt-logo.png";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { UpdateButton } from "@/components/shared/UpdateButton";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { fetchFinanciamentoFrota, type FinanciamentoFrotaRow } from "@/lib/dwApi";

// ─── Formatadores ─────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtN = (v: number) => v.toLocaleString("pt-BR");

// ─── Cores por banco ──────────────────────────────────────────────────────────

const BANCO_PALETTE: { key: string; color: string; rgb: string }[] = [
  { key: "SCANIA",     color: "#60a5fa", rgb: "96,165,250"   },
  { key: "BRADESCO",   color: "#f472b6", rgb: "244,114,182"  },
  { key: "ITAU",       color: "#fbbf24", rgb: "251,191,36"   },
  { key: "SANTANDER",  color: "#f87171", rgb: "248,113,113"  },
  { key: "BB",         color: "#34d399", rgb: "52,211,153"   },
  { key: "CEF",        color: "#a78bfa", rgb: "167,139,250"  },
  { key: "SICOOB",     color: "#22d3ee", rgb: "34,211,238"   },
  { key: "VOLVO",      color: "#fb923c", rgb: "251,146,60"   },
  { key: "MERCEDES",   color: "#94a3b8", rgb: "148,163,184"  },
];

function getBancoStyle(banco: string | null): { color: string; rgb: string } {
  if (!banco) return { color: "#94a3b8", rgb: "148,163,184" };
  const up = banco.toUpperCase();
  const match = BANCO_PALETTE.find((p) => up.includes(p.key));
  return match ?? { color: "#94a3b8", rgb: "148,163,184" };
}

// cores para bancos não mapeados (geradas por índice)
const FALLBACK_COLORS = [
  { color: "#60a5fa", rgb: "96,165,250" },
  { color: "#34d399", rgb: "52,211,153" },
  { color: "#f472b6", rgb: "244,114,182" },
  { color: "#fbbf24", rgb: "251,191,36" },
  { color: "#a78bfa", rgb: "167,139,250" },
  { color: "#22d3ee", rgb: "34,211,238" },
  { color: "#fb923c", rgb: "251,146,60" },
];

function getBancoColor(banco: string | null, bancoIndex: Map<string, number>): { color: string; rgb: string } {
  if (!banco) return { color: "#94a3b8", rgb: "148,163,184" };
  const style = getBancoStyle(banco);
  if (style.color !== "#94a3b8") return style;
  // fallback por índice
  const idx = bancoIndex.get(banco) ?? 0;
  return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────

interface Contrato {
  veiculo:         string;
  frota:           string | null;
  banco:           string | null;
  chassi:          string | null;
  anomod:          number | null;
  anofab:          number | null;
  contrato:        string | number | null;
  nota:            string | number | null;
  valor_aquisicao: number | null;
  total_parcelas:  number | null;
  parcela_atual:   number | null;
  valor_parcela:   number | null;
  juros_total:     number;
  valor_pago_total:number;
  situacao:        string | null;
  filial:          string | null;
  parcelas_abertas:number;
  compromisso:     number;
  divida_estimada: number;
  parcelas:        FinanciamentoFrotaRow[];
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FinanciamentoFrota() {
  const {
    dwFilter,
    setDwFilter,
    empresas,
    filiais,
    isFetchingDw,
    fetchFromDW,
    loadingPhase,
    progress,
  } = useFinancialData();

  const [search, setSearch]             = useState("");
  const [filtroBanco, setFiltroBanco]   = useState("__all__");
  const [filtroFrota, setFiltroFrota]   = useState("__all__");
  const [filtroSit, setFiltroSit]       = useState("__all__");
  const [sortCol, setSortCol]           = useState<keyof Contrato>("banco");
  const [sortAsc, setSortAsc]           = useState(true);
  const [expandedRow, setExpandedRow]   = useState<string | null>(null);

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: resp, isLoading, refetch } = useQuery({
    queryKey: ["financiamento-frota", dwFilter.dataInicio, dwFilter.dataFim, dwFilter.filial, dwFilter.empresa],
    queryFn: () => fetchFinanciamentoFrota({
      dataInicio: dwFilter.dataInicio,
      dataFim:    dwFilter.dataFim,
      filial:     dwFilter.filial,
    }),
    staleTime: 10 * 60_000,
  });

  const rows: FinanciamentoFrotaRow[] = useMemo(() => resp?.data ?? [], [resp]);

  // ── Agrupa por veículo (um contrato = um veículo) ─────────────────────────
  const contratos: Contrato[] = useMemo(() => {
    const map = new Map<string, Contrato>();

    for (const r of rows) {
      const key = String(r.veiculo ?? "?");
      if (!map.has(key)) {
        map.set(key, {
          veiculo:          String(r.veiculo ?? ""),
          frota:            r.frota,
          banco:            r.banco,
          chassi:           r.chassi,
          anomod:           r.anomod,
          anofab:           r.anofab,
          contrato:         r.contrato,
          nota:             r.nota,
          valor_aquisicao:  r.valor_aquisicao,
          total_parcelas:   r.total_parcelas,
          parcela_atual:    r.parcela_atual,
          valor_parcela:    r.valor_parcela,
          juros_total:      0,
          valor_pago_total: 0,
          situacao:         r.situacao,
          filial:           r.filial,
          parcelas_abertas: 0,
          compromisso:      0,
          divida_estimada:  0,
          parcelas:         [],
        });
      }
      const c = map.get(key)!;
      c.parcelas.push(r);
      c.juros_total      += r.juros ?? 0;
      c.valor_pago_total += r.valor_pago ?? 0;

      // parcela mais recente = parcela_atual
      if ((r.parcela_atual ?? 0) > (c.parcela_atual ?? 0)) {
        c.parcela_atual  = r.parcela_atual;
        c.situacao       = r.situacao;
        c.valor_parcela  = r.valor_parcela;
        c.total_parcelas = r.total_parcelas;
        c.banco          = r.banco;
      }
    }

    // calcula derivados depois de agregar
    for (const c of map.values()) {
      const restantes      = Math.max(0, (c.total_parcelas ?? 0) - (c.parcela_atual ?? 0));
      c.parcelas_abertas   = restantes;
      c.compromisso        = c.valor_parcela ?? 0;
      c.divida_estimada    = restantes * (c.valor_parcela ?? 0);
    }

    return Array.from(map.values());
  }, [rows]);

  // ── Opções de filtro ──────────────────────────────────────────────────────
  const bancos  = useMemo(() => [...new Set(contratos.map((c) => c.banco).filter(Boolean))].sort() as string[], [contratos]);
  const frotas  = useMemo(() => [...new Set(contratos.map((c) => c.frota).filter(Boolean))].sort() as string[], [contratos]);
  const situacs = useMemo(() => [...new Set(contratos.map((c) => c.situacao).filter(Boolean))].sort() as string[], [contratos]);

  // índice de banco para cores de fallback
  const bancoIndex = useMemo(() => {
    const m = new Map<string, number>();
    bancos.forEach((b, i) => m.set(b, i));
    return m;
  }, [bancos]);

  // ── Filtro + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contratos
      .filter((c) => {
        const matchSearch = !q || [c.veiculo, c.banco, c.frota, c.chassi, String(c.contrato ?? "")]
          .some((v) => v?.toLowerCase().includes(q));
        const matchBanco = filtroBanco === "__all__" || c.banco === filtroBanco;
        const matchFrota = filtroFrota === "__all__" || c.frota === filtroFrota;
        const matchSit   = filtroSit   === "__all__" || c.situacao === filtroSit;
        return matchSearch && matchBanco && matchFrota && matchSit;
      })
      .sort((a, b) => {
        const va = a[sortCol], vb = b[sortCol];
        if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
        return sortAsc
          ? String(va ?? "").localeCompare(String(vb ?? ""))
          : String(vb ?? "").localeCompare(String(va ?? ""));
      });
  }, [contratos, search, filtroBanco, filtroFrota, filtroSit, sortCol, sortAsc]);

  // ── KPIs globais ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    totalContratos:    contratos.length,
    compromissoMensal: contratos.reduce((s, c) => s + c.compromisso, 0),
    parcelasAbertas:   contratos.reduce((s, c) => s + c.parcelas_abertas, 0),
    jurosTotal:        contratos.reduce((s, c) => s + c.juros_total, 0),
  }), [contratos]);

  // ── Distribuição por banco ────────────────────────────────────────────────
  const porBanco = useMemo(() => {
    const map = new Map<string, { compromisso: number; count: number }>();
    for (const c of contratos) {
      const b = c.banco ?? "Sem banco";
      const cur = map.get(b) ?? { compromisso: 0, count: 0 };
      map.set(b, { compromisso: cur.compromisso + c.compromisso, count: cur.count + 1 });
    }
    return [...map.entries()]
      .map(([banco, v]) => ({ banco, ...v }))
      .sort((a, b) => b.compromisso - a.compromisso);
  }, [contratos]);

  const maxCompromisso = porBanco[0]?.compromisso ?? 1;
  const totalCompromisso = porBanco.reduce((s, b) => s + b.compromisso, 0) || 1;

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (col: keyof Contrato) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const SortIcon = ({ col }: { col: keyof Contrato }) =>
    sortCol === col
      ? sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      : <ChevronUp className="h-3 w-3 opacity-20" />;

  const anyLoading = isLoading || isFetchingDw;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col min-h-[100dvh] overflow-auto px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      <BackgroundEffects />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-hidden"
          style={{
            background:   "var(--sgt-bg-section)",
            borderColor:  "var(--sgt-border-subtle)",
            boxShadow:    "var(--sgt-section-shadow)",
          }}
        >
          {/* Progress bar */}
          <div className="h-[3px] w-full shrink-0 overflow-hidden rounded-t-[24px] bg-transparent">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-500 ease-out"
              style={{ width: anyLoading ? `${progress || 80}%` : "0%", opacity: anyLoading ? 1 : 0 }}
            />
          </div>

          <div className="relative flex flex-col flex-1 min-h-0 gap-2 sm:gap-2.5 p-2 sm:p-3 lg:p-4 w-full">

            {/* ════════ NAVBAR DESKTOP ════════ */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              <div className="flex items-center gap-3">
                <img src={sgtLogo} alt="SGT" className="block h-8 w-auto shrink-0 object-contain" />
                <div className="h-6 w-px shrink-0" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
                  <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">Financiamento de Frota</span>
                </div>
              </div>

              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                  {contratos.length} contratos
                </span>
              </div>

              <div className="h-6 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

              <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
                <DatePickerInput
                  value={dwFilter.dataInicio}
                  onChange={(v) => setDwFilter("dataInicio", v)}
                  placeholder="Data início"
                />
                <DatePickerInput
                  value={dwFilter.dataFim}
                  onChange={(v) => setDwFilter("dataFim", v)}
                  placeholder="Data fim"
                />
                <div className="h-4 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />
                <Select
                  value={dwFilter.empresa ?? "__all__"}
                  onValueChange={(v) => setDwFilter("empresa", v === "__all__" ? null : v)}
                >
                  <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[130px] rounded-lg text-[12px]">
                    <SelectValue placeholder="Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={dwFilter.filial ?? "__all__"}
                  onValueChange={(v) => setDwFilter("filial", v === "__all__" ? null : v)}
                >
                  <SelectTrigger className="h-8 w-full min-w-[80px] max-w-[140px] rounded-lg text-[12px]">
                    <SelectValue placeholder="Filial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <UpdateButton
                  onClick={() => { fetchFromDW(); refetch(); }}
                  isFetching={anyLoading}
                  loadingPhase={loadingPhase}
                  progress={progress}
                />
              </div>

              <HomeButton />
            </div>

            {/* ════════ NAVBAR MOBILE ════════ */}
            <div className="flex sm:hidden items-center justify-between gap-2 py-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={sgtLogo} alt="SGT" className="block h-7 w-auto shrink-0 object-contain" />
                <div className="h-5 w-px shrink-0" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">Workspace</span>
                  <span className="text-[15px] font-black tracking-[-0.03em] dark:text-white text-slate-800 truncate">Fin. Frota</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <UpdateButton
                  onClick={() => { fetchFromDW(); refetch(); }}
                  isFetching={anyLoading}
                  loadingPhase={loadingPhase}
                  progress={progress}
                  compact
                />
                <HomeButton />
                <MobileNav />
              </div>
            </div>

            {/* Divisor */}
            <div className="h-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

            {/* ════════ CONTEÚDO ════════ */}
            <div className="flex flex-col flex-1 min-h-0 gap-3 overflow-auto pb-2">

              {/* ── KPI Cards ── */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 shrink-0">
                {[
                  {
                    label: "Contratos ativos",
                    value: fmtN(kpis.totalContratos),
                    sub:   "financiamentos vigentes",
                    icon:  Truck,
                    stripe: "from-cyan-500/25 via-cyan-400/10 to-transparent",
                    border: "border-cyan-400/20",
                    glow:   "rgba(6,182,212,0.10)",
                    iconBg: "bg-cyan-400/10 border-cyan-400/25",
                    iconTxt:"text-cyan-300",
                    subTxt: "text-cyan-400/70",
                  },
                  {
                    label: "Compromisso mensal",
                    value: fmt(kpis.compromissoMensal),
                    sub:   "soma das parcelas atuais",
                    icon:  CreditCard,
                    stripe: "from-amber-500/25 via-amber-400/10 to-transparent",
                    border: "border-amber-400/20",
                    glow:   "rgba(245,158,11,0.10)",
                    iconBg: "bg-amber-400/10 border-amber-400/25",
                    iconTxt:"text-amber-300",
                    subTxt: "text-amber-400/70",
                  },
                  {
                    label: "Parcelas em aberto",
                    value: fmtN(kpis.parcelasAbertas),
                    sub:   "total de parcelas restantes",
                    icon:  FileText,
                    stripe: "from-violet-500/25 via-violet-400/10 to-transparent",
                    border: "border-violet-400/20",
                    glow:   "rgba(139,92,246,0.10)",
                    iconBg: "bg-violet-400/10 border-violet-400/25",
                    iconTxt:"text-violet-300",
                    subTxt: "text-violet-400/70",
                  },
                  {
                    label: "Juros acumulados",
                    value: fmt(kpis.jurosTotal),
                    sub:   "total de juros no período",
                    icon:  TrendingDown,
                    stripe: "from-rose-500/25 via-rose-400/10 to-transparent",
                    border: "border-rose-400/20",
                    glow:   "rgba(244,63,94,0.10)",
                    iconBg: "bg-rose-400/10 border-rose-400/25",
                    iconTxt:"text-rose-300",
                    subTxt: "text-rose-400/70",
                  },
                ].map((k, i) => (
                  <AnimatedCard key={k.label} delay={i * 60}>
                    <div
                      className={`relative overflow-hidden rounded-2xl border ${k.border} p-4 flex flex-col gap-3`}
                      style={{ background: "var(--sgt-bg-card)", boxShadow: `0 0 20px ${k.glow}` }}
                    >
                      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${k.stripe}`} />
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${k.iconBg} ${k.iconTxt}`}>
                        <k.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">{k.label}</p>
                        {isLoading
                          ? <div className="mt-2 h-6 w-28 animate-pulse rounded-lg bg-white/5" />
                          : <p className="mt-1 text-[22px] font-black tracking-tight sgt-text leading-tight">{k.value}</p>
                        }
                        <p className={`mt-0.5 text-[11px] ${k.subTxt}`}>{k.sub}</p>
                      </div>
                    </div>
                  </AnimatedCard>
                ))}
              </div>

              {/* ── Split: Distribuição por banco + Tabela ── */}
              <div className="flex flex-col xl:flex-row flex-1 min-h-0 gap-3">

                {/* Painel lateral — Distribuição por banco */}
                <AnimatedCard delay={300} className="xl:w-[280px] shrink-0">
                  <div
                    className="relative overflow-hidden rounded-2xl border border-amber-400/20 p-4 flex flex-col gap-3 h-full"
                    style={{ background: "var(--sgt-bg-card)", boxShadow: "0 0 20px rgba(245,158,11,0.08)" }}
                  >
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-500/25 via-amber-400/10 to-transparent" />

                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border bg-amber-400/10 border-amber-400/25 text-amber-300">
                        <BarChart3 className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-400/80">
                        Distribuição por banco
                      </p>
                    </div>

                    <div className="h-px" style={{ background: "var(--sgt-divider)" }} />

                    <div className="flex flex-col gap-3 flex-1 overflow-auto">
                      {isLoading
                        ? [1,2,3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />)
                        : porBanco.map(({ banco, compromisso, count }) => {
                            const { color, rgb } = getBancoColor(banco, bancoIndex);
                            const barW = (compromisso / maxCompromisso) * 100;
                            const pct  = (compromisso / totalCompromisso) * 100;
                            return (
                              <div key={banco} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[11px] font-semibold truncate dark:text-slate-300" style={{ maxWidth: "65%" }}>
                                    {banco}
                                  </span>
                                  <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color }}>
                                    {pct.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/[0.05]">
                                  <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${barW}%`, background: color, boxShadow: `0 0 6px rgba(${rgb},0.4)` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] tabular-nums text-[var(--sgt-text-muted)]">{fmt(compromisso)}</span>
                                  <span className="text-[10px] text-[var(--sgt-text-muted)]">{count} veíc.</span>
                                </div>
                              </div>
                            );
                          })
                      }
                    </div>
                  </div>
                </AnimatedCard>

                {/* Tabela de contratos */}
                <AnimatedCard delay={360} className="flex flex-col flex-1 min-w-0 min-h-0">
                  <div
                    className="relative overflow-hidden rounded-2xl border border-[var(--sgt-border-subtle)] flex flex-col flex-1 min-h-0"
                    style={{ background: "var(--sgt-bg-card)" }}
                  >
                    {/* Filtros */}
                    <div
                      className="flex flex-wrap items-center gap-2 px-3 py-2.5 shrink-0 border-b"
                      style={{ borderColor: "var(--sgt-border-subtle)" }}
                    >
                      {/* Busca */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--sgt-text-muted)]" />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Veículo, banco, contrato..."
                          className="h-7 rounded-lg pl-7 pr-3 text-[11px] outline-none border w-[180px]"
                          style={{
                            background:  "var(--sgt-input-bg)",
                            borderColor: "var(--sgt-border-subtle)",
                            color:       "var(--sgt-text-primary)",
                          }}
                        />
                      </div>

                      <div className="h-4 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

                      {/* Banco */}
                      <Select value={filtroBanco} onValueChange={setFiltroBanco}>
                        <SelectTrigger className="h-7 w-[130px] rounded-lg text-[11px]">
                          <Landmark className="h-3 w-3 mr-1 shrink-0 text-[var(--sgt-text-muted)]" />
                          <SelectValue placeholder="Banco" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todos os bancos</SelectItem>
                          {bancos.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      {/* Frota */}
                      <Select value={filtroFrota} onValueChange={setFiltroFrota}>
                        <SelectTrigger className="h-7 w-[130px] rounded-lg text-[11px]">
                          <Truck className="h-3 w-3 mr-1 shrink-0 text-[var(--sgt-text-muted)]" />
                          <SelectValue placeholder="Frota" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas as frotas</SelectItem>
                          {frotas.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      {/* Situação */}
                      <Select value={filtroSit} onValueChange={setFiltroSit}>
                        <SelectTrigger className="h-7 w-[110px] rounded-lg text-[11px]">
                          <SelectValue placeholder="Situação" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas</SelectItem>
                          {situacs.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <span className="ml-auto text-[10px] text-[var(--sgt-text-muted)] shrink-0">
                        {filtered.length} contrato{filtered.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Tabela */}
                    <div className="flex-1 overflow-auto min-h-0">
                      <table className="w-full text-[11px] border-collapse min-w-[820px]">
                        <thead className="sticky top-0 z-10" style={{ background: "var(--sgt-table-head, var(--sgt-bg-section))" }}>
                          <tr>
                            {(
                              [
                                { col: "veiculo" as keyof Contrato,         label: "Veículo"      },
                                { col: "frota" as keyof Contrato,           label: "Frota"        },
                                { col: "banco" as keyof Contrato,           label: "Banco"        },
                                { col: "valor_aquisicao" as keyof Contrato, label: "Aquisição"    },
                                { col: "parcela_atual" as keyof Contrato,   label: "Progresso"    },
                                { col: "valor_parcela" as keyof Contrato,   label: "Vlr. Parcela" },
                                { col: "juros_total" as keyof Contrato,     label: "Juros"        },
                                { col: "situacao" as keyof Contrato,        label: "Situação"     },
                              ] as const
                            ).map(({ col, label }) => (
                              <th
                                key={col}
                                onClick={() => handleSort(col)}
                                className="px-3 py-2.5 text-left font-bold uppercase tracking-[0.18em] text-[10px] text-[var(--sgt-text-muted)] cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap"
                              >
                                <div className="flex items-center gap-1">
                                  {label}
                                  <SortIcon col={col} />
                                </div>
                              </th>
                            ))}
                            <th className="px-3 py-2.5 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {isLoading
                            ? Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i} className="border-t" style={{ borderColor: "var(--sgt-border-subtle)" }}>
                                  {Array.from({ length: 9 }).map((_, j) => (
                                    <td key={j} className="px-3 py-2.5">
                                      <div className="h-4 rounded animate-pulse bg-white/5" />
                                    </td>
                                  ))}
                                </tr>
                              ))
                            : filtered.map((c) => {
                                const { color, rgb } = getBancoColor(c.banco, bancoIndex);
                                const pct = c.total_parcelas
                                  ? Math.min(100, Math.round(((c.parcela_atual ?? 0) / c.total_parcelas) * 100))
                                  : 0;
                                const rowKey = String(c.veiculo);
                                const expanded = expandedRow === rowKey;

                                return (
                                  <>
                                    <tr
                                      key={rowKey}
                                      onClick={() => setExpandedRow(expanded ? null : rowKey)}
                                      className="border-t cursor-pointer transition-colors hover:bg-white/[0.03]"
                                      style={{ borderColor: "var(--sgt-border-subtle)" }}
                                    >
                                      {/* Veículo */}
                                      <td className="px-3 py-2.5 font-mono font-semibold dark:text-slate-200">{c.veiculo}</td>
                                      {/* Frota */}
                                      <td className="px-3 py-2.5 dark:text-slate-400 text-[11px]">{c.frota ?? "—"}</td>
                                      {/* Banco */}
                                      <td className="px-3 py-2.5">
                                        <span
                                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold border"
                                          style={{ color, borderColor: `${color}40`, background: `${color}12` }}
                                        >
                                          {c.banco ?? "—"}
                                        </span>
                                      </td>
                                      {/* Aquisição */}
                                      <td className="px-3 py-2.5 tabular-nums dark:text-slate-300">{fmt(c.valor_aquisicao)}</td>
                                      {/* Progresso */}
                                      <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <span className="tabular-nums dark:text-slate-300 w-10 shrink-0">
                                            {c.parcela_atual ?? "?"}/{c.total_parcelas ?? "?"}
                                          </span>
                                          <div className="h-1.5 w-16 rounded-full overflow-hidden bg-white/[0.06]">
                                            <div
                                              className="h-full rounded-full transition-all duration-700"
                                              style={{ width: `${pct}%`, background: color, boxShadow: `0 0 4px rgba(${rgb},0.5)` }}
                                            />
                                          </div>
                                          <span className="text-[10px] text-[var(--sgt-text-muted)]">{pct}%</span>
                                        </div>
                                      </td>
                                      {/* Valor parcela */}
                                      <td className="px-3 py-2.5 tabular-nums dark:text-slate-300">{fmt(c.valor_parcela)}</td>
                                      {/* Juros */}
                                      <td className="px-3 py-2.5 tabular-nums text-rose-400">{fmt(c.juros_total)}</td>
                                      {/* Situação */}
                                      <td className="px-3 py-2.5">
                                        {c.situacao ? (
                                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                            c.situacao === "A"
                                              ? "bg-amber-400/10 text-amber-300 border-amber-400/20"
                                              : c.situacao === "L"
                                              ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20"
                                              : "bg-slate-400/10 text-slate-300 border-slate-400/20"
                                          }`}>
                                            {c.situacao === "A" ? "Em aberto" : c.situacao === "L" ? "Liquidado" : c.situacao}
                                          </span>
                                        ) : "—"}
                                      </td>
                                      {/* Expand icon */}
                                      <td className="px-3 py-2.5 text-right">
                                        <ChevronRight
                                          className={`h-3.5 w-3.5 text-[var(--sgt-text-muted)] transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
                                        />
                                      </td>
                                    </tr>

                                    {/* ── Linha expandida ── */}
                                    {expanded && (
                                      <tr
                                        key={`${rowKey}-detail`}
                                        className="border-t"
                                        style={{ borderColor: "var(--sgt-border-subtle)" }}
                                      >
                                        <td colSpan={9} className="px-4 py-3">
                                          <div
                                            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 rounded-xl border p-3"
                                            style={{ background: "var(--sgt-bg-base)", borderColor: "var(--sgt-border-subtle)" }}
                                          >
                                            {[
                                              { label: "Contrato",     value: String(c.contrato ?? "—") },
                                              { label: "Nota fiscal",  value: String(c.nota ?? "—")     },
                                              { label: "Chassi",       value: c.chassi ?? "—"            },
                                              { label: "Ano Fab./Mod", value: c.anofab ? `${c.anofab}/${c.anomod ?? "?"}` : "—" },
                                              { label: "Filial",       value: c.filial ?? "—"            },
                                              { label: "Vlr. líquido", value: fmt(c.parcelas.reduce((s, p) => s + (p.vlrliq ?? 0), 0)) },
                                              { label: "Total pago",   value: fmt(c.valor_pago_total)    },
                                              { label: "Desconto",     value: fmt(c.parcelas.reduce((s, p) => s + (p.valor_desconto ?? 0), 0)) },
                                              { label: "Parcelas rest.",value: fmtN(c.parcelas_abertas)  },
                                              { label: "Dívida estimada", value: fmt(c.divida_estimada)  },
                                            ].map(({ label, value }) => (
                                              <div key={label} className="flex flex-col gap-0.5">
                                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">{label}</p>
                                                <p className="text-[12px] font-semibold dark:text-slate-200">{value}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                );
                              })
                          }
                        </tbody>
                      </table>

                      {!isLoading && filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--sgt-text-muted)]">
                          <DollarSign className="h-8 w-8 opacity-20" />
                          <p className="text-[13px]">Nenhum contrato encontrado</p>
                        </div>
                      )}
                    </div>
                  </div>
                </AnimatedCard>
              </div>
            </div>{/* fim conteúdo */}
          </div>
        </section>
      </div>
    </div>
  );
}
