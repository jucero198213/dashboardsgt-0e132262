import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Trash2, Download, Sparkles, BarChart3, Wallet,
  TrendingUp, Fuel, Landmark, Truck, ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SofiaChatInput } from "@/components/ui/ai-chat-input";
import { TextShimmer } from "@/components/ui/shimmer-text";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Animated Aurora Background                                          */
/* ------------------------------------------------------------------ */
function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Primary arc — slow breathing pulse */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: "-30%",
          width: "140%",
          height: "80%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 50% 80%, rgba(245,158,11,0.20) 0%, rgba(234,88,12,0.09) 35%, rgba(180,83,9,0.03) 55%, transparent 70%)",
          filter: "blur(40px)",
        }}
        animate={{
          opacity: [0.6, 1, 0.6],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Inner glow — offset breathing */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: "-25%",
          width: "100%",
          height: "60%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 50% 85%, rgba(251,191,36,0.14) 0%, rgba(245,158,11,0.06) 40%, transparent 65%)",
          filter: "blur(30px)",
        }}
        animate={{
          opacity: [0.5, 0.9, 0.5],
          scale: [1.02, 0.98, 1.02],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />
      {/* Edge ring — subtle shimmer */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: "-28%",
          width: "120%",
          height: "70%",
          borderRadius: "50%",
          boxShadow: "inset 0 0 80px 2px rgba(251,191,36,0.08), inset 0 0 160px 4px rgba(245,158,11,0.04)",
        }}
        animate={{
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      {/* Top ambient haze */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 50% 30% at 50% 0%, rgba(245,158,11,0.03), transparent 60%)",
        }}
      />

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <FloatingParticle key={i} index={i} />
      ))}
    </div>
  );
}

