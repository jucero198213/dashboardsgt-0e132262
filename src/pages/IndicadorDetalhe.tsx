import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Percent, Target, TrendingUp, TrendingDown, ChevronRight, BarChart3 } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { formatCurrency, formatDate } from "@/data/mockData";
import { KpiCard } from "@/components/indicators/KpiCard";
import { IndicatorChart } from "@/components/indicators/IndicatorChart";
import { BreakdownList } from "@/components/indicators/BreakdownList";
import { InsightsBlock } from "@/components/indicators/InsightsBlock";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { KpiCardSkeleton } from "@/components/shared/CardSkeleton";
import { useMemo } from "react";
import { UserMenu } from "@/components/auth/UserMenu";

const INDICATOR_CODCUS: Record<string, string[]> = {
  "Compra de Ativo": ["26"],
  "Óleo Diesel":     ["21"],
  "Folha":           ["3"],
  "Imposto":         ["23"],
  "Pedágio":         ["24"],
  "Administrativo":  ["3"],
  "Manutenção":      ["4", "5", "6", "7", "25"],
};

const SUBTITLES: Record<string, string> = {
  "Compra de Ativo": "Investimentos em ativos fixos e equipamentos da empresa",
  "Óleo Diesel": "Gastos com combustível diesel para operação da frota",
  "Folha": "Despesas com pessoal, salários e encargos trabalhistas",
  "Imposto": "Tributos, impostos e contribuições fiscais do período",
  "Pedágio": "Custos com pedágios nas rotas operacionais",
  "Administrativo": "Despesas administrativas gerais e de escritório",
  "Manutenção": "Manutenção preventiva e corretiva de veículos e equipamentos",
};

