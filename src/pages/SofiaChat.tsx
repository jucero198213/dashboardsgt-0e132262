import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Trash2, Download, Sparkles, BarChart3, Wallet,
  TrendingUp, Fuel, Landmark, Truck, ArrowLeft,
} from "lucide-react";
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

const SUGGESTIONS: { icon: React.ElementType; label: string; prompt: string }[] = [
  { icon: BarChart3, label: "Faturamento",     prompt: "Qual foi o faturamento de ontem?" },
  { icon: Wallet,    label: "Contas a pagar",   prompt: "Quais contas a pagar vencem nos próximos 7 dias?" },
  { icon: TrendingUp,label: "Comparar meses",   prompt: "Compare o faturamento deste mês com o mês passado." },
  { icon: Fuel,      label: "Consumo frota",    prompt: "Como está o consumo de combustível da frota nos últimos 30 dias?" },
  { icon: Landmark,  label: "Saldo bancos",     prompt: "Qual o saldo atual de todas as contas bancárias?" },
  { icon: Truck,     label: "Composição frota", prompt: "Me mostra a composição da frota: total, situação, idade média." },
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const reduce = useReducedMotion();

  if (msg.role === "user") {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex justify-end"
      >
        <div className="max-w-[70%] rounded-3xl rounded-br-lg px-5 py-3 text-[14px] leading-relaxed whitespace-pre-wrap break-words bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex gap-3 items-start"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white mt-0.5">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div className="max-w-[80%] space-y-2 flex-1">
        <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words text-slate-200">
          {msg.content}
        </div>
        {msg.planilha?.xlsx_base64 && (
          <button
            onClick={() => baixarBase64(msg.planilha!.filename ?? "conferencia_nfe.xlsx", msg.planilha!.xlsx_base64!, XLSX_MIME)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 transition-colors"
          >
            <Download size={12} />
            Baixar planilha
          </button>
        )}
        {msg.danfe?.pdf_base64 && (
          <button
            onClick={() => {
              const bytes = Uint8Array.from(atob(msg.danfe!.pdf_base64!), (c) => c.charCodeAt(0));
              const blob = new Blob([bytes], { type: "application/pdf" });
              const url = URL.createObjectURL(blob);
              window.open(url, "_blank");
              setTimeout(() => URL.revokeObjectURL(url), 60000);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 transition-colors"
          >
            <Download size={12} />
            Abrir DANFE
          </button>
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
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white mt-0.5">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div className="pt-1">
        <TextShimmer className="text-[14px] font-medium" duration={1.5}>
          Sofia está pensando...
        </TextShimmer>
      </div>
    </motion.div>
  );
}

export default function SofiaChat() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);

  const sendText = async (text: string) => {
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [WELCOME, ...messages, userMsg];
    setMessages((m) => [...m, userMsg]);
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

  const clear = () => setMessages([]);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden relative bg-[#07090e]">

      {/* ── Ambient aurora arc (amber/gold) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Main arc glow */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: "-30%",
            width: "140%",
            height: "80%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at 50% 80%, rgba(245,158,11,0.18) 0%, rgba(234,88,12,0.08) 35%, rgba(180,83,9,0.03) 55%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        {/* Secondary inner glow */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: "-25%",
            width: "100%",
            height: "60%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at 50% 85%, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.05) 40%, transparent 65%)",
            filter: "blur(30px)",
          }}
        />
        {/* Bright edge ring */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: "-28%",
            width: "120%",
            height: "70%",
            borderRadius: "50%",
            background: "transparent",
            boxShadow: "inset 0 0 80px 2px rgba(251,191,36,0.08), inset 0 0 160px 4px rgba(245,158,11,0.04)",
          }}
        />
        {/* Subtle top ambient */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 50% 30% at 50% 0%, rgba(245,158,11,0.03), transparent 60%)",
          }}
        />
      </div>

      {/* ── Back button (always visible, discrete) ── */}
      <div className="absolute top-4 left-4 z-30">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/5 transition-all"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* ── Clear button (only when chatting) ── */}
      <AnimatePresence>
        {hasMessages && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 right-4 z-30"
          >
            <button
              onClick={clear}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white/25 hover:text-white/60 hover:bg-white/5 transition-all"
            >
              <Trash2 size={11} />
              Limpar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <AnimatePresence mode="wait">
          {!hasMessages ? (
            /* ── EMPTY STATE — centered ── */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -30, transition: { duration: 0.25 } }}
              className="flex-1 flex flex-col items-center justify-center px-4"
            >
              {/* Title */}
              <motion.h1
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="text-[clamp(2rem,6vw,3.2rem)] font-black tracking-tight text-white mb-2"
              >
                Sofia AI
              </motion.h1>

              <motion.p
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-[15px] text-white/35 mb-12 text-center"
              >
                Assistente inteligente da SGT — pergunte em linguagem natural.
              </motion.p>

              {/* Input */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="w-full max-w-[620px] mb-8"
              >
                <SofiaChatInput
                  onSubmit={sendText}
                  disabled={loading}
                  placeholder="Pergunte algo para a Sofia..."
                />
              </motion.div>

              {/* Suggestion chips */}
              <motion.div
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="flex flex-wrap gap-2.5 justify-center max-w-[640px]"
              >
                {SUGGESTIONS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.button
                      key={s.label}
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.5 + i * 0.04 }}
                      onClick={() => sendText(s.prompt)}
                      className="group flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium text-white/30 border border-white/[0.06] bg-white/[0.02] hover:text-white/70 hover:border-white/15 hover:bg-white/[0.05] transition-all duration-300 cursor-default"
                    >
                      <Icon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-80 transition-opacity" />
                      {s.label}
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>
          ) : (
            /* ── CHAT STATE ── */
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <div ref={listRef} className="flex-1 overflow-y-auto pt-14 pb-4">
                <div className="max-w-2xl mx-auto px-5 space-y-6">
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} />
                  ))}
                  {loading && <TypingIndicator />}
                </div>
              </div>

              <div className="pb-6 pt-3 px-4">
                <div className="max-w-2xl mx-auto">
                  <SofiaChatInput
                    onSubmit={sendText}
                    disabled={loading}
                    placeholder="Pergunte algo..."
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
