import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import sgtLogo from "@/assets/sgt-logo-clean.png";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Mail, Eye, EyeOff, AlertCircle, Loader2, TrendingUp, BarChart3, Shield, Sun, Moon, UserPlus, ArrowLeft, CheckCircle, KeyRound } from "lucide-react";

export default function Login() {
  const { session, isLoading, signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);

  // Primeiro acesso — inicializa pelo query param ?mode=first-access
  const [mode, setMode] = useState<"login" | "first-access">(
    searchParams.get("mode") === "first-access" ? "first-access" : "login"
  );
  const [faEmail, setFaEmail] = useState("");
  const [faCode, setFaCode] = useState("");
  const [faPassword, setFaPassword] = useState("");
  const [faConfirm, setFaConfirm] = useState("");
  const [faShowPass, setFaShowPass] = useState(false);
  const [faLoading, setFaLoading] = useState(false);
  const [faError, setFaError] = useState<string | null>(null);
  const [faSuccess, setFaSuccess] = useState(false);

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

  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (faPassword.length < 6) {
      setFaError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (faPassword !== faConfirm) {
      setFaError("As senhas não coincidem.");
      return;
    }
    setFaError(null);
    setFaLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("first-access", {
        body: { email: faEmail, code: faCode, password: faPassword },
      });
      if (error || data?.error) {
        setFaError(data?.error || "Erro ao definir senha.");
      } else {
        setFaSuccess(true);
        // Sign in automatically
        setTimeout(async () => {
          await signIn(faEmail, faPassword);
          navigate("/home");
        }, 1500);
      }
    } catch {
      setFaError("Erro inesperado. Tente novamente.");
    } finally {
      setFaLoading(false);
    }
  };

  // ── Render: First access with code ──
  if (mode === "first-access") {
    return (
      <div className="relative flex min-h-screen overflow-hidden sgt-bg-base">
        <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_80%_60%_at_30%_-10%,rgba(180,110,4,0.22),transparent_55%)]" />
        <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_50%_50%_at_100%_110%,rgba(6,182,212,0.07),transparent_60%)]" />
        <div className="pointer-events-none fixed inset-0 sgt-atmosphere" style={{ background: "radial-gradient(ellipse 120% 120% at 50% 50%, transparent 10%, rgba(2,3,12,0.70) 100%)" }} />

        {/* Left panel - desktop only */}
        <div className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--sgt-border-subtle)] sgt-bg-section px-12 py-14 lg:flex lg:w-[52%]">
          <div className="pointer-events-none absolute inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_90%_70%_at_0%_10%,rgba(180,110,4,0.18),transparent_60%)]" />
          <div className="relative space-y-6">
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-black leading-[1.08] tracking-[-0.04em] sgt-text">
              Primeiro<br />
              <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-600 bg-clip-text text-transparent">
                Acesso
              </span>
            </h1>
            <p className="max-w-[380px] text-[15px] leading-relaxed sgt-text-2">
              Utilize o código fornecido pelo administrador para definir sua senha e acessar o portal.
            </p>
          </div>
          <div className="relative flex items-center justify-between">
            <p className="text-[11px] text-[var(--sgt-text-faint)]">© 2026 SGT Log · Todos os direitos reservados</p>
          </div>
        </div>

        {/* Right panel */}
        <div className="relative flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
          <div className="pointer-events-none absolute inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_70%_60%_at_100%_-10%,rgba(6,182,212,0.06),transparent_55%)]" />
          <div className="relative w-full max-w-[400px] animate-[fadeSlideIn_0.6s_ease-out]">

            {/* Logo mobile */}
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10">
                <BarChart3 className="h-4.5 w-4.5 text-amber-300" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400/70">SGT LOG · Gestão Financeira</p>
            </div>

            <div className="mb-8">
              <h2 className="text-[28px] font-extrabold tracking-[-0.03em] sgt-text">
                {faSuccess ? "Senha definida!" : "Primeiro acesso"}
              </h2>
              <p className="mt-1.5 text-[14px] text-[var(--sgt-text-muted)]">
                {faSuccess
                  ? "Redirecionando para o portal..."
                  : "Informe seu email, código de acesso e crie sua senha"}
              </p>
            </div>

            {faSuccess ? (
              <div className="flex items-center gap-2.5 rounded-[14px] border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-[13px] text-emerald-300">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Senha definida com sucesso! Entrando...
              </div>
            ) : (
              <>
                {faError && (
                  <div className="mb-6 flex items-center gap-2.5 rounded-[14px] border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-[13px] text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {faError}
                  </div>
                )}

                <form onSubmit={handleFirstAccess} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--sgt-text-muted)]">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sgt-text-muted)]" />
                      <input
                        type="email"
                        value={faEmail}
                        onChange={(e) => setFaEmail(e.target.value)}
                        required
                        autoComplete="email"
                        placeholder="seu@email.com"
                        className="h-12 w-full rounded-[14px] border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] pl-10 pr-4 text-[14px] sgt-text placeholder:text-[var(--sgt-text-faint)] outline-none transition-all duration-200 hover:border-[var(--sgt-border-medium)] focus:border-amber-400/35 focus:bg-[var(--sgt-input-hover)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--sgt-text-muted)]">Código de acesso</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sgt-text-muted)]" />
                      <input
                        type="text"
                        value={faCode}
                        onChange={(e) => setFaCode(e.target.value.toUpperCase())}
                        required
                        placeholder="EX: ABC123"
                        maxLength={6}
                        className="h-12 w-full rounded-[14px] border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] pl-10 pr-4 text-[14px] font-mono tracking-[0.2em] sgt-text placeholder:text-[var(--sgt-text-faint)] placeholder:font-sans placeholder:tracking-normal outline-none transition-all duration-200 hover:border-[var(--sgt-border-medium)] focus:border-amber-400/35 focus:bg-[var(--sgt-input-hover)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--sgt-text-muted)]">Nova senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sgt-text-muted)]" />
                      <input
                        type={faShowPass ? "text" : "password"}
                        value={faPassword}
                        onChange={(e) => setFaPassword(e.target.value)}
                        required
                        placeholder="Mínimo 6 caracteres"
                        className="h-12 w-full rounded-[14px] border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] pl-10 pr-12 text-[14px] sgt-text placeholder:text-[var(--sgt-text-faint)] outline-none transition-all duration-200 hover:border-[var(--sgt-border-medium)] focus:border-amber-400/35 focus:bg-[var(--sgt-input-hover)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
                      />
                      <button type="button" onClick={() => setFaShowPass(!faShowPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sgt-text-muted)] transition-colors hover:text-[var(--sgt-text-secondary)]">
                        {faShowPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--sgt-text-muted)]">Confirmar senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sgt-text-muted)]" />
                      <input
                        type={faShowPass ? "text" : "password"}
                        value={faConfirm}
                        onChange={(e) => setFaConfirm(e.target.value)}
                        required
                        placeholder="Repita a senha"
                        className="h-12 w-full rounded-[14px] border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] pl-10 pr-4 text-[14px] sgt-text placeholder:text-[var(--sgt-text-faint)] outline-none transition-all duration-200 hover:border-[var(--sgt-border-medium)] focus:border-amber-400/35 focus:bg-[var(--sgt-input-hover)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={faLoading}
                    className="relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-amber-500/[0.12] text-[14px] font-bold text-amber-300 transition-all duration-300 border border-amber-400/25 hover:bg-amber-400/[0.18] hover:border-amber-400/40 hover:shadow-[0_8px_32px_rgba(245,158,11,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-amber-400/60 via-amber-300/40 to-transparent" />
                    {faLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Definindo senha...</>
                    ) : "Definir senha e acessar"}
                  </button>
                </form>

                <button
                  onClick={() => { setMode("login"); setFaError(null); setFaEmail(""); setFaCode(""); setFaPassword(""); setFaConfirm(""); }}
                  className="mt-6 flex items-center gap-2 text-[13px] text-[var(--sgt-text-muted)] hover:text-amber-300 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar ao login
                </button>
              </>
            )}

            <div className="mt-8 flex items-center justify-end">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--sgt-border-subtle)] px-2.5 py-1.5 text-[11px] font-medium text-[color:var(--sgt-text-muted)] transition-all hover:border-[var(--sgt-border-medium)] hover:text-[color:var(--sgt-text-secondary)]"
                style={{ background: "var(--sgt-input-bg)" }}
              >
                {theme === "dark" ? <Sun className="h-3 w-3 text-amber-400" /> : <Moon className="h-3 w-3 text-cyan-400" />}
                {theme === "dark" ? "Tema claro" : "Tema escuro"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Login normal (Cinematic enterprise) ──
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
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-[#060912] shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_50px_-5px_rgba(245,158,11,0.6)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Autenticando...</>
                ) : "Acessar Portal"}
              </button>

              <button
                type="button" onClick={() => setMode("first-access")}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] text-sm font-medium text-slate-300 transition-all hover:border-white/20 hover:bg-white/[0.05]"
              >
                <UserPlus className="h-[18px] w-[18px]" />
                Primeiro acesso? Defina sua senha
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
