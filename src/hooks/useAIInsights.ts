import { useState, useCallback, useRef } from "react";

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

const SECTOR_CONTEXT: Record<string, string> = {
  compras: "gestão de compras e aquisições de uma empresa de logística/transporte",
  contas_pagar: "contas a pagar e fluxo de saída de caixa de uma empresa de logística/transporte",
  contas_receber: "contas a receber e fluxo de entrada de caixa de uma empresa de logística/transporte",
  faturamento: "faturamento, receita bruta, líquida e margem de uma empresa de logística/transporte",
  frota: "gestão de frota de veículos de uma empresa de logística/transporte",
  manutencao: "manutenção de frota de uma empresa de logística/transporte",
  financiamento_frota: "financiamentos e leasing da frota de uma empresa de logística/transporte",
};

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string;

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
    // Checa cache
    const cacheKey = `${setor}:${JSON.stringify(dados)}:${periodo ?? ""}`;
    const cached = insightsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setInsights(cached.insights);
      return;
    }

    // Cancela chamada anterior
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    if (!ANTHROPIC_API_KEY) {
      setError("Chave da API não configurada. Adicione VITE_ANTHROPIC_API_KEY no .env.local e reinicie o servidor.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const contexto = SECTOR_CONTEXT[setor] ?? setor;
      const periodoStr = periodo ? `Período de análise: ${periodo}.` : "";

      const systemPrompt = `Você é um analista financeiro sênior especializado em ${contexto}.
Sua função é analisar dados operacionais e financeiros e gerar insights acionáveis, não óbvios e de alto valor para a diretoria.
Responda APENAS com JSON válido, sem markdown, sem texto fora do JSON.`;

      const userPrompt = `Analise os seguintes dados de ${contexto}:
${periodoStr}

DADOS:
${JSON.stringify(dados, null, 2)}

Gere exatamente 4 insights acionáveis baseados nesses dados. Para cada insight, identifique:
- Uma observação não óbvia ou padrão relevante nos dados
- Uma recomendação concreta de ação
- O impacto potencial (financeiro, operacional ou estratégico)

Retorne um JSON com esta estrutura exata:
{
  "insights": [
    {
      "id": 1,
      "tipo": "alerta" | "oportunidade" | "atencao" | "positivo",
      "titulo": "Título curto e direto (máx 60 chars)",
      "descricao": "Descrição detalhada com a observação e recomendação (máx 200 chars)",
      "impacto": "Descrição do impacto potencial (máx 80 chars)",
      "acao": "Ação recomendada em 1 frase imperativa (máx 80 chars)"
    }
  ]
}

Tipos:
- "alerta": situação crítica que requer ação imediata
- "atencao": situação que merece monitoramento próximo
- "oportunidade": chance de melhoria ou ganho identificada
- "positivo": resultado acima do esperado ou tendência favorável`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API error: ${err}`);
      }

      const result = await response.json();
      const content = result.content?.[0]?.text ?? "";

      // Remove possíveis blocos de markdown antes de parsear
      const clean = content.replace(/```json\n?|```\n?/g, "").trim();
      const parsed = JSON.parse(clean);
      const newInsights: AIInsight[] = parsed.insights ?? [];

      setInsights(newInsights);
      insightsCache.set(cacheKey, { insights: newInsights, timestamp: Date.now() });

    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      let msg = err instanceof Error ? err.message : "Erro ao gerar insights";
      // Tenta extrair mensagem legível de erros JSON da API
      try {
        const parsed = JSON.parse(msg.replace(/^API error: /, ""));
        if (parsed?.error?.message) msg = parsed.error.message;
      } catch { /* não era JSON, mantém msg original */ }
      setError(msg);
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
