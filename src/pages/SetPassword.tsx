import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, CheckCircle, Eye, EyeOff, AlertCircle, Loader2, BarChart3, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import sgtLogo from "@/assets/sgt-logo-clean.png";
import { PasswordStrength, type PasswordRule } from "@/components/ui/password-strength";

const passwordRules: PasswordRule[] = [
  { id: "length", label: "Exatamente 6 caracteres", test: (v) => v.length === 6 },
  { id: "letter", label: "Pelo menos uma letra", test: (v) => /[a-zA-Z]/.test(v) },
  { id: "digit", label: "Pelo menos um número", test: (v) => /\d/.test(v) },
];

const passwordLabels = ["", "Fraca", "Regular", "Forte"] as const;

export default function SetPassword() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
        setHasSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length !== 6) {
      setError("A senha deve ter exatamente 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate("/home"), 2000);
  };

  if (!hasSession) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center sgt-bg-base px-4">
        <div className="text-center">
          <div className="h-6 w-6 mx-auto mb-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-sm text-[var(--sgt-text-muted)]">Verificando convite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden sgt-bg-base">
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_80%_60%_at_30%_-10%,rgba(180,110,4,0.22),transparent_55%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_50%_50%_at_100%_110%,rgba(6,182,212,0.07),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere" style={{ background: "radial-gradient(ellipse 120% 120% at 50% 50%, transparent 10%, rgba(2,3,12,0.70) 100%)" }} />

      {/* Left panel - desktop only */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--sgt-border-subtle)] sgt-bg-section px-12 py-14 lg:flex lg:w-[52%]">
        <div className="pointer-events-none absolute inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_90%_70%_at_0%_10%,rgba(180,110,4,0.18),transparent_60%)]" />
        <div className="relative space-y-6">
          <h1 className="text-[clamp(2rem,4vw,3rem)] font-black leading-[1.08] tracking-[-0.04em] sgt-text">
            Bem-vindo ao<br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-600 bg-clip-text text-transparent">
              SGT Log
            </span>
          </h1>
          <p className="max-w-[380px] text-[15px] leading-relaxed sgt-text-2">
            Defina sua senha para acessar o portal. Você recebeu um convite por email do administrador.
          </p>
        </div>

        <div className="relative w-[clamp(280px,28vw,400px)]">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[180%] w-[140%] -translate-x-1/2 -translate-y-1/2"
            style={{
              background: "radial-gradient(ellipse 50% 42% at 50% 50%, rgba(245,140,30,0.18), rgba(227,6,19,0.06) 45%, transparent 72%)",
              filter: "blur(28px)",
            }}
          />
          <img
            src={sgtLogo}
            alt="SGT Log"
            draggable={false}
            className="h-auto w-full select-none object-contain drop-shadow-[0_8px_28px_rgba(245,140,30,0.22)]"
          />
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
              <BarChart3 className="h-4 w-4 text-amber-300" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400/70">SGT LOG</p>
          </div>

          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold tracking-[-0.03em] sgt-text">
              {success ? "Senha definida!" : "Defina sua senha"}
            </h2>
            <p className="mt-1.5 text-[14px] text-[var(--sgt-text-muted)]">
              {success
                ? "Redirecionando para o portal..."
                : "Crie sua senha para acessar o SGT Log"}
            </p>
          </div>

          {success ? (
            <div className="flex items-center gap-2.5 rounded-[14px] border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-[13px] text-emerald-300">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Senha definida com sucesso! Entrando...
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 flex items-center gap-2.5 rounded-[14px] border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-[13px] text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--sgt-text-muted)]">Nova senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sgt-text-muted)]" />
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      maxLength={6}
                      placeholder="6 caracteres"
                      className="h-12 w-full rounded-[14px] border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] pl-10 pr-12 text-[14px] sgt-text placeholder:text-[var(--sgt-text-faint)] outline-none transition-all duration-200 hover:border-[var(--sgt-border-medium)] focus:border-amber-400/35 focus:bg-[var(--sgt-input-hover)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sgt-text-muted)] transition-colors hover:text-[var(--sgt-text-secondary)]">
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrength
                    value={password}
                    rules={passwordRules}
                    labels={passwordLabels as unknown as string[]}
                    showRules={true}
                    className="mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--sgt-text-muted)]">Confirmar senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sgt-text-muted)]" />
                    <input
                      type={showPwd ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      maxLength={6}
                      placeholder="Repita a senha"
                      className="h-12 w-full rounded-[14px] border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] pl-10 pr-4 text-[14px] sgt-text placeholder:text-[var(--sgt-text-faint)] outline-none transition-all duration-200 hover:border-[var(--sgt-border-medium)] focus:border-amber-400/35 focus:bg-[var(--sgt-input-hover)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-gradient-to-r from-amber-500 to-orange-600 text-[14px] font-bold text-gray-900 shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_50px_-5px_rgba(245,158,11,0.6)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Definindo senha...</>
                  ) : "Definir senha e acessar"}
                </button>
              </form>
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
