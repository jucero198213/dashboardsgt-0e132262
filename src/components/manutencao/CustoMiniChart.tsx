"use client"

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { DailyCost } from "@/lib/manutencaoUtils";

interface Props {
  data: DailyCost[];
  totalCusto: number;
  loading?: boolean;
}

const fmtK = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")}M`
  : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(1).replace(".", ",")}k`
  : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CustoMiniChart({ data, totalCusto, loading }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [displayValue, setDisplayValue] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.custo)) : 1;

  useEffect(() => {
    if (hoveredIndex !== null && data[hoveredIndex]) {
      setDisplayValue(data[hoveredIndex].custo);
    }
  }, [hoveredIndex, data]);

  const handleContainerLeave = () => {
    setIsHovering(false);
    setHoveredIndex(null);
    setTimeout(() => setDisplayValue(null), 150);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleContainerLeave}
      className="group relative rounded-[14px] border p-4 flex flex-col gap-3 transition-all duration-500 h-full"
      style={{
        background: "var(--sgt-bg-card)",
        borderColor: "var(--sgt-border-subtle)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "rgba(123,110,245,0.9)" }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
            Custo no período
          </span>
        </div>

        {/* Valor: totalCusto por default, custo do dia ao hover */}
        <div className="relative h-6 flex items-center">
          <span
            className={cn(
              "text-[15px] font-black tracking-tight tabular-nums transition-all duration-300 ease-out",
              loading ? "animate-pulse" : "",
              isHovering && displayValue !== null
                ? "dark:text-white text-slate-800 opacity-100"
                : "dark:text-white text-slate-800",
            )}
            style={{ color: isHovering && displayValue !== null ? undefined : undefined }}
          >
            {loading
              ? "—"
              : isHovering && displayValue !== null
                ? fmtK(displayValue)
                : fmtK(totalCusto)
            }
          </span>
        </div>
      </div>

      {/* Bars */}
      {loading ? (
        <div className="flex items-end gap-1.5 flex-1 min-h-0">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-full animate-pulse"
              style={{
                height: `${40 + Math.random() * 32}px`,
                background: "var(--sgt-skeleton-bg)",
              }}
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <span className="text-[11px] text-slate-500">Sem dados no período</span>
        </div>
      ) : (
        <div className="flex items-end gap-1.5 flex-1 min-h-0">
          {data.map((item, index) => {
            const heightPct = Math.max((item.custo / maxValue) * 100, 2);
            const isHovered = hoveredIndex === index;
            const isAnyHovered = hoveredIndex !== null;
            const isNeighbor = hoveredIndex !== null &&
              (index === hoveredIndex - 1 || index === hoveredIndex + 1);

            return (
              <div
                key={item.date}
                className="relative flex-1 flex flex-col items-center justify-end h-full"
                onMouseEnter={() => setHoveredIndex(index)}
              >
                {/* Bar */}
                <div
                  className="w-full rounded-full cursor-pointer transition-all duration-300 ease-out origin-bottom"
                  style={{
                    height: `${heightPct}%`,
                    background: isHovered
                      ? "rgba(123,110,245,1)"
                      : isNeighbor
                        ? "rgba(123,110,245,0.35)"
                        : isAnyHovered
                          ? "rgba(123,110,245,0.1)"
                          : "rgba(123,110,245,0.3)",
                    transform: isHovered
                      ? "scaleX(1.15) scaleY(1.02)"
                      : isNeighbor
                        ? "scaleX(1.05)"
                        : "scaleX(1)",
                    boxShadow: isHovered ? "0 0 10px rgba(123,110,245,0.5)" : "none",
                  }}
                />

                {/* Label */}
                {(() => {
                  const skip = data.length > 15 ? Math.ceil(data.length / 14) : 1;
                  const showLabel = isHovered || index % skip === 0;
                  const label = data.length > 15
                    ? String(parseInt(item.date.split("/")[0], 10))
                    : item.date;
                  return (
                    <span
                      className={cn(
                        "text-[9px] font-medium mt-1.5 transition-all duration-300 text-center block",
                        isHovered ? "dark:text-white text-slate-700" : "text-slate-600",
                      )}
                      style={{ opacity: showLabel ? 1 : 0 }}
                    >
                      {label}
                    </span>
                  );
                })()}

                {/* Tooltip */}
                <div
                  className={cn(
                    "absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all duration-200 pointer-events-none",
                    isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
                  )}
                  style={{
                    background: "rgba(123,110,245,0.95)",
                    color: "#fff",
                    boxShadow: "0 2px 8px rgba(123,110,245,0.4)",
                  }}
                >
                  {fmtK(item.custo)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Glow on hover */}
      <div
        className="absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top, rgba(123,110,245,0.04), transparent 60%)" }}
      />
    </div>
  );
}
