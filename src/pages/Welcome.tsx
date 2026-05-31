/**
 * Welcome — SGT Log
 * Tela de entrada mobile-first (fintech premium, glassmorphism).
 * Desktop: redireciona automaticamente para /login.
 */
import { useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, TrendingUp, ArrowRight, UserPlus } from "lucide-react";
import sgtLogo from "@/assets/sgt-logo-clean.png";

// ── Dados do mini-dashboard (hero) ──────────────────────────────────────────
const BARS = [
  { h: 48,  delay: 0.0 },
  { h: 72,  delay: 0.08 },
  { h: 38,  delay: 0.16 },
  { h: 88,  delay: 0.24 },
  { h: 60,  delay: 0.32 },
  { h: 95,  delay: 0.40 },
  { h: 54,  delay: 0.48 },
];

const CHIPS = [
  { label: "Financeiro",  top: "8%",  left: "-14px",  delay: 0.0 },
  { label: "Operação",    top: "38%", right: "-16px",  delay: 0.4 },
  { label: "Frota",       top: "72%", left: "-8px",    delay: 0.8 },
];

export default function Welcome() {
  const navigate                  = useNavigate();
  const { session, isLoading }    = useAuth();

  // Desktop: pula direto pro login
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  if (isLoading) return (
    <div style={{ display:"flex", height:"100dvh", alignItems:"center", justifyContent:"center", background:"#080C14" }}>
      <div style={{ width:28, height:28, borderRadius:"50%", border:"2px solid rgba(245,166,35,0.3)", borderTopColor:"#F5A623", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (session) return <Navigate to="/home" replace />;

  return (
    <>
      {/* ── CSS animations ─────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        .wlc-root {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          background: #080C14;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        /* Fundos atmosféricos */
        .wlc-glow-top {
          position: fixed; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 90% 55% at 50% -4%, rgba(245,166,35,0.18) 0%, transparent 62%);
        }
        .wlc-glow-bottom {
          position: fixed; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 70% 40% at 50% 110%, rgba(245,166,35,0.07) 0%, transparent 60%);
        }
        .wlc-grid {
          position: fixed; inset: 0; pointer-events: none; opacity: 0.025;
          background-image: linear-gradient(rgba(245,166,35,0.6) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(245,166,35,0.6) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* Entrada geral */
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .wlc-fadein { animation: fadeSlide 0.55s cubic-bezier(.22,.68,0,1.05) both; }

        /* Barras do chart */
        @keyframes barGrow {
          from { transform: scaleY(0); opacity: 0; }
          to   { transform: scaleY(1); opacity: 1; }
        }
        .wlc-bar {
          transform-origin: bottom;
          animation: barGrow 0.6s cubic-bezier(.22,.68,0,1.1) both;
        }

        /* Chips flutuando */
        @keyframes floatChip {
          0%, 100% { transform: translateY(0px);  }
          50%       { transform: translateY(-5px); }
        }
        .wlc-chip-float {
          animation: floatChip 3.2s ease-in-out infinite;
        }

        /* Pulse no card */
        @keyframes cardPulse {
          0%, 100% { box-shadow: 0 0 32px rgba(245,166,35,0.10), 0 20px 60px rgba(0,0,0,0.55); }
          50%       { box-shadow: 0 0 48px rgba(245,166,35,0.18), 0 20px 60px rgba(0,0,0,0.55); }
        }
        .wlc-card { animation: cardPulse 4s ease-in-out infinite; }

        /* Sparkline trace */
        @keyframes traceLine {
          from { stroke-dashoffset: 300; }
          to   { stroke-dashoffset: 0; }
        }
        .wlc-sparkline {
          stroke-dasharray: 300;
          animation: traceLine 1.4s cubic-bezier(.4,0,.2,1) 0.8s both;
        }

        /* Dot piscando */
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        .wlc-dot { animation: blink 1.8s ease-in-out infinite; }

        /* Botão primário */
        .wlc-btn-primary {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 16px 24px;
          background: linear-gradient(95deg, #F5A623 0%, #E09010 100%);
          border: none; border-radius: 14px; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 16px; font-weight: 700; color: #1B1304;
          letter-spacing: 0.01em;
          box-shadow: 0 4px 24px rgba(245,166,35,0.35), 0 1px 0 rgba(255,255,255,0.12) inset;
          transition: transform 120ms, box-shadow 120ms;
          -webkit-tap-highlight-color: transparent;
        }
        .wlc-btn-primary:active {
          transform: scale(0.975);
          box-shadow: 0 2px 12px rgba(245,166,35,0.25);
        }

        /* Botão secundário */
        .wlc-btn-secondary {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 14px 24px;
          background: rgba(245,166,35,0.06);
          border: 1px solid rgba(245,166,35,0.20); border-radius: 14px; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 600; color: #F5A623;
          transition: background 120ms, border-color 120ms;
          -webkit-tap-highlight-color: transparent;
        }
        .wlc-btn-secondary:active { background: rgba(245,166,35,0.12); }

        .wlc-metric-num { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="wlc-root">
        {/* Fundos */}
        <div className="wlc-glow-top" />
        <div className="wlc-glow-bottom" />
        <div className="wlc-grid" />

        {/* ── TOPO: Logo ───────────────────────────────────────────────── */}
        <div className="wlc-fadein" style={{ padding: "52px 28px 0", animationDelay: "0s",
          display: "flex", alignItems: "center", gap: 10, zIndex: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <img src={sgtLogo} alt="SGT" style={{ width: 22, height: 22, objectFit: "contain" }}
              onError={e => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement!.innerHTML = `<span style="font-family:'Space Grotesk',sans-serif;font-weight:800;font-style:italic;font-size:14px;color:#F5A623">S</span>`;
              }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.32em", textTransform: "uppercase",
              color: "rgba(240,244,248,0.45)", lineHeight: 1 }}>Workspace</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#F0F4F8", lineHeight: 1.2,
              fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.3px" }}>SGT Log</p>
          </div>
        </div>

        {/* ── HERO: Card glassmorphism + mini dashboard ─────────────────── */}
        <div className="wlc-fadein" style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "28px 40px", animationDelay: "0.1s", zIndex: 10, position: "relative",
        }}>
          {/* Chips flutuando */}
          {CHIPS.map((c, i) => (
            <div key={i} className="wlc-chip-float" style={{
              position: "absolute",
              top: c.top,
              ...(c.left  ? { left:  c.left  } : {}),
              ...(c.right ? { right: c.right } : {}),
              animationDelay: `${c.delay}s`,
              zIndex: 20,
            }}>
              <div style={{
                padding: "5px 11px", borderRadius: 999,
                background: "rgba(15,21,32,0.92)",
                border: "1px solid rgba(245,166,35,0.22)",
                backdropFilter: "blur(8px)",
                fontSize: 11, fontWeight: 600, color: "#F5A623",
                letterSpacing: "0.04em",
                boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                whiteSpace: "nowrap",
              }}>{c.label}</div>
            </div>
          ))}

          {/* Card principal */}
          <div className="wlc-card" style={{
            width: "100%", maxWidth: 320,
            background: "rgba(14,20,34,0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(245,166,35,0.18)",
            borderRadius: 20,
            padding: "20px 20px 16px",
            position: "relative", overflow: "hidden",
          }}>
            {/* Glow interno topo */}
            <div style={{
              position: "absolute", top: 0, left: "20%", right: "20%", height: 1,
              background: "linear-gradient(90deg, transparent, rgba(245,166,35,0.5), transparent)",
            }} />

            {/* Header do card */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                  color: "rgba(143,163,187,0.55)", marginBottom: 2 }}>Painel Executivo</p>
                <p className="wlc-metric-num" style={{ fontSize: 22, fontWeight: 700, color: "#F0F4F8", lineHeight: 1 }}>
                  R$ 12,4M
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                {/* Dot live */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div className="wlc-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C97A" }} />
                  <span style={{ fontSize: 10, color: "#22C97A", fontWeight: 600 }}>Live</span>
                </div>
                {/* Delta */}
                <div style={{
                  padding: "3px 8px", borderRadius: 999,
                  background: "rgba(34,201,122,0.1)", border: "1px solid rgba(34,201,122,0.2)",
                }}>
                  <span className="wlc-metric-num" style={{ fontSize: 12, fontWeight: 700, color: "#22C97A" }}>↑ 8.4%</span>
                </div>
              </div>
            </div>

            {/* Mini KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { label: "A Receber", value: "R$ 10,7M", color: "#4A9EFF", bg: "rgba(74,158,255,0.08)", border: "rgba(74,158,255,0.18)" },
                { label: "A Pagar",   value: "R$ 8,8M",  color: "#F0A730", bg: "rgba(240,167,48,0.08)",  border: "rgba(240,167,48,0.18)" },
              ].map((k, i) => (
                <div key={i} style={{
                  padding: "8px 10px", borderRadius: 10,
                  background: k.bg, border: `1px solid ${k.border}`,
                }}>
                  <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                    color: "rgba(143,163,187,0.5)", marginBottom: 2 }}>{k.label}</p>
                  <p className="wlc-metric-num" style={{ fontSize: 14, fontWeight: 700, color: k.color }}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
                color: "rgba(143,163,187,0.4)", marginBottom: 8 }}>Faturamento mensal</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 60 }}>
                {BARS.map((b, i) => (
                  <div key={i} className="wlc-bar" style={{
                    flex: 1, borderRadius: "4px 4px 2px 2px",
                    height: `${b.h}%`,
                    background: i === BARS.length - 2
                      ? "linear-gradient(180deg,#F5A623,#C77E1A)"
                      : "rgba(245,166,35,0.22)",
                    border: i === BARS.length - 2
                      ? "1px solid rgba(245,166,35,0.5)"
                      : "1px solid rgba(245,166,35,0.08)",
                    animationDelay: `${0.4 + b.delay}s`,
                  }} />
                ))}
              </div>
            </div>

            {/* Sparkline */}
            <svg width="100%" height="32" viewBox="0 0 280 32" preserveAspectRatio="none"
                 style={{ display: "block", marginTop: 4 }}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5A623" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,24 L40,18 L80,22 L120,10 L160,14 L200,6 L240,10 L280,4"
                fill="none" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="wlc-sparkline" />
              <path d="M0,24 L40,18 L80,22 L120,10 L160,14 L200,6 L240,10 L280,4 L280,32 L0,32 Z"
                fill="url(#sparkGrad)" opacity="0.5" />
              {/* Dot no último ponto */}
              <circle cx="280" cy="4" r="3" fill="#F5A623"
                style={{ animation: "blink 1.8s ease-in-out infinite" }} />
            </svg>
          </div>
        </div>

        {/* ── TEXTO + CTAs ──────────────────────────────────────────────── */}
        <div className="wlc-fadein" style={{
          padding: "0 28px 40px", zIndex: 10, animationDelay: "0.2s",
        }}>
          {/* Headline */}
          <div style={{ marginBottom: 20 }}>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 28, fontWeight: 800, lineHeight: 1.15,
              color: "#F0F4F8", letterSpacing: "-0.5px", marginBottom: 8,
            }}>
              Sua plataforma<br />
              <span style={{ color: "#F5A623" }}>operacional</span> e<br />
              financeira.
            </p>
            <p style={{
              fontSize: 14, fontWeight: 400, color: "rgba(143,163,187,0.7)",
              lineHeight: 1.55,
            }}>
              Indicadores, frota, financeiro e gestão — tudo da SGT Log em tempo real, no seu bolso.
            </p>
          </div>

          {/* Module chips row */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
            {["Financeiro","Frota","Compras","RH","Operação"].map((m, i) => (
              <span key={i} style={{
                padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.16)",
                color: "rgba(245,166,35,0.75)", letterSpacing: "0.03em",
              }}>{m}</span>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="wlc-btn-primary" onClick={() => navigate("/login")}>
              Acessar Plataforma
              <ArrowRight size={18} />
            </button>
            <button className="wlc-btn-secondary" onClick={() => navigate("/login?mode=first-access")}>
              <UserPlus size={15} />
              Primeiro acesso? Defina sua senha
            </button>
          </div>

          {/* Rodapé */}
          <p style={{
            marginTop: 24, textAlign: "center",
            fontSize: 11, color: "rgba(143,163,187,0.3)", letterSpacing: "0.03em",
          }}>
            Acesso restrito · Uso interno SGT Log
          </p>
        </div>
      </div>
    </>
  );
}
