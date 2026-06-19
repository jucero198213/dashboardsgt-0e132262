import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { MessageCircle, X, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type ChatMessage = { role: "user" | "assistant"; content: string };

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Olá! Sou a assistente do SGT Workspace. Posso consultar e analisar os dados do seu DW (faturamento, contas, manutenção e mais). Não realizo alterações no sistema. Como posso ajudar?",
};

const SUGGESTIONS: { label: string; prompt: string }[] = [
  { label: "📊 Faturamento de ontem", prompt: "Qual foi o faturamento de ontem?" },
  { label: "📈 Top 5 clientes do mês", prompt: "Quais os 5 clientes que mais faturaram este mês?" },
  { label: "📅 Mês atual vs mês passado", prompt: "Compare o faturamento deste mês com o mês passado." },
  { label: "💰 Contas a pagar (7 dias)", prompt: "Quais contas a pagar vencem nos próximos 7 dias?" },
  { label: "📉 Inadimplência atual", prompt: "Qual o total de contas a receber vencidas e quem são os maiores devedores?" },
  { label: "🔧 Caminhão que mais gasta", prompt: "Qual veículo está com maior custo de manutenção nos últimos 90 dias?" },
  { label: "🛠️ Preventiva vs corretiva", prompt: "Compare os gastos de manutenção preventiva vs corretiva nos últimos 90 dias." },
  { label: "⛽ Consumo da frota", prompt: "Como está o consumo de combustível da frota nos últimos 30 dias?" },
  { label: "🛢️ Estoque do posto interno", prompt: "Qual o saldo atual de diesel do posto interno?" },
  { label: "🚛 Composição da frota", prompt: "Me mostra a composição da frota: total, situação, idade média." },
  { label: "🗺️ Operação agora", prompt: "Como está a operação em tempo real? Quantas viagens em andamento?" },
  { label: "🛒 Compras do mês", prompt: "Resumo das compras do mês: total e principais fornecedores." },
  { label: "👷 Motoristas + CNHs vencendo", prompt: "Quantos motoristas ativos temos e quais CNHs vencem nos próximos 60 dias?" },
  { label: "🏦 Saldo dos bancos", prompt: "Qual o saldo atual de todas as contas bancárias?" },
  { label: "🚚 Financiamentos de frota", prompt: "Qual o total em aberto de financiamentos de veículos e o que vence nos próximos 30 dias?" },
];

export function AiAssistant() {
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  if (role !== "admin" && role !== "diretoria") return null;

  const sendText = async (text: string) => {
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { messages: next },
      });
      if (error) throw error;
      const reply = (data as { reply?: string })?.reply ?? "Não consegui responder agora.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Erro ao consultar a IA. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const send = () => sendText(input.trim());

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clear = () => setMessages([WELCOME]);

  const gradient = "linear-gradient(135deg, var(--sgt-accent), var(--sgt-accent-hover))";

  return (
    <>
      <div
        role="dialog"
        aria-label="Assistente SGT"
        className="sgt-ai-popup"
        style={{
          position: "fixed",
          bottom: 80,
          right: 20,
          width: 360,
          height: 480,
          zIndex: 9998,
          background: "var(--sgt-bg-surface)",
          border: "1px solid var(--sgt-border-subtle)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "var(--sgt-text-primary)",
          opacity: open ? 1 : 0,
          transform: open ? "scale(1) translateY(0)" : "scale(0.92) translateY(12px)",
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
          <div
            style={{
              background: gradient,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14 }}>
              <MessageCircle size={16} />
              Assistente SGT
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={clear}
                title="Limpar conversa"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#fff",
                  padding: "4px 8px",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                }}
              >
                <Trash2 size={12} /> Limpar
              </button>
              <button
                onClick={() => setOpen(false)}
                title="Fechar"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#fff",
                  padding: 4,
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: "var(--sgt-bg-surface)",
            }}
          >
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      background: gradient,
                      color: "#fff",
                      padding: "8px 12px",
                      borderRadius: "14px 14px 4px 14px",
                      maxWidth: "80%",
                      fontSize: 13,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: gradient,
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    IA
                  </div>
                  <div
                    style={{
                      background: "var(--sgt-bg-section)",
                      color: "var(--sgt-text-primary)",
                      padding: "8px 12px",
                      borderRadius: "14px 14px 14px 4px",
                      maxWidth: "80%",
                      fontSize: 13,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      border: "1px solid var(--sgt-border-subtle)",
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ),
            )}
            {loading && (
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: gradient,
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  IA
                </div>
                <div
                  style={{
                    background: "var(--sgt-bg-section)",
                    padding: "10px 14px",
                    borderRadius: "14px 14px 14px 4px",
                    border: "1px solid var(--sgt-border-subtle)",
                    display: "flex",
                    gap: 4,
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--sgt-accent)",
                        display: "inline-block",
                        animation: `sgt-bounce 1.2s infinite ${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            {messages.length === 1 && !loading && (
              <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, color: "var(--sgt-text-muted, #888)", padding: "0 4px" }}>
                  💡 Sugestões para começar:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => sendText(s.prompt)}
                      style={{
                        background: "var(--sgt-bg-section)",
                        color: "var(--sgt-text-primary)",
                        border: "1px solid var(--sgt-border-subtle)",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 11,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--sgt-accent-soft, rgba(245,166,35,0.12))")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--sgt-bg-section)")}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>


          <div
            style={{
              padding: 10,
              borderTop: "1px solid var(--sgt-border-subtle)",
              display: "flex",
              gap: 6,
              alignItems: "flex-end",
              background: "var(--sgt-bg-surface)",
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Digite sua mensagem..."
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                background: "var(--sgt-bg-section)",
                color: "var(--sgt-text-primary)",
                border: "1px solid var(--sgt-border-subtle)",
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 13,
                outline: "none",
                maxHeight: 96,
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                background: gradient,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                opacity: loading || !input.trim() ? 0.6 : 1,
                flexShrink: 0,
              }}
              aria-label="Enviar"
            >
              <Send size={15} />
            </button>
          </div>
        </div>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Abrir assistente"
        className="sgt-ai-btn"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: gradient,
          color: "#fff",
          border: "none",
          cursor: "pointer",
          zIndex: 9998,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(245,166,35,0.4)",
        }}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      <style>{`
        @keyframes sgt-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        @media (max-width: 640px) {
          .sgt-ai-btn {
            bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important;
            right: 12px !important;
            width: 44px !important;
            height: 44px !important;
            box-shadow: 0 6px 18px rgba(245,166,35,0.45) !important;
          }
          .sgt-ai-popup {
            bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
            right: 8px !important;
            left: 8px !important;
            top: 8px !important;
            width: auto !important;
            height: auto !important;
            border-radius: 14px !important;
          }
        }
      `}</style>
    </>
  );
}

export default AiAssistant;
