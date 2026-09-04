import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { Ticket } from "@/lib/ticketsApi";
import { calcularSla, SLA_COLOR } from "@/lib/ticketSla";

interface Props {
  ticket: Pick<Ticket, "data_chamado" | "horario_chamado" | "created_at" | "prioridade" | "status">;
  className?: string;
}

export function SlaBadge({ ticket, className = "" }: Props) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const sla = calcularSla(ticket);
  if (!sla) return null;
  const c = SLA_COLOR[sla.nivel];

  return (
    <span
      title="Tempo desde a abertura do chamado"
      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${c.border} ${c.bg} ${c.text} ${className}`}
    >
      <Timer className="h-2.5 w-2.5" />
      {sla.label}
    </span>
  );
}
