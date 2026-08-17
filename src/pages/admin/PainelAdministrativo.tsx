import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, Settings, Database, Activity, Shield,
  ChevronRight, Lock, Server, Zap, ClipboardList, Terminal,
  Inbox, AlertTriangle, Ticket as TicketIcon, LogIn, CheckCircle2, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { HomeButton } from "@/components/shared/HomeButton";
import { BackgroundEffects } from "@/components/shared/BackgroundEffects";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { supabase } from "@/integrations/supabase/client";
import { ACTION_LABEL, tempoRelativo, type ActivityLog } from "@/lib/activityLogApi";
import { LOGIN_EVENT_LABEL, type LoginHistoryRow } from "@/lib/loginHistoryApi";
import { getSettingsMeta } from "@/lib/settingsApi";
import { fetchTickets, STATUS_LABEL, STATUS_COLOR, type Ticket } from "@/lib/ticketsApi";
import { fetchProfileById, type Profile } from "@/hooks/useProfiles";
import GestaoUsuarios from "./GestaoUsuarios";
import Configuracoes from "./Configuracoes";
import BancoDados from "./BancoDados";
import Monitoramento from "./Monitoramento";
import Seguranca from "./Seguranca";

type Screen = "home" | "usuarios" | "config" | "banco" | "monitor" | "seguranca" | "chamados";

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const FEATURE_LIST = [
  { key: "sofia_ai", name: "Sofia AI", locked: false },
  { key: "fiscal_nfe", name: "Conferência Fiscal NFe", locked: false },
  { key: "whatsapp_alerts", name: "Alertas WhatsApp", locked: false },
  { key: "automacao_mb", name: "Automação MB", locked: false },
  { key: "chamados", name: "Sistema de Chamados", locked: true },
];

interface DashboardData {
  totalUsers: number;
  openTickets: number;
  actionsToday: number;
  activeUsersToday: number;
  lastTickets: Ticket[];
  lastLogs: ActivityLog[];
  failedLogins: number;
  lastFailedLogin: LoginHistoryRow | null;
  activeModules: number;
  loading: boolean;
  updatedAt: Date | null;
}

const NAV_BASE: {
  id: Screen;
  label: string;
  desc: string;
  icon: React.ElementType;
  gradient: string;
  borderGlow: string;
  iconBg: string;
  route?: string;
}[] = [
  {
    id: "usuarios",
    label: "Gestão de Usuários",
    desc: "Gerencie usuários, permissões e roles do sistema",
    icon: Users,
    gradient: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.08) 100%)",
    borderGlow: "rgba(16,185,129,0.3)",
    iconBg: "bg-emerald-500/20",
  },
  {
    id: "config",
    label: "Configurações",
    desc: "Tunnel URL, integrações e parâmetros do sistema",
    icon: Settings,
    gradient: "linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(59,130,246,0.08) 100%)",
    borderGlow: "rgba(6,182,212,0.3)",
    iconBg: "bg-cyan-500/20",
  },
  {
    id: "banco",
    label: "Banco de Dados",
    desc: "Schema, tabelas e console SQL read-only",
    icon: Database,
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(99,102,241,0.08) 100%)",
    borderGlow: "rgba(139,92,246,0.3)",
    iconBg: "bg-violet-500/20",
  },
  {
    id: "monitor",
    label: "Monitoramento",
    desc: "Logs de atividade, auditoria e métricas em tempo real",
    icon: Activity,
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(239,68,68,0.06) 100%)",
    borderGlow: "rgba(245,158,11,0.3)",
    iconBg: "bg-amber-500/20",
  },
  {
    id: "seguranca",
    label: "Segurança",
    desc: "Sessões ativas, histórico de acessos e políticas de senha",
    icon: Shield,
    gradient: "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(244,63,94,0.08) 100%)",
    borderGlow: "rgba(239,68,68,0.3)",
    iconBg: "bg-red-500/20",
  },
  {
    id: "chamados",
    label: "Agenda de Chamados",
    desc: "Calendário, criação e acompanhamento",
    icon: ClipboardList,
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(234,88,12,0.08) 100%)",
    borderGlow: "rgba(245,158,11,0.3)",
    iconBg: "bg-amber-500/20",
    route: "/chamados",
  },
];

