import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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

  // Pre-filter by vehicle when opened from vehicle row
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[860px] p-0 flex flex-col">
        <SheetTitle className="sr-only">Detalhamento de Ordens de Serviço</SheetTitle>

        {/* Sheet header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Detalhamento
            </p>
            <p className="text-base font-black tracking-tight text-foreground">
              Ordens de Serviço
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto text-[9px] font-bold">
            {filtered.length} / {ordens.length} OS
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por ordem, veículo, fornecedor…"
              className="pl-8 h-8 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Select value={filtroVeiculo} onValueChange={setFiltroVeiculo}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Veículo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos veículos</SelectItem>
              {veiculos.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todas</SelectItem>
              <SelectItem value="ANDAMENTO">Andamento</SelectItem>
              <SelectItem value="CONCLUIDO">Concluído</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-8 text-xs w-[110px]">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] tracking-wider w-[90px]">Ordem</TableHead>
                <TableHead className="text-[10px] tracking-wider">Veículo</TableHead>
                <TableHead className="text-[10px] tracking-wider w-[90px]">Data</TableHead>
                <TableHead className="text-[10px] tracking-wider w-[80px]">Tipo</TableHead>
                <TableHead className="text-[10px] tracking-wider w-[100px]">Situação</TableHead>
                <TableHead className="text-[10px] tracking-wider">Classificação</TableHead>
                <TableHead className="text-[10px] tracking-wider">Fornecedor</TableHead>
                <TableHead className="text-[10px] tracking-wider text-right w-[100px]">Custo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(o => {
                const sit = SITUACAO_STYLE[o.situacao ?? ""] ?? SITUACAO_STYLE.INCONSISTENTE;
                return (
                  <TableRow key={o.ordem}>
                    <TableCell className="text-[11px] font-mono text-muted-foreground">{o.ordem}</TableCell>
                    <TableCell className="text-[11px] font-semibold">{o.veiculo || "—"}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">{fmtData(o.dataordem)}</TableCell>
                    <TableCell>
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider", o.tiposervico === "SERVICOEXTERNO" ? "text-cyan-400" : "text-violet-400")}>
                        {o.tiposervico === "SERVICOEXTERNO" ? "Ext" : o.tiposervico === "SERVICOINTERNO" ? "Int" : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", sit.bg, sit.text)}>
                        {sit.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground max-w-[140px] truncate" title={o.classificacao ?? ""}>{o.classificacao || "—"}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground max-w-[160px] truncate" title={o.fornecedor ?? ""}>{o.fornecedor || "—"}</TableCell>
                    <TableCell className="text-[11px] font-black text-right text-foreground">{fmtBRL(o.totalCusto)}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-10">
                    Nenhuma OS encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
