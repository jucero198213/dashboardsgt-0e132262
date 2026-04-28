import { forwardRef, useEffect, useState } from "react";

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(function AnimatedCard(
  { children, delay = 0, className = "" },
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
      className={`transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
});
