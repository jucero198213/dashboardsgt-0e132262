import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import React, { useRef } from "react";
import { cn } from "@/lib/utils";

type ScrollCharacterProps = {
  char: string;
  index: number;
  centerIndex: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  color?: string;
};

const ScrollCharacter: React.FC<ScrollCharacterProps> = ({
  char,
  index,
  centerIndex,
  scrollYProgress,
  color = "text-amber-400",
}) => {
  const isSpace = char === " ";
  const dist = index - centerIndex;

  const x = useTransform(scrollYProgress, [0, 0.5], [dist * 50, 0]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5], [dist * 40, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.5], [0.15, 0.6, 1]);

  return (
    <motion.span
      className={cn("inline-block", color, isSpace && "w-[0.35em]")}
      style={{ x, rotateX, opacity }}
    >
      {char}
    </motion.span>
  );
};

type ScrollIconProps = {
  icon: React.ElementType;
  index: number;
  centerIndex: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  iconColor?: string;
};

const ScrollIcon: React.FC<ScrollIconProps> = ({
  icon: Icon,
  index,
  centerIndex,
  scrollYProgress,
  iconColor = "text-amber-400/70",
}) => {
  const dist = index - centerIndex;

  const x = useTransform(scrollYProgress, [0, 0.5], [dist * 80, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], [Math.abs(dist) * 40, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.6, 1]);
  const rotate = useTransform(scrollYProgress, [0, 0.5], [dist * 30, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.5], [0.2, 0.7, 1]);

  return (
    <motion.div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] backdrop-blur-sm will-change-transform",
        iconColor,
      )}
      style={{ x, y, scale, rotate, opacity, transformOrigin: "center" }}
    >
      <Icon className="h-6 w-6" />
    </motion.div>
  );
};

interface ScrollTextSectionProps {
  text: string;
  subtitle?: string;
  color?: string;
  subtitleColor?: string;
  height?: string;
  className?: string;
  textClassName?: string;
  icons?: { icon: React.ElementType; color?: string }[];
}

const ScrollTextSection: React.FC<ScrollTextSectionProps> = ({
  text,
  subtitle,
  color = "text-amber-400",
  subtitleColor = "text-slate-400",
  height = "150vh",
  className,
  textClassName,
  icons,
}) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: targetRef });

  const chars = text.split("");
  const centerIndex = Math.floor(chars.length / 2);

  const subtitleOpacity = useTransform(scrollYProgress, [0.35, 0.55], [0, 1]);
  const subtitleY = useTransform(scrollYProgress, [0.35, 0.55], [20, 0]);

  if (reduce) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
        <h2 className={cn("text-[clamp(1.8rem,5vw,3.5rem)] font-black tracking-tight", color, textClassName)}>
          {text}
        </h2>
        {subtitle && (
          <p className={cn("mt-4 max-w-lg text-base leading-relaxed", subtitleColor)}>
            {subtitle}
          </p>
        )}
        {icons && (
          <div className="mt-6 flex items-center justify-center gap-4">
            {icons.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06]",
                    item.color ?? "text-amber-400/70",
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={targetRef}
      className={cn("relative flex items-center justify-center overflow-hidden", className)}
      style={{ height }}
    >
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center gap-6 px-4">
        <div
          className={cn(
            "w-full max-w-5xl text-center font-black tracking-tight",
            textClassName,
          )}
          style={{
            fontSize: "clamp(1.8rem, 5vw, 3.5rem)",
            perspective: "500px",
          }}
        >
          {chars.map((char, i) => (
            <ScrollCharacter
              key={i}
              char={char}
              index={i}
              centerIndex={centerIndex}
              scrollYProgress={scrollYProgress}
              color={color}
            />
          ))}
        </div>

        {subtitle && (
          <motion.p
            className={cn("max-w-lg text-center text-base leading-relaxed", subtitleColor)}
            style={{ opacity: subtitleOpacity, y: subtitleY }}
          >
            {subtitle}
          </motion.p>
        )}

        {icons && icons.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-5">
            {icons.map((item, i) => (
              <ScrollIcon
                key={i}
                icon={item.icon}
                index={i}
                centerIndex={Math.floor(icons.length / 2)}
                scrollYProgress={scrollYProgress}
                iconColor={item.color}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { ScrollCharacter, ScrollIcon, ScrollTextSection };
