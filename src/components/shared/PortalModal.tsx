/**
 * PortalModal — SGT Log
 * Abre portais externos em modal iframe dentro do próprio app.
 * Controle via query param: ?portal=receitaflow | visual-rodopar | portal-wr
 * Fechar: remove o param (browser back também fecha).
 */
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { X, RotateCw, ExternalLink, Sparkles, Globe, Monitor, AlertTriangle } from "lucide-react";

// ── Definição dos portais ──────────────────────────────────────────────────
const PORTALS: Record<string, {
  label: string;
  url: string;
  icon: React.ElementType;
  color: string;
  warning?: string;
}> = {
  receitaflow: {
    label: "ReceitaFlow",
    url: "https://receitaflow.lovable.app",
    icon: Sparkles,
    color: "#22D3EE",
  },
  "visual-rodopar": {
    label: "Visual Rodopar",
    url: "https://webcloud2.datapardc.com/software/html5.html",
    icon: Globe,
    color: "#60A5FA",
  },
  "portal-wr": {
    label: "Portal WR SGT",
    url: "http://54.232.121.164:9474/#/login",
    icon: Monitor,
    color: "#F5A623",
    warning: "Este portal usa HTTP — alguns navegadores bloqueiam conteúdo misto em páginas HTTPS.",
  },
};

