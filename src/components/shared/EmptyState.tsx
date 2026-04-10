import { FileX } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title = "Nenhum dado encontrado",
  description = "Não há registros para exibir com os filtros selecionados.",
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 mb-4">
        {icon ?? <FileX className="h-7 w-7 text-slate-500" />}
      </div>
      <p className="text-sm font-medium text-slate-300 mb-1">{title}</p>
      <p className="text-xs text-slate-500 text-center max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
