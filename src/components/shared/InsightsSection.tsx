import React, { useEffect, useRef } from "react";
import {
  Sparkles, AlertTriangle, TrendingUp, Eye, CheckCircle2,
  Lightbulb, RefreshCw, ChevronRight, Zap
} from "lucide-react";
import { useAIInsights, type AIInsight, type InsightTipo } from "@/hooks/useAIInsights";

// ─── Config visual por tipo ───────────────────────────────────────────────────
const TIPO_CONFIG: Record<InsightTipo, {
  icon: React.ElementType;
  label: string;
  border: string;
  bg: string;
  badge: string;
  badgeText: string;
  glow: string;
}> = {
  alerta: {
    icon: AlertTriangle,
    label: "Alerta",
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
    badgeText: "text-red-400",
    glow: "rgba(239,68,68,0.08)",
  },
  atencao: {
    icon: Eye,
    label: "Atenção",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    badge: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    badgeText: "text-amber-400",
    glow: "rgba(245,158,11,0.08)",
  },
  oportunidade: {
    icon: TrendingUp,
    label: "Oportunidade",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    badgeText: "text-emerald-400",
    glow: "rgba(16,185,129,0.08)",
  },
  positivo: {
    icon: CheckCircle2,
    label: "Positivo",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    badge: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
    badgeText: "text-cyan-400",
    glow: "rgba(6,182,212,0.08)",
  },
};

// ─── Skeleton de loading ──────────────────────────────────────────────────────
function InsightSkeleton() {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 animate-pulse flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-white/5" />
        <div className="h-4 w-24 rounded bg-white/5" />
        <div className="ml-auto h-5 w-16 rounded-full bg-white/5" />
      </div>
      <div className="h-4 w-3/4 rounded bg-white/5" />
      <div className="h-3 w-full rounded bg-white/5" />
      <div className="h-3 w-5/6 rounded bg-white/5" />
      <div className="h-8 w-full rounded-lg bg-white/5 mt-1" />
    </div>
  );
}

// ─── Card individual de insight ───────────────────────────────────────────────
function InsightCard({ insight }: { insight: AIInsight }) {
  const cfg = TIPO_CONFIG[insight.tipo] ?? TIPO_CONFIG.atencao;
  const Icon = cfg.icon;

  return (
    <div
      className={`relative rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex flex-col gap-3 transition-all duration-200 hover:brightness-110 group overflow-hidden`}
      style={{ boxShadow: `0 0 24px ${cfg.glow}` }}
    >
      {/* Glow de fundo */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
        style={{ background: `radial-gradient(ellipse at 30% 30%, ${cfg.glow} 0%, transparent 70%)` }}
      />

      {/* Header */}
      <div className="flex items-start gap-2.5 relative z-10">
        <div className={`flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
          <Icon className={`h-3.5 w-3.5 ${cfg.badgeText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white/90 leading-tight">{insight.titulo}</p>
        </div>
        <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* Descrição */}
      <p className="text-[12px] text-white/60 leading-relaxed relative z-10">
        {insight.descricao}
      </p>

      {/* Impacto */}
      <div className="flex items-center gap-1.5 relative z-10">
        <Zap className="h-3 w-3 text-white/30 flex-shrink-0" />
        <p className="text-[11px] text-white/40 italic">{insight.impacto}</p>
      </div>

      {/* Ação recomendada */}
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${cfg.border} ${cfg.bg} relative z-10`}>
        <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 ${cfg.badgeText}`} />
        <p className={`text-[11px] font-medium ${cfg.badgeText}`}>{insight.acao}</p>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface InsightsSectionProps {
  setor: string;
  dados: Record<string, unknown>;
  periodo?: string;
  /** Se true, dispara a geração automaticamente quando os dados mudarem */
  autoGenerate?: boolean;
}

export function InsightsSection({
  setor,
  dados,
  periodo,
  autoGenerate = false,
}: InsightsSectionProps) {
  const { insights, loading, error, gerarInsights, limpar } = useAIInsights();
  const prevDadosRef = useRef<string>("");
  const hasGenerated = useRef(false);

  // Auto-gera quando os dados chegam (apenas uma vez por conjunto de dados)
  useEffect(() => {
    if (!autoGenerate) return;
    const dadosStr = JSON.stringify(dados);
    if (dadosStr === prevDadosRef.current) return;
    // Só gera se houver dados reais (não tudo zero/vazio)
    const temDados = Object.values(dados).some(v => v !== 0 && v !== "" && v !== null && v !== undefined);
    if (!temDados) return;
    prevDadosRef.current = dadosStr;
    hasGenerated.current = true;
    gerarInsights(setor, dados, periodo);
  }, [autoGenerate, dados, setor, periodo, gerarInsights]);

  const handleGerar = () => {
    limpar();
    gerarInsights(setor, dados, periodo);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header da seção */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-white/90">Insights por IA</h3>
            <p className="text-[11px] text-white/40">Análise inteligente dos dados do período</p>
          </div>
        </div>

        <button
          onClick={handleGerar}
          disabled={loading}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400 text-[11px] font-medium hover:bg-violet-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Analisando..." : insights.length > 0 ? "Atualizar" : "Gerar Insights"}
        </button>
      </div>

      {/* Estado: erro */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-[12px] text-red-400">{error}</p>
        </div>
      )}

      {/* Estado: loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <InsightSkeleton key={i} />)}
        </div>
      )}

      {/* Estado: insights carregados */}
      {!loading && insights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {insights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {/* Estado: vazio (antes de gerar) */}
      {!loading && insights.length === 0 && !error && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Lightbulb className="h-6 w-6 text-violet-400/60" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-white/50">Nenhum insight gerado ainda</p>
            <p className="text-[11px] text-white/30 mt-1">
              Clique em "Gerar Insights" para que a IA analise os dados e traga recomendações acionáveis
            </p>
          </div>
          <button
            onClick={handleGerar}
            disabled={loading}
            className="mt-1 flex items-center gap-1.5 h-8 px-4 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-400 text-[12px] font-medium hover:bg-violet-500/30 transition-all duration-200"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Gerar Insights com IA
          </button>
        </div>
      )}
    </div>
  );
}
