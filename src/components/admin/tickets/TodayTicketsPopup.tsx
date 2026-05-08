import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Ticket, fetchTicketsByDate,
  PRIORIDADE_LABEL, STATUS_LABEL, PRIORIDADE_COLOR, STATUS_COLOR,
} from "@/lib/ticketsApi";

const STORAGE_KEY = "dailyTicketsPopupShown";

export function TodayTicketsPopup() {
  const { isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (isLoading || !isAdmin) return;
    const today = new Date().toISOString().slice(0, 10);
    const last = localStorage.getItem(STORAGE_KEY);
    if (last === today) return;

    fetchTicketsByDate(today)
      .then((data) => {
        if (data.length > 0) {
          setTickets(data);
          setOpen(true);
        }
        localStorage.setItem(STORAGE_KEY, today);
      })
      .catch(() => {
        // silent
      });
  }, [isAdmin, isLoading]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-400" />
            Chamados de hoje
          </DialogTitle>
          <DialogDescription>
            {tickets.length} chamado{tickets.length !== 1 ? "s" : ""} agendado{tickets.length !== 1 ? "s" : ""} para hoje.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          {tickets.map((t) => {
            const pc = PRIORIDADE_COLOR[t.prioridade];
            const sc = STATUS_COLOR[t.status];
            return (
              <div
                key={t.id}
                className="flex items-start gap-3 rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] p-3"
              >
                <div className={`flex flex-col items-center justify-center min-w-[60px] rounded-lg border ${pc.border} ${pc.bg} ${pc.text} p-1.5`}>
                  <Clock className="h-3 w-3 mb-0.5" />
                  <span className="text-[11px] font-bold">
                    {t.horario_chamado ? t.horario_chamado.slice(0, 5) : "—"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold sgt-text truncate">{t.titulo}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${pc.border} ${pc.bg} ${pc.text}`}>
                      {PRIORIDADE_LABEL[t.prioridade]}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${sc.border} ${sc.bg} ${sc.text}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
          <Button onClick={() => { setOpen(false); navigate("/admin/chamados"); }}>
            Ver chamados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
