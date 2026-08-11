import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Trash2, Download, ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SofiaChatInput } from "@/components/ui/ai-chat-input";
import { TextShimmer } from "@/components/ui/shimmer-text";

type Planilha = { filename?: string; xlsx_base64?: string };
type Danfe = { filename?: string; pdf_base64?: string };
type ChatMessage = { role: "user" | "assistant"; content: string; planilha?: Planilha; danfe?: Danfe };

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function baixarBase64(filename: string, base64: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Olá! Sou a Sofia, assistente de IA da SGT. Posso consultar e analisar os dados do seu DW (faturamento, contas, manutenção e mais). Não realizo alterações no sistema. Como posso ajudar?",
};

const SUGGESTIONS: { label: string; prompt: string }[] = [
  { label: "Faturamento de ontem", prompt: "Qual foi o faturamento de ontem?" },
  { label: "Top 5 clientes do mês", prompt: "Quais os 5 clientes que mais faturaram este mês?" },
  { label: "Mês atual vs mês passado", prompt: "Compare o faturamento deste mês com o mês passado." },
  { label: "Contas a pagar (7 dias)", prompt: "Quais contas a pagar vencem nos próximos 7 dias?" },
  { label: "Inadimplência atual", prompt: "Qual o total de contas a receber vencidas e quem são os maiores devedores?" },
  { label: "Caminhão que mais gasta", prompt: "Qual veículo está com maior custo de manutenção nos últimos 90 dias?" },
  { label: "Consumo da frota", prompt: "Como está o consumo de combustível da frota nos últimos 30 dias?" },
  { label: "Saldo dos bancos", prompt: "Qual o saldo atual de todas as contas bancárias?" },
  { label: "Composição da frota", prompt: "Me mostra a composição da frota: total, situação, idade média." },
  { label: "Compras do mês", prompt: "Resumo das compras do mês: total e principais fornecedores." },
  { label: "Motoristas + CNHs", prompt: "Quantos motoristas ativos temos e quais CNHs vencem nos próximos 60 dias?" },
  { label: "Financiamentos", prompt: "Qual o total em aberto de financiamentos de veículos e o que vence nos próximos 30 dias?" },
];

