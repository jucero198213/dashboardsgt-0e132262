import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Message = {
  role: "assistant",
  content: "Olá! Sou a assistente do SGT Workspace. Como posso ajudar você hoje?",
};

export function AiAssistant() {
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAllowed = role === "admin" || role === "diretoria";
  if (!isAllowed) return null;

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { messages: updated.filter((m) => m !== WELCOME) },
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data?.reply ?? "Não consegui processar sua solicitação." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro ao conectar com a assistente. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => setMessages([WELCOME]);

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-[9998] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: 360,
            height: 480,
            background: "var(--sgt-bg-surface)",
            border: "1px solid var(--sgt-border-subtle)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              background: "linear-gradient(95deg, var(--sgt-accent) 0%, var(--sgt-accent-hover) 100%)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-semibold">Assistente SGT</span>
              <span
                className="h-2 w-2 rounded-full bg-green-300 animate-pulse"
                title="Online"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="text-white/70 hover:text-white text-xs transition-colors"
                title="Limpar conversa"
              >
                Limpar
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
                title="Fechar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="h-6 w-6 rounded-full shrink-0 mr-2 mt-0.5 flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: "linear-gradient(135deg, var(--sgt-accent), var(--sgt-accent-hover))",
                      color: "#fff",
                    }}
                  >
                    IA
                  </div>
                )}
                <div
                  className="max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                  style={
                    msg.role === "user"
                      ? {
                          background: "var(--sgt-accent)",
                          color: "#fff",
                          borderBottomRightRadius: 4,
                        }
                      : {
                          background: "var(--sgt-bg-section)",
                          color: "var(--sgt-text-primary)",
                          borderBottomLeftRadius: 4,
                        }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="h-6 w-6 rounded-full shrink-0 mr-2 mt-0.5 flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: "linear-gradient(135deg, var(--sgt-accent), var(--sgt-accent-hover))",
                    color: "#fff",
                  }}
                >
                  IA
                </div>
                <div
                  className="rounded-2xl px-4 py-3 flex gap-1 items-center"
                  style={{ background: "var(--sgt-bg-section)", borderBottomLeftRadius: 4 }}
                >
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full animate-bounce"
                      style={{
                        background: "var(--sgt-accent)",
                        animationDelay: `${d * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="shrink-0 flex items-center gap-2 px-3 py-3"
            style={{ borderTop: "1px solid var(--sgt-border-subtle)" }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Digite sua mensagem..."
              disabled={loading}
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--sgt-bg-section)",
                color: "var(--sgt-text-primary)",
                border: "1px solid var(--sgt-border-subtle)",
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, var(--sgt-accent), var(--sgt-accent-hover))",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="m22 2-7 20-4-9-9-4z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[9998] h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        style={{
          background: open
            ? "var(--sgt-text-secondary)"
            : "linear-gradient(135deg, var(--sgt-accent) 0%, var(--sgt-accent-hover) 100%)",
        }}
        title="Assistente IA"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2a8 8 0 0 1 8 8c0 3.5-2 6.5-5 7.7V20a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2.3C6 16.5 4 13.5 4 10a8 8 0 0 1 8-8z" />
            <circle cx="9" cy="10" r="1" fill="white" />
            <circle cx="12" cy="10" r="1" fill="white" />
            <circle cx="15" cy="10" r="1" fill="white" />
          </svg>
        )}
      </button>
    </>
  );
}
