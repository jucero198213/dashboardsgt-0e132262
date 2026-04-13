import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Mail, Eye, EyeOff, AlertCircle, Loader2, TrendingUp, BarChart3, Shield } from "lucide-react";

export default function Login() {
  const { session, isLoading, signIn } = useAuth();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center [background:var(--sgt-bg-base)]">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
    </div>
  );

  if (session) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setSubmitting(false);
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden [background:var(--sgt-bg-base)]">

      {/* ── Atmosfera global ── */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_-10%,rgba(180,110,4,0.22),transparent_55%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_50%_50%_at_100%_110%,rgba(6,182,212,0.07),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(ellipse 120% 120% at 50% 50%, transparent 10%, rgba(2,3,12,0.70) 100%)" }} />

      {/* ══════════════════════════════════════════════
          PAINEL ESQUERDO — Branding
      ══════════════════════════════════════════════ */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-[rgba(6,9,18,0.60)] px-12 py-14 lg:flex lg:w-[52%]">

        {/* Luz focal no painel esquerdo */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_0%_10%,rgba(180,110,4,0.18),transparent_60%)]" />

        {/* Logo / identidade */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10">
              <BarChart3 className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-amber-400/70">SGT LOG</p>
              <p className="text-[10px] text-slate-600 tracking-[0.15em]">GESTÃO FINANCEIRA</p>
            </div>
          </div>
        </div>

        {/* Headline central */}
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/8 px-3 py-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Tempo Real</span>
          </div>

          <h1 className="text-4xl font-black leading-[1.08] tracking-[-0.04em] text-white xl:text-5xl">
            Inteligência<br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-white bg-clip-text text-transparent">
              Financeira
            </span><br />
            para Logística
          </h1>

          <p className="max-w-[380px] text-[15px] leading-relaxed text-slate-400">
            Análise consolidada de contas a pagar, receber e indicadores estratégicos da operação de frota em tempo real.
          </p>

          {/* Features */}
          <div className="space-y-3 pt-2">
            {[
              { icon: TrendingUp,  text: "Indicadores estratégicos com meta vs realizado" },
              { icon: BarChart3,   text: "Evolução diária e composição por fornecedor" },
              { icon: Shield,      text: "Acesso seguro com controle por perfil" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03]">
                  <Icon className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <p className="text-[13px] text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé do painel */}
        <div className="relative flex items-center justify-between">
          <p className="text-[11px] text-slate-700">© 2026 SGT Log · Todos os direitos reservados</p>
          <p className="text-[10px] text-slate-700 tracking-[0.1em]">v2.0</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          PAINEL DIREITO — Formulário
      ══════════════════════════════════════════════ */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12 lg:px-16">

        {/* Luz focal no painel direito */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_-10%,rgba(6,182,212,0.06),transparent_55%)]" />

        <div className="relative w-full max-w-[400px] animate-[fadeSlideIn_0.6s_ease-out]">

          {/* Logo mobile (só aparece em telas pequenas) */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10">
              <BarChart3 className="h-4.5 w-4.5 text-amber-300" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400/70">SGT LOG · Gestão Financeira</p>
          </div>

          {/* Cabeçalho do form */}
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold tracking-[-0.03em] text-white">Bem-vindo</h2>
            <p className="mt-1.5 text-[14px] text-slate-500">Acesse o portal com suas credenciais</p>
          </div>

          {/* Erro */}
          {error && (
            <div className="mb-6 flex items-center gap-2.5 rounded-[14px] border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-[13px] text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-600">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="h-12 w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 text-[14px] text-white placeholder:text-slate-700 outline-none transition-all duration-200 hover:border-white/[0.13] focus:border-amber-400/35 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-600">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-12 w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] pl-10 pr-12 text-[14px] text-white placeholder:text-slate-700 outline-none transition-all duration-200 hover:border-white/[0.13] focus:border-amber-400/35 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 transition-colors hover:text-slate-300">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={submitting}
              className="relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-amber-500/[0.12] text-[14px] font-bold text-amber-300 transition-all duration-300 border border-amber-400/25 hover:bg-amber-400/[0.18] hover:border-amber-400/40 hover:shadow-[0_8px_32px_rgba(245,158,11,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {/* Stripe de cor no topo */}
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-amber-400/60 via-amber-300/40 to-transparent" />
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Autenticando...</>
              ) : "Acessar Portal"}
            </button>
          </form>

          {/* Rodapé */}
          <p className="mt-8 text-center text-[11px] text-slate-700">
            Acesso restrito · Uso interno SGT Log
          </p>
        </div>
      </div>
    </div>
  );
}
