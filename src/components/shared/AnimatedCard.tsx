import { forwardRef, useEffect, useState } from "react";

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  hover?: boolean; // habilita hover lift + shimmer sweep
  bare?: boolean;  // sem moldura de card: remove overflow-hidden e efeitos (ex.: modo TV)
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(function AnimatedCard(
  { children, delay = 0, className = "", hover = true, bare = false },
  ref,
) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`relative transition-all duration-500 ease-out ${bare ? "" : "overflow-hidden"} ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${hover && !bare ? "sgt-hover-lift sgt-shimmer-sweep" : ""} ${className}`}
    >
      {children}
    </div>
  );
});
