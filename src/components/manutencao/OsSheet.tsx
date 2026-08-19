import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrdemAgregada } from "@/lib/manutencaoUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordens: OrdemAgregada[];
  initialVeiculo?: string | null;
}

const SITUACAO_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  CONCLUIDO:     { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Concluído" },
  ANDAMENTO:     { bg: "bg-amber-500/10",   text: "text-amber-400",   label: "Andamento" },
  CANCELADO:     { bg: "bg-rose-500/10",    text: "text-rose-400",    label: "Cancelado" },
  INCONSISTENTE: { bg: "bg-slate-500/10",   text: "text-slate-400",   label: "Inconsistente" },
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

export function OsSheet({ open, onOpenChange, ordens, initialVeiculo }: Props) {
  const [search, setSearch] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroVeiculo, setFiltroVeiculo] = useState("Todos");

  useEffect(() => {
    if (open && initialVeiculo) {
      setFiltroVeiculo(initialVeiculo);
    }
    if (!open) {
      setSearch("");
      setFiltroSituacao("Todos");
      setFiltroTipo("Todos");
      setFiltroVeiculo("Todos");
    }
  }, [open, initialVeiculo]);

  const veiculos = useMemo(() => {
    const s = new Set<string>();
    ordens.forEach(o => { if (o.veiculo) s.add(o.veiculo); });
    return Array.from(s).sort();
  }, [ordens]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ordens.filter(o => {
      if (filtroSituacao !== "Todos" && o.situacao !== filtroSituacao) return false;
      if (filtroTipo !== "Todos" && o.tiposervico !== filtroTipo) return false;
      if (filtroVeiculo !== "Todos" && o.veiculo !== filtroVeiculo) return false;
      if (q && !`${o.ordem} ${o.veiculo} ${o.fornecedor} ${o.classificacao}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ordens, search, filtroSituacao, filtroTipo, filtroVeiculo]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl w-full p-0 flex flex-col overflow-hidden"
        style={{
          height: "85vh",
          background: "var(--sgt-bg-section)",
          borderColor: "var(--sgt-border-subtle)",
          borderRadius: "1rem",
        }}
      >
        <DialogTitle className="sr-only">Detalhamento de Ordens de Serviço</DialogTitle>

        {/* Dialog header */}
        <div className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
              Detalhamento
            </p>
            <p className="text-base font-black tracking-tight dark:text-white text-slate-800">
              Ordens de Serviço
            </p>
          </div>
          <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "var(--sgt-skeleton-bg)", color: "var(--sgt-text-secondary)" }}>
            {filtered.length} / {ordens.length} OS
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por ordem, veículo, fornecedor…"
              className="w-full h-8 pl-8 pr-8 text-xs rounded-lg outline-none transition-colors"
              style={{
                background: "var(--sgt-input-bg)",
                border: "1px solid var(--sgt-input-border)",
                color: "var(--sgt-text-primary)",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Select value={filtroVeiculo} onValueChange={setFiltroVeiculo}>
            <SelectTrigger className="h-8 text-xs w-[140px]"
              style={{ background: "var(--sgt-input-bg)", borderColor: "var(--sgt-input-border)" }}>
              <SelectValue placeholder="Veículo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos veículos</SelectItem>
              {veiculos.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
            <SelectTrigger className="h-8 text-xs w-[120px]"
              style={{ background: "var(--sgt-input-bg)", borderColor: "var(--sgt-input-border)" }}>
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todas</SelectItem>
              <SelectItem value="ANDAMENTO">Andamento</SelectItem>
              <SelectItem value="CONCLUIDO">Concluído</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-8 text-xs w-[110px]"
              style={{ background: "var(--sgt-input-bg)", borderColor: "var(--sgt-input-border)" }}>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos tipos</SelectItem>
              <SelectItem value="SERVICOEXTERNO">Externo</SelectItem>
              <SelectItem value="SERVICOINTERNO">Interno</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <ScrollArea className="flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10" style={{ background: "var(--sgt-table-head)" }}>
              <tr>
                {["Ordem", "Veículo", "Data", "Tipo", "Situação", "Classificação", "Fornecedor", "Custo"].map(h => (
                  <th key={h} className={cn(
                    "px-3 py-2 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500",
                    h === "Custo" && "text-right"
                  )}
                    style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const sit = SITUACAO_STYLE[o.situacao ?? ""] ?? SITUACAO_STYLE.INCONSISTENTE;
                return (
                  <tr key={o.ordem} className="transition-colors"
                    style={{ borderBottom: "1px solid var(--sgt-border-subtle)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--sgt-row-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}>
                    <td className="px-3 py-2.5 text-[11px] font-mono text-slate-500">{o.ordem}</td>
                    <td className="px-3 py-2.5 text-[11px] font-semibold dark:text-white text-slate-800">{o.veiculo || "—"}</td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500">{fmtData(o.dataordem)}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider",
                        o.tiposervico === "SERVICOEXTERNO" ? "text-cyan-400" : "text-violet-400")}>
                        {o.tiposervico === "SERVICOEXTERNO" ? "Ext" : o.tiposervico === "SERVICOINTERNO" ? "Int" : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", sit.bg, sit.text)}>
                        {sit.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500 max-w-[140px] truncate" title={o.classificacao ?? ""}>{o.classificacao || "—"}</td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500 max-w-[160px] truncate" title={o.fornecedor ?? ""}>{o.fornecedor || "—"}</td>
                    <td className="px-3 py-2.5 text-[11px] font-black text-right dark:text-white text-slate-800">{fmtBRL(o.totalCusto)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500">
                    Nenhuma OS encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
