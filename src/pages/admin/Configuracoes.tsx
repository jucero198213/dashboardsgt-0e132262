import { useCallback, useEffect, useState } from "react";
import {
  Settings, CheckCircle, Zap, Link2, RefreshCw, ToggleLeft, ToggleRight, Loader2, AlertCircle,
} from "lucide-react";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { getSettingsMeta, setSetting } from "@/lib/settingsApi";
import { supabase } from "@/integrations/supabase/client";

type FeatureFlags = Record<string, boolean>;

const FEATURE_LIST: { key: string; name: string; desc: string; locked?: boolean }[] = [
  { key: "sofia_ai", name: "Sofia AI", desc: "Assistente inteligente integrada ao portal" },
  { key: "fiscal_nfe", name: "Conferência Fiscal NFe", desc: "Validação e alertas de notas fiscais" },
  { key: "whatsapp_alerts", name: "Alertas WhatsApp", desc: "Envio automático de alertas via WhatsApp" },
  { key: "automacao_mb", name: "Automação MB", desc: "Baixa automática de títulos (Martin Brower)" },
  { key: "chamados", name: "Sistema de Chamados", desc: "Sempre ativo — módulo essencial", locked: true },
];

type Health = "online" | "offline" | "unknown" | "checking";

const HEALTH_UI: Record<Health, { label: string; badge: string; dot: string }> = {
  online:   { label: "Online",          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  offline:  { label: "Offline",         badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",          dot: "bg-rose-400" },
  unknown:  { label: "Não configurado", badge: "bg-slate-500/10 text-slate-400 border-slate-500/20",       dot: "bg-slate-400" },
  checking: { label: "Verificando...",  badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",       dot: "bg-amber-400" },
};

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function Configuracoes() {
  const [tunnelUrl, setTunnelUrl] = useState("");
  const [tunnelUpdatedAt, setTunnelUpdatedAt] = useState<string | null>(null);
  const [flags, setFlags] = useState<FeatureFlags>({});
  const [flagsUpdatedAt, setFlagsUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const [health, setHealth] = useState<Record<string, Health>>({
    supabase: "checking", resend: "checking", dw: "unknown",
  });
  const [checking, setChecking] = useState(false);

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await getSettingsMeta();
    const tunnel = rows.find((r) => r.key === "tunnel_url");
    const ff = rows.find((r) => r.key === "feature_flags");
    setTunnelUrl(typeof tunnel?.value === "string" ? tunnel.value : "");
    setTunnelUpdatedAt(tunnel?.updated_at ?? null);
    setFlags((ff?.value as FeatureFlags) ?? {});
    setFlagsUpdatedAt(ff?.updated_at ?? null);
    setLoading(false);
    return typeof tunnel?.value === "string" ? tunnel.value : "";
  }, []);

  const checkDw = useCallback(async (url: string): Promise<Health> => {
    if (!url.trim()) return "unknown";
    try {
      const res = await fetch(url.replace(/\/$/, "") + "/health", { method: "GET" });
      return res.ok ? "online" : "offline";
    } catch {
      return "offline";
    }
  }, []);

  const runHealthChecks = useCallback(async (url: string) => {
    setChecking(true);
    setHealth({ supabase: "checking", resend: "checking", dw: url.trim() ? "checking" : "unknown" });

    const supaP = (async (): Promise<Health> => {
      const { error } = await supabase.from("app_settings").select("key").limit(1);
      return error ? "offline" : "online";
    })();

    const resendP = (async (): Promise<Health> => {
      try {
        const base = import.meta.env.VITE_SUPABASE_URL as string;
        const res = await fetch(`${base}/functions/v1/notify-ticket-email`, { method: "OPTIONS" });
        return res.ok || res.status === 401 ? "online" : "offline";
      } catch {
        return "offline";
      }
    })();

    const [supabaseStatus, resendStatus, dwStatus] = await Promise.all([supaP, resendP, checkDw(url)]);
    setHealth({ supabase: supabaseStatus, resend: resendStatus, dw: dwStatus });
    setChecking(false);
  }, [checkDw]);

  useEffect(() => {
    load().then((url) => runHealthChecks(url));
  }, [load, runHealthChecks]);

  const saveTunnel = async () => {
    setSaving(true);
    try {
      await setSetting("tunnel_url", tunnelUrl.trim());
      setTunnelUpdatedAt(new Date().toISOString());
      notify(true, "URL do túnel salva com sucesso!");
      setHealth((h) => ({ ...h, dw: await_placeholder() }));
      const st = await checkDw(tunnelUrl);
      setHealth((h) => ({ ...h, dw: st }));
    } catch {
      notify(false, "Não foi possível salvar a URL.");
    }
    setSaving(false);
  };

  const await_placeholder = (): Health => "checking";

  const testTunnel = async () => {
    if (!tunnelUrl.trim()) return notify(false, "Informe a URL do túnel primeiro.");
    setHealth((h) => ({ ...h, dw: "checking" }));
    const st = await checkDw(tunnelUrl);
    setHealth((h) => ({ ...h, dw: st }));
    notify(st === "online", st === "online" ? "Conexão OK (HTTP 200)." : "A URL não respondeu.");
  };

  const toggleFlag = async (key: string) => {
    const next = { ...flags, [key]: !flags[key] };
    setFlags(next);
    try {
      await setSetting("feature_flags", next);
      setFlagsUpdatedAt(new Date().toISOString());
    } catch {
      setFlags(flags);
      notify(false, "Não foi possível salvar o módulo.");
    }
  };

  const integrations = [
    { id: "supabase", name: "Banco de dados", desc: "Backend principal + autenticação" },
    { id: "resend", name: "E-mails (Resend)", desc: "Função de envio de e-mails de chamados" },
    { id: "dw", name: "DW API (Cloudflare Tunnel)", desc: tunnelUrl || "URL não configurada" },
  ];

  const activeCount = FEATURE_LIST.filter((f) => f.locked || flags[f.key]).length;
  const onlineCount = integrations.filter((i) => health[i.id] === "online").length;

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

      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Configurações Gerais</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Tunnel URL */}
        <AnimatedCard delay={0} className="rounded-[20px] overflow-hidden border border-[var(--sgt-border-subtle)]">
          <div
            className="p-5 sm:p-6 space-y-4 h-full"
            style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.10) 0%, rgba(59,130,246,0.04) 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/20">
                <Link2 className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-bold sgt-text">Tunnel URL — DW Local</p>
                <p className="text-[11px] text-[var(--sgt-text-muted)]">Última atualização: {formatDate(tunnelUpdatedAt)}</p>
              </div>
            </div>
            <p className="text-xs text-[var(--sgt-text-secondary)] leading-relaxed">
              URL do Cloudflare Tunnel que conecta o portal ao servidor Node.js local. Atualizar quando reiniciar o tunnel.
            </p>
            <input
              value={tunnelUrl}
              onChange={(e) => setTunnelUrl(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] px-3 py-2.5 text-sm sgt-text font-mono placeholder:text-[var(--sgt-text-faint)] focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
              placeholder="https://xxxx.trycloudflare.com"
            />
            <div className="flex gap-2">
              <button onClick={saveTunnel} disabled={saving || loading}
                className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-all disabled:opacity-50">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Salvar URL
              </button>
              <button onClick={testTunnel}
                className="flex items-center gap-2 rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-2 text-sm sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all">
                <RefreshCw className={`h-3.5 w-3.5 ${health.dw === "checking" ? "animate-spin" : ""}`} /> Testar conexão
              </button>
            </div>
          </div>
        </AnimatedCard>

        {/* Feature flags */}
        <AnimatedCard delay={80} className="rounded-[20px] overflow-hidden border border-[var(--sgt-border-subtle)]">
          <div
            className="p-5 sm:p-6 space-y-3 h-full"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(99,102,241,0.04) 100%)" }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20">
                <Settings className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-bold sgt-text">Módulos do Sistema</p>
                <p className="text-[11px] text-[var(--sgt-text-muted)]">
                  {activeCount}/{FEATURE_LIST.length} ativos · salvo em {formatDate(flagsUpdatedAt)}
                </p>
              </div>
            </div>
            {FEATURE_LIST.map((f) => {
              const on = f.locked ? true : !!flags[f.key];
              return (
                <div key={f.key} className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0">
                  <div>
                    <p className="text-sm font-medium sgt-text">{f.name}</p>
                    <p className="text-[11px] text-[var(--sgt-text-muted)]">{f.desc}</p>
                  </div>
                  <button
                    onClick={() => !f.locked && toggleFlag(f.key)}
                    disabled={f.locked || loading}
                    className="shrink-0 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {on
                      ? <ToggleRight className="h-7 w-7 text-cyan-400" />
                      : <ToggleLeft className="h-7 w-7 text-[var(--sgt-text-faint)]" />}
                  </button>
                </div>
              );
            })}
          </div>
        </AnimatedCard>
      </div>

      {/* ── Integrações ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Integrações</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <AnimatedCard delay={160} className="rounded-[20px] overflow-hidden border border-[var(--sgt-border-subtle)]">
        <div
          className="p-5 sm:p-6"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(234,88,12,0.03) 100%)" }}
        >
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/20">
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold sgt-text">Status das Integrações</p>
                <p className="text-[11px] text-[var(--sgt-text-muted)]">{onlineCount}/{integrations.length} online</p>
              </div>
            </div>
            <button onClick={() => runHealthChecks(tunnelUrl)} disabled={checking}
              className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/25 transition-all disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} /> Verificar todas
            </button>
          </div>
          <div className="space-y-2.5">
            {integrations.map((int) => {
              const ui = HEALTH_UI[health[int.id] ?? "unknown"];
              return (
                <div key={int.id} className="flex items-center justify-between gap-4 rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-3.5 transition-all hover:bg-[var(--sgt-row-hover)]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${ui.dot}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium sgt-text">{int.name}</p>
                      <p className="text-[11px] text-[var(--sgt-text-muted)] truncate">{int.desc}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ui.badge}`}>
                    {ui.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
}
