import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  value: number;
  duration?: number;
  prefix?: string;
  format?: "currency" | "percent" | "number";
  decimals?: number;
}

export function CountUp({
  value,
  duration = 1200,
  prefix = "",
  format = "currency",
  decimals,
}: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const diff = value - start;
    if (Math.abs(diff) < 0.01) {
      setDisplay(value);
      return;
    }

    const startTime = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = start + diff * ease;
      setDisplay(current);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else prevValue.current = value;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const formatted = (() => {
    switch (format) {
      case "currency":
        return display.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      case "percent":
        return `${display.toFixed(decimals ?? 1)}%`;
      case "number":
        return display.toLocaleString("pt-BR", {
          minimumFractionDigits: decimals ?? 0,
          maximumFractionDigits: decimals ?? 0,
        });
      default:
        return String(display);
    }
  })();

  return (
    <>
      {prefix}
      {formatted}
    </>
  );
}
