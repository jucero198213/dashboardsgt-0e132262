import { Ticket, TicketPrioridade, TicketStatus } from "./ticketsApi";

export type SlaNivel = "ok" | "atencao" | "critico";

const LIMITES: Record<"normal" | "urgente", { ok: number; atencao: number }> = {
  normal: { ok: 4, atencao: 8 },   // horas — baixa/média
  urgente: { ok: 1, atencao: 2 },  // horas — alta/urgente
};

export const SLA_COLOR: Record<SlaNivel, { text: string; bg: string; border: string }> = {
  ok: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  atencao: { text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  critico: { text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30" },
};

/** Timestamp de abertura: usa data+horário do chamado quando houver, senão created_at. */
export function aberturaTimestamp(t: Pick<Ticket, "data_chamado" | "horario_chamado" | "created_at">): number {
  if (t.data_chamado) {
    const hora = t.horario_chamado ? t.horario_chamado.slice(0, 8) : "00:00:00";
    const ts = new Date(`${t.data_chamado}T${hora}`).getTime();
    if (!Number.isNaN(ts)) return ts;
  }
  return new Date(t.created_at).getTime();
}

export function formatDuracao(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const dias = Math.floor(totalMin / 1440);
  const horas = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (dias > 0) return `${dias}d ${horas}h`;
  if (horas > 0) return `${horas}h ${mins}min`;
  return `${mins}min`;
}

export interface SlaInfo {
  nivel: SlaNivel;
  label: string;
}

export function calcularSla(
  t: Pick<Ticket, "data_chamado" | "horario_chamado" | "created_at" | "prioridade" | "status">,
  agora = Date.now(),
): SlaInfo | null {
  if (t.status === "concluido" || t.status === "cancelado") return null;
  const decorridoMs = agora - aberturaTimestamp(t);
  const horas = decorridoMs / 3_600_000;
  const limites = isUrgente(t.prioridade) ? LIMITES.urgente : LIMITES.normal;
  const nivel: SlaNivel = horas < limites.ok ? "ok" : horas < limites.atencao ? "atencao" : "critico";
  return { nivel, label: formatDuracao(decorridoMs) };
}

function isUrgente(p: TicketPrioridade) {
  return p === "alta" || p === "urgente";
}

export const STATUS_FINAIS: TicketStatus[] = ["concluido", "cancelado"];
