import { useState } from "react";
import { Settings, CheckCircle, Zap, Link2, RefreshCw } from "lucide-react";

const integrations = [
  { name: "Power BI Embedded", desc: "Azure Service Principal ativo", status: "Conectado", color: "emerald" },
  { name: "SQL Server (DW SGT)", desc: "Cloudflare Tunnel → porta 3001", status: "Online", color: "emerald" },
  { name: "Supabase", desc: "Banco de dados principal + Auth", status: "Ativo", color: "emerald" },
  { name: "TOTVS Protheus", desc: "ERP — sincronização diária", status: "Parcial", color: "amber" },
  { name: "Vercel Deploy", desc: "CI/CD automático via GitHub", status: "Ativo", color: "emerald" },
];

const statusColors: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  amber:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function Configuracoes() {
  const [tunnelUrl, setTunnelUrl] = useState("https://burn-screenshot-however-scientist.trycloudflare.com");
  const [saved, setSaved] = useState(false);
  const [features, setFeatures] = useState({
    twofa: true, audit: true, email: true, maintenance: false, api: true, cache: true,
  });

  const toggle = (k: keyof typeof features) =>
    setFeatures((p) => ({ ...p, [k]: !p[k] }));

  const save = () => {
    sessionStorage.setItem("admin_tunnel_url", tunnelUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const featureList = [
    { key: "twofa" as const,        name: "Autenticação 2FA",         desc: "Exigir segundo fator para todos os usuários" },
    { key: "audit" as const,        name: "Logs de auditoria",         desc: "Registrar todas as ações dos usuários" },
    { key: "email" as const,        name: "Notificações por e-mail",   desc: "Alertas automáticos do sistema" },
    { key: "maintenance" as const,  name: "Modo manutenção",           desc: "Bloquear acesso de usuários comuns" },
    { key: "api" as const,          name: "Acesso via API",            desc: "Habilitar endpoints REST externos" },
    { key: "cache" as const,        name: "Cache de relatórios",       desc: "Cachear relatórios por 30 min" },
  ];

  return (
    <div className="space-y-5">
      {saved && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle className="h-4 w-4" /> Configurações salvas com sucesso!
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">

        {/* Tunnel URL */}
        <div className="rounded-[20px] border border-[var(--sgt-border-subtle)] sgt-bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-cyan-400" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] sgt-text-2">Tunnel URL — DW Local</p>
          </div>
          <p className="text-xs text-[var(--sgt-text-muted)]">URL do Cloudflare Tunnel que conecta o portal ao servidor Node.js local. Atualizar quando reiniciar o tunnel.</p>
          <input
            value={tunnelUrl}
            onChange={(e) => setTunnelUrl(e.target.value)}
            className="w-full rounded-xl border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] px-3 py-2 text-sm sgt-text font-mono placeholder:text-[var(--sgt-text-faint)] focus:outline-none focus:border-cyan-500/50"
            placeholder="https://xxxx.trycloudflare.com"
          />
          <div className="flex gap-2">
            <button onClick={save}
              className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all">
              <CheckCircle className="h-3.5 w-3.5" /> Salvar URL
            </button>
            <button onClick={() => window.open(tunnelUrl + "/health", "_blank")}
              className="flex items-center gap-2 rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-2 text-sm sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all">
              <RefreshCw className="h-3.5 w-3.5" /> Testar
            </button>
          </div>
        </div>

        {/* Feature flags */}
        <div className="rounded-[20px] border border-[var(--sgt-border-subtle)] sgt-bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="h-4 w-4 text-violet-400" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] sgt-text-2">Feature Flags</p>
          </div>
          {featureList.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-4 py-2 border-b border-[var(--sgt-divider)] last:border-0">
              <div>
                <p className="text-sm font-medium sgt-text">{f.name}</p>
                <p className="text-xs text-[var(--sgt-text-muted)]">{f.desc}</p>
              </div>
              <button
                onClick={() => toggle(f.key)}
                className={`relative h-5 w-9 rounded-full transition-colors duration-200 shrink-0 ${
                  features[f.key] ? "bg-cyan-500" : "bg-[var(--sgt-progress-track)]"
                }`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                  features[f.key] ? "translate-x-4" : "translate-x-0.5"
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Integrações */}
      <div className="rounded-[20px] border border-[var(--sgt-border-subtle)] sgt-bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-amber-400" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] sgt-text-2">Status das Integrações</p>
        </div>
        <div className="space-y-3">
          {integrations.map((int) => (
            <div key={int.name} className="flex items-center justify-between gap-4 rounded-[12px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-3">
              <div>
                <p className="text-sm font-medium sgt-text">{int.name}</p>
                <p className="text-xs text-[var(--sgt-text-muted)]">{int.desc}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusColors[int.color]}`}>
                {int.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}