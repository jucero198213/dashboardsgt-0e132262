import { useState } from "react";
import { Settings, CheckCircle, Zap, Link2, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { AnimatedCard } from "@/components/shared/AnimatedCard";

const integrations = [
  { name: "Power BI Embedded", desc: "Azure Service Principal ativo", status: "Conectado", color: "emerald" },
  { name: "SQL Server (DW SGT)", desc: "Cloudflare Tunnel → porta 3001", status: "Online", color: "emerald" },
  { name: "Supabase", desc: "Banco de dados principal + Auth", status: "Ativo", color: "emerald" },
  { name: "TOTVS Protheus", desc: "ERP — sincronização diária", status: "Parcial", color: "amber" },
  { name: "Vercel Deploy", desc: "CI/CD automático via GitHub", status: "Ativo", color: "emerald" },
];

const statusColors: Record<string, { badge: string; dot: string }> = {
  emerald: { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  amber:   { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
};

export default function Configuracoes() {
  const [tunnelUrl, setTunnelUrl] = useState("https://firefox-fixed-iii-targets.trycloudflare.com");
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

      {/* ── Configurações Gerais ── */}
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
                <p className="text-[11px] text-[var(--sgt-text-muted)]">Cloudflare Tunnel → Node.js</p>
              </div>
            </div>
            <p className="text-xs text-[var(--sgt-text-secondary)] leading-relaxed">URL do Cloudflare Tunnel que conecta o portal ao servidor Node.js local. Atualizar quando reiniciar o tunnel.</p>
            <input
              value={tunnelUrl}
              onChange={(e) => setTunnelUrl(e.target.value)}
              className="w-full rounded-xl border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] px-3 py-2.5 text-sm sgt-text font-mono placeholder:text-[var(--sgt-text-faint)] focus:outline-none focus:border-cyan-500/50"
              placeholder="https://xxxx.trycloudflare.com"
            />
            <div className="flex gap-2">
              <button onClick={save}
                className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-all">
                <CheckCircle className="h-3.5 w-3.5" /> Salvar URL
              </button>
              <button onClick={() => window.open(tunnelUrl + "/health", "_blank")}
                className="flex items-center gap-2 rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-2 text-sm sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all">
                <RefreshCw className="h-3.5 w-3.5" /> Testar
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
                <p className="text-sm font-bold sgt-text">Feature Flags</p>
                <p className="text-[11px] text-[var(--sgt-text-muted)]">{Object.values(features).filter(Boolean).length}/{featureList.length} ativas</p>
              </div>
            </div>
            {featureList.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--sgt-divider)] last:border-0">
                <div>
                  <p className="text-sm font-medium sgt-text">{f.name}</p>
                  <p className="text-[11px] text-[var(--sgt-text-muted)]">{f.desc}</p>
                </div>
                <button
                  onClick={() => toggle(f.key)}
                  className="shrink-0 transition-colors duration-200"
                >
                  {features[f.key]
                    ? <ToggleRight className="h-7 w-7 text-cyan-400" />
                    : <ToggleLeft className="h-7 w-7 text-[var(--sgt-text-faint)]" />
                  }
                </button>
              </div>
            ))}
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
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/20">
              <Zap className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold sgt-text">Status das Integrações</p>
              <p className="text-[11px] text-[var(--sgt-text-muted)]">{integrations.filter(i => i.color === "emerald").length}/{integrations.length} online</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {integrations.map((int) => (
              <div key={int.name} className="flex items-center justify-between gap-4 rounded-[14px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-3.5 transition-all hover:bg-[var(--sgt-row-hover)]">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${statusColors[int.color].dot}`} />
                  <div>
                    <p className="text-sm font-medium sgt-text">{int.name}</p>
                    <p className="text-[11px] text-[var(--sgt-text-muted)]">{int.desc}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusColors[int.color].badge}`}>
                  {int.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
}
