import { useState } from "react";
import { Building2, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const ANOS = ["2023", "2024", "2025", "2026"];

export function DashboardHeader() {
  const [mes, setMes] = useState("Fevereiro");
  const [ano, setAno] = useState("2024");

  return (
    <div className="mb-10">
      <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
        DETALHAMENTO — {mes.toUpperCase()}
      </h1>
      <p className="mt-2 text-muted-foreground text-sm lg:text-base">
        Visão consolidada financeira do período · Contas a Receber, Contas a Pagar e Indicadores
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-[160px] h-8 text-xs border-border/60 bg-secondary/50 text-muted-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ano} onValueChange={setAno}>
          <SelectTrigger className="w-[100px] h-8 text-xs border-border/60 bg-secondary/50 text-muted-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANOS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          Todas as Empresas
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Todos os Centros de Custo
        </div>
      </div>
    </div>
  );
}
