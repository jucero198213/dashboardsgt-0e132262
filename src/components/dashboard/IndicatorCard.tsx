import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface IndicatorCardProps {
  nome: string;
  percentualReal: number;
  percentualEsperado: number;
}

function getDeltaInfo(real: number, esperado: number) {
  const delta = real - esperado;
  if (Math.abs(delta) < 1) return { label: "Dentro", icon: Minus, color: "text-primary", bg: "bg-primary/10" };
  if (delta > 0) return { label: "Acima", icon: TrendingUp, color: "text-destructive", bg: "bg-destructive/10" };
  return { label: "Abaixo", icon: TrendingDown, color: "text-accent", bg: "bg-accent/10" };
}

export function IndicatorCard({ nome, percentualReal, percentualEsperado }: IndicatorCardProps) {
  const navigate = useNavigate();
  const { label, icon: Icon, color, bg } = getDeltaInfo(percentualReal, percentualEsperado);
  const circumference = 2 * Math.PI * 36;
  const offsetReal = circumference - (Math.min(percentualReal, 100) / 100) * circumference;
  const offsetEsperado = circumference - (Math.min(percentualEsperado, 100) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border/50 bg-card p-5 transition-all duration-200 hover:border-border hover:bg-card-elevated">
      {/* Donut with two rings */}
      <div className="relative">
        <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
          {/* Background */}
          <circle cx="44" cy="44" r="36" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          {/* Expected (outer, dimmer) */}
          <circle
            cx="44" cy="44" r="36" fill="none"
            stroke="hsl(var(--muted-foreground) / 0.25)"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offsetEsperado}
            strokeLinecap="round"
          />
          {/* Real (overlaid) */}
          <circle
            cx="44" cy="44" r="30" fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="5"
            strokeDasharray={2 * Math.PI * 30}
            strokeDashoffset={2 * Math.PI * 30 - (Math.min(percentualReal, 100) / 100) * 2 * Math.PI * 30}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground">{percentualReal.toFixed(1)}%</span>
        </div>
      </div>

      {/* Label */}
      <span className="text-xs font-medium text-muted-foreground text-center leading-tight">{nome}</span>

      {/* Expected */}
      <span className="text-[10px] text-muted-foreground/70">
        Esperado: {percentualEsperado}%
      </span>

      {/* Delta badge */}
      <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${bg} ${color}`}>
        <Icon className="h-3 w-3" />
        {label}
      </div>

      {/* Detail button */}
      <button
        onClick={() => navigate(`/contas-a-pagar?indicador=${encodeURIComponent(nome)}`)}
        className="mt-1 text-[10px] font-medium text-muted-foreground/50 transition-colors hover:text-primary"
      >
        Ver detalhamento
      </button>
    </div>
  );
}
