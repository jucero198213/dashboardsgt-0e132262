import { useState, useEffect, useMemo, useCallback } from "react";
import { DollarSign, AlertTriangle, Activity, TrendingUp, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/indicators/KpiCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { UpdateButton } from "@/components/shared/UpdateButton";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { VehicleAttentionPanel } from "@/components/manutencao/VehicleAttentionPanel";
import { FornecedorRanking } from "@/components/manutencao/FornecedorRanking";
import { CustoMiniChart } from "@/components/manutencao/CustoMiniChart";
import { OsSheet } from "@/components/manutencao/OsSheet";
import {
  aggregateOrdens,
  computeVehicleSignals,
  computeKpis,
  computeFornecedorRanking,
  computeDailyCosts,
} from "@/lib/manutencaoUtils";
import { fetchManutencao, type ManutencaoRow } from "@/lib/dwApi";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useCooldown } from "@/hooks/useCooldown";

const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")}M`
  : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(1).replace(".", ",")}k`
  : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Manutencao() {
  const { dwFilter, setDwFilter, filiais } = useFinancialData();
  const manutCooldown = useCooldown("dw_manutencao_fetch_ts");
  const filiaisFiltradas = filiais.filter(f => !dwFilter.empresa || f.empresa === dwFilter.empresa);

  // ── State ──────────────────────────────────────────────────────────────────
  const [dados, setDados] = useState<ManutencaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetVeiculo, setSheetVeiculo] = useState<string | null>(null);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const carregarDados = useCallback(async (force = false) => {
    if (!force && !manutCooldown.canFetch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchManutencao({
        dataInicio: dwFilter.dataInicio,
        dataFim: dwFilter.dataFim,
        filial: dwFilter.filial ?? null,
      });
      setDados(res.data ?? []);
      manutCooldown.start();
    } catch (err) {
      setError((err as Error).message ?? "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [dwFilter.dataInicio, dwFilter.dataFim, dwFilter.filial]);

  useEffect(() => { carregarDados(); }, []);

  // ── Derived data ────────────────────────────────────────────────────────────
  const ordens = useMemo(() => aggregateOrdens(dados), [dados]);
  const vehicleSignals = useMemo(() => computeVehicleSignals(ordens), [ordens]);
  const kpis = useMemo(() => computeKpis(ordens, vehicleSignals), [ordens, vehicleSignals]);
  const fornecedorRanking = useMemo(() => computeFornecedorRanking(ordens), [ordens]);
  const dailyCosts = useMemo(() => computeDailyCosts(ordens), [ordens]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSelectVeiculo = (veiculo: string) => {
    setSheetVeiculo(veiculo);
    setSheetOpen(true);
  };

  const handleOpenSheet = () => {
    setSheetVeiculo(null);
    setSheetOpen(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col transition-all duration-300 min-h-[100dvh] overflow-auto px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* Gradientes de fundo SGT — tom violet/rose para Manutenção */}
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(123,110,245,0.18),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_50%_40%_at_100%_105%,rgba(232,72,72,0.07),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:opacity-100" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.68) 100%)" }} />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-hidden"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          {/* Barra de progresso */}
          <div className="h-[3px] w-full shrink-0 overflow-hidden rounded-t-[24px] bg-transparent">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-violet-400 to-rose-400 shadow-[0_0_12px_rgba(123,110,245,0.5)] transition-all duration-500 ease-out"
              style={{ width: loading ? "70%" : "0%", opacity: loading ? 1 : 0 }}
            />
          </div>

          <div className="relative flex flex-col flex-1 min-h-0 gap-2.5 sm:gap-3 p-2 sm:p-3 lg:p-4 overflow-y-auto w-full">

            {/* Mobile nav */}
            <MobileNav title="Manutenção" />

            {/* Navbar desktop */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              <div className="flex flex-col leading-none">
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: "rgba(123,110,245,0.8)" }}>Workspace</span>
                <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">Manutenção</span>
              </div>

              <div className="h-6 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

              <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
                <DatePickerInput value={dwFilter.dataInicio} onChange={v => setDwFilter("dataInicio", v)} placeholder="Data início" />
                <DatePickerInput value={dwFilter.dataFim}    onChange={v => setDwFilter("dataFim", v)}    placeholder="Data fim" />
                <div className="h-4 w-px shrink-0" style={{ background: "var(--sgt-divider)" }} />
                <Select
                  value={dwFilter.filial ?? "Todas"}
                  onValueChange={v => setDwFilter("filial", v === "Todas" ? null : v)}
                >
                  <SelectTrigger className="h-8 text-xs w-[130px]"
                    style={{ background: "var(--sgt-input-bg)", borderColor: "var(--sgt-input-border)" }}>
                    <SelectValue placeholder="Filial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas as filiais</SelectItem>
                    {filiaisFiltradas.map(f => (
                      <SelectItem key={f.codfilial} value={String(f.codfilial)}>{f.filial}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <UpdateButton onClick={() => carregarDados(true)} isFetching={loading} />
              </div>

              <HomeButton />
            </div>

            <div className="h-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm text-rose-400 border"
                style={{ background: "rgba(232,72,72,0.05)", borderColor: "rgba(232,72,72,0.2)" }}>
                {error}
              </div>
            )}

            {/* ════ Indicadores ════ */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Indicadores</span>
              <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 shrink-0 sgt-stagger">
              <AnimatedCard delay={0}>
                <KpiCard
                  label="Custo Total"
                  value={fmtK(kpis.totalCusto)}
                  rawValue={kpis.totalCusto}
                  subtitle="período atual"
                  icon={DollarSign}
                  tone="violet"
                  loading={loading}
                />
              </AnimatedCard>
              <AnimatedCard delay={60}>
                <KpiCard
                  label="Veículos em Atenção"
                  value={String(kpis.veiculosEmAtencao)}
                  rawValue={kpis.veiculosEmAtencao}
                  subtitle="com sinal ativo"
                  icon={AlertTriangle}
                  tone="rose"
                  loading={loading}
                />
              </AnimatedCard>
              <AnimatedCard delay={120}>
                <KpiCard
                  label="OS em Andamento"
                  value={String(kpis.osEmAndamento)}
                  rawValue={kpis.osEmAndamento}
                  subtitle="ordens abertas"
                  icon={Activity}
                  tone="amber"
                  loading={loading}
                />
              </AnimatedCard>
              <AnimatedCard delay={180}>
                <KpiCard
                  label="Custo Médio / OS"
                  value={fmtK(kpis.custoMedioOS)}
                  rawValue={kpis.custoMedioOS}
                  subtitle={`base: ${kpis.totalOrdens} ordens`}
                  icon={TrendingUp}
                  tone="emerald"
                  loading={loading}
                />
              </AnimatedCard>
            </div>

            {/* ════ Análise ════ */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Análise</span>
              <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-[1fr_300px] gap-3 flex-1 min-h-0">
              <AnimatedCard delay={240} className="flex flex-col min-h-0">
                <VehicleAttentionPanel
                  vehicles={vehicleSignals}
                  onSelectVeiculo={handleSelectVeiculo}
                  loading={loading}
                />
              </AnimatedCard>

              <div className="flex flex-col gap-3">
                <AnimatedCard delay={300}>
                  <CustoMiniChart
                    data={dailyCosts}
                    totalCusto={kpis.totalCusto}
                    loading={loading}
                  />
                </AnimatedCard>
                <AnimatedCard delay={360} className="flex flex-col flex-1 min-h-0">
                  <FornecedorRanking
                    items={fornecedorRanking}
                    loading={loading}
                  />
                </AnimatedCard>
              </div>
            </div>

            {/* OS Sheet trigger */}
            <AnimatedCard delay={420} hover={false}>
              <button
                type="button"
                onClick={handleOpenSheet}
                className="w-full rounded-[14px] border px-4 py-3 flex items-center gap-3 text-left transition-colors"
                style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(123,110,245,0.3)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--sgt-border-subtle)")}
              >
                <span className="text-base">📋</span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Detalhamento de Ordens de Serviço
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--sgt-skeleton-bg)", color: "var(--sgt-text-secondary)" }}>
                  {kpis.totalOrdens} OS
                </span>
                <ChevronRight className="ml-auto h-4 w-4 text-slate-500" />
              </button>
            </AnimatedCard>
          </div>
        </section>
      </div>

      {/* Sheet */}
      <OsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        ordens={ordens}
        initialVeiculo={sheetVeiculo}
      />
    </div>
  );
}