const ACTION_ICON: Record<string, { icon: React.ElementType; color: string; badge: string }> = {
  login: { icon: LogIn, color: "text-blue-400", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  logout: { icon: LogIn, color: "text-slate-400", badge: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  ticket_created: { icon: TicketIcon, color: "text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  ticket_updated: { icon: TicketIcon, color: "text-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  ticket_deleted: { icon: TicketIcon, color: "text-red-400", badge: "bg-red-500/10 text-red-400 border-red-500/20" },
  user_created: { icon: Users, color: "text-teal-400", badge: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  user_deleted: { icon: Users, color: "text-red-400", badge: "bg-red-500/10 text-red-400 border-red-500/20" },
  role_changed: { icon: Shield, color: "text-violet-400", badge: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  permission_changed: { icon: Shield, color: "text-violet-400", badge: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  settings_changed: { icon: Settings, color: "text-cyan-400", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
};

const fallbackMeta = { icon: Activity, color: "sgt-text-2", badge: "bg-[var(--sgt-input-bg)] sgt-text-2 border-[var(--sgt-border-subtle)]" };

function useAdminDashboard(): DashboardData & { refresh: () => Promise<void>; profiles: Record<string, Profile> } {
  const [data, setData] = useState<DashboardData>({
    totalUsers: 0,
    openTickets: 0,
    actionsToday: 0,
    activeUsersToday: 0,
    lastTickets: [],
    lastLogs: [],
    failedLogins: 0,
    lastFailedLogin: null,
    activeModules: 0,
    loading: true,
    updatedAt: null,
  });
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const load = useCallback(async () => {
    setData((d) => ({ ...d, loading: true }));
    const hoje = startOfToday();

    try {
      const [usersRes, openRes, actionsRes, actionsRowsRes, tickets, logs, failedRes, failedRowsRes, settingsRows] =
        await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .in("status", ["aberto", "em_andamento", "pendente"]),
          supabase.from("activity_logs").select("*", { count: "exact", head: true }).gte("created_at", hoje),
          supabase.from("activity_logs").select("user_id").gte("created_at", hoje),
          fetchTickets(),
          supabase
            .from("activity_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("login_history")
            .select("*", { count: "exact", head: true })
            .eq("event", "login_failed")
            .gte("created_at", hoje),
          supabase
            .from("login_history")
            .select("*")
            .eq("event", "login_failed")
            .gte("created_at", hoje)
            .order("created_at", { ascending: false })
            .limit(1),
          getSettingsMeta(),
        ]);

      const allTickets = tickets.slice(0, 5);
      const allLogs = ((logs.data ?? []) as ActivityLog[]).slice(0, 5);
      const distinctUserIds = new Set([
        ...allTickets.map((t) => t.aberto_por).filter(Boolean),
        ...allLogs.map((l) => l.user_id),
        ...((actionsRowsRes.data ?? []) as { user_id: string }[]).map((r) => r.user_id),
      ] as string[]);

      if (distinctUserIds.size) {
        const ids = [...distinctUserIds];
        const map: Record<string, Profile> = {};
        // fetchProfileById faz uma query; em lote usamos o supabase diretamente
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, departamento, telefone, avatar_url, created_at, updated_at")
          .in("id", ids);
        (profs ?? []).forEach((p) => {
          map[p.id] = p as Profile;
        });
        setProfiles(map);
      }

      const flags = (settingsRows.find((r) => r.key === "feature_flags")?.value as Record<string, boolean>) ?? {};
      const activeModules = FEATURE_LIST.filter((f) => f.locked || flags[f.key]).length;

      setData({
        totalUsers: usersRes.count ?? 0,
        openTickets: openRes.count ?? 0,
        actionsToday: actionsRes.count ?? 0,
        activeUsersToday: new Set((actionsRowsRes.data ?? []).map((r) => (r as { user_id: string }).user_id)).size,
        lastTickets: allTickets,
        lastLogs: allLogs,
        failedLogins: failedRes.count ?? 0,
        lastFailedLogin: ((failedRowsRes.data ?? [])[0] as LoginHistoryRow) ?? null,
        activeModules,
        loading: false,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error("Erro ao carregar dashboard administrativo:", err);
      setData((d) => ({ ...d, loading: false }));
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  return { ...data, refresh: load, profiles };
}

export default function PainelAdministrativo() {
  const [screen, setScreen] = useState<Screen>("home");
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { refresh, loading, profiles, ...data } = useAdminDashboard();

  const renderContent = () => {
    switch (screen) {
      case "usuarios":  return <GestaoUsuarios />;
      case "config":    return <Configuracoes />;
      case "banco":     return <BancoDados />;
      case "monitor":   return <Monitoramento />;
      case "seguranca": return <Seguranca />;
      default: return null;
    }
  };

  const currentItem = NAV_BASE.find((n) => n.id === screen);

  const heroStats = useMemo(
    () => [
      { label: "Usuários", value: data.totalUsers, color: "text-emerald-400", icon: Users, bg: "bg-emerald-500/10 border-emerald-500/20" },
      { label: "Chamados abertos", value: data.openTickets, color: "text-amber-400", icon: Inbox, bg: "bg-amber-500/10 border-amber-500/20" },
      { label: "Ações hoje", value: data.actionsToday, color: "text-cyan-400", icon: Activity, bg: "bg-cyan-500/10 border-cyan-500/20" },
      { label: "Usuários ativos hoje", value: data.activeUsersToday, color: "text-violet-400", icon: Server, bg: "bg-violet-500/10 border-violet-500/20" },
    ],
    [data],
  );

  const navItems = useMemo(() => {
    const counters: Record<Screen, string> = {
      home: "Dashboard executivo",
      usuarios: `${data.totalUsers} usuário${data.totalUsers === 1 ? "" : "s"}`,
      config: `${data.activeModules} módulo${data.activeModules === 1 ? "" : "s"} ativo${data.activeModules === 1 ? "" : "s"}`,
      banco: "Schema • SQL read-only",
      monitor: `${data.actionsToday} ação${data.actionsToday === 1 ? "" : "es"} hoje`,
      seguranca: `${data.failedLogins} falha${data.failedLogins === 1 ? "" : "s"} hoje`,
      chamados: `${data.openTickets} chamado${data.openTickets === 1 ? "" : "s"} aberto${data.openTickets === 1 ? "" : "s"}`,
    };
    return NAV_BASE.map((item) => ({
      ...item,
      desc: counters[item.id] ? `${item.desc} • ${counters[item.id]}` : item.desc,
      alert: item.id === "seguranca" && data.failedLogins > 0,
    }));
  }, [data]);

  return (
    <div
      className="flex flex-col min-h-[100dvh] transition-all duration-300 px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      <BackgroundEffects />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          <div className="relative flex flex-col flex-1 min-h-0 gap-3 p-2 sm:p-3 lg:p-4 w-full overflow-auto">

            {/* ─── Navbar desktop ─── */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 py-1">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/[0.08]">
                  <Shield className="h-4 w-4 text-red-400" />
                </div>
                <div className="h-6 w-px" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-red-400/70">Workspace</span>
                  <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">
                    {screen === "home" ? "Painel Administrativo" : currentItem?.label}
                  </span>
                </div>
              </div>
              <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-red-400/20 bg-red-500/[0.08] px-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">Área restrita</span>
              </div>
              {isAdmin && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  <Lock className="h-2.5 w-2.5" />
                  Admin
                </div>
              )}
              <div className="flex-1" />
              {screen !== "home" && (
                <button
                  onClick={() => setScreen("home")}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400 hover:text-white transition-all hover:border-[var(--sgt-border-medium)] hover:bg-[var(--sgt-input-hover)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <HomeButton />
              <UserMenu />
            </div>

            {/* ─── Navbar mobile ─── */}
            <div className="flex sm:hidden items-center justify-between gap-2 py-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/[0.08] shrink-0">
                  <Shield className="h-3.5 w-3.5 text-red-400" />
                </div>
                <div className="h-5 w-px shrink-0" style={{ background: "var(--sgt-border-medium)" }} />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-red-400/70">Workspace</span>
                  <span className="text-[15px] font-black tracking-[-0.03em] dark:text-white text-slate-800 truncate">
                    {screen === "home" ? "Admin" : currentItem?.label}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {screen !== "home" && (
                  <button onClick={() => setScreen("home")} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400">
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                )}
                <HomeButton />
                <UserMenu />
              </div>
            </div>

            <div className="h-px shrink-0" style={{ background: "var(--sgt-divider)" }} />

            {/* ─── Content ─── */}
            <div className="flex flex-col gap-6">

        {screen === "home" && (
          <>
            {/* ═══ Hero banner ═══ */}
            <AnimatedCard delay={0} hover={false} className="rounded-[20px] sm:rounded-[24px] overflow-hidden border border-[var(--sgt-border-subtle)]">
              <div
                className="relative px-5 py-6 sm:px-8 sm:py-8"
                style={{
                  background: "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(139,92,246,0.08) 40%, rgba(6,182,212,0.06) 100%)",
                }}
              >
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }} />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 backdrop-blur-sm shrink-0">
                    <Terminal className="h-7 w-7 sm:h-8 sm:w-8 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-black tracking-[-0.03em] dark:text-white text-slate-800 mb-1">
                      Central de Controle
                    </h1>
                    <p className="text-sm sm:text-base text-[var(--sgt-text-secondary)] leading-relaxed">
                      Dashboard executivo do Workspace SGT com dados atualizados em tempo real.
                    </p>
                    <p className="text-xs text-[var(--sgt-text-muted)] mt-2 font-mono">
                      {user?.email ?? "ti@sgtlog.com.br"}
                    </p>
                  </div>
                  <div className="hidden lg:flex gap-3 shrink-0">
                    {heroStats.map((s) => (
                      <div key={s.label} className={`flex flex-col items-center rounded-xl border px-4 py-3 backdrop-blur-sm ${s.bg}`}>
                        <s.icon className={`h-4 w-4 ${s.color} mb-1`} />
                        <span className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</span>
                        <span className="text-[9px] uppercase tracking-[0.15em] text-[var(--sgt-text-muted)]">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedCard>

            {/* ═══ Stats mobile (visíveis só em < lg) ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 lg:hidden">
              {heroStats.map((s, i) => (
                <AnimatedCard key={s.label} delay={80 + i * 50} className="rounded-[16px] border border-[var(--sgt-border-subtle)] sgt-bg-card">
                  <div className="flex flex-col items-center py-3 px-2" style={{ background: `linear-gradient(135deg, ${s.color.replace("text-", "rgba(")}0.12), transparent)` }}>
                    <s.icon className={`h-4 w-4 ${s.color} mb-1.5`} />
                    <span className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</span>
                    <span className="text-[9px] uppercase tracking-[0.15em] text-[var(--sgt-text-muted)] text-center">{s.label}</span>
                  </div>
                </AnimatedCard>
              ))}
            </div>

            {/* ═══ Resumo rápido ═══ */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Resumo</span>
              <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
            </div>

            <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
              {/* Últimos chamados */}
              <AnimatedCard delay={160} className="rounded-[20px] border border-[var(--sgt-border-subtle)] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ background: "linear-gradient(180deg, rgba(245,158,11,0.05) 0%, transparent 100%)" }}>
                  <div className="flex items-center gap-2">
                    <TicketIcon className="h-4 w-4 text-amber-400" />
                    <p className="text-[12px] font-semibold uppercase tracking-[0.2em] sgt-text-2">Últimos chamados</p>
                  </div>
                  <button
                    onClick={() => navigate("/chamados")}
                    className="text-[10px] font-medium text-amber-300 hover:text-amber-200 transition-colors"
                  >
                    Ver todos
                  </button>
                </div>
                <div className="flex-1 divide-y divide-[var(--sgt-divider)]">
                  {loading ? (
                    <div className="px-5 py-8 text-center text-[12px] text-[var(--sgt-text-muted)]">Carregando...</div>
                  ) : data.lastTickets.length === 0 ? (
                    <div className="px-5 py-8 text-center text-[12px] text-[var(--sgt-text-muted)]">Nenhum chamado registrado.</div>
                  ) : (
                    data.lastTickets.map((t) => {
                      const color = STATUS_COLOR[t.status];
                      return (
                        <button
                          key={t.id}
                          onClick={() => navigate("/chamados")}
                          className="flex items-start gap-3 px-5 py-3 w-full text-left hover:bg-[var(--sgt-row-hover)] transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] shrink-0">
                            <TicketIcon className="h-3.5 w-3.5 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold sgt-text truncate">{t.titulo}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color.bg} ${color.text} ${color.border}`}>
                                {STATUS_LABEL[t.status]}
                              </span>
                              <span className="text-[10px] text-[var(--sgt-text-muted)]">
                                por {t.aberto_por ? (profiles[t.aberto_por]?.display_name ?? "Usuário") : "—"}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-[var(--sgt-text-muted)] shrink-0 pt-1">
                            {tempoRelativo(t.created_at)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </AnimatedCard>

              {/* Atividade recente */}
              <AnimatedCard delay={230} className="rounded-[20px] border border-[var(--sgt-border-subtle)] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ background: "linear-gradient(180deg, rgba(6,182,212,0.05) 0%, transparent 100%)" }}>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-400" />
                    <p className="text-[12px] font-semibold uppercase tracking-[0.2em] sgt-text-2">Atividade recente</p>
                  </div>
                  <button
                    onClick={() => setScreen("monitor")}
                    className="text-[10px] font-medium text-cyan-300 hover:text-cyan-200 transition-colors"
                  >
                    Monitoramento
                  </button>
                </div>
                <div className="flex-1 divide-y divide-[var(--sgt-divider)]">
                  {loading ? (
                    <div className="px-5 py-8 text-center text-[12px] text-[var(--sgt-text-muted)]">Carregando...</div>
                  ) : data.lastLogs.length === 0 ? (
                    <div className="px-5 py-8 text-center text-[12px] text-[var(--sgt-text-muted)]">Nenhuma atividade recente.</div>
                  ) : (
                    data.lastLogs.map((l) => {
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
                                {profiles[l.user_id]?.display_name ?? "Usuário"}
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
                    })
                  )}
                </div>
              </AnimatedCard>

              {/* Segurança */}
              <AnimatedCard
                delay={300}
                className={`rounded-[20px] overflow-hidden flex flex-col ${data.failedLogins > 0 ? "border border-red-400/40" : "border border-[var(--sgt-border-subtle)]"}`}
              >
                <div className={`flex items-center justify-between gap-3 px-5 py-4 ${data.failedLogins > 0 ? "bg-red-500/10" : ""}`} style={{ background: data.failedLogins > 0 ? undefined : "linear-gradient(180deg, rgba(239,68,68,0.05) 0%, transparent 100%)" }}>
                  <div className="flex items-center gap-2">
                    <Shield className={`h-4 w-4 ${data.failedLogins > 0 ? "text-red-400" : "text-red-300"}`} />
                    <p className="text-[12px] font-semibold uppercase tracking-[0.2em] sgt-text-2">Segurança</p>
                  </div>
                  {data.failedLogins > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                      <AlertTriangle className="h-3 w-3" />
                      {data.failedLogins} falha{data.failedLogins === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <div className="flex-1 p-5">
                  {loading ? (
                    <div className="py-6 text-center text-[12px] text-[var(--sgt-text-muted)]">Carregando...</div>
                  ) : data.failedLogins === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      </div>
                      <p className="text-[12px] font-medium sgt-text-2">Nenhum login falho hoje</p>
                      <p className="text-[11px] text-[var(--sgt-text-muted)]">Última verificação: {data.updatedAt?.toLocaleTimeString("pt-BR") ?? "—"}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/20 shrink-0">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-red-200">{data.failedLogins} tentativa{data.failedLogins === 1 ? "" : "s"} falha{data.failedLogins === 1 ? "" : "s"} hoje</p>
                          <p className="text-[11px] text-red-300/80">
                            Última: {data.lastFailedLogin?.email ?? "—"} • {data.lastFailedLogin ? tempoRelativo(data.lastFailedLogin.created_at) : "—"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setScreen("seguranca")}
                        className="w-full rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-2 text-[11px] font-medium sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all"
                      >
                        Ver histórico de acessos
                      </button>
                    </div>
                  )}
                </div>
              </AnimatedCard>
            </div>

            {/* ═══ Módulos ═══ */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Módulos</span>
              <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
              <button
                onClick={() => refresh()}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-1.5 text-[10px] sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                {data.updatedAt ? data.updatedAt.toLocaleTimeString("pt-BR") : "Atualizar"}
              </button>
            </div>

            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {navItems.map((item, i) => (
                <AnimatedCard
                  key={item.id}
                  delay={380 + i * 70}
                  hover
                  className="group rounded-[20px] overflow-hidden cursor-pointer"
                >
                  <button
                    onClick={() => item.route ? navigate(item.route) : setScreen(item.id)}
                    className="text-left w-full h-full"
                  >
                    <div
                      className={`relative p-5 sm:p-6 h-full border rounded-[20px] transition-all duration-300 ${item.alert ? "border-red-400/40" : ""}`}
                      style={{
                        background: item.gradient,
                        borderColor: item.alert ? undefined : item.borderGlow,
                      }}
                    >
                      {/* Dot pattern overlay */}
                      <div className="absolute inset-0 opacity-[0.025] rounded-[20px]" style={{
                        backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 0.5px, transparent 0)",
                        backgroundSize: "16px 16px",
                      }} />

                      <div className="relative">
                        <div className="flex items-start justify-between mb-5">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconBg} backdrop-blur-sm border border-white/[0.06]`}>
                            <item.icon className="h-6 w-6" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            {item.alert && (
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                              </span>
                            )}
                            <ChevronRight className="h-5 w-5 text-[var(--sgt-text-muted)] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--sgt-text-secondary)]" />
                          </div>
                        </div>
                        <h3 className="text-[15px] sm:text-base font-bold sgt-text mb-1.5 tracking-[-0.01em]">{item.label}</h3>
                        <p className="text-[12px] sm:text-[13px] text-[var(--sgt-text-secondary)] leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </button>
                </AnimatedCard>
              ))}
            </div>
          </>
        )}

        {/* Sub-pages */}
        {screen !== "home" && (
          <div className="animate-[fadeSlideIn_0.4s_ease-out]">
            {renderContent()}
          </div>
        )}

            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
