import { useState, useEffect } from "react";
import { Shield, Monitor, Smartphone, Globe, Plus, Trash2, CheckCircle, Lock, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Session } from "@supabase/supabase-js";
import { AnimatedCard } from "@/components/shared/AnimatedCard";

export default function Seguranca() {
  const { user, signOut } = useAuth();
  const [saved, setSaved] = useState(false);
  const [ips, setIps] = useState(["192.168.0.0/16", "10.0.0.0/8", "187.45.0.0/24"]);
  const [pwdLen, setPwdLen] = useState(12);
  const [settings, setSettings] = useState({ uppercase: true, numbers: true, special: true, sms2fa: false, azureSSO: true, google: false });
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentSession(data.session));
  }, []);

  const toggle = (k: keyof typeof settings) => setSettings((p) => ({ ...p, [k]: !p[k] }));

  const addIP = () => {
    const v = window.prompt("Insira o IP ou range CIDR:");
    if (v?.trim()) setIps((prev) => [...prev, v.trim()]);
  };

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const Toggle = ({ label, desc, checked, onToggle }: { label: string; desc: string; checked: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--sgt-divider)] last:border-0">
      <div>
        <p className="text-sm font-medium sgt-text">{label}</p>
        <p className="text-[11px] text-[var(--sgt-text-muted)]">{desc}</p>
      </div>
      <button onClick={onToggle} className="shrink-0 transition-colors duration-200">
        {checked
          ? <ToggleRight className="h-7 w-7 text-cyan-400" />
          : <ToggleLeft className="h-7 w-7 text-[var(--sgt-text-faint)]" />
        }
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {saved && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle className="h-4 w-4" /> Configurações salvas.
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
                <p className="text-sm font-bold sgt-text">Política de Senhas</p>
                <p className="text-[11px] text-[var(--sgt-text-muted)]">Requisitos mínimos</p>
              </div>
            </div>
            <div className="rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm sgt-text-2">Comprimento mínimo</span>
                <span className="text-sm font-bold sgt-text tabular-nums">{pwdLen} chars</span>
              </div>
              <input type="range" min={8} max={32} value={pwdLen} onChange={(e) => setPwdLen(+e.target.value)}
                className="w-full accent-violet-500" />
            </div>
            <Toggle label="Letras maiúsculas"  desc="Exigir ao menos uma maiúscula"    checked={settings.uppercase} onToggle={() => toggle("uppercase")} />
            <Toggle label="Números"             desc="Exigir ao menos um número"        checked={settings.numbers}   onToggle={() => toggle("numbers")} />
            <Toggle label="Caracteres especiais" desc="Exigir !@#$ etc."               checked={settings.special}   onToggle={() => toggle("special")} />
          </div>
        </AnimatedCard>
      </div>

      {/* ── Autenticação e Rede ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Autenticação e Rede</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Autenticação */}
        <AnimatedCard delay={160} className="rounded-[20px] overflow-hidden border border-emerald-500/15">
          <div
            className="p-5 sm:p-6 space-y-3 h-full"
            style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(6,182,212,0.04) 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                <Smartphone className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold sgt-text">Métodos de Autenticação</p>
                <p className="text-[11px] text-[var(--sgt-text-muted)]">{[settings.sms2fa, settings.azureSSO, settings.google].filter(Boolean).length}/3 habilitados</p>
              </div>
            </div>
            <Toggle label="2FA via SMS"      desc="Código por mensagem de texto"    checked={settings.sms2fa}    onToggle={() => toggle("sms2fa")} />
            <Toggle label="Azure SSO"        desc="Single Sign-On via Microsoft"   checked={settings.azureSSO}  onToggle={() => toggle("azureSSO")} />
            <Toggle label="Google OAuth"     desc="Login via conta Google"          checked={settings.google}    onToggle={() => toggle("google")} />
          </div>
        </AnimatedCard>

        {/* IPs permitidos */}
        <AnimatedCard delay={240} className="rounded-[20px] overflow-hidden border border-amber-500/15">
          <div
            className="p-5 sm:p-6 space-y-3 h-full"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(234,88,12,0.04) 100%)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/20">
                  <Globe className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold sgt-text">IPs Permitidos</p>
                  <p className="text-[11px] text-[var(--sgt-text-muted)]">{ips.length} ranges configurados</p>
                </div>
              </div>
              <button onClick={addIP}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all">
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {ips.map((ip, i) => (
                <div key={i} className="flex items-center justify-between rounded-[12px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-2.5">
                  <span className="font-mono text-sm sgt-text">{ip}</span>
                  <button onClick={() => setIps((p) => p.filter((_, idx) => idx !== i))}
                    className="text-[var(--sgt-text-muted)] hover:text-red-400 transition-colors p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </AnimatedCard>
      </div>

      <div className="flex justify-end">
        <button onClick={save}
          className="flex items-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/15 px-5 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-all">
          <CheckCircle className="h-4 w-4" /> Salvar todas as configurações
        </button>
      </div>
    </div>
  );
}
