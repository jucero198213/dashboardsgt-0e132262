import { useState, useEffect, useMemo, useCallback } from "react";
import { DollarSign, AlertTriangle, Activity, TrendingUp, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/indicators/KpiCard";
import { HomeButton } from "@/components/shared/HomeButton";
import { MobileNav } from "@/components/shared/MobileNav";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { UpdateButton } from "@/components/shared/UpdateButton";
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
import { cn } from "@/lib/utils";

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

  // Sheet
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
    <div className="min-h-screen bg-background flex flex-col">
      <MobileNav title="Manutenção" />

      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-2.5 flex items-center gap-3">
        <HomeButton />
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">SGT Log</p>
          <p className="text-[15px] font-black tracking-tight text-foreground leading-tight">Manutenção</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <DatePickerInput
            value={dwFilter.dataInicio}
            onChange={v => setDwFilter("dataInicio", v)}
          />
          <DatePickerInput
            value={dwFilter.dataFim}
            onChange={v => setDwFilter("dataFim", v)}
          />
          <Select
            value={dwFilter.filial ?? "Todas"}
            onValueChange={v => setDwFilter("filial", v === "Todas" ? null : v)}
          >
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="Filial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas as filiais</SelectItem>
              {filiaisFiltradas.map(f => (
                <SelectItem key={f.codfilial} value={String(f.codfilial)}>{f.filial}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <UpdateButton
            onClick={() => carregarDados(true)}
            isFetching={loading}
          />
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-3 max-w-[1600px] w-full mx-auto">
        {/* Error */}
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3">
          <KpiCard
            label="Custo Total"
            value={fmtK(kpis.totalCusto)}
            rawValue={kpis.totalCusto}
            subtitle="período atual"
            icon={DollarSign}
            tone="violet"
            loading={loading}
          />
          <KpiCard
            label="Veículos em Atenção"
            value={String(kpis.veiculosEmAtencao)}
            rawValue={kpis.veiculosEmAtencao}
            subtitle="com sinal ativo"
            icon={AlertTriangle}
            tone="rose"
            loading={loading}
          />
          <KpiCard
            label="OS em Andamento"
            value={String(kpis.osEmAndamento)}
            rawValue={kpis.osEmAndamento}
            subtitle="ordens abertas"
            icon={Activity}
            tone="amber"
            loading={loading}
          />
          <KpiCard
            label="Custo Médio / OS"
            value={fmtK(kpis.custoMedioOS)}
            rawValue={kpis.custoMedioOS}
            subtitle={`base: ${kpis.totalOrdens} ordens`}
            icon={TrendingUp}
            tone="emerald"
            loading={loading}
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-[1fr_300px] gap-3 flex-1 min-h-0">
          {/* Vehicle attention panel */}
          <VehicleAttentionPanel
            vehicles={vehicleSignals}
            onSelectVeiculo={handleSelectVeiculo}
            loading={loading}
          />

          {/* Right column */}
          <div className="flex flex-col gap-3">
            <CustoMiniChart
              data={dailyCosts}
              totalCusto={kpis.totalCusto}
              loading={loading}
            />
            <FornecedorRanking
              items={fornecedorRanking}
              loading={loading}
            />
          </div>
        </div>

        {/* OS Sheet trigger */}
        <button
          type="button"
          onClick={handleOpenSheet}
          className={cn(
            "w-full rounded-xl border border-border bg-card px-4 py-3",
            "flex items-center gap-3 text-left",
            "transition-colors hover:border-violet-400/25 hover:bg-muted/30"
          )}
        >
          <span className="text-base">📋</span>
          <span className="text-[11px] font-semibold text-muted-foreground">
            Detalhamento de Ordens de Serviço
          </span>
          <Badge variant="secondary" className="text-[9px] font-bold">
            {kpis.totalOrdens} OS
          </Badge>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/40" />
        </button>
      </main>

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
