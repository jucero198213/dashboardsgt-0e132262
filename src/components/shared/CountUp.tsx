import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  value: number;
  duration?: number;
  format?: "brl" | "int" | "pct" | "kmL" | "short";
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function CountUp({
  value,
  duration = 1100,
  format = "brl",
  prefix = "",
  suffix = "",
  decimals,
}: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const diff = value - start;
    if (Math.abs(diff) < 0.01) { setDisplay(value); return; }

    const startTime = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing: exponential out — acelera no começo, desacelera no fim
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(start + diff * ease);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else prevValue.current = value;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const fmt = (v: number): string => {
    switch (format) {
      case "brl":
        return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: decimals ?? 2, maximumFractionDigits: decimals ?? 2 });
      case "int":
        return Math.round(v).toLocaleString("pt-BR");
      case "pct":
        return `${v.toFixed(decimals ?? 1)}%`;
      case "kmL":
        return `${v.toFixed(decimals ?? 2)} km/L`;
      case "short":
        if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toFixed(1).replace(".", ",")}M`;
        if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}k`;
        return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
      default:
        return v.toLocaleString("pt-BR");
    }
  };

  return <>{prefix}{fmt(display)}{suffix}</>;
}
