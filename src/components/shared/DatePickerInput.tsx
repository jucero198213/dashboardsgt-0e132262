import { useState, useRef, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";

interface DatePickerInputProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
}

function toDate(s: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtDisplay(s: string): string {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

export function DatePickerInput({ value, onChange, placeholder = "DD/MM/AAAA" }: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(toDate(value) ?? new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const d = toDate(value);
    if (d) setMonth(d);
  }, [value]);

  const selected = toDate(value);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-all hover:border-[var(--sgt-border-medium)] cursor-pointer"
        style={{
          background: "var(--sgt-input-bg)",
          borderColor: open ? "rgba(34,211,238,0.4)" : "var(--sgt-input-border)",
          color: value ? "var(--sgt-text-secondary)" : "var(--sgt-text-muted)",
          boxShadow: open ? "0 0 0 3px rgba(34,211,238,0.06)" : "none",
          minWidth: 110,
        }}
      >
        <CalendarDays className="h-3 w-3 shrink-0 text-cyan-400/70" />
        <span className="tabular-nums">
          {value ? fmtDisplay(value) : placeholder}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full z-[200] mt-2 overflow-hidden rounded-[16px] border shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
          style={{
            background: "var(--sgt-bg-overlay)",
            borderColor: "var(--sgt-border-subtle)",
            minWidth: 280,
          }}
        >
          {/* Header do calendário */}
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: "var(--sgt-border-subtle)" }}
          >
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border transition-all hover:border-[var(--sgt-border-medium)] hover:[background:var(--sgt-input-hover)]"
              style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <span
              className="text-[13px] font-semibold capitalize tracking-wide"
              style={{ color: "var(--sgt-text-primary)" }}
            >
              {month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>

            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border transition-all hover:border-[var(--sgt-border-medium)] hover:[background:var(--sgt-input-hover)]"
              style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* DayPicker */}
          <div className="p-3">
            <DayPicker
              mode="single"
              selected={selected}
              month={month}
              onMonthChange={setMonth}
              locale={ptBR}
              showOutsideDays
              onSelect={(day) => {
                if (day) {
                  onChange(toStr(day));
                  setOpen(false);
                }
              }}
              classNames={{
                months: "flex flex-col",
                month: "space-y-2",
                caption: "hidden",
                table: "w-full border-collapse",
                head_row: "flex mb-1",
                head_cell: "flex-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em]",
                row: "flex w-full mt-1",
                cell: "flex-1 text-center",
                day: "mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-medium transition-all duration-150 cursor-pointer hover:scale-105",
                day_selected: "!bg-cyan-500 !text-white shadow-[0_0_12px_rgba(34,211,238,0.35)]",
                day_today: "border border-cyan-400/40 text-cyan-300",
                day_outside: "opacity-30",
                day_disabled: "opacity-20 cursor-not-allowed",
                day_hidden: "invisible",
              }}
              styles={{
                head_cell: { color: "var(--sgt-text-muted)" },
                day: { color: "var(--sgt-text-secondary)" },
              }}
              modifiersStyles={{
                selected: { background: "#06b6d4", color: "#fff" },
                today: { color: "#22d3ee" },
              }}
            />
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between border-t px-4 py-2.5"
            style={{ borderColor: "var(--sgt-border-subtle)" }}
          >
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="text-[11px] font-medium transition-colors"
              style={{ color: "var(--sgt-text-muted)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--sgt-text-primary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--sgt-text-muted)")}
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => { onChange(toStr(new Date())); setOpen(false); }}
              className="text-[11px] font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
