import { useState, useEffect } from "react";
import { Activity, Shield, RefreshCw, Download, Circle, AlertTriangle, Clock, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { AnimatedCard } from "@/components/shared/AnimatedCard";

interface LogEntry {
  time: string;
  user: string;
  action: "LOGIN" | "LOGOUT" | "EXPORT" | "CONFIG" | "CRUD";
  module: string;
  ip: string;
  status: "OK" | "ERRO";
}

const SAMPLE_LOGS: LogEntry[] = [
  { time: "09:41:22", user: "pedro@sgtlog.com.br", action: "LOGIN",  module: "Dashboard",     ip: "192.168.1.12",  status: "OK"   },
  { time: "09:38:10", user: "ana@sgtlog.com.br",   action: "EXPORT", module: "Faturamento",   ip: "192.168.1.25",  status: "OK"   },
  { time: "09:22:05", user: "carlos@sgtlog.com.br", action: "CRUD", module: "Usuários",       ip: "192.168.1.8",   status: "OK"   },
  { time: "08:55:40", user: "desconhecido",          action: "LOGIN", module: "Auth",           ip: "189.45.67.89",  status: "ERRO" },
  { time: "08:30:15", user: "julia@sgtlog.com.br",  action: "CONFIG", module: "Configurações", ip: "192.168.1.31",  status: "OK"   },
  { time: "07:15:00", user: "sistema",               action: "CRUD",  module: "Backup",         ip: "127.0.0.1",     status: "OK"   },
];

const actionColor: Record<string, string> = {
  LOGIN:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  LOGOUT: "bg-slate-500/10 sgt-text-2 border-[var(--sgt-border-subtle)]",
  EXPORT: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  CONFIG: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  CRUD:   "bg-[var(--sgt-input-bg)] sgt-text-2 border-[var(--sgt-border-subtle)]",
};

function ResourceBar({ label, base, color }: { label: string; base: number; color: string }) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const t = setInterval(() => setVal(Math.max(5, Math.min(95, base + Math.floor((Math.random() - 0.5) * 12)))), 4000);
    return () => clearInterval(t);
  }, [base]);
  const isHigh = val > 75;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <span className="text-xs text-[var(--sgt-text-muted)]">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${isHigh ? "text-red-400" : "sgt-text"}`}>{val}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--sgt-progress-track)]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Monitoramento() {
  const [filter, setFilter] = useState("all");
  const [logs, setLogs] = useState<LogEntry[]>(SAMPLE_LOGS);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [count, setCount] = useState(847);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthSession(data.session));
    const t = setInterval(() => setCount((c) => c + Math.floor(Math.random() * 3)), 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (authSession?.user) {
      const realEntry: LogEntry = {
        time: new Date().toLocaleTimeString("pt-BR"),
        user: authSession.user.email ?? "—",
        action: "LOGIN",
        module: "Portal",
        ip: "—",
        status: "OK",
      };
      setLogs((prev) => [realEntry, ...prev].slice(0, 20));
    }
  }, [authSession]);

  const filtered = filter === "all" ? logs : logs.filter((l) => l.action === filter);

  const stats = [
    { label: "Eventos hoje", value: String(count), icon: Activity, color: "text-cyan-400", gradient: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(59,130,246,0.04))", border: "border-cyan-500/20" },
    { label: "Erros (24h)", value: "1", icon: AlertTriangle, color: "text-red-400", gradient: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(244,63,94,0.04))", border: "border-red-500/20" },
    { label: "Sessões ativas", value: "3", icon: Wifi, color: "text-emerald-400", gradient: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.04))", border: "border-emerald-500/20" },
    { label: "Tempo resp.", value: "124ms", icon: Clock, color: "text-violet-400", gradient: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.04))", border: "border-violet-500/20" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Indicadores ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Indicadores</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <div className="grid gap-2.5 sm:gap-3 grid-cols-2 md:grid-cols-4">
        {stats.map((s, i) => (
          <AnimatedCard key={s.label} delay={i * 60} className={`rounded-[16px] border ${s.border} overflow-hidden`}>
            <div className="px-4 py-3.5 flex items-center gap-3" style={{ background: s.gradient }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] shrink-0">
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--sgt-text-muted)]">{s.label}</p>
                <p className={`text-[16px] font-bold tabular-nums ${s.color}`}>{s.value}</p>
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* ── Atividade ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Atividade</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        {/* Logs */}
        <AnimatedCard delay={240} className="overflow-hidden rounded-[20px] border border-[var(--sgt-border-subtle)]">
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            style={{ background: "linear-gradient(180deg, rgba(6,182,212,0.05) 0%, transparent 100%)" }}
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] sgt-text-2">Logs de Atividade</p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {["all","LOGIN","EXPORT","CRUD","CONFIG"].map((v) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    filter === v ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25" : "text-[var(--sgt-text-muted)] hover:text-[var(--sgt-text-secondary)] hover:bg-[var(--sgt-input-bg)]"
                  }`}>
                  {v === "all" ? "Todos" : v}
                </button>
              ))}
              <button className="flex items-center gap-1.5 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-1.5 text-xs sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all">
                <Download className="h-3 w-3" /> Exportar
              </button>
            </div>
          </div>
          {/* Mobile cards (< md) */}
          <div className="md:hidden divide-y divide-[var(--sgt-divider)]">
            {filtered.map((l, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className="flex flex-col items-center shrink-0 pt-0.5 gap-1.5">
                  <Circle className={`h-2 w-2 fill-current ${l.status === "OK" ? "text-emerald-400" : "text-red-400"}`} />
                  <span className="font-mono text-[10px] text-[var(--sgt-text-muted)]">{l.time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold sgt-text truncate">{l.user}</p>
                  <p className="text-[11px] text-[var(--sgt-text-muted)] truncate">{l.module}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${actionColor[l.action]}`}>{l.action}</span>
              </div>
            ))}
          </div>

          {/* Desktop table (≥ md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--sgt-divider)]">
                  {["Hora", "Usuário", "Ação", "Módulo", "IP", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={i} className="border-b border-[var(--sgt-divider)] hover:bg-[var(--sgt-row-hover)] transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[11px] sgt-text-2">{l.time}</td>
                    <td className="px-4 py-2.5 text-sm sgt-text max-w-[180px] truncate">{l.user}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${actionColor[l.action]}`}>{l.action}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm sgt-text-2">{l.module}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--sgt-text-muted)]">{l.ip}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Circle className={`h-2 w-2 fill-current ${l.status === "OK" ? "text-emerald-400" : "text-red-400"}`} />
                        <span className={`text-[11px] font-semibold ${l.status === "OK" ? "text-emerald-400" : "text-red-400"}`}>{l.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedCard>

        {/* Recursos do Servidor */}
        <AnimatedCard delay={320} className="rounded-[20px] overflow-hidden border border-[var(--sgt-border-subtle)]">
          <div
            className="p-5 space-y-5 h-full"
            style={{ background: "linear-gradient(180deg, rgba(139,92,246,0.06) 0%, transparent 100%)" }}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-violet-400" />
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] sgt-text-2">Servidor</p>
            </div>
            <ResourceBar label="CPU"    base={42} color="linear-gradient(90deg,#06b6d4,#3b82f6)" />
            <ResourceBar label="Memória" base={61} color="linear-gradient(90deg,#8b5cf6,#6366f1)" />
            <ResourceBar label="Disco"   base={38} color="linear-gradient(90deg,#10b981,#06b6d4)" />
            <ResourceBar label="Rede"    base={22} color="linear-gradient(90deg,#f59e0b,#ef4444)" />
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}