function MessageBubble({ msg, index }: { msg: ChatMessage; index: number }) {
  const reduce = useReducedMotion();

  if (msg.role === "user") {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex justify-end"
      >
        <div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap break-words bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/10">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex gap-3 items-start"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/15">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="max-w-[80%] space-y-2">
        <div className="rounded-2xl rounded-tl-md px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap break-words dark:bg-white/[0.06] bg-slate-100 dark:text-[var(--sgt-text-primary)] text-slate-800 border dark:border-white/8 border-slate-200/60">
          {msg.content}
        </div>
        {msg.planilha?.xlsx_base64 && (
          <button
            onClick={() => baixarBase64(msg.planilha!.filename ?? "conferencia_nfe.xlsx", msg.planilha!.xlsx_base64!, XLSX_MIME)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold cursor-pointer bg-amber-400/10 text-amber-400 border border-amber-400/25 hover:bg-amber-400/20 transition-colors"
          >
            <Download size={13} />
            Baixar planilha (Excel)
          </button>
        )}
        {msg.danfe?.pdf_base64 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                const bytes = Uint8Array.from(atob(msg.danfe!.pdf_base64!), (c) => c.charCodeAt(0));
                const blob = new Blob([bytes], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank");
                setTimeout(() => URL.revokeObjectURL(url), 60000);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold cursor-pointer bg-amber-400/10 text-amber-400 border border-amber-400/25 hover:bg-amber-400/20 transition-colors"
            >
              <Download size={13} />
              Abrir DANFE (PDF)
            </button>
            <button
              onClick={() => baixarBase64(msg.danfe!.filename ?? "danfe.pdf", msg.danfe!.pdf_base64!, "application/pdf")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold cursor-pointer dark:bg-white/5 bg-slate-100 dark:text-[var(--sgt-text-primary)] text-slate-600 border dark:border-white/10 border-slate-200 hover:dark:bg-white/10 hover:bg-slate-200 transition-colors"
            >
              <Download size={13} />
              Baixar
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 items-start"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/15">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="rounded-2xl rounded-tl-md px-4 py-3 dark:bg-white/[0.06] bg-slate-100 border dark:border-white/8 border-slate-200/60">
        <TextShimmer className="text-[14px] font-medium" duration={1.5}>
          Sofia está pensando...
        </TextShimmer>
      </div>
    </motion.div>
  );
}

export default function SofiaChat() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const reduce = useReducedMotion();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);

  const sendText = async (text: string) => {
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { messages: next },
      });
      if (error) throw error;
      const reply = (data as { reply?: string })?.reply ?? "Não consegui responder agora.";
      const planilha = (data as { planilha?: Planilha })?.planilha;
      const danfe = (data as { danfe?: Danfe })?.danfe;
      setMessages((m) => [...m, { role: "assistant", content: reply, planilha, danfe }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Erro ao consultar a IA. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => setMessages([WELCOME]);

  const showChat = messages.length > 1 || loading;

  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      {/* Atmosfera */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_-8%,rgba(180,110,4,0.10),transparent_58%)]" />

      {/* Header */}
      <header className="relative z-20 flex items-center gap-3 px-4 py-3 sm:px-6 border-b dark:border-white/[0.06] border-slate-200/60 dark:bg-[var(--sgt-bg-surface)]/80 bg-white/80 backdrop-blur-xl">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center justify-center w-9 h-9 rounded-xl dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500 hover:dark:bg-white/10 hover:bg-slate-200 transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/15">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold dark:text-white text-slate-800 leading-tight">Sofia AI</h1>
            <p className="text-[11px] dark:text-slate-500 text-slate-400 leading-tight">Assistente inteligente SGT</p>
          </div>
        </div>

        <button
          onClick={clear}
          title="Nova conversa"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500 hover:dark:bg-white/10 hover:bg-slate-200 transition-colors"
        >
          <Trash2 size={12} />
          <span className="hidden sm:inline">Nova conversa</span>
        </button>
      </header>

      {/* Chat area */}
      <div ref={listRef} className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Welcome screen */}
          {!showChat && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex flex-col items-center text-center pt-8 sm:pt-16"
            >
              <motion.div
                initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.175, 0.885, 0.32, 1.275] }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-xl shadow-amber-500/20 mb-6"
              >
                <Sparkles className="w-7 h-7" />
              </motion.div>

              <motion.h2
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-2xl sm:text-3xl font-black tracking-tight dark:text-white text-slate-800 mb-2"
              >
                Como posso ajudar?
              </motion.h2>
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-[14px] dark:text-slate-400 text-slate-500 max-w-md mb-10"
              >
                Consulte faturamento, contas, frota, manutenção e muito mais. Pergunte em linguagem natural.
              </motion.p>

              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="w-full max-w-xl"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] dark:text-slate-600 text-slate-400 mb-4">
                  Sugestões para começar
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s.label}
                      initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.45 + i * 0.03 }}
                      onClick={() => sendText(s.prompt)}
                      className="px-3 py-2 rounded-xl text-[12px] font-medium dark:bg-white/[0.04] bg-slate-50 dark:text-slate-300 text-slate-600 border dark:border-white/8 border-slate-200/80 hover:dark:bg-white/[0.08] hover:bg-slate-100 hover:dark:border-white/15 hover:border-slate-300 transition-all duration-200 hover:-translate-y-0.5"
                    >
                      {s.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Messages */}
          {showChat && (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} index={i} />
              ))}
              {loading && <TypingIndicator />}
            </>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="relative z-20 border-t dark:border-white/[0.06] border-slate-200/60 dark:bg-[var(--sgt-bg-surface)]/80 bg-white/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <SofiaChatInput
            onSubmit={sendText}
            disabled={loading}
            placeholder="Pergunte algo para a Sofia..."
          />
        </div>
      </div>
    </div>
  );
}
