import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

const statusConfig = {
  "Em Aberto": {
    className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 dark:text-cyan-300 light:text-cyan-700",
    icon: Clock,
  },
  "Vencido": {
    className: "border-red-500/30 bg-red-500/10 text-red-400 dark:text-red-400 light:text-red-700",
    icon: AlertTriangle,
  },
  "Parcial": {
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300 dark:text-amber-300 light:text-amber-700",
    icon: CheckCircle2,
  },
};

export function StatusBadge({ status }: { status: "Em Aberto" | "Vencido" | "Parcial" }) {
  const { className, icon: Icon } = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${className}`}>
      <Icon className="h-2.5 w-2.5 shrink-0" />
      {status}
    </span>
  );
}
