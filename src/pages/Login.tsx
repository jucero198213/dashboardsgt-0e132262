import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Mail, Eye, EyeOff, AlertCircle, Loader2, TrendingUp, BarChart3, Shield, Sun, Moon, UserPlus, ArrowLeft, CheckCircle } from "lucide-react";

export default function Login() {
  const { session, isLoading, signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);

  // Primeiro acesso / reset
  const [mode, setMode] = useState<"login" | "first-access" | "reset-password">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Set new password (from reset link)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center sgt-bg-base">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
    </div>
  );

  // If user arrived via recovery link, show password set form
  const hash = window.location.hash;
  const isRecovery = hash.includes("type=recovery") || hash.includes("type=signup");

  if (session && !isRecovery) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setSubmitting(false);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + "/login",
      });
      if (error) {
        setResetError("Erro ao enviar email. Verifique o endereço e tente novamente.");
      } else {
        setResetSent(true);
      }
    } catch {
      setResetError("Erro inesperado. Tente novamente.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setResetError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("As senhas não coincidem.");
      return;
    }
    setResetError(null);
    setSettingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setResetError("Erro ao definir senha. Tente novamente.");
      } else {
        setPasswordSet(true);
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
    } catch {
      setResetError("Erro inesperado.");
    } finally {
      setSettingPassword(false);
    }
  };

  // ── Render: Set new password (after clicking recovery link) ──
  if (isRecovery || session) {
    return (
      <div className="relative flex min-h-screen overflow-hidden sgt-bg-base">
        <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_80%_60%_at_30%_-10%,rgba(180,110,4,0.22),transparent_55%)]" />
        <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_50%_50%_at_100%_110%,rgba(6,182,212,0.07),transparent_60%)]" />
        <div className="pointer-events-none fixed inset-0 sgt-atmosphere" style={{ background: "radial-gradient(ellipse 120% 120% at 50% 50%, transparent 10%, rgba(2,3,12,0.70) 100%)" }} />

        <div className="relative flex flex-1 items-center justify-center px-6 py-12">
          <div className="relative w-full max-w-[400px] animate-[fadeSlideIn_0.6s_ease-out]">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10">
                <BarChart3 className="h-4.5 w-4.5 text-amber-300" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400/70">SGT LOG · Gestão Financeira</p>
            </div>

            <div className="mb-8">
              <h2 className="text-[28px] font-extrabold tracking-[-0.03em] sgt-text">
                {passwordSet ? "Senha definida!" : "Defina sua senha"}
              </h2>
              <p className="mt-1.5 text-[14px] text-[var(--sgt-text-muted)]">
                {passwordSet ? "Redirecionando para o portal..." : "Crie uma senha segura para acessar o portal"}
              </p>
            </div>

            {passwordSet ? (
              <div className="flex items-center gap-2.5 rounded-[14px] border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-[13px] text-emerald-300">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Senha definida com sucesso! Redirecionando...
              </div>
            ) : (
              <>
                {resetError && (
                  <div className="mb-6 flex items-center gap-2.5 rounded-[14px] border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-[13px] text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {resetError}
                  </div>
                )}

                <form onSubmit={handleSetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--sgt-text-muted)]">Nova senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sgt-text-muted)]" />
                      <input
                        type={showNewPass ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Mínimo 6 caracteres"
                        className="h-12 w-full rounded-[14px] border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] pl-10 pr-12 text-[14px] sgt-text placeholder:text-[var(--sgt-text-faint)] outline-none transition-all duration-200 hover:border-[var(--sgt-border-medium)] focus:border-amber-400/35 focus:bg-[var(--sgt-input-hover)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
                      />
                      <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sgt-text-muted)] transition-colors hover:text-[var(--sgt-text-secondary)]">
                        {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--sgt-text-muted)]">Confirmar senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sgt-text-muted)]" />
                      <input
                        type={showNewPass ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Repita a senha"
                        className="h-12 w-full rounded-[14px] border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] pl-10 pr-4 text-[14px] sgt-text placeholder:text-[var(--sgt-text-faint)] outline-none transition-all duration-200 hover:border-[var(--sgt-border-medium)] focus:border-amber-400/35 focus:bg-[var(--sgt-input-hover)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={settingPassword}
                    className="relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-amber-500/[0.12] text-[14px] font-bold text-amber-300 transition-all duration-300 border border-amber-400/25 hover:bg-amber-400/[0.18] hover:border-amber-400/40 hover:shadow-[0_8px_32px_rgba(245,158,11,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-amber-400/60 via-amber-300/40 to-transparent" />
                    {settingPassword ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                    ) : "Definir senha e acessar"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: First access / reset request ──
  if (mode === "first-access") {
    return (
      <div className="relative flex min-h-screen overflow-hidden sgt-bg-base">
        <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_80%_60%_at_30%_-10%,rgba(180,110,4,0.22),transparent_55%)]" />
        <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_50%_50%_at_100%_110%,rgba(6,182,212,0.07),transparent_60%)]" />
        <div className="pointer-events-none fixed inset-0 sgt-atmosphere" style={{ background: "radial-gradient(ellipse 120% 120% at 50% 50%, transparent 10%, rgba(2,3,12,0.70) 100%)" }} />

        {/* Left panel - desktop only */}
        <div className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--sgt-border-subtle)] sgt-bg-section px-12 py-14 lg:flex lg:w-[52%]">
          <div className="pointer-events-none absolute inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_90%_70%_at_0%_10%,rgba(180,110,4,0.18),transparent_60%)]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10">
                <BarChart3 className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-amber-400/70">SGT LOG</p>
                <p className="text-[10px] text-[var(--sgt-text-muted)] tracking-[0.15em]">GESTÃO FINANCEIRA</p>
              </div>
            </div>
          </div>
          <div className="relative space-y-6">
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-black leading-[1.08] tracking-[-0.04em] sgt-text">
              Primeiro<br />
              <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-600 bg-clip-text text-transparent">
                Acesso
              </span>
            </h1>
            <p className="max-w-[380px] text-[15px] leading-relaxed sgt-text-2">
              Se o administrador já cadastrou seu email, solicite aqui o link para criar sua senha e acessar o portal.
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
                {resetSent ? "Email enviado!" : "Primeiro acesso"}
              </h2>
              <p className="mt-1.5 text-[14px] text-[var(--sgt-text-muted)]">
                {resetSent
                  ? "Verifique sua caixa de entrada e clique no link para definir sua senha."
                  : "Informe seu email corporativo para receber o link de criação de senha"}
              </p>
            </div>

            {resetSent ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2.5 rounded-[14px] border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-[13px] text-emerald-300">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Um link foi enviado para <strong>{resetEmail}</strong>
                </div>
                <button
                  onClick={() => { setMode("login"); setResetSent(false); setResetEmail(""); }}
                  className="flex items-center gap-2 text-[13px] text-amber-300 hover:text-amber-200 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar ao login
                </button>
              </div>
            ) : (
              <>
                {resetError && (
                  <div className="mb-6 flex items-center gap-2.5 rounded-[14px] border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-[13px] text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {resetError}
                  </div>
                )}

                <form onSubmit={handleResetRequest} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--sgt-text-muted)]">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sgt-text-muted)]" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        autoComplete="email"
                        placeholder="seu@email.com"
                        className="h-12 w-full rounded-[14px] border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] pl-10 pr-4 text-[14px] sgt-text placeholder:text-[var(--sgt-text-faint)] outline-none transition-all duration-200 hover:border-[var(--sgt-border-medium)] focus:border-amber-400/35 focus:bg-[var(--sgt-input-hover)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-amber-500/[0.12] text-[14px] font-bold text-amber-300 transition-all duration-300 border border-amber-400/25 hover:bg-amber-400/[0.18] hover:border-amber-400/40 hover:shadow-[0_8px_32px_rgba(245,158,11,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-amber-400/60 via-amber-300/40 to-transparent" />
                    {resetLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                    ) : "Enviar link de acesso"}
                  </button>
                </form>

                <button
                  onClick={() => { setMode("login"); setResetError(null); setResetEmail(""); }}
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

  // ── Render: Login normal ──
  return (
    <div className="relative flex min-h-screen overflow-hidden sgt-bg-base">

      {/* ── Atmosfera global ── */}
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_80%_60%_at_30%_-10%,rgba(180,110,4,0.22),transparent_55%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_50%_50%_at_100%_110%,rgba(6,182,212,0.07),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere" style={{ background: "radial-gradient(ellipse 120% 120% at 50% 50%, transparent 10%, rgba(2,3,12,0.70) 100%)" }} />

      {/* PAINEL ESQUERDO — Branding */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--sgt-border-subtle)] sgt-bg-section px-12 py-14 lg:flex lg:w-[52%]">
        <div className="pointer-events-none absolute inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_90%_70%_at_0%_10%,rgba(180,110,4,0.18),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10">
              <BarChart3 className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-amber-400/70">SGT LOG</p>
              <p className="text-[10px] text-[var(--sgt-text-muted)] tracking-[0.15em]">GESTÃO FINANCEIRA</p>
            </div>
          </div>
        </div>
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/8 px-3 py-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Tempo Real</span>
          </div>
          <h1 className="text-[clamp(2rem,4vw,3rem)] font-black leading-[1.08] tracking-[-0.04em] sgt-text">
            Inteligência<br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-600 bg-clip-text text-transparent">
              Financeira
            </span><br />
            para Logística
          </h1>
          <p className="max-w-[380px] text-[15px] leading-relaxed sgt-text-2">
            Análise consolidada de contas a pagar, receber e indicadores estratégicos da operação de frota em tempo real.
          </p>
          <div className="space-y-3 pt-2">
            {[
              { icon: TrendingUp,  text: "Indicadores estratégicos com meta vs realizado" },
              { icon: BarChart3,   text: "Evolução diária e composição por fornecedor" },
              { icon: Shield,      text: "Acesso seguro com controle por perfil" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]">
                  <Icon className="h-3.5 w-3.5 text-[var(--sgt-text-muted)]" />
                </div>
                <p className="text-[13px] text-[var(--sgt-text-muted)]">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center justify-between">
          <p className="text-[11px] text-[var(--sgt-text-faint)]">© 2026 SGT Log · Todos os direitos reservados</p>
          <p className="text-[10px] text-[var(--sgt-text-faint)] tracking-[0.1em]">v2.0</p>
        </div>
      </div>

      {/* PAINEL DIREITO — Formulário */}
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
            <h2 className="text-[28px] font-extrabold tracking-[-0.03em] sgt-text">Bem-vindo</h2>
            <p className="mt-1.5 text-[14px] text-[var(--sgt-text-muted)]">Acesse o portal com suas credenciais</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2.5 rounded-[14px] border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-[13px] text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--sgt-text-muted)]">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sgt-text-muted)]" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoComplete="email" placeholder="seu@email.com"
                  className="h-12 w-full rounded-[14px] border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] pl-10 pr-4 text-[14px] sgt-text placeholder:text-[var(--sgt-text-faint)] outline-none transition-all duration-200 hover:border-[var(--sgt-border-medium)] focus:border-amber-400/35 focus:bg-[var(--sgt-input-hover)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--sgt-text-muted)]">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sgt-text-muted)]" />
                <input
                  type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  required autoComplete="current-password" placeholder="••••••••"
                  className="h-12 w-full rounded-[14px] border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] pl-10 pr-12 text-[14px] sgt-text placeholder:text-[var(--sgt-text-faint)] outline-none transition-all duration-200 hover:border-[var(--sgt-border-medium)] focus:border-amber-400/35 focus:bg-[var(--sgt-input-hover)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sgt-text-muted)] transition-colors hover:text-[var(--sgt-text-secondary)]">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={submitting}
              className="relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-amber-500/[0.12] text-[14px] font-bold text-amber-300 transition-all duration-300 border border-amber-400/25 hover:bg-amber-400/[0.18] hover:border-amber-400/40 hover:shadow-[0_8px_32px_rgba(245,158,11,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-amber-400/60 via-amber-300/40 to-transparent" />
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Autenticando...</>
              ) : "Acessar Portal"}
            </button>
          </form>

          {/* Primeiro Acesso */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setMode("first-access")}
              className="flex items-center gap-2 rounded-[14px] border border-cyan-500/20 bg-cyan-500/5 px-5 py-2.5 text-[13px] font-medium text-cyan-300 transition-all hover:bg-cyan-500/10 hover:border-cyan-500/30"
            >
              <UserPlus className="h-4 w-4" />
              Primeiro acesso? Defina sua senha
            </button>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <p className="text-[11px] text-[var(--sgt-text-faint)]">Acesso restrito · Uso interno SGT Log</p>
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