function FloatingParticle({ index }: { index: number }) {
  const size = useMemo(() => 1.5 + Math.random() * 2, []);
  const startX = useMemo(() => 10 + Math.random() * 80, []);
  const startY = useMemo(() => 20 + Math.random() * 60, []);
  const duration = useMemo(() => 12 + Math.random() * 18, []);
  const delay = useMemo(() => Math.random() * 10, []);
  const driftX = useMemo(() => (Math.random() - 0.5) * 60, []);
  const driftY = useMemo(() => -20 - Math.random() * 40, []);

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `${startX}%`,
        top: `${startY}%`,
        background: `rgba(251, 191, 36, ${0.15 + Math.random() * 0.2})`,
        boxShadow: `0 0 ${size * 3}px rgba(251, 191, 36, 0.15)`,
      }}
      animate={{
        x: [0, driftX * 0.5, driftX, driftX * 0.3, 0],
        y: [0, driftY * 0.3, driftY * 0.7, driftY, 0],
        opacity: [0, 0.6, 0.8, 0.4, 0],
        scale: [0.5, 1, 1.2, 0.8, 0.5],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Animated Title                                                      */
/* ------------------------------------------------------------------ */
function AnimatedTitle() {
  const reduce = useReducedMotion();
  const text = "Sofia AI";

  if (reduce) {
    return (
      <h1 className="text-[clamp(2.2rem,7vw,3.8rem)] font-black tracking-tight text-white mb-3">
        {text}
      </h1>
    );
  }

  return (
    <h1 className="text-[clamp(2.2rem,7vw,3.8rem)] font-black tracking-tight mb-3 overflow-hidden">
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.6,
            delay: 0.15 + i * 0.04,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            backgroundImage: "linear-gradient(135deg, #ffffff 0%, #fcd34d 40%, #f59e0b 60%, #ffffff 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </h1>
  );
}

/* ------------------------------------------------------------------ */
/*  Suggestion Chip with spring hover                                   */
/* ------------------------------------------------------------------ */
function SuggestionChip({
  icon: Icon,
  label,
  onClick,
  index,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  index: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: 0.5,
        delay: 0.6 + index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        scale: 1.06,
        y: -2,
        transition: { type: "spring", stiffness: 400, damping: 15 },
      }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-[12px] font-medium text-white/30 border border-white/[0.06] bg-white/[0.02] hover:text-white/80 hover:border-amber-400/25 hover:bg-amber-400/[0.06] transition-colors duration-300 cursor-default overflow-hidden"
    >
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(251,191,36,0.08), transparent 70%)" }}
      />
      <Icon className="w-3.5 h-3.5 opacity-40 group-hover:opacity-90 transition-all duration-300 relative z-10 group-hover:text-amber-400" />
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Message Bubble                                                      */
/* ------------------------------------------------------------------ */
function MessageBubble({ msg, index }: { msg: ChatMessage; index: number }) {
  const reduce = useReducedMotion();

  if (msg.role === "user") {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20, scale: 0.92, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex justify-end"
      >
        <div className="max-w-[70%] rounded-3xl rounded-br-lg px-5 py-3 text-[14px] leading-relaxed whitespace-pre-wrap break-words bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/10">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20, scale: 0.92, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-3 items-start"
    >
      <motion.div
        initial={reduce ? false : { scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.4, delay: 0.1, type: "spring", stiffness: 300, damping: 15 }}
        className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white mt-0.5 shadow-md shadow-amber-500/20"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </motion.div>
      <div className="max-w-[80%] space-y-2 flex-1">
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="text-[14px] leading-relaxed whitespace-pre-wrap break-words text-slate-200"
        >
          {msg.content}
        </motion.div>
        {msg.planilha?.xlsx_base64 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => baixarBase64(msg.planilha!.filename ?? "conferencia_nfe.xlsx", msg.planilha!.xlsx_base64!, XLSX_MIME)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 transition-colors"
          >
            <Download size={12} />
            Baixar planilha
          </motion.button>
        )}
        {msg.danfe?.pdf_base64 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
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
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Typing Indicator                                                    */
/* ------------------------------------------------------------------ */
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-3 items-start"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white mt-0.5 shadow-md shadow-amber-500/20"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-3.5 h-3.5" />
        </motion.div>
      </motion.div>
      <div className="pt-1">
        <TextShimmer className="text-[14px] font-medium" duration={1.5}>
          Sofia está pensando...
        </TextShimmer>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Glowing divider line                                                */
/* ------------------------------------------------------------------ */
function GlowLine() {
  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-16 h-[1px] mx-auto mb-10"
      style={{
        background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.4), transparent)",
        boxShadow: "0 0 8px rgba(251,191,36,0.15)",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
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

      {/* Animated aurora */}
      <AuroraBackground />

      {/* Back button + Beta badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute top-4 left-4 z-30 flex items-center gap-2"
      >
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.06)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/home")}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-white/15 hover:text-white/50 transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400/70 border border-amber-400/20 bg-amber-400/[0.06] select-none">
          Beta
        </span>
      </motion.div>

      {/* Clear button */}
      <AnimatePresence>
        {hasMessages && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-4 right-4 z-30"
          >
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.06)" }}
              whileTap={{ scale: 0.95 }}
              onClick={clear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-white/20 hover:text-white/60 transition-colors"
            >
              <Trash2 size={11} />
              Limpar
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <AnimatePresence mode="wait">
          {!hasMessages ? (
            /* ── EMPTY STATE ── */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                y: -40,
                scale: 0.95,
                filter: "blur(10px)",
                transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
              }}
              className="flex-1 flex flex-col items-center justify-center px-4"
            >
              {/* Sparkles icon */}
              <motion.div
                initial={reduce ? false : { scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 12,
                  delay: 0.05,
                }}
                className="mb-6"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-xl shadow-amber-500/25"
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
              </motion.div>

              {/* Title */}
              <AnimatedTitle />

              {/* Subtitle */}
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="text-[15px] text-white/25 mb-4 text-center"
              >
                Assistente inteligente da SGT
              </motion.p>

              {/* Glowing divider */}
              <GlowLine />

              {/* Input */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 20, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[620px] mb-8"
              >
                <SofiaChatInput
                  onSubmit={sendText}
                  disabled={loading}
                  placeholder="Pergunte qualquer coisa..."
                />
              </motion.div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2.5 justify-center max-w-[640px]">
                {SUGGESTIONS.map((s, i) => (
                  <SuggestionChip
                    key={s.label}
                    icon={s.icon}
                    label={s.label}
                    onClick={() => sendText(s.prompt)}
                    index={i}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            /* ── CHAT STATE ── */
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col min-h-0"
            >
              <div ref={listRef} className="flex-1 overflow-y-auto pt-14 pb-4">
                <div className="max-w-2xl mx-auto px-5 space-y-6">
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} index={i} />
                  ))}
                  {loading && <TypingIndicator />}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="pb-6 pt-3 px-4"
              >
                <div className="max-w-2xl mx-auto">
                  <SofiaChatInput
                    onSubmit={sendText}
                    disabled={loading}
                    placeholder="Pergunte algo..."
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
