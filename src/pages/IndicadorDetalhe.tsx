import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Percent, Target, TrendingUp, TrendingDown, ChevronRight, Sparkles } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { formatCurrency, formatDate } from "@/data/mockData";
import { KpiCard } from "@/components/indicators/KpiCard";
import { IndicatorChart } from "@/components/indicators/IndicatorChart";
import { BreakdownList } from "@/components/indicators/BreakdownList";
import { InsightsBlock } from "@/components/indicators/InsightsBlock";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useMemo } from "react";
import { UserMenu } from "@/components/auth/UserMenu";

const INDICATOR_KEYWORDS: Record<string, string[]> = {
  "Compra de Ativo": ["ativo", "compra", "aquisição", "equipamento"],
  "Óleo Diesel": ["diesel", "óleo", "combustível", "combustivel"],
  "Folha": ["folha", "salário", "salario", "pessoal", "funcionário", "funcionario"],
  "Imposto": ["imposto", "tributo", "icms", "iss", "pis", "cofins", "taxa"],
  "Pedágio": ["pedágio", "pedagio", "tag"],
  "Administrativo": ["administrativo", "admin", "escritório", "escritorio", "aluguel"],
  "Manutenção": ["manutenção", "manutencao", "reparo", "peça", "peca", "oficina"],
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
  const { indicadores, contasPagar, resumo, isProcessed } = useFinancialData();

  const indicador = indicadores.find((i) => i.id === id);

  const matchedContas = useMemo(() => {
    if (!indicador) return [];
    const keywords = INDICATOR_KEYWORDS[indicador.nome] ?? indicador.nome.toLowerCase().split(" ");
    return contasPagar.filter((c) => {
      const desc = (c.fornecedor || "").toLowerCase();
      return keywords.some((kw) => kw.length > 2 && desc.includes(kw));
    });
  }, [indicador, contasPagar]);

  const totalIndicador = matchedContas.reduce((s, c) => s + c.valor, 0);
  const totalPagar = resumo.contasPagar.valorAPagar;

  const breakdownItems = useMemo(() => {
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
  }, [matchedContas, totalIndicador]);

  // Generate mock weekly chart data
  const chartData = useMemo(() => {
    if (!indicador) return [];
    const weeklyReal = totalIndicador / 4;
    const weeklyEsperado = (totalPagar * (indicador.percentualEsperado / 100)) / 4;
    return ["Semana 1", "Semana 2", "Semana 3", "Semana 4"].map((name, i) => ({
      name,
      real: Math.round(weeklyReal * (0.7 + Math.random() * 0.6)),
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

    if (matchedContas.length > 5) {
      result.push({ type: "info", text: `${matchedContas.length} documentos identificados nesta categoria.` });
    }

    const vencidos = matchedContas.filter((c) => c.status === "Vencido").length;
    if (vencidos > 0) {
      result.push({ type: "negative", text: `${vencidos} documento(s) vencido(s) encontrado(s). Atenção ao fluxo de caixa.` });
    }

    return result;
  }, [indicador, matchedContas]);

  if (!indicador) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <div className="text-center">
          <p className="text-lg text-slate-400">Indicador não encontrado</p>
          <button onClick={() => navigate("/")} className="mt-4 text-sm text-cyan-400 hover:underline">Voltar ao dashboard</button>
        </div>
      </div>
    );
  }

  const diffPct = indicador.percentualReal - indicador.percentualEsperado;
  const isPositive = diffPct <= 0;

  return (
    <div className="min-h-screen bg-[#020617] text-white px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:88px_88px]" />

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
                  <Sparkles className="h-3 w-3" />
                  Painel Financeiro
                </div>

              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">{indicador.nome}</h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl">{SUBTITLES[indicador.nome] ?? "Detalhamento do indicador estratégico"}</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Valor Total" value={formatCurrency(totalIndicador)} subtitle="Gasto acumulado no período" icon={DollarSign} tone="cyan" />
          <KpiCard label="Percentual Real" value={`${indicador.percentualReal.toFixed(1)}%`} subtitle="Do total de despesas" icon={Percent} tone={isPositive ? "emerald" : "amber"} />
          <KpiCard label="Meta Esperada" value={`${indicador.percentualEsperado}%`} subtitle="Definido pela diretoria" icon={Target} tone="violet" />
          <KpiCard
            label="Diferença"
            value={`${diffPct > 0 ? "+" : ""}${diffPct.toFixed(1)}%`}
            subtitle={diffPct > 0 ? "Acima do esperado" : diffPct < 0 ? "Abaixo do esperado" : "Dentro do esperado"}
            icon={diffPct > 0 ? TrendingUp : TrendingDown}
            tone={isPositive ? "emerald" : "rose"}
          />
        </div>

        {/* Chart + Breakdown */}
        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.4fr_1fr]">
          <IndicatorChart data={chartData} />
          <BreakdownList items={breakdownItems} />
        </div>

        {/* Insights */}
        <InsightsBlock insights={insights} />

        {/* Table */}
        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)]">
          <div className="p-6 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Documentos Detalhados</p>
          </div>

          {!isProcessed || matchedContas.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              {isProcessed ? "Nenhum documento encontrado para este indicador" : "Importe e processe os dados no dashboard"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Data</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Documento</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Fornecedor</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Valor</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedContas.map((c) => (
                    <TableRow key={c.id} className="border-white/5 transition-colors hover:bg-white/[0.03]">
                      <TableCell className="text-sm text-slate-300">{formatDate(c.vencimento)}</TableCell>
                      <TableCell className="text-sm font-medium text-white">{c.documento}</TableCell>
                      <TableCell className="text-sm text-slate-300">{c.fornecedor}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-white">{formatCurrency(c.valor)}</TableCell>
                      <TableCell className="text-center"><StatusBadge status={c.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="border-t border-white/5 px-6 py-3">
            <p className="text-xs text-slate-500">{matchedContas.length} documento(s) encontrado(s)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
