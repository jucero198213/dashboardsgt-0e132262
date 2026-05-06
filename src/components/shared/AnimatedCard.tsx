import { forwardRef, useEffect, useState } from "react";

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  hover?: boolean; // habilita hover lift + shimmer sweep
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(function AnimatedCard(
  { children, delay = 0, className = "", hover = true },
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
      className={`relative overflow-hidden transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${hover ? "sgt-hover-lift sgt-shimmer-sweep" : ""} ${className}`}
    >
      {children}
    </div>
  );
});
