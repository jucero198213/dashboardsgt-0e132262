import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import sgtLogo from "@/assets/sgt-logo-clean.png";
import { Lock, Mail, Eye, EyeOff, AlertCircle, Loader2, BarChart3, Sun, Moon } from "lucide-react";

export default function Login() {
  const { session, isLoading, signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center sgt-bg-base">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
    </div>
  );

  if (session) return <Navigate to="/home" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setSubmitting(false);
  };

  // ── Render: Login (Cinematic enterprise) ──
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden sgt-bg-base text-slate-200 selection:bg-amber-500/30">

      {/* PAINEL ESQUERDO — Branding cinematográfico */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/5 p-16 lg:flex lg:w-1/2">
        {/* Aura âmbar */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-600/10 blur-[120px]" />
        <div className="pointer-events-none absolute inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_80%_60%_at_20%_-10%,rgba(180,110,4,0.18),transparent_60%)]" />

        {/* Chip topo */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-amber-500/80">SGT LOG · Enterprise</span>
          </div>
        </div>

        {/* Bloco central — logo SGT como peça arquitetônica */}
        <div className="relative z-10 flex flex-col gap-10 animate-[fadeSlideIn_0.7s_ease-out]">

          {/* Kicker discreto que ancora o logo */}
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-gradient-to-r from-amber-500/60 to-transparent" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.45em] text-amber-500/70">
              Bem-vindo ao Workspace
            </p>
          </div>

          {/* Plinto do logo: aura quente difusa, perfeitamente centrada atrás do logo */}
          <div className="relative w-[clamp(320px,32vw,440px)]">
            {/* Halo principal — elipse ampla e suave, centrada na massa do logo */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[180%] w-[140%] -translate-x-1/2 -translate-y-1/2"
              style={{
                background:
                  "radial-gradient(ellipse 50% 42% at 50% 50%, rgba(245,140,30,0.18), rgba(227,6,19,0.06) 45%, transparent 72%)",
                filter: "blur(28px)",
              }}
            />
            {/* Núcleo quente — pequeno acento sob o logotipo */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[60%] w-[70%] -translate-x-1/2 -translate-y-1/2"
              style={{
                background:
                  "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,170,60,0.16), transparent 70%)",
                filter: "blur(20px)",
              }}
            />

            <div className="relative flex flex-col gap-6">
              <img
                src={sgtLogo}
                alt="SGT Log — Sistema de Gestão em Transporte"
                draggable={false}
                width={1514}
                height={466}
                className="h-auto w-full select-none object-contain drop-shadow-[0_8px_28px_rgba(245,140,30,0.22)]"
                style={{ imageRendering: "auto" }}
              />

              {/* Régua tipográfica que conecta logo ↔ tagline (linguagem visual unificada) */}
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-amber-500/70 via-orange-600/40 to-transparent" />
                <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">
                  gestão - operação - financeiro
                </p>
              </div>
            </div>
          </div>

          <p className="max-w-[420px] text-[15px] leading-relaxed text-slate-400/75">
            Plataforma unificada para operações logísticas de alto desempenho
            <span className="text-amber-400/70"> e controle de frota em tempo real.</span>
          </p>
        </div>

        {/* Rodapé */}
        <div className="relative z-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/20">
          <span>© 2026 SGT Log · Todos os direitos reservados</span>
          <span>v2.0</span>
        </div>
      </div>

      {/* PAINEL DIREITO — Formulário */}
      <div className="relative flex w-full flex-col items-center justify-center p-8 lg:w-1/2"
           style={{ background: "radial-gradient(circle at center, rgba(15,20,35,1) 0%, rgba(6,9,18,1) 100%)" }}>
        <div className="pointer-events-none absolute inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_70%_60%_at_100%_-10%,rgba(6,182,212,0.05),transparent_55%)]" />

        <div className="relative flex w-full max-w-[420px] flex-col gap-10 animate-[fadeSlideIn_0.6s_ease-out]">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10">
              <BarChart3 className="h-4 w-4 text-amber-300" />
            </div>
            <p className="text-[13px] font-bold tracking-tight text-white">Workspace <span className="text-amber-300">SGT</span></p>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-4xl font-bold tracking-tight text-white">Bem-vindo</h2>
            <p className="text-slate-400">Acesse o portal com suas credenciais</p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 text-[13px] text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="ml-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">E-mail</label>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500 transition-colors group-focus-within:text-amber-500">
                  <Mail className="h-[18px] w-[18px]" />
                </div>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoComplete="email" placeholder="seu@email.com"
                  className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-12 pr-4 text-white placeholder:text-slate-600 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Senha</label>
              </div>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500 transition-colors group-focus-within:text-amber-500">
                  <Lock className="h-[18px] w-[18px]" />
                </div>
                <input
                  type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  required autoComplete="current-password" placeholder="••••••••"
                  className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-12 pr-12 text-white placeholder:text-slate-700 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-4 flex items-center text-slate-500 transition-colors hover:text-white">
                  {showPass ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-2">
              <button
                type="submit" disabled={submitting}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-gray-900 shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_50px_-5px_rgba(245,158,11,0.6)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Autenticando...</>
                ) : "Acessar Portal"}
              </button>

            </div>
          </form>

          {/* Rodapé */}
          <div className="flex items-center justify-between border-t border-white/5 pt-8">
            <p className="text-[11px] font-medium tracking-tight text-slate-500">
              Acesso restrito · Uso interno SGT Log
            </p>
            <button
              type="button" onClick={toggleTheme}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/10"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-cyan-400" />}
              {theme === "dark" ? "Tema claro" : "Tema escuro"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