export function PortalModal() {
  const [params, setParams] = useSearchParams();
  const portalId = params.get("portal");
  const portal   = portalId ? PORTALS[portalId] : null;

  const iframeRef          = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [iframeKey, setKey]   = useState(0);

  // Reseta estado a cada abertura de portal
  useEffect(() => {
    if (portal) { setLoading(true); setBlocked(false); }
  }, [portalId]);

  // Trava scroll do body enquanto modal aberto
  useEffect(() => {
    document.body.style.overflow = portal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [!!portal]);

  // Detecta possível bloqueio: se onLoad disparar mas iframe ficar branco
  // (X-Frame-Options bloqueia silenciosamente no Chrome/Safari)
  function handleLoad() {
    setLoading(false);
    try {
      // Tenta acessar contentDocument — lança se bloqueado por CORS/X-Frame
      const doc = iframeRef.current?.contentDocument;
      if (doc === null) setBlocked(true); // null = blocked
    } catch {
      setBlocked(true);
    }
  }

  function handleClose() {
    const p = new URLSearchParams(params);
    p.delete("portal");
    setParams(p, { replace: true });
  }

  function handleReload() {
    setLoading(true);
    setBlocked(false);
    setKey(k => k + 1);
  }

  if (!portal) return null;
  const Icon = portal.icon;

  return (
    <>
      {/* ── CSS ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes pm-fadein  { from{opacity:0}           to{opacity:1} }
        @keyframes pm-slidein { from{opacity:0;transform:scale(.97) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .pm-backdrop { animation: pm-fadein .2s ease both }
        .pm-panel    { animation: pm-slidein .22s cubic-bezier(.22,.68,0,1.05) both }
      `}</style>

      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <div
        className="pm-backdrop"
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(5px)",
        }}
      />

      {/* ── Painel ───────────────────────────────────────────────────── */}
      <div
        className="pm-panel"
        style={{
          position: "fixed", zIndex: 1001,
          /* Mobile: full screen | Desktop: 94% × 92% centralizado */
          inset: 0,
          top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", flexDirection: "column",
          background: "var(--sgt-bg-surface)",
          borderRadius: 0,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.65)",
        }}
        /* Evita fechar ao clicar dentro do painel */
        onClick={e => e.stopPropagation()}
      >
        {/* ── Estilo responsivo desktop injetado ── */}
        <style>{`
          @media(min-width:640px){
            .pm-panel-inner{
              position:fixed !important;
              inset:auto !important;
              top:50% !important; left:50% !important;
              transform:translate(-50%,-50%) !important;
              width:94vw !important; height:92vh !important;
              border-radius:16px !important;
              border:1px solid var(--sgt-border-default) !important;
            }
          }
        `}</style>
        <div className="pm-panel-inner" style={{
          display:"flex", flexDirection:"column",
          background:"var(--sgt-bg-surface)",
          width:"100%", height:"100%",
          overflow:"hidden", borderRadius:"inherit",
        }}>

          {/* ── Header ───────────────────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "0 14px", height: 48, flexShrink: 0,
            borderBottom: "1px solid var(--sgt-border-subtle)",
            background: "var(--sgt-bg-surface)",
          }}>
            {/* Ícone + nome */}
            <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
              <div style={{
                width:28, height:28, borderRadius:7, flexShrink:0,
                background:`${portal.color}15`,
                border:`1px solid ${portal.color}30`,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <Icon style={{ width:14, height:14, color: portal.color }} />
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{
                  fontSize:13, fontWeight:700, color:"var(--sgt-text-primary)",
                  lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>{portal.label}</p>
                <p style={{
                  fontSize:10, color:"var(--sgt-text-faint)",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                  maxWidth:"40vw",
                }}>{portal.url}</p>
              </div>
            </div>

            {/* Ações */}
            <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
              {/* Recarregar */}
              <button
                onClick={handleReload}
                title="Recarregar"
                style={{
                  width:32, height:32, borderRadius:8, border:"1px solid var(--sgt-border-subtle)",
                  background:"transparent", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:"var(--sgt-text-muted)",
                }}
                onMouseEnter={e=>(e.currentTarget.style.background="var(--sgt-row-hover)")}
                onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
              >
                <RotateCw style={{ width:13, height:13,
                  animation: loading ? "spin 0.8s linear infinite" : "none" }} />
              </button>

              {/* Abrir em nova aba */}
              <button
                onClick={() => window.open(portal.url, "_blank", "noopener,noreferrer")}
                title="Abrir em nova aba"
                style={{
                  height:32, padding:"0 10px", borderRadius:8,
                  border:"1px solid var(--sgt-border-subtle)",
                  background:"transparent", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:5,
                  color:"var(--sgt-text-secondary)", fontSize:11, fontWeight:600,
                }}
                onMouseEnter={e=>(e.currentTarget.style.background="var(--sgt-row-hover)")}
                onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
              >
                <ExternalLink style={{ width:11, height:11 }} />
                <span className="hidden sm:inline">Nova aba</span>
              </button>

              {/* Fechar */}
              <button
                onClick={handleClose}
                title="Fechar"
                style={{
                  width:32, height:32, borderRadius:8,
                  border:"1px solid var(--sgt-border-subtle)",
                  background:"transparent", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:"var(--sgt-text-muted)",
                }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,0.1)";e.currentTarget.style.color="#ef4444";e.currentTarget.style.borderColor="rgba(239,68,68,0.3)"}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--sgt-text-muted)";e.currentTarget.style.borderColor="var(--sgt-border-subtle)"}}
              >
                <X style={{ width:14, height:14 }} />
              </button>
            </div>
          </div>

          {/* Aviso HTTP (Portal WR) */}
          {portal.warning && (
            <div style={{
              display:"flex", alignItems:"center", gap:8,
              padding:"6px 14px", flexShrink:0,
              background:"rgba(245,166,35,0.06)",
              borderBottom:"1px solid rgba(245,166,35,0.15)",
            }}>
              <AlertTriangle style={{ width:13, height:13, color:"#F5A623", flexShrink:0 }} />
              <p style={{ fontSize:11, color:"rgba(245,166,35,0.8)", lineHeight:1.4 }}>{portal.warning}</p>
            </div>
          )}

          {/* ── Body: iframe ─────────────────────────────────────────── */}
          <div style={{ flex:1, position:"relative", overflow:"hidden" }}>

            {/* Spinner de loading */}
            {loading && !blocked && (
              <div style={{
                position:"absolute", inset:0, zIndex:10,
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                background:"var(--sgt-bg-surface)", gap:12,
              }}>
                <div style={{
                  width:36, height:36, borderRadius:"50%",
                  border:"2.5px solid rgba(245,166,35,0.2)",
                  borderTopColor:"#F5A623",
                  animation:"spin 0.8s linear infinite",
                }} />
                <p style={{ fontSize:13, color:"var(--sgt-text-muted)" }}>
                  Carregando {portal.label}…
                </p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {/* Fallback: iframe bloqueado */}
            {blocked && (
              <div style={{
                position:"absolute", inset:0, zIndex:10,
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                background:"var(--sgt-bg-surface)", gap:16, padding:32,
                textAlign:"center",
              }}>
                <div style={{
                  width:52, height:52, borderRadius:14,
                  background:"rgba(245,166,35,0.08)",
                  border:"1px solid rgba(245,166,35,0.2)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <ExternalLink style={{ width:22, height:22, color:"#F5A623" }} />
                </div>
                <div>
                  <p style={{ fontSize:15, fontWeight:700, color:"var(--sgt-text-primary)", marginBottom:6 }}>
                    {portal.label} não permite incorporação
                  </p>
                  <p style={{ fontSize:13, color:"var(--sgt-text-muted)", maxWidth:340, lineHeight:1.55 }}>
                    O portal bloqueou o acesso via iframe por política de segurança.
                    Abre normalmente em nova aba.
                  </p>
                </div>
                <button
                  onClick={() => window.open(portal.url, "_blank", "noopener,noreferrer")}
                  style={{
                    padding:"11px 24px", borderRadius:12,
                    background:"linear-gradient(95deg,#F5A623,#E09010)",
                    border:"none", cursor:"pointer",
                    fontSize:14, fontWeight:700, color:"#1B1304",
                    display:"flex", alignItems:"center", gap:7,
                    boxShadow:"0 4px 20px rgba(245,166,35,0.3)",
                  }}
                >
                  <ExternalLink style={{ width:15, height:15 }} />
                  Abrir {portal.label}
                </button>
              </div>
            )}

            {/* iFrame */}
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={portal.url}
              title={portal.label}
              onLoad={handleLoad}
              onError={() => { setLoading(false); setBlocked(true); }}
              allow="fullscreen; autoplay"
              style={{
                width:"100%", height:"100%",
                border:"none", display:"block",
                opacity: loading || blocked ? 0 : 1,
                transition: "opacity 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
