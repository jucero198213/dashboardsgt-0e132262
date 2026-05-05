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
  dot: string;
}> = {
  alerta: {
    icon: AlertTriangle,
    label: "Alerta",
    border: "border-red-500/20",
    bg: "bg-red-500/[0.04]",
    badge: "bg-red-500/10 text-red-400 border border-red-500/20",
    badgeText: "text-red-400",
    dot: "bg-red-400",
  },
  atencao: {
    icon: Eye,
    label: "Atenção",
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.04]",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    badgeText: "text-amber-400",
    dot: "bg-amber-400",
  },
  oportunidade: {
    icon: TrendingUp,
    label: "Oportunidade",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/[0.04]",
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    badgeText: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  positivo: {
    icon: CheckCircle2,
    label: "Positivo",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/[0.04]",
    badge: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
    badgeText: "text-cyan-400",
    dot: "bg-cyan-400",
  },
};

// ─── Skeleton de loading ──────────────────────────────────────────────────────
function InsightSkeleton() {
  return (
    <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3.5 animate-pulse flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-lg bg-white/[0.05]" />
        <div className="h-3 w-20 rounded bg-white/[0.05]" />
        <div className="ml-auto h-4 w-14 rounded-full bg-white/[0.05]" />
      </div>
      <div className="h-3 w-3/4 rounded bg-white/[0.05]" />
      <div className="h-2.5 w-full rounded bg-white/[0.05]" />
      <div className="h-2.5 w-5/6 rounded bg-white/[0.05]" />
      <div className="h-7 w-full rounded-lg bg-white/[0.05] mt-0.5" />
    </div>
  );
}

// ─── Card individual de insight ───────────────────────────────────────────────
function InsightCard({ insight }: { insight: AIInsight }) {
  const cfg = TIPO_CONFIG[insight.tipo] ?? TIPO_CONFIG.atencao;
  const Icon = cfg.icon;

  return (
    <div className={`relative rounded-[14px] border ${cfg.border} ${cfg.bg} p-3.5 flex flex-col gap-2.5 transition-all duration-200 hover:brightness-105 group overflow-hidden`}>
      {/* Header */}
      <div className="flex items-start gap-2 relative z-10">
        <div className={`flex-shrink-0 h-5 w-5 rounded-md flex items-center justify-center ${cfg.bg} border ${cfg.border} mt-0.5`}>
          <Icon className={`h-3 w-3 ${cfg.badgeText}`} />
        </div>
        <p className="text-[12px] font-semibold text-white/85 leading-tight flex-1">{insight.titulo}</p>
        <span className={`flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badge} uppercase tracking-[0.1em]`}>
          {cfg.label}
        </span>
      </div>

      {/* Descrição */}
      <p className="text-[11px] text-white/50 leading-relaxed relative z-10">
        {insight.descricao}
      </p>

      {/* Impacto */}
      <div className="flex items-center gap-1.5 relative z-10">
        <Zap className="h-2.5 w-2.5 text-white/25 flex-shrink-0" />
        <p className="text-[10px] text-white/35 italic">{insight.impacto}</p>
      </div>

      {/* Ação recomendada */}
      <div className={`flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 border ${cfg.border} ${cfg.bg} relative z-10`}>
        <ChevronRight className={`h-3 w-3 flex-shrink-0 ${cfg.badgeText} opacity-70`} />
        <p className={`text-[10px] font-medium ${cfg.badgeText}`}>{insight.acao}</p>
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
    <div className="flex flex-col gap-3">
      {/* Header discreto da seção */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-3 h-3 text-violet-400/60" />
        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Insights por IA</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-border-subtle, rgba(255,255,255,0.06))" }} />
        <button
          onClick={handleGerar}
          disabled={loading}
          className="flex items-center gap-1 h-6 px-2 rounded-md border border-white/[0.08] bg-white/[0.03] text-slate-500 text-[9px] font-medium hover:text-slate-300 hover:border-white/[0.12] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-[0.1em]"
        >
          <RefreshCw className={`h-2.5 w-2.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Analisando..." : insights.length > 0 ? "Atualizar" : "Gerar"}
        </button>
      </div>

      {/* Estado: erro */}
      {error && (
        <div className="rounded-[12px] border border-red-500/15 bg-red-500/[0.04] px-3 py-2 flex items-center gap-2">
          <AlertTriangle className="h-3 w-3 text-red-400/70 flex-shrink-0" />
          <p className="text-[11px] text-red-400/70">{error}</p>
        </div>
      )}

      {/* Estado: loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => <InsightSkeleton key={i} />)}
        </div>
      )}

      {/* Estado: insights carregados */}
      {!loading && insights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          {insights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {/* Estado: vazio (antes de gerar) */}
      {!loading && insights.length === 0 && !error && (
        <div className="rounded-[14px] border border-white/[0.05] bg-white/[0.015] px-4 py-5 flex flex-col items-center gap-2 text-center">
          <Lightbulb className="h-5 w-5 text-violet-400/40" />
          <p className="text-[11px] text-white/30">
            Clique em "Gerar" para que a IA analise os dados e traga recomendações
          </p>
        </div>
      )}
    </div>
  );
}
