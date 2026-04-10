import { Badge } from "@/components/ui/badge";

const statusConfig = {
  "Em Aberto": "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/10",
  "Vencido": "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/10",
  "Parcial": "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/10",
};

export function StatusBadge({ status }: { status: "Em Aberto" | "Vencido" | "Parcial" }) {
  return (
    <Badge variant="outline" className={statusConfig[status]}>
      {status}
    </Badge>
  );
}
