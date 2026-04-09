import { useState, useEffect } from "react";
import { Activity, Bell, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LogEntry {
  time: string;
  user: string;
  action: "LOGIN" | "CRUD" | "EXPORT" | "CONFIG";
  module: string;
  ip: string;
  status: "OK" | "ERRO";
}

const LOGS: LogEntry[] = [
  { time: "09:41:22", user: "pedro@sgtlog.com.br", action: "LOGIN", module: "Dashboard", ip: "192.168.1.12", status: "OK" },
  { time: "09:38:10", user: "ana@sgtlog.com.br", action: "EXPORT", module: "Faturamento", ip: "192.168.1.25", status: "OK" },
  { time: "09:22:05", user: "carlos@sgtlog.com.br", action: "CRUD", module: "Usuários", ip: "192.168.1.8", status: "OK" },
  { time: "08:55:40", user: "desconhecido", action: "LOGIN", module: "Auth", ip: "189.45.67.89", status: "ERRO" },
  { time: "08:30:15", user: "julia@sgtlog.com.br", action: "CONFIG", module: "Configurações", ip: "192.168.1.31", status: "OK" },
  { time: "07:15:00", user: "sistema", action: "CRUD", module: "Backup", ip: "127.0.0.1", status: "OK" },
];

const actionStyle: Record<string, string> = {
  LOGIN: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  EXPORT: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  CONFIG: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  CRUD: "bg-white/5 text-white/40 border border-white/10",
};

function ResourceBar({ label, baseVal, color }: { label: string; baseVal: number; color: string }) {
  const [val, setVal] = useState(baseVal);
  useEffect(() => {
    const t = setInterval(() => setVal(Math.max(5, Math.min(95, baseVal + Math.floor((Math.random() - 0.5) * 14)))), 5000);
    return () => clearInterval(t);
  }, [baseVal]);
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-xs font-semibold text-white">{val}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Monitoramento() {
  const [filterAction, setFilterAction] = useState("all");
  const [eventCount, setEventCount] = useState(847);

  useEffect(() => {
    const t = setInterval(() => setEventCount((n) => n + (Math.random() > 0.6 ? 1 : 0)), 4000);
    return () => clearInterval(t);
  }, []);

  const filteredLogs = filterAction === "all" ? LOGS : LOGS.filter((l) => l.action === filterAction);

  const alerts = [
    { color: "#ef4444", title: "Falha na sincronização TOTVS", desc: "Timeout na conexão TCP após 30s", time: "09:14" },
    { color: "#f59e0b", title: "Alta latência no DW", desc: "Query acima de 5s detectada", time: "08:52" },
    { color: "#ef4444", title: "Tentativas de acesso inválidas", desc: "5 tentativas falhas — IP 189.x.x.x", time: "07:31" },
    { color: "#3b82f6", title: "Backup concluído", desc: "Snapshot diário executado com sucesso", time: "03:00" },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Uptime", value: "99.8%", sub: "últimos 30 dias", color: "text-emerald-400" },
          { label: "Eventos hoje", value: String(eventCount), sub: "+12% vs ontem" },
          { label: "Erros 24h", value: "3", sub: "críticos", color: "text-red-400" },
          { label: "Resp. médio", value: "142ms", sub: "tempo de resposta API" },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-semibold ${s.color || "text-white"}`}>{s.value}</p>
            <p className="text-[11px] text-white/30 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Resources */}
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" /> Uso de Recursos
            </h3>
            <span className="text-[10px] text-white/30">ao vivo</span>
          </div>
          <ResourceBar label="CPU" baseVal={34} color="#3b82f6" />
          <ResourceBar label="Memória RAM" baseVal={61} color="#8b5cf6" />
          <ResourceBar label="Disco" baseVal={45} color="#14b8a6" />
          <ResourceBar label="Rede (out)" baseVal={18} color="#f59e0b" />
        </div>

        {/* Alerts */}
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-400" /> Alertas Ativos
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              3 críticos
            </span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: a.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{a.title}</p>
                  <p className="text-[11px] text-white/35 mt-0.5">{a.desc}</p>
                </div>
                <span className="text-[10px] text-white/30 font-mono flex-shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit log */}
      <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-white/50" /> Log de Auditoria
          </h3>
          <div className="flex gap-2">
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="h-8 text-xs w-[140px] bg-white/[0.04] border-white/[0.08] text-white/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2236] border-white/10 text-white">
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="LOGIN">LOGIN</SelectItem>
                <SelectItem value="CRUD">CRUD</SelectItem>
                <SelectItem value="EXPORT">EXPORT</SelectItem>
                <SelectItem value="CONFIG">CONFIG</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="text-xs border-white/10 text-white/50 hover:bg-white/5 hover:text-white h-8 gap-1">
              <Download className="w-3 h-3" /> CSV
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Horário", "Usuário", "Ação", "Módulo", "IP", "Status"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-white/30 uppercase tracking-wider pb-2 px-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, i) => (
                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-2 text-[11px] font-mono text-white/40">{log.time}</td>
                  <td className="py-2.5 px-2 text-xs text-white">{log.user}</td>
                  <td className="py-2.5 px-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${actionStyle[log.action]}`}>{log.action}</span>
                  </td>
                  <td className="py-2.5 px-2 text-xs text-white/50">{log.module}</td>
                  <td className="py-2.5 px-2 text-[11px] font-mono text-white/35">{log.ip}</td>
                  <td className="py-2.5 px-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${log.status === "OK" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
