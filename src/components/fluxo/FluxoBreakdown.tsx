import { useMemo, useState } from "react";
import { X, ChevronRight, ChevronDown, Layers } from "lucide-react";
import type { DwRow } from "@/lib/dwApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnaliticaRow {
  key: string;
  label: string;
  debito: number;
  credito: number;
}

interface SinteticaRow {
  key: string;
  label: string;
  debito: number;
  credito: number;
  children: AnaliticaRow[];
}

interface CentroCustoRow {
  key: string;
  label: string;
  debito: number;
  credito: number;
  children: SinteticaRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEM = "Sem classificação";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const round2 = (v: number) => Math.round(v * 100) / 100;

function buildTree(rows: DwRow[]): CentroCustoRow[] {
  type Cell = { debito: number; credito: number };
  // cc → si → an → Cell
  const tree = new Map<string, Map<string, Map<string, Cell>>>();

  for (const r of rows) {
    if (r.ORIGEM !== "CP" && r.ORIGEM !== "CR") continue;
    const vlr = +(r.VLR_PAGO ?? 0);
    if (vlr <= 0) continue;

    const cc = String(r.CENTRO_CUSTO ?? "").trim() || SEM;
    const si = String(r.SINTETICA    ?? "").trim() || SEM;
    const an = String(r.ANALITICA    ?? "").trim() || SEM;

    if (!tree.has(cc)) tree.set(cc, new Map());
    const siMap = tree.get(cc)!;
    if (!siMap.has(si)) siMap.set(si, new Map());
    const anMap = siMap.get(si)!;
    if (!anMap.has(an)) anMap.set(an, { debito: 0, credito: 0 });
    const cell = anMap.get(an)!;

    if (r.ORIGEM === "CP") cell.debito  += vlr;
    else                    cell.credito += vlr;
  }

  return Array.from(tree.entries())
    .map(([cc, siMap]): CentroCustoRow => {
      const sChildren = Array.from(siMap.entries())
        .map(([si, anMap]): SinteticaRow => {
          const aChildren = Array.from(anMap.entries())
            .map(([an, cell]): AnaliticaRow => ({
              key:     `${cc}|${si}|${an}`,
              label:   an,
              debito:  round2(cell.debito),
              credito: round2(cell.credito),
            }))
            .sort((a, b) => (b.debito + b.credito) - (a.debito + a.credito));

          return {
            key:     `${cc}|${si}`,
            label:   si,
            debito:  round2(aChildren.reduce((s, r) => s + r.debito,  0)),
            credito: round2(aChildren.reduce((s, r) => s + r.credito, 0)),
            children: aChildren,
          };
        })
        .sort((a, b) => (b.debito + b.credito) - (a.debito + a.credito));

      return {
        key:     cc,
        label:   cc,
        debito:  round2(sChildren.reduce((s, r) => s + r.debito,  0)),
        credito: round2(sChildren.reduce((s, r) => s + r.credito, 0)),
        children: sChildren,
      };
    })
    .sort((a, b) => (b.debito + b.credito) - (a.debito + a.credito));
}

// ─── Células de valor ─────────────────────────────────────────────────────────

const DebitoCell = ({ v }: { v: number }) =>
  v > 0
    ? <span className="tabular-nums text-rose-400 font-semibold">{fmt(v)}</span>
    : <span className="text-slate-600">—</span>;

const CreditoCell = ({ v }: { v: number }) =>
  v > 0
    ? <span className="tabular-nums text-teal-400 font-semibold">{fmt(v)}</span>
    : <span className="text-slate-600">—</span>;

const ResultadoCell = ({ d, c }: { d: number; c: number }) => {
  const r = c - d;
  if (Math.abs(r) < 0.01) return <span className="text-slate-600">—</span>;
  const positive = r >= 0;
  return (
    <span className={`tabular-nums font-bold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
      {r >= 0 ? "+" : ""}{fmt(r)}
    </span>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  rows:     DwRow[];
  onClose:  () => void;
  periodo?: string;
}

export function FluxoBreakdown({ rows, onClose, periodo }: Props) {
  const tree = useMemo(() => buildTree(rows), [rows]);

  const [expandedCC, setExpandedCC] = useState<Set<string>>(new Set());
  const [expandedSI, setExpandedSI] = useState<Set<string>>(new Set());

  const toggleCC = (key: string) =>
    setExpandedCC(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleSI = (key: string) =>
    setExpandedSI(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const totalDebito  = round2(tree.reduce((s, r) => s + r.debito,  0));
  const totalCredito = round2(tree.reduce((s, r) => s + r.credito, 0));

  const COL_CLASS = "text-left";
  const COL_NUM   = "text-right";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Painel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[860px] flex-col shadow-[−32px_0_80px_rgba(0,0,0,0.7)] animate-in slide-in-from-right duration-300"
        style={{ background: "var(--sgt-bg-section)", borderLeft: "1px solid var(--sgt-border-subtle)" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
            style={{ background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.25)" }}>
            <Layers className="h-4 w-4" style={{ color: "#2dd4bf" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-bold tracking-tight dark:text-white text-slate-800">
              Composição por Classificação
            </h2>
            {periodo && (
              <p className="text-[11px] text-slate-500 mt-0.5">{periodo}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "var(--sgt-text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Totalizador */}
        <div className="grid grid-cols-3 gap-3 px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--sgt-border-subtle)", background: "var(--sgt-bg-card)" }}>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500">Débito (CP)</span>
            <span className="text-[16px] font-black tabular-nums text-rose-400 leading-tight">{fmt(totalDebito)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500">Crédito (CR)</span>
            <span className="text-[16px] font-black tabular-nums text-teal-400 leading-tight">{fmt(totalCredito)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500">Resultado</span>
            <span className={`text-[16px] font-black tabular-nums leading-tight ${totalCredito - totalDebito >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {totalCredito - totalDebito >= 0 ? "+" : ""}{fmt(totalCredito - totalDebito)}
            </span>
          </div>
        </div>

        {/* Cabeçalho da tabela */}
        <div className="grid grid-cols-[1fr_160px_160px_160px] gap-0 px-5 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--sgt-border-subtle)", background: "var(--sgt-bg-card)" }}>
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500">Classificação</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-rose-500/80 text-right">Débito</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-teal-500/80 text-right">Crédito</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500 text-right">Resultado</span>
        </div>

        {/* Corpo da tabela */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
              <Layers className="h-10 w-10 opacity-20" />
              <p className="text-sm">Nenhum dado com classificação no período</p>
            </div>
          ) : (
            tree.map(cc => {
              const ccOpen = expandedCC.has(cc.key);
              return (
                <div key={cc.key}>
                  {/* Nível 1 — Centro de Custo */}
                  <button
                    type="button"
                    onClick={() => toggleCC(cc.key)}
                    className="w-full grid grid-cols-[1fr_160px_160px_160px] gap-0 px-5 py-2.5 text-left transition-colors group"
                    style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--sgt-row-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {ccOpen
                          ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                      </div>
                      <div className="h-3.5 w-[3px] rounded-full shrink-0 bg-indigo-400/70" />
                      <span className="text-[12px] font-bold dark:text-white/90 text-slate-700 truncate">
                        {cc.label}
                      </span>
                    </div>
                    <div className={COL_NUM}><DebitoCell  v={cc.debito}  /></div>
                    <div className={COL_NUM}><CreditoCell v={cc.credito} /></div>
                    <div className={COL_NUM}><ResultadoCell d={cc.debito} c={cc.credito} /></div>
                  </button>

                  {/* Nível 2 — Sintética */}
                  {ccOpen && cc.children.map(si => {
                    const siOpen = expandedSI.has(si.key);
                    return (
                      <div key={si.key}>
                        <button
                          type="button"
                          onClick={() => toggleSI(si.key)}
                          className="w-full grid grid-cols-[1fr_160px_160px_160px] gap-0 pl-10 pr-5 py-2 text-left transition-colors"
                          style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--sgt-row-hover)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "")}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                              {siOpen
                                ? <ChevronDown className="h-3 w-3 text-slate-500" />
                                : <ChevronRight className="h-3 w-3 text-slate-500" />}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400 truncate">
                              {si.label}
                            </span>
                          </div>
                          <div className={`${COL_NUM} text-[11px]`}><DebitoCell  v={si.debito}  /></div>
                          <div className={`${COL_NUM} text-[11px]`}><CreditoCell v={si.credito} /></div>
                          <div className={`${COL_NUM} text-[11px]`}><ResultadoCell d={si.debito} c={si.credito} /></div>
                        </button>

                        {/* Nível 3 — Analítica */}
                        {siOpen && si.children.map(an => (
                          <div
                            key={an.key}
                            className="grid grid-cols-[1fr_160px_160px_160px] gap-0 pl-16 pr-5 py-1.5 transition-colors"
                            style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--sgt-row-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-1.5 w-1.5 rounded-full shrink-0 bg-slate-600" />
                              <span className="text-[10px] text-slate-500 truncate">{an.label}</span>
                            </div>
                            <div className={`${COL_NUM} text-[10px]`}><DebitoCell  v={an.debito}  /></div>
                            <div className={`${COL_NUM} text-[10px]`}><CreditoCell v={an.credito} /></div>
                            <div className={`${COL_NUM} text-[10px]`}><ResultadoCell d={an.debito} c={an.credito} /></div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 shrink-0 flex items-center gap-2"
          style={{ borderTop: "1px solid var(--sgt-border-subtle)", background: "var(--sgt-bg-card)" }}>
          <span className="text-[9px] text-slate-600 uppercase tracking-[0.2em]">
            {tree.length} centros de custo · clique para expandir
          </span>
        </div>
      </div>
    </>
  );
}
