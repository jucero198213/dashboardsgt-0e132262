import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Ticket, PRIORIDADE_COLOR, STATUS_COLOR } from "@/lib/ticketsApi";

interface Props {
  month: Date; // any day in month
  onMonthChange: (d: Date) => void;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (d: string) => void;
  tickets: Ticket[];
  onTicketClick: (t: Ticket) => void;
  onEmptyDayClick: (d: string) => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const fmtDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function TicketsCalendar({
  month, onMonthChange, selectedDate, onSelectDate, tickets, onTicketClick, onEmptyDayClick,
}: Props) {
  const grid = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startWeekday = first.getDay();
    const days: { date: Date; inMonth: boolean }[] = [];
    for (let i = startWeekday; i > 0; i--) {
      const d = new Date(first);
      d.setDate(d.getDate() - i);
      days.push({ date: d, inMonth: false });
    }
    for (let i = 1; i <= last.getDate(); i++) {
      days.push({ date: new Date(month.getFullYear(), month.getMonth(), i), inMonth: true });
    }
    while (days.length % 7 !== 0) {
      const d = new Date(days[days.length - 1].date);
      d.setDate(d.getDate() + 1);
      days.push({ date: d, inMonth: false });
    }
    return days;
  }, [month]);

  const byDate = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    for (const t of tickets) {
      const arr = map.get(t.data_chamado) ?? [];
      arr.push(t);
      map.set(t.data_chamado, arr);
    }
    return map;
  }, [tickets]);

  const today = fmtDate(new Date());

  return (
    <div className="rounded-2xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--sgt-border-subtle)] hover:bg-[var(--sgt-input-hover)] text-[var(--sgt-text-secondary)]"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <h3 className="text-sm sm:text-base font-bold sgt-text">
            {MONTHS[month.getMonth()]} {month.getFullYear()}
          </h3>
          <button
            onClick={() => onMonthChange(new Date())}
            className="text-[10px] uppercase tracking-wider text-amber-400 hover:text-amber-300"
          >
            Hoje
          </button>
        </div>
        <button
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--sgt-border-subtle)] hover:bg-[var(--sgt-input-hover)] text-[var(--sgt-text-secondary)]"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] uppercase tracking-wider text-[var(--sgt-text-muted)] py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map(({ date, inMonth }, i) => {
          const ds = fmtDate(date);
          const dayTickets = byDate.get(ds) ?? [];
          const isToday = ds === today;
          const isSelected = ds === selectedDate;
          return (
            <button
              key={i}
              onClick={() => {
                onSelectDate(ds);
                if (dayTickets.length === 0) onEmptyDayClick(ds);
              }}
              className={`min-h-[78px] sm:min-h-[96px] rounded-lg border p-1.5 text-left transition-all flex flex-col gap-1 ${
                isSelected
                  ? "border-amber-500/60 bg-amber-500/10"
                  : isToday
                    ? "border-cyan-500/40 bg-cyan-500/5"
                    : "border-[var(--sgt-border-subtle)] hover:border-[var(--sgt-border-medium)] hover:bg-[var(--sgt-input-hover)]"
              } ${!inMonth ? "opacity-40" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold ${isToday ? "text-cyan-300" : "sgt-text"}`}>
                  {date.getDate()}
                </span>
                {dayTickets.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    {dayTickets.length}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayTickets.slice(0, 2).map((t) => {
                  const pc = PRIORIDADE_COLOR[t.prioridade];
                  const sc = STATUS_COLOR[t.status];
                  return (
                    <div
                      key={t.id}
                      onClick={(e) => { e.stopPropagation(); onTicketClick(t); }}
                      className={`text-[9px] sm:text-[10px] truncate rounded px-1 py-0.5 border ${sc.border} ${sc.bg} ${sc.text} cursor-pointer hover:brightness-125`}
                      title={`${t.titulo} • ${t.status}`}
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle ${pc.dot}`} />
                      {t.horario_chamado ? `${t.horario_chamado.slice(0, 5)} ` : ""}
                      {t.titulo}
                    </div>
                  );
                })}
                {dayTickets.length > 2 && (
                  <div className="text-[9px] text-[var(--sgt-text-muted)] px-1">
                    +{dayTickets.length - 2} mais
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
