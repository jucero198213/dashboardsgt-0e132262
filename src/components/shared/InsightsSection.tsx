import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles, AlertTriangle, TrendingUp, Eye, CheckCircle2,
  Lightbulb, RefreshCw, ChevronRight, Zap, X, List
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
  modalBorder: string;
  modalHeader: string;
}> = {
  alerta: {
    icon: AlertTriangle,
    label: "Alerta",
    border: "border-red-500/20",
    bg: "bg-red-500/[0.04]",
    badge: "bg-red-500/10 text-red-400 border border-red-500/20",
    badgeText: "text-red-400",
    dot: "bg-red-400",
    modalBorder: "border-red-400/25",
    modalHeader: "border-red-400/15",
  },
  atencao: {
    icon: Eye,
    label: "Atenção",
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.04]",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    badgeText: "text-amber-400",
    dot: "bg-amber-400",
    modalBorder: "border-amber-400/25",
    modalHeader: "border-amber-400/15",
  },
  oportunidade: {
    icon: TrendingUp,
    label: "Oportunidade",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/[0.04]",
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    badgeText: "text-emerald-400",
    dot: "bg-emerald-400",
    modalBorder: "border-emerald-400/25",
    modalHeader: "border-emerald-400/15",
  },
  positivo: {
    icon: CheckCircle2,
    label: "Positivo",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/[0.04]",
    badge: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
    badgeText: "text-cyan-400",
    dot: "bg-cyan-400",
    modalBorder: "border-cyan-400/25",
    modalHeader: "border-cyan-400/15",
  },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function InsightSkeleton() {
  return (
    <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4 animate-pulse flex flex-col gap-3">
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

// ─── Modal de detalhe ─────────────────────────────────────────────────────────
function InsightModal({ insight, onClose }: { insight: AIInsight; onClose: () => void }) {
  const cfg = TIPO_CONFIG[insight.tipo] ?? TIPO_CONFIG.atencao;
  const Icon = cfg.icon;

  // Fecha com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2,3,12,0.82)" }}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-lg max-h-[82vh] flex flex-col rounded-2xl border ${cfg.modalBorder} shadow-2xl`}
        style={{ background: "var(--sgt-bg-section)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-start gap-3 px-5 pt-4 pb-3.5 border-b ${cfg.modalHeader}`}>
          <div className={`flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center ${cfg.bg} border ${cfg.border} mt-0.5`}>
            <Icon className={`h-3.5 w-3.5 ${cfg.badgeText}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badge} uppercase tracking-[0.1em]`}>
                {cfg.label}
              </span>
            </div>
            <h3 className="text-[14px] font-bold text-slate-100 leading-snug">{insight.titulo}</h3>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg border border-white/[0.08] p-1.5 text-slate-400 hover:border-red-400/30 hover:text-red-300 transition-all mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body scrollável */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Análise principal */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Análise</p>
            <p className="text-[13px] text-slate-300 leading-relaxed">{insight.descricao}</p>
          </div>

          {/* Contexto explicativo */}
          {insight.contexto && (
            <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1.5">Como foi calculado</p>
              <p className="text-[12px] text-slate-400 leading-relaxed">{insight.contexto}</p>
            </div>
          )}

          {/* Métricas detalhadas */}
          {insight.detalhes && insight.detalhes.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Dados</p>
              <div className="grid grid-cols-2 gap-2">
                {insight.detalhes.map((det, i) => (
                  <div
                    key={i}
                    className={`rounded-[10px] border ${cfg.border} ${cfg.bg} px-3 py-2.5 flex flex-col gap-0.5`}
                  >
                    <span className="text-[10px] text-slate-500 uppercase tracking-[0.12em] font-medium">{det.rotulo}</span>
                    <span className={`text-[14px] font-bold ${cfg.badgeText}`}>{det.valor}</span>
                    {det.obs && <span className="text-[10px] text-slate-500 italic">{det.obs}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de itens (veículos, clientes, etc.) */}
          {insight.itens && insight.itens.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-1.5">
                <List className="h-2.5 w-2.5" />
                Detalhamento
              </p>
              <div className="flex flex-col gap-1">
                {insight.itens.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 rounded-[8px] border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <span className={`text-[9px] font-bold w-4 text-right shrink-0 ${cfg.badgeText} opacity-60`}>{i + 1}</span>
                    <span className="text-[12px] text-slate-300 min-w-0">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impacto */}
          <div className={`flex items-start gap-2 rounded-[10px] border ${cfg.border} ${cfg.bg} px-3.5 py-3`}>
            <Zap className={`h-3.5 w-3.5 flex-shrink-0 ${cfg.badgeText} opacity-60 mt-0.5`} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-0.5">Impacto</p>
              <p className="text-[12px] text-slate-300">{insight.impacto}</p>
            </div>
          </div>

          {/* Ação recomendada */}
          <div className={`flex items-start gap-2 rounded-[10px] border ${cfg.modalBorder} bg-white/[0.02] px-3.5 py-3`}>
            <ChevronRight className={`h-4 w-4 flex-shrink-0 ${cfg.badgeText} mt-0.5`} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-0.5">Ação recomendada</p>
              <p className={`text-[13px] font-semibold ${cfg.badgeText}`}>{insight.acao}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Card individual ──────────────────────────────────────────────────────────
function InsightCard({ insight, onClick }: { insight: AIInsight; onClick: () => void }) {
  const cfg = TIPO_CONFIG[insight.tipo] ?? TIPO_CONFIG.atencao;
  const Icon = cfg.icon;
  const temDetalhes = !!(insight.detalhes?.length || insight.contexto || insight.itens?.length);

  return (
    <div
      className={`relative rounded-[14px] border ${cfg.border} ${cfg.bg} p-4 flex flex-col gap-3 transition-all duration-200 group overflow-hidden
        ${temDetalhes ? "cursor-pointer hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]" : "hover:brightness-105"}`}
      onClick={temDetalhes ? onClick : undefined}
    >
      {/* Indicador clicável */}
      {temDetalhes && (
        <div className={`absolute top-3 right-3 flex items-center gap-1 rounded-full px-2 py-0.5 border ${cfg.border} bg-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity`}>
          <span className={`text-[8px] font-semibold uppercase tracking-[0.12em] ${cfg.badgeText}`}>Ver mais</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-2 relative z-10">
        <div className={`flex-shrink-0 h-6 w-6 rounded-lg flex items-center justify-center ${cfg.bg} border ${cfg.border} mt-0.5`}>
          <Icon className={`h-3.5 w-3.5 ${cfg.badgeText}`} />
        </div>
        <p className={`text-[13px] font-semibold text-white/90 leading-snug flex-1 ${temDetalhes ? "pr-14" : ""}`}>
          {insight.titulo}
        </p>
        <span className={`flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badge} uppercase tracking-[0.1em] ${temDetalhes ? "opacity-0 group-hover:opacity-0" : ""}`}>
          {cfg.label}
        </span>
      </div>

      {/* Descrição */}
      <p className="text-[12px] text-white/55 leading-relaxed relative z-10">
        {insight.descricao}
      </p>

      {/* Impacto */}
      <div className="flex items-center gap-1.5 relative z-10">
        <Zap className="h-2.5 w-2.5 text-white/25 flex-shrink-0" />
        <p className="text-[11px] text-white/40 italic">{insight.impacto}</p>
      </div>

      {/* Ação */}
      <div className={`flex items-center gap-1.5 rounded-[10px] px-3 py-2 border ${cfg.border} ${cfg.bg} relative z-10`}>
        <ChevronRight className={`h-3 w-3 flex-shrink-0 ${cfg.badgeText} opacity-70`} />
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
  autoGenerate?: boolean;
}

export function InsightsSection({
  setor, dados, periodo, autoGenerate = false,
}: InsightsSectionProps) {
  const { insights, loading, error, gerarInsights, limpar } = useAIInsights();
  const [modalInsight, setModalInsight] = useState<AIInsight | null>(null);
  const prevDadosRef = useRef<string>("");

  useEffect(() => {
    if (!autoGenerate) return;
    const dadosStr = JSON.stringify(dados);
    if (dadosStr === prevDadosRef.current) return;
    const temDados = Object.values(dados).some(v => v !== 0 && v !== "" && v !== null && v !== undefined);
    if (!temDados) return;
    prevDadosRef.current = dadosStr;
    gerarInsights(setor, dados, periodo);
  }, [autoGenerate, dados, setor, periodo, gerarInsights]);

  const handleGerar = () => { limpar(); gerarInsights(setor, dados, periodo); };

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Header */}
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

        {/* Erro */}
        {error && (
          <div className="rounded-[12px] border border-red-500/15 bg-red-500/[0.04] px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-red-400/70 flex-shrink-0" />
            <p className="text-[11px] text-red-400/70">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <InsightSkeleton key={i} />)}
          </div>
        )}

        {/* Cards */}
        {!loading && insights.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {insights.map(insight => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onClick={() => setModalInsight(insight)}
              />
            ))}
          </div>
        )}

        {/* Vazio */}
        {!loading && insights.length === 0 && !error && (
          <div className="rounded-[14px] border border-white/[0.05] bg-white/[0.015] px-4 py-5 flex flex-col items-center gap-2 text-center">
            <Lightbulb className="h-5 w-5 text-violet-400/40" />
            <p className="text-[11px] text-white/30">
              Clique em "Gerar" para que a IA analise os dados e traga recomendações
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalInsight && (
        <InsightModal
          insight={modalInsight}
          onClose={() => setModalInsight(null)}
        />
      )}
    </>
  );
}
