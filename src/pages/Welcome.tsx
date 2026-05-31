/**
 * Welcome — SGT Log
 * Mobile: tudo visível sem scroll (height: 100dvh, espaçamentos comprimidos).
 * Desktop: grid 52/48 — texto+CTA esquerda, hero glassmorphism direita.
 */
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowRight, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import sgtLogo from "@/assets/sgt-logo-clean.png";

const BARS = [
  { h: 48, delay: 0.00 }, { h: 72, delay: 0.08 }, { h: 38, delay: 0.16 },
  { h: 88, delay: 0.24 }, { h: 60, delay: 0.32 }, { h: 95, delay: 0.40 },
  { h: 54, delay: 0.48 },
];

export default function Welcome() {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();

  if (isLoading) return (
    <div style={{ display:"flex", height:"100dvh", alignItems:"center", justifyContent:"center", background:"#080C14" }}>
      <div style={{ width:28, height:28, borderRadius:"50%", border:"2px solid rgba(245,166,35,0.3)", borderTopColor:"#F5A623", animation:"wlc-spin 0.8s linear infinite" }} />
      <style>{`@keyframes wlc-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (session) return <Navigate to="/home" replace />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        /* ── Reset & root ─────────────────────────────────────────── */
        .wlc-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .wlc-root {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          background: #080C14;
          height: 100dvh;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        /* ── Atmosfera ─────────────────────────────────────────────── */
        .wlc-atm {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
        }
        .wlc-atm-top {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 90% 55% at 50% -4%,
            rgba(245,166,35,0.17) 0%, transparent 62%);
        }
        .wlc-atm-bot {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 70% 40% at 50% 110%,
            rgba(245,166,35,0.07) 0%, transparent 60%);
        }
        .wlc-atm-grid {
          position: absolute; inset: 0; opacity: 0.022;
          background-image:
            linear-gradient(rgba(245,166,35,.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,166,35,.6) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* ── Animações ─────────────────────────────────────────────── */
        @keyframes wlc-fadeslide {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes wlc-bargrow {
          from { transform:scaleY(0); opacity:0; }
          to   { transform:scaleY(1); opacity:1; }
        }
        @keyframes wlc-float {
          0%,100% { transform:translateY(0); }
          50%     { transform:translateY(-5px); }
        }
        @keyframes wlc-pulse {
          0%,100% { box-shadow: 0 0 30px rgba(245,166,35,.10), 0 18px 56px rgba(0,0,0,.55); }
          50%     { box-shadow: 0 0 48px rgba(245,166,35,.18), 0 18px 56px rgba(0,0,0,.55); }
        }
        @keyframes wlc-trace {
          from { stroke-dashoffset:300; }
          to   { stroke-dashoffset:0; }
        }
        @keyframes wlc-blink {
          0%,100% { opacity:1; }
          50%     { opacity:.3; }
        }
        @keyframes wlc-spin { to { transform:rotate(360deg); } }

        .wlc-fadein { animation: wlc-fadeslide .5s cubic-bezier(.22,.68,0,1.05) both; }
        .wlc-bar    { transform-origin:bottom; animation: wlc-bargrow .55s cubic-bezier(.22,.68,0,1.1) both; }
        .wlc-float  { animation: wlc-float 3.2s ease-in-out infinite; }
        .wlc-card   { animation: wlc-pulse 4s ease-in-out infinite; }
        .wlc-spark  { stroke-dasharray:300; animation: wlc-trace 1.4s cubic-bezier(.4,0,.2,1) .8s both; }
        .wlc-dot    { animation: wlc-blink 1.8s ease-in-out infinite; }
        .wlc-metric { font-family:'Space Grotesk',sans-serif; }

        /* ── Botões ────────────────────────────────────────────────── */
        .wlc-btn1 {
          display:flex; align-items:center; justify-content:center; gap:8px;
          width:100%; padding:13px 24px; border:none; border-radius:13px; cursor:pointer;
          background:linear-gradient(95deg,#F5A623 0%,#E09010 100%);
          font-family:'Plus Jakarta Sans',sans-serif; font-size:15px; font-weight:700;
          color:#1B1304; letter-spacing:.01em;
          box-shadow:0 4px 24px rgba(245,166,35,.35),0 1px 0 rgba(255,255,255,.12) inset;
          transition:transform 120ms,box-shadow 120ms;
          -webkit-tap-highlight-color:transparent;
        }
        .wlc-btn1:active  { transform:scale(.975); box-shadow:0 2px 12px rgba(245,166,35,.22); }
        .wlc-btn1:hover   { background:linear-gradient(95deg,#FFB733 0%,#F0A020 100%); transform:translateY(-1px); }

        .wlc-btn2 {
          display:flex; align-items:center; justify-content:center; gap:7px;
          width:100%; padding:11px 24px; border-radius:13px; cursor:pointer;
          background:rgba(245,166,35,.06); border:1px solid rgba(245,166,35,.20);
          font-family:'Plus Jakarta Sans',sans-serif; font-size:13px; font-weight:600;
          color:#F5A623; transition:background 120ms;
          -webkit-tap-highlight-color:transparent;
        }
        .wlc-btn2:active { background:rgba(245,166,35,.12); }
        .wlc-btn2:hover  { background:rgba(245,166,35,.10); border-color:rgba(245,166,35,.32); }

        /* ── Seções mobile ─────────────────────────────────────────── */
        .wlc-header { z-index:10; padding:36px 26px 0; display:flex; align-items:center; gap:10px; }
        .wlc-hero   { z-index:10; flex:1; min-height:0; display:flex; align-items:center; justify-content:center; padding:12px 36px; position:relative; }
        .wlc-bottom { z-index:10; padding:0 26px 22px; }

        .wlc-headline {
          font-family:'Space Grotesk',sans-serif;
          font-size:24px; font-weight:800; line-height:1.18;
          color:#F0F4F8; letter-spacing:-.4px; margin-bottom:6px;
        }
        .wlc-sub {
          font-size:13px; font-weight:400; color:rgba(143,163,187,.70);
          line-height:1.52; margin-bottom:12px;
        }
        .wlc-chips { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:14px; }
        .wlc-chip-mod {
          padding:3px 9px; border-radius:999px; font-size:10px; font-weight:600;
          background:rgba(245,166,35,.07); border:1px solid rgba(245,166,35,.16);
          color:rgba(245,166,35,.75); letter-spacing:.03em;
        }
        .wlc-btns   { display:flex; flex-direction:column; gap:8px; }
        .wlc-footer { margin-top:14px; text-align:center; font-size:10px; color:rgba(143,163,187,.28); letter-spacing:.03em; }

        /* ── Card hero ─────────────────────────────────────────────── */
        .wlc-glass {
          width:100%; max-width:310px;
          background:rgba(14,20,34,.85); backdrop-filter:blur(20px);
          border:1px solid rgba(245,166,35,.18); border-radius:20px;
          padding:18px 18px 14px; position:relative; overflow:hidden;
        }
        .wlc-glass-line {
          position:absolute; top:0; left:20%; right:20%; height:1px;
          background:linear-gradient(90deg,transparent,rgba(245,166,35,.5),transparent);
        }

        /* ── Chips flutuantes (mobile posições) ────────────────────── */
        .wlc-fc { position:absolute; z-index:20; }
        .wlc-fc-inner {
          padding:4px 10px; border-radius:999px;
          background:rgba(15,21,32,.92); border:1px solid rgba(245,166,35,.22);
          backdrop-filter:blur(8px); font-size:10px; font-weight:600;
          color:#F5A623; letter-spacing:.04em;
          box-shadow:0 2px 10px rgba(0,0,0,.4); white-space:nowrap;
        }

        /* ── DESKTOP ───────────────────────────────────────────────── */
        @media (min-width: 768px) {
          .wlc-root {
            display: grid;
            grid-template-columns: 52% 48%;
            grid-template-rows: auto 1fr;
          }
          /* Header fica no topo da coluna esquerda */
          .wlc-header {
            grid-column: 1; grid-row: 1;
            padding: 52px 64px 0;
          }
          /* Hero ocupa toda a coluna direita */
          .wlc-hero {
            grid-column: 2; grid-row: 1 / 3;
            padding: 48px 56px 48px 32px;
            border-left: 1px solid rgba(245,166,35,.06);
            background: linear-gradient(135deg, rgba(245,166,35,.024) 0%, transparent 60%);
            align-items: center;
          }
          /* Bottom preenche o restante da esquerda */
          .wlc-bottom {
            grid-column: 1; grid-row: 2;
            padding: 0 64px 52px;
            display: flex; flex-direction: column; justify-content: flex-end;
          }
          /* Tipografia maior no desktop */
          .wlc-headline { font-size: 44px; letter-spacing: -.8px; margin-bottom: 12px; }
          .wlc-sub      { font-size: 16px; margin-bottom: 20px; max-width: 460px; }
          .wlc-chips    { margin-bottom: 28px; gap: 8px; }
          .wlc-chip-mod { padding: 5px 14px; font-size: 12px; }
          .wlc-btns     { flex-direction: row; gap: 12px; max-width: 480px; }
          .wlc-btn1     { font-size: 16px; padding: 15px 28px; border-radius: 14px; }
          .wlc-btn2     { font-size: 14px; padding: 14px 24px; border-radius: 14px; width: auto; white-space: nowrap; }
          .wlc-footer   { text-align: left; margin-top: 20px; font-size: 11px; }
          /* Card maior no desktop */
          .wlc-glass    { max-width: 420px; padding: 24px 24px 20px; border-radius: 24px; }
          /* Chips flutuantes repositionados para desktop */
          .wlc-fc-fin   { top: 18%; left: -20px; }
          .wlc-fc-op    { top: 46%; right: -16px; }
          .wlc-fc-fr    { top: 76%; left: -16px; }
        }
      `}</style>

      <div className="wlc-root">
        {/* Atmosfera */}
        <div className="wlc-atm">
          <div className="wlc-atm-top" />
          <div className="wlc-atm-bot" />
          <div className="wlc-atm-grid" />
        </div>

        {/* ── HEADER: Logo ─────────────────────────────────────────── */}
        <div className="wlc-header wlc-fadein" style={{ animationDelay: "0s" }}>
          <div style={{
            width:36, height:36, borderRadius:10, flexShrink:0,
            background:"rgba(245,166,35,.12)", border:"1px solid rgba(245,166,35,.25)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <img src={sgtLogo} alt="SGT"
              style={{ width:20, height:20, objectFit:"contain" }}
              onError={e => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement!.innerHTML =
                  `<span style="font-family:'Space Grotesk',sans-serif;font-weight:800;font-style:italic;font-size:13px;color:#F5A623">S</span>`;
              }} />
          </div>
          <div>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.32em", textTransform:"uppercase",
              color:"rgba(240,244,248,.42)", lineHeight:1 }}>Workspace</p>
            <p style={{ fontSize:14, fontWeight:800, color:"#F0F4F8", lineHeight:1.2,
              fontFamily:"'Space Grotesk',sans-serif", letterSpacing:"-0.3px" }}>SGT Log</p>
          </div>
        </div>

        {/* ── HERO: Card glassmorphism ──────────────────────────────── */}
        <div className="wlc-hero wlc-fadein" style={{ animationDelay: "0.1s" }}>

          {/* Chips flutuando */}
          <div className="wlc-fc wlc-float wlc-fc-fin"
               style={{ top:"8%", left:"-14px", animationDelay:"0s" }}>
            <div className="wlc-fc-inner">Financeiro</div>
          </div>
          <div className="wlc-fc wlc-float wlc-fc-op"
               style={{ top:"40%", right:"-16px", animationDelay:"0.4s" }}>
            <div className="wlc-fc-inner">Operação</div>
          </div>
          <div className="wlc-fc wlc-float wlc-fc-fr"
               style={{ top:"74%", left:"-8px", animationDelay:"0.8s" }}>
            <div className="wlc-fc-inner">Frota</div>
          </div>

          {/* Card principal */}
          <div className="wlc-card wlc-glass">
            <div className="wlc-glass-line" />

            {/* Cabeçalho do card */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div>
                <p style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase",
                  color:"rgba(143,163,187,.55)", marginBottom:2 }}>Painel Executivo</p>
                <p className="wlc-metric" style={{ fontSize:22, fontWeight:700, color:"#F0F4F8", lineHeight:1 }}>
                  R$ 12,4M
                </p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div className="wlc-dot"
                       style={{ width:5, height:5, borderRadius:"50%", background:"#22C97A" }} />
                  <span style={{ fontSize:9, color:"#22C97A", fontWeight:600 }}>Live</span>
                </div>
                <div style={{ padding:"3px 8px", borderRadius:999,
                  background:"rgba(34,201,122,.1)", border:"1px solid rgba(34,201,122,.2)" }}>
                  <span className="wlc-metric" style={{ fontSize:11, fontWeight:700, color:"#22C97A" }}>↑ 8.4%</span>
                </div>
              </div>
            </div>

            {/* Mini KPIs */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:14 }}>
              {[
                { label:"A Receber", value:"R$ 10,7M", color:"#4A9EFF", bg:"rgba(74,158,255,.08)", bd:"rgba(74,158,255,.18)" },
                { label:"A Pagar",   value:"R$ 8,8M",  color:"#F0A730", bg:"rgba(240,167,48,.08)",  bd:"rgba(240,167,48,.18)" },
              ].map((k,i) => (
                <div key={i} style={{ padding:"7px 9px", borderRadius:9,
                  background:k.bg, border:`1px solid ${k.bd}` }}>
                  <p style={{ fontSize:8, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase",
                    color:"rgba(143,163,187,.5)", marginBottom:2 }}>{k.label}</p>
                  <p className="wlc-metric" style={{ fontSize:13, fontWeight:700, color:k.color }}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Barras */}
            <div style={{ marginBottom:8 }}>
              <p style={{ fontSize:8, fontWeight:600, letterSpacing:".1em", textTransform:"uppercase",
                color:"rgba(143,163,187,.38)", marginBottom:7 }}>Faturamento mensal</p>
              <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:52 }}>
                {BARS.map((b,i) => (
                  <div key={i} className="wlc-bar" style={{
                    flex:1, borderRadius:"3px 3px 2px 2px",
                    height:`${b.h}%`,
                    background: i === BARS.length-2
                      ? "linear-gradient(180deg,#F5A623,#C77E1A)"
                      : "rgba(245,166,35,.22)",
                    border: i === BARS.length-2
                      ? "1px solid rgba(245,166,35,.5)"
                      : "1px solid rgba(245,166,35,.08)",
                    animationDelay:`${.4+b.delay}s`,
                  }} />
                ))}
              </div>
            </div>

            {/* Sparkline */}
            <svg width="100%" height="28" viewBox="0 0 280 28"
                 preserveAspectRatio="none" style={{ display:"block", marginTop:3 }}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5A623" stopOpacity=".22"/>
                  <stop offset="100%" stopColor="#F5A623" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0,22 L40,16 L80,20 L120,9 L160,12 L200,5 L240,9 L280,3"
                fill="none" stroke="#F5A623" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" className="wlc-spark" />
              <path d="M0,22 L40,16 L80,20 L120,9 L160,12 L200,5 L240,9 L280,3 L280,28 L0,28Z"
                fill="url(#sg)" opacity=".5" />
              <circle cx="280" cy="3" r="2.5" fill="#F5A623"
                style={{ animation:"wlc-blink 1.8s ease-in-out infinite" }} />
            </svg>
          </div>
        </div>

        {/* ── BOTTOM: Texto + CTAs ──────────────────────────────────── */}
        <div className="wlc-bottom wlc-fadein" style={{ animationDelay: "0.2s" }}>

          <p className="wlc-headline">
            Sua plataforma<br />
            <span style={{ color:"#F5A623" }}>operacional</span> e<br />
            financeira.
          </p>

          <p className="wlc-sub">
            Indicadores, frota, financeiro e gestão —
            tudo da SGT Log em tempo real, no seu bolso.
          </p>

          <div className="wlc-chips">
            {["Financeiro","Frota","Compras","RH","Operação"].map((m,i) => (
              <span key={i} className="wlc-chip-mod">{m}</span>
            ))}
          </div>

          <div className="wlc-btns">
            <button className="wlc-btn1" onClick={() => navigate("/login")}>
              Acessar Plataforma <ArrowRight size={17} />
            </button>
            <button className="wlc-btn2" onClick={() => navigate("/login?mode=first-access")}>
              <UserPlus size={14} /> Primeiro acesso? Defina sua senha
            </button>
          </div>

          <p className="wlc-footer">Acesso restrito · Uso interno SGT Log</p>
        </div>
      </div>
    </>
  );
}
