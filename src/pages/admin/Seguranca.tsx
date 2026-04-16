import { useState, useEffect } from "react";
import { Shield, Monitor, Smartphone, Globe, Plus, Trash2, CheckCircle, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Session } from "@supabase/supabase-js";

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
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0">
      <div>
        <p className="text-sm font-medium sgt-text">{label}</p>
        <p className="text-xs text-[var(--sgt-text-muted)]">{desc}</p>
      </div>
      <button onClick={onToggle} className={`relative h-5 w-9 rounded-full transition-colors duration-200 shrink-0 ${checked ? "bg-cyan-500" : "bg-[var(--sgt-progress-track)]"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
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

      <div className="grid gap-5 xl:grid-cols-2">

        {/* Sessão atual */}
        <div className="rounded-[20px] border border-[var(--sgt-border-subtle)] sgt-bg-card p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] sgt-text-2 flex items-center gap-2">
            <Monitor className="h-3.5 w-3.5 text-cyan-400" /> Sessão Atual
          </p>
          <div className="rounded-[12px] border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium sgt-text">{user?.email ?? "—"}</span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Sessão ativa</span>
            </div>
            <p className="text-xs text-[var(--sgt-text-muted)]">ID: <span className="font-mono">{user?.id?.substring(0, 16)}…</span></p>
            {currentSession?.expires_at && (
              <p className="text-xs text-[var(--sgt-text-muted)]">
                Expira em: {new Date(currentSession.expires_at * 1000).toLocaleString("pt-BR")}
              </p>
            )}
            <button onClick={signOut}
              className="mt-2 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all">
              <Lock className="h-3 w-3" /> Encerrar sessão
            </button>
          </div>
        </div>

        {/* Política de senhas */}
        <div className="rounded-[20px] border border-[var(--sgt-border-subtle)] sgt-bg-card p-5 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] sgt-text-2 flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-violet-400" /> Política de Senhas
          </p>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm sgt-text-2">Comprimento mínimo</span>
              <span className="text-sm font-bold sgt-text">{pwdLen} caracteres</span>
            </div>
            <input type="range" min={8} max={32} value={pwdLen} onChange={(e) => setPwdLen(+e.target.value)}
              className="w-full accent-cyan-500" />
          </div>
          <Toggle label="Letras maiúsculas"  desc="Exigir ao menos uma maiúscula"    checked={settings.uppercase} onToggle={() => toggle("uppercase")} />
          <Toggle label="Números"             desc="Exigir ao menos um número"        checked={settings.numbers}   onToggle={() => toggle("numbers")} />
          <Toggle label="Caracteres especiais" desc="Exigir !@#$ etc."               checked={settings.special}   onToggle={() => toggle("special")} />
        </div>

        {/* Autenticação */}
        <div className="rounded-[20px] border border-[var(--sgt-border-subtle)] sgt-bg-card p-5 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] sgt-text-2 flex items-center gap-2">
            <Smartphone className="h-3.5 w-3.5 text-emerald-400" /> Métodos de Autenticação
          </p>
          <Toggle label="2FA via SMS"      desc="Código por mensagem de texto"    checked={settings.sms2fa}    onToggle={() => toggle("sms2fa")} />
          <Toggle label="Azure SSO"        desc="Single Sign-On via Microsoft"   checked={settings.azureSSO}  onToggle={() => toggle("azureSSO")} />
          <Toggle label="Google OAuth"     desc="Login via conta Google"          checked={settings.google}    onToggle={() => toggle("google")} />
        </div>

        {/* IPs permitidos */}
        <div className="rounded-[20px] border border-[var(--sgt-border-subtle)] sgt-bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] sgt-text-2 flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-amber-400" /> IPs Permitidos
            </p>
            <button onClick={addIP}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2.5 py-1 text-xs sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all">
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>
          <div className="space-y-2">
            {ips.map((ip, i) => (
              <div key={i} className="flex items-center justify-between rounded-[10px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-2">
                <span className="font-mono text-sm sgt-text">{ip}</span>
                <button onClick={() => setIps((p) => p.filter((_, idx) => idx !== i))}
                  className="text-[var(--sgt-text-muted)] hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save}
          className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all">
          <CheckCircle className="h-4 w-4" /> Salvar todas as configurações
        </button>
      </div>
    </div>
  );
}