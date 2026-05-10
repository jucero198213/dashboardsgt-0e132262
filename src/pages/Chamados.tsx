import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Filter, CalendarDays, Loader2, ClipboardList,
  AlertCircle, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { HomeButton } from "@/components/shared/HomeButton";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Ticket, TicketPrioridade, TicketStatus, fetchTickets,
  PRIORIDADE_LABEL, STATUS_LABEL, PRIORIDADE_COLOR, STATUS_COLOR,
} from "@/lib/ticketsApi";
import { TicketsCalendar } from "@/components/admin/tickets/TicketsCalendar";
import { TicketModal } from "@/components/admin/tickets/TicketModal";

const fmtDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fmtDateBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export default function Chamados() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(fmtDateInput(new Date()));

  const [filterStatus, setFilterStatus] = useState<TicketStatus | "todos">("todos");
  const [filterPrioridade, setFilterPrioridade] = useState<TicketPrioridade | "todas">("todas");
  const [filterResp, setFilterResp] = useState("");
  const [filterDataIni, setFilterDataIni] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchTickets();
      setTickets(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar chamados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (filterStatus !== "todos" && t.status !== filterStatus) return false;
      if (filterPrioridade !== "todas" && t.prioridade !== filterPrioridade) return false;
      if (filterResp && !(t.responsavel ?? "").toLowerCase().includes(filterResp.toLowerCase())) return false;
      if (filterDataIni && t.data_chamado < filterDataIni) return false;
      if (filterDataFim && t.data_chamado > filterDataFim) return false;
      return true;
    });
  }, [tickets, filterStatus, filterPrioridade, filterResp, filterDataIni, filterDataFim]);

  const dayTickets = useMemo(
    () => filtered.filter((t) => t.data_chamado === selectedDate),
    [filtered, selectedDate],
  );

  const stats = useMemo(() => ({
    abertos: filtered.filter(t => t.status === "aberto").length,
    andamento: filtered.filter(t => t.status === "em_andamento").length,
    concluidos: filtered.filter(t => t.status === "concluido").length,
    urgentes: filtered.filter(t => t.prioridade === "urgente" && t.status !== "concluido" && t.status !== "cancelado").length,
  }), [filtered]);

  const openNew = (date?: string) => {
    setEditingTicket(null);
    setModalDefaultDate(date ?? selectedDate);
    setModalOpen(true);
  };
  const openEdit = (t: Ticket) => {
    setEditingTicket(t);
    setModalDefaultDate(undefined);
    setModalOpen(true);
  };

  return (
    <div
      className="flex flex-col min-h-[100dvh] transition-all duration-300 px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(245,158,11,0.18),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_55%_40%_at_100%_110%,rgba(139,92,246,0.07),transparent_60%)]" />

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          <div className="relative flex flex-col flex-1 min-h-0 gap-3 p-2 sm:p-3 lg:p-4 w-full overflow-auto">

            {/* Header */}
            <div className="flex items-center gap-2 md:gap-3 py-1 flex-wrap">
              <button
                onClick={() => navigate("/")}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400 hover:text-white"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.08]">
                <ClipboardList className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Workspace</span>
                <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">
                  Agenda de Chamados
                </span>
              </div>
              <div className="flex-1" />
              <Button
                size="sm" variant="outline"
                onClick={() => setShowFilters((v) => !v)}
                className="border-[var(--sgt-border-subtle)]"
              >
                <Filter className="h-4 w-4 mr-1" /> Filtros
              </Button>
              <Button size="sm" onClick={() => openNew()} className="bg-amber-500 hover:bg-amber-600 text-black">
                <Plus className="h-4 w-4 mr-1" /> Novo chamado
              </Button>
              <UserMenu />
              <HomeButton />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: "Abertos", value: stats.abertos, icon: AlertCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
                { label: "Em andamento", value: stats.andamento, icon: Clock, color: "text-violet-400", bg: "bg-violet-500/10" },
                { label: "Concluídos", value: stats.concluidos, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                { label: "Urgentes ativos", value: stats.urgentes, icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/10" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-2.5 flex items-center gap-2.5">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} shrink-0`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-[var(--sgt-text-muted)] uppercase tracking-[0.15em] truncate">{s.label}</p>
                    <p className={`text-[17px] font-bold ${s.color}`}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="rounded-2xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--sgt-text-muted)]">Status</label>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--sgt-text-muted)]">Prioridade</label>
                  <Select value={filterPrioridade} onValueChange={(v) => setFilterPrioridade(v as any)}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {(Object.keys(PRIORIDADE_LABEL) as TicketPrioridade[]).map((p) => (
                        <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--sgt-text-muted)]">Responsável</label>
                  <Input className="h-9 mt-1" placeholder="Buscar" value={filterResp} onChange={(e) => setFilterResp(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--sgt-text-muted)]">De</label>
                  <Input type="date" className="h-9 mt-1" value={filterDataIni} onChange={(e) => setFilterDataIni(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--sgt-text-muted)]">Até</label>
                  <Input type="date" className="h-9 mt-1" value={filterDataFim} onChange={(e) => setFilterDataFim(e.target.value)} />
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
                <p className="text-sm text-[var(--sgt-text-muted)]">Carregando chamados...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Calendar */}
                <div className="lg:col-span-2">
                  <TicketsCalendar
                    month={month}
                    onMonthChange={setMonth}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    tickets={filtered}
                    onTicketClick={openEdit}
                    onEmptyDayClick={(d) => openNew(d)}
                  />
                </div>

                {/* Day list */}
                <div className="rounded-2xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] p-3 sm:p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-bold sgt-text">
                      {fmtDateBR(selectedDate)}
                    </h3>
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-[var(--sgt-text-muted)]">
                      {dayTickets.length} chamado{dayTickets.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {dayTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                      <CalendarDays className="h-8 w-8 text-[var(--sgt-text-muted)] opacity-50" />
                      <p className="text-sm text-[var(--sgt-text-muted)]">Nenhum chamado nesta data</p>
                      <Button size="sm" variant="outline" onClick={() => openNew(selectedDate)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Criar chamado
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[520px]">
                      {dayTickets.map((t) => {
                        const pc = PRIORIDADE_COLOR[t.prioridade];
                        const sc = STATUS_COLOR[t.status];
                        return (
                          <button
                            key={t.id}
                            onClick={() => openEdit(t)}
                            className="text-left rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-base)] p-3 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <p className="text-sm font-semibold sgt-text line-clamp-1">{t.titulo}</p>
                              {t.horario_chamado && (
                                <span className="text-[10px] font-bold text-cyan-300 shrink-0">
                                  {t.horario_chamado.slice(0, 5)}
                                </span>
                              )}
                            </div>
                            {t.responsavel && (
                              <p className="text-[11px] text-[var(--sgt-text-muted)] mb-1.5 truncate">
                                {t.responsavel}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1.5">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${pc.border} ${pc.bg} ${pc.text} font-semibold uppercase tracking-wider`}>
                                {PRIORIDADE_LABEL[t.prioridade]}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${sc.border} ${sc.bg} ${sc.text} font-semibold uppercase tracking-wider`}>
                                {STATUS_LABEL[t.status]}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <TicketModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        ticket={editingTicket}
        defaultDate={modalDefaultDate}
        onSaved={load}
      />
    </div>
  );
}
