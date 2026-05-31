/**
 * Welcome — SGT Log
 * Mobile: 100dvh, sem scroll. Desktop: grid 52/48.
 * Hero: carrossel automático com 5 telas + dot nav.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowRight, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import sgtLogo from "@/assets/sgt-logo-clean.png";

const BARS = [
  { h:48,d:.00 },{ h:72,d:.08 },{ h:38,d:.16 },
  { h:88,d:.24 },{ h:60,d:.32 },{ h:95,d:.40 },{ h:54,d:.48 },
];
const AGING = [{ l:"1-30d",h:72 },{ l:"31-60d",h:45 },{ l:"61-90d",h:30 },{ l:"90d+",h:60 },{ l:"Hoje",h:20 }];
const BANKS = [
  { n:"BRADESCO",    v:"R$ 1,2M", ok:true  },
  { n:"SICOOB",      v:"R$ 820k", ok:true  },
  { n:"B. BRASIL",   v:"R$ 380k", ok:false },
];
const KPIs = [
  { l:"Diesel",    v:"15,6%",    d:"-0,8pp",  c:"#E94848", bg:"rgba(233,72,72,.08)",  bd:"rgba(233,72,72,.2)"  },
  { l:"Folha",     v:"R$1,2M",   d:"+3,4%",   c:"#F0A730", bg:"rgba(240,167,48,.08)", bd:"rgba(240,167,48,.2)" },
  { l:"Pedágio",   v:"R$180k",   d:"OK",      c:"#22C97A", bg:"rgba(34,201,122,.08)", bd:"rgba(34,201,122,.2)" },
  { l:"Manutenção",v:"R$48k",    d:"4 C.C.",  c:"#4A9EFF", bg:"rgba(74,158,255,.08)", bd:"rgba(74,158,255,.2)" },
];

const INTERVAL = 3800;

/* ── Slides ───────────────────────────────────────────────────────────── */
function S1() {
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div>
          <p style={{fontSize:8,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(143,163,187,.5)",marginBottom:2}}>Painel Executivo</p>
          <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700,color:"#F0F4F8",lineHeight:1}}>R$ 12,4M</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"#22C97A",display:"inline-block",animation:"wlc-blink 1.8s ease-in-out infinite"}}/>
            <span style={{fontSize:9,color:"#22C97A",fontWeight:600}}>Live</span>
          </div>
          <div style={{padding:"2px 7px",borderRadius:999,background:"rgba(34,201,122,.1)",border:"1px solid rgba(34,201,122,.2)"}}>
            <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:700,color:"#22C97A"}}>↑ 8.4%</span>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
        {[{l:"A Receber",v:"R$10,7M",c:"#4A9EFF",bg:"rgba(74,158,255,.08)",bd:"rgba(74,158,255,.18)"},{l:"A Pagar",v:"R$8,8M",c:"#F0A730",bg:"rgba(240,167,48,.08)",bd:"rgba(240,167,48,.18)"}].map((k,i)=>(
          <div key={i} style={{padding:"6px 8px",borderRadius:9,background:k.bg,border:`1px solid ${k.bd}`}}>
            <p style={{fontSize:7,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(143,163,187,.5)",marginBottom:2}}>{k.l}</p>
            <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:700,color:k.c}}>{k.v}</p>
          </div>
        ))}
      </div>
      <p style={{fontSize:7,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(143,163,187,.38)",marginBottom:6}}>Faturamento mensal</p>
      <div style={{display:"flex",alignItems:"flex-end",gap:3,height:44,marginBottom:8}}>
        {BARS.map((b,i)=>(
          <div key={i} style={{flex:1,borderRadius:"3px 3px 2px 2px",height:`${b.h}%`,
            background:i===BARS.length-2?"linear-gradient(180deg,#F5A623,#C77E1A)":"rgba(245,166,35,.22)",
            border:i===BARS.length-2?"1px solid rgba(245,166,35,.5)":"1px solid rgba(245,166,35,.08)"}}/>
        ))}
      </div>
      <svg width="100%" height="24" viewBox="0 0 280 24" preserveAspectRatio="none" style={{display:"block"}}>
        <defs><linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F5A623" stopOpacity=".2"/><stop offset="100%" stopColor="#F5A623" stopOpacity="0"/></linearGradient></defs>
        <path d="M0,20 L40,14 L80,18 L120,8 L160,11 L200,4 L240,8 L280,2" fill="none" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M0,20 L40,14 L80,18 L120,8 L160,11 L200,4 L240,8 L280,2 L280,24 L0,24Z" fill="url(#sg1)" opacity=".5"/>
        <circle cx="280" cy="2" r="2.5" fill="#F5A623" style={{animation:"wlc-blink 1.8s ease-in-out infinite"}}/>
      </svg>
    </>
  );
}

function S2() {
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div>
          <p style={{fontSize:8,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(143,163,187,.5)",marginBottom:2}}>Contas a Pagar</p>
          <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700,color:"#F0F4F8",lineHeight:1}}>R$ 8,8M</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
          <div style={{padding:"2px 7px",borderRadius:999,background:"rgba(233,72,72,.12)",border:"1px solid rgba(233,72,72,.25)"}}>
            <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:700,color:"#E94848"}}>3.851 títulos</span>
          </div>
          <span style={{fontSize:9,fontWeight:600,color:"rgba(143,163,187,.5)"}}>3.067 vencidos</span>
        </div>
      </div>
      <p style={{fontSize:7,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(143,163,187,.38)",marginBottom:6}}>Aging — Vencidos por faixa</p>
      <div style={{display:"flex",alignItems:"flex-end",gap:4,height:44,marginBottom:10}}>
        {AGING.map((a,i)=>(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <div style={{width:"100%",borderRadius:"3px 3px 2px 2px",height:`${a.h}%`,
              background:i===4?"rgba(74,158,255,.35)":"rgba(233,72,72,.35)",
              border:i===4?"1px solid rgba(74,158,255,.3)":"1px solid rgba(233,72,72,.2)"}}/>
          </div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,paddingBottom:2}}>
        {AGING.map((a,i)=><span key={i} style={{fontSize:7,color:"rgba(143,163,187,.38)",flex:1,textAlign:"center"}}>{a.l}</span>)}
      </div>
      {[{f:"DATAPAR LTDA",v:"R$9.904",s:true},{f:"INSS / Folha",v:"R$4.828",s:true},{f:"ALE Combustíveis",v:"R$3.200",s:false}].map((r,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 0",borderTop:"1px solid rgba(143,163,187,.07)"}}>
          <span style={{fontSize:10,color:"rgba(240,244,248,.7)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"55%"}}>{r.f}</span>
          <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:600,color:"rgba(240,244,248,.8)",marginRight:8}}>{r.v}</span>
          <span style={{padding:"2px 6px",borderRadius:999,fontSize:8,fontWeight:700,
            background:r.s?"rgba(233,72,72,.12)":"rgba(74,158,255,.12)",
            border:r.s?"1px solid rgba(233,72,72,.25)":"1px solid rgba(74,158,255,.25)",
            color:r.s?"#E94848":"#4A9EFF"}}>{r.s?"Vencido":"A Vencer"}</span>
        </div>
      ))}
    </>
  );
}

function S3() {
  const metrics = [
    {l:"Diesel",v:"15,6 km/L",p:78,c:"#F0A730",bg:"rgba(240,167,48,.15)"},
    {l:"Viagens",v:"1.247",p:92,c:"#22C97A",bg:"rgba(34,201,122,.15)"},
    {l:"Manutenção",v:"R$ 48,2k",p:55,c:"#4A9EFF",bg:"rgba(74,158,255,.15)"},
  ];
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <p style={{fontSize:8,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(143,163,187,.5)",marginBottom:2}}>Gestão de Frota</p>
          <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700,color:"#F0F4F8",lineHeight:1}}>847 veículos</p>
        </div>
        <div style={{padding:"2px 7px",borderRadius:999,background:"rgba(34,201,122,.1)",border:"1px solid rgba(34,201,122,.2)"}}>
          <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:700,color:"#22C97A"}}>94% ativos</span>
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span style={{fontSize:9,fontWeight:600,color:"rgba(143,163,187,.55)"}}>Frota ativa</span>
          <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:9,fontWeight:700,color:"#22C97A"}}>797 / 847</span>
        </div>
        <div style={{height:5,borderRadius:999,background:"rgba(255,255,255,.07)",overflow:"hidden"}}>
          <div style={{height:"100%",width:"94%",borderRadius:999,background:"linear-gradient(90deg,#22C97A,#1aad6a)"}}/>
        </div>
      </div>
      {metrics.map((m,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderTop:"1px solid rgba(143,163,187,.07)"}}>
          <div style={{width:32,height:32,borderRadius:8,background:m.bg,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:18,height:3,borderRadius:999,background:m.c}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:9,fontWeight:600,color:"rgba(143,163,187,.6)"}}>{m.l}</span>
              <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:700,color:"rgba(240,244,248,.85)"}}>{m.v}</span>
            </div>
            <div style={{height:3,borderRadius:999,background:"rgba(255,255,255,.07)",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${m.p}%`,borderRadius:999,background:m.c,opacity:.8}}/>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function S4() {
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <p style={{fontSize:8,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(143,163,187,.5)",marginBottom:2}}>Indicadores</p>
          <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:"#F0F4F8",lineHeight:1}}>Estratégicos</p>
        </div>
        <span style={{padding:"2px 8px",borderRadius:999,fontSize:9,fontWeight:600,background:"rgba(245,166,35,.08)",border:"1px solid rgba(245,166,35,.18)",color:"rgba(245,166,35,.8)"}}>Mai 2026</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
        {KPIs.map((k,i)=>(
          <div key={i} style={{padding:"10px",borderRadius:10,background:k.bg,border:`1px solid ${k.bd}`}}>
            <p style={{fontSize:7,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(143,163,187,.5)",marginBottom:4}}>{k.l}</p>
            <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:17,fontWeight:700,color:k.c,lineHeight:1,marginBottom:4}}>{k.v}</p>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:24,height:2,borderRadius:999,background:k.c,opacity:.5}}/>
              <span style={{fontSize:8,fontWeight:600,color:k.c,opacity:.8}}>{k.d}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:10,padding:"7px 10px",borderRadius:10,background:"rgba(255,255,255,.03)",border:"1px solid rgba(143,163,187,.08)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:9,color:"rgba(143,163,187,.5)"}}>Score geral do período</span>
        <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:14,fontWeight:700,color:"#F5A623"}}>7,4 / 10</span>
      </div>
    </>
  );
}

function S5() {
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <p style={{fontSize:8,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(143,163,187,.5)",marginBottom:2}}>Conciliação Bancária</p>
          <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700,color:"#F0F4F8",lineHeight:1}}>R$ 2,4M</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
          <div style={{padding:"2px 7px",borderRadius:999,background:"rgba(34,201,122,.1)",border:"1px solid rgba(34,201,122,.2)"}}>
            <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:700,color:"#22C97A"}}>94% conciliados</span>
          </div>
          <span style={{fontSize:9,color:"rgba(143,163,187,.45)"}}>20 contas ativas</span>
        </div>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span style={{fontSize:9,color:"rgba(143,163,187,.55)"}}>Títulos conciliados</span>
          <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:9,fontWeight:700,color:"#22C97A"}}>1.412 / 1.502</span>
        </div>
        <div style={{height:5,borderRadius:999,background:"rgba(255,255,255,.07)",overflow:"hidden"}}>
          <div style={{height:"100%",width:"94%",borderRadius:999,background:"linear-gradient(90deg,#22C97A,#1aad6a)"}}/>
        </div>
      </div>
      {BANKS.map((b,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderTop:"1px solid rgba(143,163,187,.07)"}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:24,height:24,borderRadius:6,background:b.ok?"rgba(34,201,122,.12)":"rgba(240,167,48,.12)",border:b.ok?"1px solid rgba(34,201,122,.2)":"1px solid rgba(240,167,48,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:7,fontWeight:800,color:b.ok?"#22C97A":"#F0A730"}}>B</span>
            </div>
            <span style={{fontSize:10,fontWeight:600,color:"rgba(240,244,248,.75)"}}>{b.n}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:700,color:"rgba(240,244,248,.85)"}}>{b.v}</span>
            <span style={{padding:"2px 6px",borderRadius:999,fontSize:8,fontWeight:700,
              background:b.ok?"rgba(34,201,122,.12)":"rgba(240,167,48,.12)",
              border:b.ok?"1px solid rgba(34,201,122,.25)":"1px solid rgba(240,167,48,.25)",
              color:b.ok?"#22C97A":"#F0A730"}}>{b.ok?"Conciliado":"Pendente"}</span>
          </div>
        </div>
      ))}
    </>
  );
}

const SLIDES = [
  { id:"executivo",  label:"Executivo",   render: <S1 /> },
  { id:"pagar",      label:"Fin. Pagar",  render: <S2 /> },
  { id:"frota",      label:"Frota",       render: <S3 /> },
  { id:"indicadores",label:"Indicadores", render: <S4 /> },
  { id:"conciliacao",label:"Bancos",      render: <S5 /> },
];

/* ── Componente principal ──────────────────────────────────────────────── */
export default function Welcome() {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();
  const [slide, setSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  function goTo(i: number) {
    setSlide(i);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() =>
      setSlide(s => (s + 1) % SLIDES.length), INTERVAL);
  }

  useEffect(() => {
    timerRef.current = setInterval(() =>
      setSlide(s => (s + 1) % SLIDES.length), INTERVAL);
    return () => clearInterval(timerRef.current);
  }, []);

  if (isLoading) return (
    <div style={{display:"flex",height:"100dvh",alignItems:"center",justifyContent:"center",background:"#080C14"}}>
      <div style={{width:28,height:28,borderRadius:"50%",border:"2px solid rgba(245,166,35,.3)",borderTopColor:"#F5A623",animation:"wlc-spin .8s linear infinite"}}/>
      <style>{`@keyframes wlc-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (session) return <Navigate to="/home" replace />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        .wlc-root*{box-sizing:border-box;margin:0;padding:0}
        .wlc-root{
          font-family:'Plus Jakarta Sans',system-ui,sans-serif;
          background:#080C14; height:100dvh; overflow:hidden;
          position:relative; display:flex; flex-direction:column;
        }

        /* Atmosfera */
        .wlc-atm{position:fixed;inset:0;pointer-events:none;z-index:0}
        .wlc-atm-t{position:absolute;inset:0;background:radial-gradient(ellipse 90% 55% at 50% -4%,rgba(245,166,35,.17) 0%,transparent 62%)}
        .wlc-atm-b{position:absolute;inset:0;background:radial-gradient(ellipse 70% 40% at 50% 110%,rgba(245,166,35,.07) 0%,transparent 60%)}
        .wlc-atm-g{position:absolute;inset:0;opacity:.022;background-image:linear-gradient(rgba(245,166,35,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(245,166,35,.6) 1px,transparent 1px);background-size:40px 40px}

        /* Animações */
        @keyframes wlc-fadeslide{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes wlc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes wlc-pulse{0%,100%{box-shadow:0 0 30px rgba(245,166,35,.10),0 18px 56px rgba(0,0,0,.55)}50%{box-shadow:0 0 48px rgba(245,166,35,.18),0 18px 56px rgba(0,0,0,.55)}}
        @keyframes wlc-blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes wlc-spin{to{transform:rotate(360deg)}}

        .wlc-fadein{animation:wlc-fadeslide .5s cubic-bezier(.22,.68,0,1.05) both}
        .wlc-float {animation:wlc-float 3.2s ease-in-out infinite}

        /* Seções mobile */
        .wlc-header{z-index:10;padding:36px 26px 0;display:flex;align-items:center;gap:10px}
        .wlc-hero  {z-index:10;flex:1 1 0;min-height:0;max-height:46vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 36px 4px;position:relative}
        .wlc-bottom{z-index:10;padding:0 26px 20px}

        /* Carrossel */
        .wlc-slides{display:grid;grid-template-columns:1fr;width:100%;max-width:310px}
        .wlc-slides>*{grid-column:1;grid-row:1}

        .wlc-slide{
          background:rgba(14,20,34,.85); backdrop-filter:blur(20px);
          border:1px solid rgba(245,166,35,.18); border-radius:20px;
          padding:16px 16px 13px; position:relative; overflow:hidden;
          transition:opacity .45s ease,transform .45s ease;
        }
        .wlc-slide.active{opacity:1;transform:scale(1);animation:wlc-pulse 4s ease-in-out infinite}
        .wlc-slide:not(.active){opacity:0;transform:scale(.97);pointer-events:none}
        .wlc-slide-line{position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,rgba(245,166,35,.5),transparent)}

        /* Dots */
        .wlc-dots{display:flex;align-items:center;gap:6px;margin-top:10px;z-index:10}
        .wlc-dot-btn{
          border:none;cursor:pointer;padding:4px;background:transparent;
          display:flex;align-items:center;justify-content:center;
          -webkit-tap-highlight-color:transparent;
        }
        .wlc-dot-inner{
          border-radius:999px;
          transition:all .3s ease;
        }
        .wlc-dot-inner.on {width:18px;height:5px;background:#F5A623;box-shadow:0 0 8px rgba(245,166,35,.6)}
        .wlc-dot-inner.off{width:5px; height:5px;background:rgba(143,163,187,.25)}

        /* Chips flutuantes */
        .wlc-fc{position:absolute;z-index:20}
        .wlc-fc-i{padding:4px 10px;border-radius:999px;background:rgba(15,21,32,.92);border:1px solid rgba(245,166,35,.22);backdrop-filter:blur(8px);font-size:10px;font-weight:600;color:#F5A623;letter-spacing:.04em;box-shadow:0 2px 10px rgba(0,0,0,.4);white-space:nowrap}

        /* Texto */
        .wlc-headline{font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:800;line-height:1.18;color:#F0F4F8;letter-spacing:-.4px;margin-bottom:5px}
        .wlc-sub    {font-size:13px;font-weight:400;color:rgba(143,163,187,.70);line-height:1.5;margin-bottom:11px}
        .wlc-chips  {display:flex;gap:5px;flex-wrap:wrap;margin-bottom:13px}
        .wlc-chip-m {padding:3px 9px;border-radius:999px;font-size:10px;font-weight:600;background:rgba(245,166,35,.07);border:1px solid rgba(245,166,35,.16);color:rgba(245,166,35,.75);letter-spacing:.03em}
        .wlc-btns   {display:flex;flex-direction:column;gap:8px}
        .wlc-footer {margin-top:12px;text-align:center;font-size:10px;color:rgba(143,163,187,.28);letter-spacing:.03em}

        .wlc-btn1{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px 24px;border:none;border-radius:13px;cursor:pointer;background:linear-gradient(95deg,#F5A623 0%,#E09010 100%);font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;color:#1B1304;letter-spacing:.01em;box-shadow:0 4px 24px rgba(245,166,35,.35),0 1px 0 rgba(255,255,255,.12) inset;transition:transform 120ms,box-shadow 120ms,background 120ms;-webkit-tap-highlight-color:transparent}
        .wlc-btn1:active{transform:scale(.975);box-shadow:0 2px 12px rgba(245,166,35,.22)}
        .wlc-btn1:hover{background:linear-gradient(95deg,#FFB733 0%,#F0A020 100%);transform:translateY(-1px)}

        .wlc-btn2{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:11px 24px;border-radius:13px;cursor:pointer;background:rgba(245,166,35,.06);border:1px solid rgba(245,166,35,.20);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;color:#F5A623;transition:background 120ms;-webkit-tap-highlight-color:transparent}
        .wlc-btn2:active{background:rgba(245,166,35,.12)}
        .wlc-btn2:hover{background:rgba(245,166,35,.10);border-color:rgba(245,166,35,.32)}

        /* Desktop */
        @media(min-width:768px){
          .wlc-root  {display:grid;grid-template-columns:52% 48%;grid-template-rows:auto 1fr}
          .wlc-header{grid-column:1;grid-row:1;padding:52px 64px 0}
          .wlc-hero  {grid-column:2;grid-row:1/3;padding:40px 52px 40px 28px;border-left:1px solid rgba(245,166,35,.06);background:linear-gradient(135deg,rgba(245,166,35,.024) 0%,transparent 60%);flex-direction:column;align-items:center;justify-content:center}
          .wlc-bottom{grid-column:1;grid-row:2;padding:0 64px 52px;display:flex;flex-direction:column;justify-content:flex-end}
          .wlc-slides{max-width:420px}
          .wlc-slide {padding:22px 22px 18px;border-radius:22px}
          .wlc-headline{font-size:44px;letter-spacing:-.8px;margin-bottom:10px}
          .wlc-sub   {font-size:16px;margin-bottom:18px;max-width:460px}
          .wlc-chips {margin-bottom:26px;gap:8px}
          .wlc-chip-m{padding:5px 14px;font-size:12px}
          .wlc-btns  {flex-direction:row;gap:12px;max-width:480px}
          .wlc-btn1  {font-size:16px;padding:15px 28px;border-radius:14px}
          .wlc-btn2  {font-size:14px;padding:14px 24px;border-radius:14px;width:auto;white-space:nowrap}
          .wlc-footer{text-align:left;margin-top:18px;font-size:11px}
          .wlc-dots  {margin-top:14px}
          .wlc-fc-fin{top:16%;left:-20px}
          .wlc-fc-op {top:46%;right:-16px}
          .wlc-fc-fr {top:78%;left:-16px}
        }
      `}</style>

      <div className="wlc-root">
        <div className="wlc-atm"><div className="wlc-atm-t"/><div className="wlc-atm-b"/><div className="wlc-atm-g"/></div>

        {/* Logo */}
        <div className="wlc-header wlc-fadein" style={{animationDelay:"0s"}}>
          <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:"rgba(245,166,35,.12)",border:"1px solid rgba(245,166,35,.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <img src={sgtLogo} alt="SGT" style={{width:20,height:20,objectFit:"contain"}}
              onError={e=>{e.currentTarget.style.display="none";e.currentTarget.parentElement!.innerHTML=`<span style="font-family:'Space Grotesk',sans-serif;font-weight:800;font-style:italic;font-size:13px;color:#F5A623">S</span>`;}}/>
          </div>
          <div>
            <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.32em",textTransform:"uppercase",color:"rgba(240,244,248,.42)",lineHeight:1}}>Workspace</p>
            <p style={{fontSize:14,fontWeight:800,color:"#F0F4F8",lineHeight:1.2,fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"-0.3px"}}>SGT Log</p>
          </div>
        </div>

        {/* Hero — carrossel */}
        <div className="wlc-hero wlc-fadein" style={{animationDelay:"0.1s"}}>
          {/* Chips flutuantes */}
          <div className="wlc-fc wlc-float wlc-fc-fin" style={{top:"8%",left:"-14px",animationDelay:"0s"}}>
            <div className="wlc-fc-i">Financeiro</div>
          </div>
          <div className="wlc-fc wlc-float wlc-fc-op" style={{top:"40%",right:"-16px",animationDelay:"0.4s"}}>
            <div className="wlc-fc-i">Operação</div>
          </div>
          <div className="wlc-fc wlc-float wlc-fc-fr" style={{top:"74%",left:"-8px",animationDelay:"0.8s"}}>
            <div className="wlc-fc-i">Frota</div>
          </div>

          {/* Slides empilhados via CSS grid */}
          <div className="wlc-slides">
            {SLIDES.map((s, i) => (
              <div key={s.id} className={`wlc-slide${i === slide ? " active" : ""}`}>
                <div className="wlc-slide-line"/>
                {s.render}
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="wlc-dots">
            {SLIDES.map((s, i) => (
              <button key={s.id} className="wlc-dot-btn" onClick={() => goTo(i)} aria-label={s.label} title={s.label}>
                <div className={`wlc-dot-inner${i === slide ? " on" : " off"}`}/>
              </button>
            ))}
          </div>
        </div>

        {/* Texto + CTAs */}
        <div className="wlc-bottom wlc-fadein" style={{animationDelay:"0.2s"}}>
          <p className="wlc-headline">
            Sua plataforma<br/>
            <span style={{color:"#F5A623"}}>operacional</span> e<br/>
            financeira.
          </p>
          <p className="wlc-sub">Indicadores, frota, financeiro e gestão — tudo da SGT Log em tempo real, no seu bolso.</p>
          <div className="wlc-chips">
            {["Financeiro","Frota","Compras","RH","Operação"].map((m,i)=>(
              <span key={i} className="wlc-chip-m">{m}</span>
            ))}
          </div>
          <div className="wlc-btns">
            <button className="wlc-btn1" onClick={()=>navigate("/login")}>
              Acessar Plataforma <ArrowRight size={17}/>
            </button>
            <button className="wlc-btn2" onClick={()=>navigate("/login?mode=first-access")}>
              <UserPlus size={14}/> Primeiro acesso? Defina sua senha
            </button>
          </div>
          <p className="wlc-footer">Acesso restrito · Uso interno SGT Log</p>
        </div>
      </div>
    </>
  );
}
