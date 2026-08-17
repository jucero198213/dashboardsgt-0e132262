import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Monitor, CheckCircle, Lock, ToggleLeft, ToggleRight, History, LogOut,
  ShieldAlert, ShieldCheck, Loader2, RefreshCw, AlertCircle, Users, KeyRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Session } from "@supabase/supabase-js";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { getSettingsMeta, setSetting } from "@/lib/settingsApi";
import {
  listarHistoricoLogin, resumirUserAgent, LOGIN_EVENT_LABEL,
  type LoginHistoryRow, type LoginEvent,
} from "@/lib/loginHistoryApi";

type PasswordPolicy = {
  min_length: number;
  max_length: number;
  require_letter: boolean;
  require_number: boolean;
};

const DEFAULT_POLICY: PasswordPolicy = {
  min_length: 6, max_length: 6, require_letter: true, require_number: true,
};

const EVENT_UI: Record<LoginEvent, { badge: string; dot: string; icon: typeof ShieldCheck }> = {
  login_success:    { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400", icon: ShieldCheck },
  login_failed:     { badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",          dot: "bg-rose-400",    icon: ShieldAlert },
  logout:           { badge: "bg-slate-500/10 text-slate-400 border-slate-500/20",       dot: "bg-slate-400",   icon: LogOut },
  password_changed: { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",       dot: "bg-amber-400",   icon: KeyRound },
};

const PERIODOS = [
  { key: "hoje", label: "Hoje", days: 0 },
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
] as const;

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function inicioDoDia() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Seguranca() {
  const { user, signOut } = useAuth();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  const [policy, setPolicy] = useState<PasswordPolicy>(DEFAULT_POLICY);
  const [policyUpdatedAt, setPolicyUpdatedAt] = useState<string | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const [historico, setHistorico] = useState<LoginHistoryRow[]>([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [filtroEvento, setFiltroEvento] = useState<"todos" | LoginEvent>("todos");
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["key"]>("7d");

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentSession(data.session));
  }, []);

  useEffect(() => {
    getSettingsMeta().then((rows) => {
      const p = rows.find((r) => r.key === "password_policy");
      if (p?.value) setPolicy({ ...DEFAULT_POLICY, ...(p.value as Partial<PasswordPolicy>) });
      setPolicyUpdatedAt(p?.updated_at ?? null);
    });
  }, []);

  const carregarHistorico = useCallback(async () => {
    setLoadingHist(true);
    setHistorico(await listarHistoricoLogin(50));
    setLoadingHist(false);
  }, []);

  useEffect(() => { carregarHistorico(); }, [carregarHistorico]);

  const salvarPolitica = async () => {
    setSavingPolicy(true);
    try {
      await setSetting("password_policy", policy);
      setPolicyUpdatedAt(new Date().toISOString());
      notify(true, "Política de senha salva com sucesso!");
    } catch {
      notify(false, "Não foi possível salvar a política.");
    }
    setSavingPolicy(false);
  };

  const filtrados = useMemo(() => {
    const cfg = PERIODOS.find((p) => p.key === periodo)!;
    const limite = cfg.days === 0 ? inicioDoDia() : new Date(Date.now() - cfg.days * 86400000);
    return historico.filter(
      (h) => new Date(h.created_at) >= limite && (filtroEvento === "todos" || h.event === filtroEvento),
    );
  }, [historico, filtroEvento, periodo]);

  const stats = useMemo(() => {
    const hoje = inicioDoDia();
    const doDia = historico.filter((h) => new Date(h.created_at) >= hoje);
    const sucessos = doDia.filter((h) => h.event === "login_success");
    const falhas = doDia.filter((h) => h.event === "login_failed");
    const ultimaFalha = historico.find((h) => h.event === "login_failed") ?? null;
    return {
      logins: sucessos.length,
      falhas: falhas.length,
      unicos: new Set(sucessos.map((h) => h.user_id ?? h.email)).size,
      ultimaFalha,
    };
  }, [historico]);

  const Toggle = ({ label, desc, checked, onToggle }: { label: string; desc: string; checked: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--sgt-divider)] last:border-0">
      <div>
        <p className="text-sm font-medium sgt-text">{label}</p>
        <p className="text-[11px] text-[var(--sgt-text-muted)]">{desc}</p>
      </div>
      <button onClick={onToggle} className="shrink-0 transition-colors duration-200">
        {checked
          ? <ToggleRight className="h-7 w-7 text-cyan-400" />
          : <ToggleLeft className="h-7 w-7 text-[var(--sgt-text-faint)]" />}
      </button>
    </div>
  );

  const statCards = [
    { label: "Logins hoje", value: stats.logins, color: "text-emerald-400", icon: ShieldCheck },
    { label: "Tentativas falhadas hoje", value: stats.falhas, color: stats.falhas > 0 ? "text-rose-400" : "sgt-text", icon: ShieldAlert },
    { label: "Usuários únicos hoje", value: stats.unicos, color: "text-cyan-400", icon: Users },
  ];

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
          toast.ok
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            : "border-rose-500/20 bg-rose-500/10 text-rose-400"
        }`}>
          {toast.ok ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {toast.msg}
        </div>
      )}

      {/* ── Sessão e Políticas ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Sessão e Políticas</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Sessão atual */}
        <AnimatedCard delay={0} className="rounded-[20px] overflow-hidden border border-cyan-500/15">
          <div
            className="p-5 sm:p-6 space-y-4 h-full"
            style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.10) 0%, rgba(59,130,246,0.04) 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/20">
                <Monitor className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-bold sgt-text">Sessão Atual</p>
                <p className="text-[11px] text-[var(--sgt-text-muted)]">Informações da sessão ativa</p>
              </div>
            </div>
            <div className="rounded-[14px] border border-cyan-500/20 bg-cyan-500/5 px-4 py-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium sgt-text">{user?.email ?? "—"}</span>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">Ativa</span>
              </div>
              <p className="text-xs text-[var(--sgt-text-muted)]">ID: <span className="font-mono">{user?.id?.substring(0, 16)}…</span></p>
              {currentSession?.expires_at && (
                <p className="text-xs text-[var(--sgt-text-muted)]">
                  Expira em: {new Date(currentSession.expires_at * 1000).toLocaleString("pt-BR")}
                </p>
              )}
              <button onClick={signOut}
                className="mt-1 flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all">
                <Lock className="h-3 w-3" /> Encerrar sessão
              </button>
            </div>
          </div>
        </AnimatedCard>

        {/* Política de senhas */}
        <AnimatedCard delay={80} className="rounded-[20px] overflow-hidden border border-violet-500/15">
          <div
            className="p-5 sm:p-6 space-y-3 h-full"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(99,102,241,0.04) 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20">
                <Lock className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-bold sgt-text">Política de Senha</p>
                <p className="text-[11px] text-[var(--sgt-text-muted)]">Última atualização: {formatDate(policyUpdatedAt)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-3">
                <p className="text-[11px] text-[var(--sgt-text-muted)] mb-1.5">Tamanho mínimo</p>
                <input
                  type="number" min={4} max={64} value={policy.min_length}
                  onChange={(e) => setPolicy((p) => ({ ...p, min_length: Math.max(1, +e.target.value || 0) }))}
                  className="w-full bg-transparent text-sm font-bold sgt-text tabular-nums focus:outline-none"
                />
              </div>
              <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-3">
                <p className="text-[11px] text-[var(--sgt-text-muted)] mb-1.5">Tamanho máximo</p>
                <input
                  type="number" min={4} max={128} value={policy.max_length}
                  onChange={(e) => setPolicy((p) => ({ ...p, max_length: Math.max(1, +e.target.value || 0) }))}
                  className="w-full bg-transparent text-sm font-bold sgt-text tabular-nums focus:outline-none"
                />
              </div>
            </div>

            <Toggle label="Exigir letra" desc="Ao menos uma letra na senha"
              checked={policy.require_letter} onToggle={() => setPolicy((p) => ({ ...p, require_letter: !p.require_letter }))} />
            <Toggle label="Exigir número" desc="Ao menos um número na senha"
              checked={policy.require_number} onToggle={() => setPolicy((p) => ({ ...p, require_number: !p.require_number }))} />

            <button onClick={salvarPolitica} disabled={savingPolicy}
              className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-300 hover:bg-violet-500/25 transition-all disabled:opacity-50">
              {savingPolicy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Salvar política
            </button>
          </div>
        </AnimatedCard>
      </div>

      {/* ── Estatísticas ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Estatísticas de Segurança</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s, i) => (
          <AnimatedCard key={s.label} delay={i * 60} className="rounded-[20px] overflow-hidden border border-[var(--sgt-border-subtle)]">
            <div className="p-5 h-full bg-[var(--sgt-input-bg)]">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <p className="text-[11px] text-[var(--sgt-text-muted)]">{s.label}</p>
              </div>
              <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          </AnimatedCard>
        ))}
        <AnimatedCard delay={180} className="rounded-[20px] overflow-hidden border border-[var(--sgt-border-subtle)]">
          <div className="p-5 h-full bg-[var(--sgt-input-bg)]">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <p className="text-[11px] text-[var(--sgt-text-muted)]">Último login falhado</p>
            </div>
            {stats.ultimaFalha ? (
              <>
                <p className="text-sm font-semibold sgt-text truncate">{stats.ultimaFalha.email}</p>
                <p className="text-[11px] text-[var(--sgt-text-muted)]">{formatDate(stats.ultimaFalha.created_at)}</p>
              </>
            ) : (
              <p className="text-sm sgt-text-2">Nenhuma falha registrada</p>
            )}
          </div>
        </AnimatedCard>
      </div>

      {/* ── Histórico ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Histórico de Sessões</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <AnimatedCard delay={240} className="rounded-[20px] overflow-hidden border border-amber-500/15">
        <div
          className="p-5 sm:p-6"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(234,88,12,0.03) 100%)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/20">
                <History className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold sgt-text">Últimos acessos</p>
                <p className="text-[11px] text-[var(--sgt-text-muted)]">{filtrados.length} registro(s) no período</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filtroEvento}
                onChange={(e) => setFiltroEvento(e.target.value as "todos" | LoginEvent)}
                className="rounded-xl border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] px-3 py-1.5 text-xs sgt-text focus:outline-none"
              >
                <option value="todos">Todos os eventos</option>
                {(Object.keys(LOGIN_EVENT_LABEL) as LoginEvent[]).map((e) => (
                  <option key={e} value={e}>{LOGIN_EVENT_LABEL[e]}</option>
                ))}
              </select>
              <div className="flex rounded-xl border border-[var(--sgt-border-subtle)] overflow-hidden">
                {PERIODOS.map((p) => (
                  <button key={p.key} onClick={() => setPeriodo(p.key)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                      periodo === p.key ? "bg-amber-500/20 text-amber-300" : "bg-[var(--sgt-input-bg)] text-[var(--sgt-text-muted)]"
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <button onClick={carregarHistorico} disabled={loadingHist}
                className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-all disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${loadingHist ? "animate-spin" : ""}`} /> Atualizar
              </button>
            </div>
          </div>

          {loadingHist ? (
            <div className="flex items-center justify-center py-10 text-[var(--sgt-text-muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--sgt-text-muted)]">Nenhum registro no período selecionado.</p>
          ) : (
            <div className="space-y-2.5">
              {filtrados.map((h) => {
                const ui = EVENT_UI[h.event] ?? EVENT_UI.logout;
                const Icon = ui.icon;
                return (
                  <div key={h.id} className="flex items-center justify-between gap-4 rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-3.5 transition-all hover:bg-[var(--sgt-row-hover)]">
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 ${ui.badge.split(" ")[1]}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium sgt-text truncate">{h.email}</p>
                        <p className="text-[11px] text-[var(--sgt-text-muted)] truncate">
                          {formatDate(h.created_at)} · {resumirUserAgent(h.user_agent)}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ui.badge}`}>
                      {LOGIN_EVENT_LABEL[h.event] ?? h.event}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AnimatedCard>
    </div>
  );
}
