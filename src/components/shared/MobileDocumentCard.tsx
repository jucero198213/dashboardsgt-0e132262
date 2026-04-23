import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatCurrency, formatDate } from "@/data/mockData";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export interface MobileDocumentCardProps {
  /** Documento (numero) */
  documento: string;
  /** Cliente ou Fornecedor */
  parceiro: string;
  /** Valor principal do documento */
  valor: number;
  /** Data de vencimento */
  vencimento: string | null | undefined;
  /** Status para o badge */
  status: "Em Aberto" | "Vencido" | "Parcial";
  /** Cor do tom (paga = amber, recebe = emerald) */
  tone: "emerald" | "amber";
  /** Detalhes extras mostrados ao expandir */
  details: Array<{ label: string; value: React.ReactNode }>;
}

/**
 * MobileDocumentCard — Substitui linhas de tabela no mobile.
 * Mostra os 3 dados essenciais (cliente/fornecedor, valor, vencimento + status)
 * e permite expandir para ver todos os campos.
 */
export function MobileDocumentCard({
  documento,
  parceiro,
  valor,
  vencimento,
  status,
  tone,
  details,
}: MobileDocumentCardProps) {
  const [open, setOpen] = useState(false);

  const accent =
    tone === "emerald"
      ? "border-emerald-400/15 hover:border-emerald-400/30"
      : "border-amber-400/15 hover:border-amber-400/30";

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className={`group w-full overflow-hidden rounded-2xl border text-left transition-all active:scale-[0.99] ${accent}`}
      style={{
        background: "var(--sgt-bg-card)",
        borderColor: open ? "rgba(255,255,255,0.18)" : undefined,
      }}
    >
      {/* Linha resumo */}
      <div className="flex items-start gap-3 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          {/* topo: documento + status */}
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: "var(--sgt-text-muted)" }}
            >
              Doc {documento}
            </span>
            <StatusBadge status={status} />
          </div>

          {/* nome do parceiro */}
          <p
            className="truncate text-[13px] font-semibold"
            style={{ color: "var(--sgt-text-primary)" }}
          >
            {parceiro}
          </p>

          {/* valor + vencimento */}
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <span
              className={`text-[15px] font-extrabold tabular-nums tracking-[-0.02em] ${
                tone === "emerald" ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {formatCurrency(valor)}
            </span>
            <span
              className="text-[11px] tabular-nums"
              style={{ color: "var(--sgt-text-muted)" }}
            >
              Venc. {vencimento ? formatDate(vencimento) : "—"}
            </span>
          </div>
        </div>

        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
          style={{ color: "var(--sgt-text-muted)" }}
        />
      </div>

      {/* Detalhes expandidos */}
      {open && (
        <div
          className="border-t px-3.5 py-3"
          style={{
            borderColor: "var(--sgt-border-subtle)",
            background: "var(--sgt-row-alt)",
          }}
        >
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {details.map((d, i) => (
              <div key={i} className="min-w-0">
                <dt
                  className="text-[9px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--sgt-text-muted)" }}
                >
                  {d.label}
                </dt>
                <dd
                  className="mt-0.5 truncate text-[12px] font-medium tabular-nums"
                  style={{ color: "var(--sgt-text-secondary)" }}
                >
                  {d.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </button>
  );
}
