import { useState, useEffect } from "react";
import { Activity, Shield, RefreshCw, Download, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  LOGOUT: "bg-slate-500/10 text-slate-400 border-white/10",
  EXPORT: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  CONFIG: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  CRUD:   "bg-white/5 text-slate-400 border-white/10",
};

function ResourceBar({ label, base, color }: { label: string; base: number; color: string }) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const t = setInterval(() => setVal(Math.max(5, Math.min(95, base + Math.floor((Math.random() - 0.5) * 12)))), 4000);
    return () => clearInterval(t);
  }, [base]);
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-semibold text-white">{val}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Monitoramento() {
  const [filter, setFilter] = useState("all");
  const [logs, setLogs] = useState<LogEntry[]>(SAMPLE_LOGS);
  const [authSession, setAuthSession] = useState<any>(null);
  const [count, setCount] = useState(847);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthSession(data.session));
    const t = setInterval(() => setCount((c) => c + Math.floor(Math.random() * 3)), 8000);
    return () => clearInterval(t);
  }, []);

  // Injeta evento real da sessão Supabase
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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Eventos hoje",      value: String(count),  color: "text-cyan-400" },
          { label: "Erros (24h)",        value: "1",            color: "text-red-400" },
          { label: "Sessões ativas",     value: "3",            color: "text-emerald-400" },
          { label: "Tempo médio resp.", value: "124ms",        color: "text-violet-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-[16px] border border-white/8 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        {/* Logs */}
        <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Logs de Atividade</p>
            <div className="flex items-center gap-2">
              {["all","LOGIN","EXPORT","CRUD","CONFIG"].map((v) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                    filter === v ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20" : "text-slate-500 hover:text-slate-300"
                  }`}>
                  {v === "all" ? "Todos" : v}
                </button>
              ))}
              <button className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400 hover:text-white transition-all">
                <Download className="h-3 w-3" /> Exportar
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {["Hora", "Usuário", "Ação", "Módulo", "IP", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{l.time}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-300 max-w-[180px] truncate">{l.user}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${actionColor[l.action]}`}>{l.action}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-400">{l.module}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{l.ip}</td>
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
        </div>

        {/* Recursos */}
        <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)] p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Recursos do Servidor</p>
          <ResourceBar label="CPU"    base={42} color="linear-gradient(90deg,#06b6d4,#3b82f6)" />
          <ResourceBar label="Memória" base={61} color="linear-gradient(90deg,#8b5cf6,#6366f1)" />
          <ResourceBar label="Disco"   base={38} color="linear-gradient(90deg,#10b981,#06b6d4)" />
          <ResourceBar label="Rede"    base={22} color="linear-gradient(90deg,#f59e0b,#ef4444)" />
        </div>
      </div>
    </div>
  );
}
