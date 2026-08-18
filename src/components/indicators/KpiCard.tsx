import React from "react";
import { CountUp } from "@/components/shared/CountUp";
import { Card } from "@/components/ui/card";

export type KpiTone = "emerald" | "amber" | "cyan" | "violet" | "rose" | "orange" | "blue";

interface KpiCardProps {
  label: string;
  value: string;
  rawValue?: number;
  subtitle?: string;
  icon: React.ElementType;
  tone: KpiTone;
  loading?: boolean;
  onClick?: () => void;
}

const toneMap: Record<KpiTone, { iconColor: string; sub: string }> = {
  emerald: { iconColor: "text-emerald-400", sub: "text-emerald-600" },
  amber:   { iconColor: "text-amber-400",   sub: "text-amber-600"   },
  cyan:    { iconColor: "text-cyan-400",     sub: "text-cyan-600"   },
  violet:  { iconColor: "text-violet-400",   sub: "text-violet-600" },
  rose:    { iconColor: "text-rose-400",     sub: "text-rose-600"   },
  orange:  { iconColor: "text-orange-400",   sub: "text-orange-600" },
  blue:    { iconColor: "text-blue-400",     sub: "text-blue-600"   },
};

export function KpiCard({
  label, value, rawValue, subtitle, icon: Icon, tone, loading, onClick,
}: KpiCardProps) {
  const t = toneMap[tone];
  const isCurrency = value.startsWith("R$");
  const isPercent  = value.endsWith("%");

  return (
    <Card
      onClick={onClick}
      className={`group flex h-full min-h-[112px] flex-col rounded-xl transition-all duration-200 hover:border-white/[0.12]${onClick ? " cursor-pointer" : ""}`}
    >
      <div className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground leading-tight">
            {label}
          </p>
          <Icon className={`h-3.5 w-3.5 shrink-0 ${t.iconColor}`} />
        </div>

        <p className={`mt-auto pt-3 text-[clamp(1.1rem,2vw,1.4rem)] font-black leading-[1.15] tracking-[-0.04em] text-foreground${loading ? " animate-pulse" : ""}`}>
          {rawValue !== undefined && isCurrency ? (
            <CountUp value={rawValue} format="brl" />
          ) : rawValue !== undefined && isPercent ? (
            <CountUp value={rawValue} format="pct" />
          ) : (
            value
          )}
        </p>

        {subtitle && (
          <p className={`mt-1.5 text-[11px] font-medium ${t.sub}`}>
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  );
}
