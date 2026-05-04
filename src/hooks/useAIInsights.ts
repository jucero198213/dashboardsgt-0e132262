import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type InsightTipo = "alerta" | "oportunidade" | "atencao" | "positivo";

export interface AIInsight {
  id: number;
  tipo: InsightTipo;
  titulo: string;
  descricao: string;
  impacto: string;
  acao: string;
}

interface UseAIInsightsReturn {
  insights: AIInsight[];
  loading: boolean;
  error: string | null;
  gerarInsights: (setor: string, dados: Record<string, unknown>, periodo?: string) => Promise<void>;
  limpar: () => void;
}

// Cache simples para evitar chamadas repetidas com os mesmos dados
const insightsCache = new Map<string, { insights: AIInsight[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function useAIInsights(): UseAIInsightsReturn {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const gerarInsights = useCallback(async (
    setor: string,
    dados: Record<string, unknown>,
    periodo?: string
  ) => {
    // Gera chave de cache
    const cacheKey = `${setor}:${JSON.stringify(dados)}:${periodo ?? ""}`;
    const cached = insightsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setInsights(cached.insights);
      return;
    }

    // Cancela chamada anterior se ainda estiver em andamento
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-insights", {
        body: { setor, dados, periodo },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const result: AIInsight[] = data?.insights ?? [];
      setInsights(result);

      // Salva no cache
      insightsCache.set(cacheKey, { insights: result, timestamp: Date.now() });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Erro ao gerar insights");
    } finally {
      setLoading(false);
    }
  }, []);

  const limpar = useCallback(() => {
    setInsights([]);
    setError(null);
  }, []);

  return { insights, loading, error, gerarInsights, limpar };
}
