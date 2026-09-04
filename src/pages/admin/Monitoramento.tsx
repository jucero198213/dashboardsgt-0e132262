import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Activity, RefreshCw, LogIn, LogOut, Ticket, PencilLine, Trash2,
  UserPlus, UserX, Shield, KeyRound, Settings, CheckCircle2, Users, Inbox,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { ACTION_LABEL, tempoRelativo, type ActivityLog } from "@/lib/activityLogApi";

const ACTION_ICON: Record<string, { icon: React.ElementType; color: string; badge: string }> = {
  login:              { icon: LogIn,        color: "text-blue-400",    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  logout:             { icon: LogOut,       color: "text-slate-400",   badge: "bg-slate-500/10 sgt-text-2 border-[var(--sgt-border-subtle)]" },
  ticket_created:     { icon: Ticket,       color: "text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  ticket_updated:     { icon: PencilLine,   color: "text-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  ticket_deleted:     { icon: Trash2,       color: "text-red-400",     badge: "bg-red-500/10 text-red-400 border-red-500/20" },
  user_created:       { icon: UserPlus,     color: "text-teal-400",    badge: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  user_deleted:       { icon: UserX,        color: "text-red-400",     badge: "bg-red-500/10 text-red-400 border-red-500/20" },
  role_changed:       { icon: Shield,       color: "text-violet-400",  badge: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  permission_changed: { icon: KeyRound,     color: "text-violet-400",  badge: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  settings_changed:   { icon: Settings,     color: "text-cyan-400",    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
};

const fallbackMeta = { icon: Activity, color: "sgt-text-2", badge: "bg-[var(--sgt-input-bg)] sgt-text-2 border-[var(--sgt-border-subtle)]" };

type Periodo = "hoje" | "7d" | "30d";

const PERIODO_LABEL: Record<Periodo, string> = { hoje: "Hoje", "7d": "7 dias", "30d": "30 dias" };

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function periodoStart(p: Periodo): string {
  if (p === "hoje") return startOfToday();
  const d = new Date();
  d.setDate(d.getDate() - (p === "7d" ? 7 : 30));
  return d.toISOString();
}

export default function Monitoramento() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filterAction, setFilterAction] = useState("all");
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ acoes: 0, usuarios: 0, abertos: 0, concluidos: 0 });

  const loadStats = useCallback(async () => {
    const hoje = startOfToday();
    const [acoesRes, distinctRes, abertosRes, concluidosRes] = await Promise.all([
      supabase.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", hoje),
      supabase.from("activity_logs").select("user_id").gte("created_at", hoje),
      supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "aberto"),
      supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "concluido").gte("updated_at", hoje),
    ]);
    const uniques = new Set((distinctRes.data ?? []).map((r) => (r as { user_id: string }).user_id));
    setStats({
      acoes: acoesRes.count ?? 0,
      usuarios: uniques.size,
      abertos: abertosRes.count ?? 0,
      concluidos: concluidosRes.count ?? 0,
    });
  }, []);

  const loadLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .gte("created_at", periodoStart(periodo))
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) { console.error("Erro ao carregar logs:", error); setLoading(false); return; }
    const rows = (data ?? []) as unknown as ActivityLog[];
    setLogs(rows);

    const ids = [...new Set(rows.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p) => { map[p.id] = p.display_name; });
      setNames(map);
    }
    setLoading(false);
  }, [periodo]);

  useEffect(() => {
    setLoading(true);
    loadLogs();
    loadStats();
  }, [loadLogs, loadStats]);

  useEffect(() => {
    const t = setInterval(() => { loadLogs(); loadStats(); }, 30000);
    return () => clearInterval(t);
  }, [loadLogs, loadStats]);

  const acoesDisponiveis = useMemo(
    () => [...new Set(logs.map((l) => l.action))].sort(),
    [logs],
  );

  const filtered = filterAction === "all" ? logs : logs.filter((l) => l.action === filterAction);

  const cards = [
    { label: "Ações hoje", value: stats.acoes, icon: Activity, color: "text-cyan-400", gradient: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(59,130,246,0.04))", border: "border-cyan-500/20" },
    { label: "Usuários ativos", value: stats.usuarios, icon: Users, color: "text-emerald-400", gradient: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.04))", border: "border-emerald-500/20" },
    { label: "Chamados abertos", value: stats.abertos, icon: Inbox, color: "text-amber-400", gradient: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,88,12,0.04))", border: "border-amber-500/20" },
    { label: "Concluídos hoje", value: stats.concluidos, icon: CheckCircle2, color: "text-violet-400", gradient: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.04))", border: "border-violet-500/20" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Indicadores ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Indicadores</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <div className="grid gap-2.5 sm:gap-3 grid-cols-2 md:grid-cols-4">
        {cards.map((s, i) => (
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
            {(["hoje", "7d", "30d"] as Periodo[]).map((p) => (
              <button key={p} onClick={() => setPeriodo(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  periodo === p ? "bg-amber-500/15 text-amber-300 border border-amber-500/25" : "text-[var(--sgt-text-muted)] hover:text-[var(--sgt-text-secondary)] hover:bg-[var(--sgt-input-bg)]"
                }`}>
                {PERIODO_LABEL[p]}
              </button>
            ))}
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-1.5 text-xs sgt-text-2 outline-none"
            >
              <option value="all">Todas as ações</option>
              {acoesDisponiveis.map((a) => (
                <option key={a} value={a}>{ACTION_LABEL[a] ?? a}</option>
              ))}
            </select>
            <button
              onClick={() => { loadLogs(); loadStats(); }}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-1.5 text-xs sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all"
            >
              <RefreshCw className="h-3 w-3" /> Atualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-[12px] text-[var(--sgt-text-muted)]">Carregando registros...</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-[12px] text-[var(--sgt-text-muted)]">Nenhuma atividade registrada no período.</div>
        ) : (
          <div className="divide-y divide-[var(--sgt-divider)]">
            {filtered.map((l) => {
              const meta = ACTION_ICON[l.action] ?? fallbackMeta;
              const Icon = meta.icon;
              return (
                <div key={l.id} className="flex items-start gap-3 px-5 py-3 hover:bg-[var(--sgt-row-hover)] transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] shrink-0">
                    <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12px] font-semibold sgt-text truncate">
                        {names[l.user_id] ?? "Usuário"}
                      </p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                        {ACTION_LABEL[l.action] ?? l.action}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--sgt-text-muted)] truncate">{l.description ?? "—"}</p>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--sgt-text-muted)] shrink-0 pt-1">
                    {tempoRelativo(l.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </AnimatedCard>
    </div>
  );
}
