import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Loader2, ClipboardList,
  AlertCircle, Clock, CheckCircle2, XCircle, Inbox,
} from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { HomeButton } from "@/components/shared/HomeButton";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Ticket, fetchMyTickets, fetchTickets,
  PRIORIDADE_LABEL, STATUS_LABEL, PRIORIDADE_COLOR, STATUS_COLOR,
} from "@/lib/ticketsApi";
import { TicketModal } from "@/components/admin/tickets/TicketModal";

const fmtDateBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export default function Chamados() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = isAdmin ? await fetchTickets() : await fetchMyTickets();
      setTickets(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar chamados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isAdmin]);

  const stats = useMemo(() => ({
    abertos: tickets.filter(t => t.status === "aberto").length,
    andamento: tickets.filter(t => t.status === "em_andamento" || t.status === "pendente").length,
    concluidos: tickets.filter(t => t.status === "concluido").length,
    urgentes: tickets.filter(t => t.prioridade === "urgente" && t.status !== "concluido" && t.status !== "cancelado").length,
  }), [tickets]);

  const openNew = () => {
    setEditingTicket(null);
    setModalOpen(true);
  };
  const openView = (t: Ticket) => {
    setEditingTicket(t);
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
                onClick={() => navigate("/home")}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-slate-400 hover:text-white"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.08]">
                <ClipboardList className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">Suporte</span>
                <span className="text-[17px] font-black tracking-[-0.03em] dark:text-white text-slate-800">
                  {isAdmin ? "Chamados (todos)" : "Meus chamados"}
                </span>
              </div>
              <div className="flex-1" />
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={() => navigate("/admin/chamados")} className="border-amber-500/40 text-amber-300">
                  Ver agenda completa
                </Button>
              )}
              <Button size="sm" onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-black">
                <Plus className="h-4 w-4 mr-1" /> Abrir chamado
              </Button>
              <UserMenu />
              <HomeButton />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: "Abertos", value: stats.abertos, icon: AlertCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
                { label: "Em tratamento", value: stats.andamento, icon: Clock, color: "text-violet-400", bg: "bg-violet-500/10" },
                { label: "Concluídos", value: stats.concluidos, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                { label: "Urgentes", value: stats.urgentes, icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/10" },
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

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
                <p className="text-sm text-[var(--sgt-text-muted)]">Carregando chamados...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Inbox className="h-12 w-12 text-[var(--sgt-text-muted)] opacity-50" />
                <p className="text-sm text-[var(--sgt-text-muted)]">
                  Você ainda não abriu nenhum chamado.
                </p>
                <Button size="sm" onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-black">
                  <Plus className="h-4 w-4 mr-1" /> Abrir meu primeiro chamado
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {tickets.map((t) => {
                  const pc = PRIORIDADE_COLOR[t.prioridade];
                  const sc = STATUS_COLOR[t.status];
                  return (
                    <button
                      key={t.id}
                      onClick={() => openView(t)}
                      className="text-left rounded-2xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] p-4 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold sgt-text line-clamp-2 flex-1">{t.titulo}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sc.border} ${sc.bg} ${sc.text} font-semibold uppercase tracking-wider shrink-0`}>
                          {STATUS_LABEL[t.status]}
                        </span>
                      </div>
                      {t.descricao && (
                        <p className="text-[12px] text-[var(--sgt-text-muted)] line-clamp-2">{t.descricao}</p>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${pc.border} ${pc.bg} ${pc.text} font-semibold uppercase tracking-wider`}>
                          {PRIORIDADE_LABEL[t.prioridade]}
                        </span>
                        <span className="text-[10px] text-[var(--sgt-text-muted)]">
                          {fmtDateBR(t.data_chamado)}{t.horario_chamado ? ` · ${t.horario_chamado.slice(0,5)}` : ""}
                        </span>
                      </div>
                      {t.responsavel && (
                        <p className="text-[11px] text-[var(--sgt-text-muted)] truncate">
                          Responsável: <span className="text-slate-300">{t.responsavel}</span>
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <TicketModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        ticket={editingTicket}
        defaultDate={undefined}
        onSaved={load}
      />
    </div>
  );
}