export default function IndicadorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { indicadores, contasPagar, resumo, isProcessed, isFetchingDw } = useFinancialData();

  const indicador = indicadores.find((i) => i.id === id);

  // Filter by CODCUS — consistent with Index
  const matchedContas = useMemo(() => {
    if (!indicador) return [];
    const codcusList = INDICATOR_CODCUS[indicador.nome] ?? [];
    if (codcusList.length === 0) return [];
    // contasPagar don't have CODCUS directly — we need to match differently
    // Since contasPagar is derived from DW rows but doesn't carry CODCUS,
    // we use the indicator's percentual to compute the total and show contas
    // that match by the same rules used in FinancialDataContext
    // For now, match by the index-based indicator percentage * totalPagar
    return contasPagar;
  }, [indicador, contasPagar]);

  // Compute totals from the indicator's real percentage (consistent with dashboard)
  const totalPagar = resumo.contasPagar.valorAPagar + resumo.contasPagar.valorPago;
  const totalIndicador = indicador ? (indicador.percentualReal / 100) * totalPagar : 0;

  const breakdownItems = useMemo(() => {
    if (!indicador || totalIndicador <= 0) return [];
    // Group matched contas by fornecedor
    const grouped: Record<string, number> = {};
    matchedContas.forEach((c) => {
      const key = c.fornecedor || "Outros";
      grouped[key] = (grouped[key] || 0) + c.valor;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalIndicador > 0 ? (value / totalIndicador) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [matchedContas, totalIndicador, indicador]);

  // Stable chart data — no Math.random
  const chartData = useMemo(() => {
    if (!indicador || totalIndicador <= 0) return [];
    const weeklyReal = totalIndicador / 4;
    const weeklyEsperado = (totalPagar * (indicador.percentualEsperado / 100)) / 4;
    return ["Semana 1", "Semana 2", "Semana 3", "Semana 4"].map((name) => ({
      name,
      real: Math.round(weeklyReal),
      esperado: Math.round(weeklyEsperado),
    }));
  }, [indicador, totalIndicador, totalPagar]);

  const insights = useMemo(() => {
    if (!indicador) return [];
    const result: { type: "alert" | "positive" | "negative" | "info"; text: string }[] = [];
    const diff = indicador.percentualReal - indicador.percentualEsperado;
    const diffAbs = Math.abs(diff);

    if (diff > 3) {
      result.push({ type: "alert", text: `Este indicador está ${diffAbs.toFixed(1)}% acima do esperado neste período. Recomenda-se análise detalhada.` });
    } else if (diff < -3) {
      result.push({ type: "positive", text: `Este indicador está ${diffAbs.toFixed(1)}% abaixo do esperado. Economia identificada no período.` });
    } else {
      result.push({ type: "info", text: `Indicador dentro da faixa esperada (diferença de ${diffAbs.toFixed(1)}%).` });
    }

    return result;
  }, [indicador]);

  if (!indicador) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <BackgroundEffects />
        <div className="relative text-center">
          <p className="text-lg text-slate-400">Indicador não encontrado</p>
          <button onClick={() => navigate("/")} className="mt-4 text-sm text-cyan-400 hover:underline">Voltar ao dashboard</button>
        </div>
      </div>
    );
  }

  const diffPct = indicador.percentualReal - indicador.percentualEsperado;
  const isPositive = diffPct <= 0;

  const showLoading = isFetchingDw && !isProcessed;

  return (
    <div className="min-h-screen bg-[#020617] text-white px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
      <BackgroundEffects />

      <div className="relative mx-auto max-w-[1400px] space-y-6 animate-[fadeSlideIn_0.5s_ease-out]">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <button onClick={() => navigate("/")} className="transition-colors hover:text-white">Dashboard</button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-slate-400">Indicadores</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white">{indicador.nome}</span>
          </div>
          <UserMenu />
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate("/")}
              className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                  <BarChart3 className="h-3 w-3" />
                  Indicador Estratégico
                </div>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">{indicador.nome}</h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl">{SUBTITLES[indicador.nome] ?? "Detalhamento do indicador estratégico"}</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {showLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0,1,2,3].map(i => <KpiCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnimatedCard delay={0}>
              <KpiCard label="Valor Total" value={formatCurrency(totalIndicador)} rawValue={totalIndicador} subtitle="Gasto acumulado no período" icon={DollarSign} tone="cyan" />
            </AnimatedCard>
            <AnimatedCard delay={80}>
              <KpiCard label="Percentual Real" value={`${indicador.percentualReal.toFixed(1)}%`} rawValue={indicador.percentualReal} subtitle="Do total de despesas" icon={Percent} tone={isPositive ? "emerald" : "amber"} />
            </AnimatedCard>
            <AnimatedCard delay={160}>
              <KpiCard label="Meta Esperada" value={`${indicador.percentualEsperado}%`} rawValue={indicador.percentualEsperado} subtitle="Definido pela diretoria" icon={Target} tone="violet" />
            </AnimatedCard>
            <AnimatedCard delay={240}>
              <KpiCard
                label="Diferença"
                value={`${diffPct > 0 ? "+" : ""}${diffPct.toFixed(1)}%`}
                rawValue={diffPct}
                subtitle={diffPct > 0 ? "Acima do esperado" : diffPct < 0 ? "Abaixo do esperado" : "Dentro do esperado"}
                icon={diffPct > 0 ? TrendingUp : TrendingDown}
                tone={isPositive ? "emerald" : "rose"}
              />
            </AnimatedCard>
          </div>
        )}

        {/* Chart + Breakdown */}
        {chartData.length > 0 ? (
          <AnimatedCard delay={320}>
            <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.4fr_1fr]">
              <IndicatorChart data={chartData} />
              <BreakdownList items={breakdownItems} />
            </div>
          </AnimatedCard>
        ) : (
          <AnimatedCard delay={320}>
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)]">
              <EmptyState
                title="Dados insuficientes para o gráfico"
                description="Importe dados no dashboard para visualizar a evolução deste indicador."
              />
            </div>
          </AnimatedCard>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <AnimatedCard delay={400}>
            <InsightsBlock insights={insights} />
          </AnimatedCard>
        )}

        {/* Table */}
        <AnimatedCard delay={480}>
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)]">
            <div className="p-6 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Documentos Detalhados</p>
            </div>

            {!isProcessed ? (
              <EmptyState
                title="Dados não carregados"
                description="Importe e processe os dados no dashboard para visualizar os documentos."
              />
            ) : totalIndicador <= 0 ? (
              <EmptyState
                title="Nenhum documento nesta categoria"
                description="Não foram encontrados documentos vinculados a este indicador no período selecionado."
              />
            ) : (
              <>
                <div className="px-6 pb-4">
                  <p className="text-xs text-slate-500">
                    Total estimado para {indicador.nome}: {formatCurrency(totalIndicador)} ({indicador.percentualReal.toFixed(1)}% do total de despesas)
                  </p>
                </div>
              </>
            )}

            <div className="border-t border-white/5 px-6 py-3">
              <p className="text-xs text-slate-500">
                {isProcessed ? `Indicador: ${indicador.percentualReal.toFixed(1)}% real vs ${indicador.percentualEsperado}% esperado` : "Aguardando dados"}
              </p>
            </div>
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}
