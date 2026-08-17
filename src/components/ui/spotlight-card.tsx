import React, { useEffect, useRef, ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose';
  /** When true, only adds the glow border — no layout, padding, or shadow. */
  wrapper?: boolean;
}

const glowColorMap: Record<string, { base: number; spread: number }> = {
  blue:    { base: 220, spread: 200 },
  purple:  { base: 280, spread: 300 },
  green:   { base: 120, spread: 200 },
  red:     { base: 0,   spread: 200 },
  orange:  { base: 30,  spread: 200 },
  cyan:    { base: 185, spread: 160 },
  emerald: { base: 155, spread: 160 },
  amber:   { base: 38,  spread: 180 },
  violet:  { base: 270, spread: 200 },
  rose:    { base: 340, spread: 200 },
};

let styleInjected = false;
const GLOW_CSS = `
[data-glow]::before,
[data-glow]::after {
  pointer-events: none;
  content: "";
  position: absolute;
  inset: calc(var(--glow-border-size) * -1);
  border: var(--glow-border-size) solid transparent;
  border-radius: inherit;
  background-attachment: fixed;
  background-size: calc(100% + (2 * var(--glow-border-size))) calc(100% + (2 * var(--glow-border-size)));
  background-repeat: no-repeat;
  background-position: 50% 50%;
  mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
  mask-clip: padding-box, border-box;
  mask-composite: intersect;
}
[data-glow]::before {
  background-image: radial-gradient(
    calc(var(--glow-spot-size) * 0.75) calc(var(--glow-spot-size) * 0.75) at
    calc(var(--glow-x, 0) * 1px) calc(var(--glow-y, 0) * 1px),
    hsl(var(--glow-hue, 210) calc(var(--glow-sat, 100) * 1%) calc(var(--glow-lgt, 50) * 1%) / var(--glow-border-opacity, 1)),
    transparent 100%
  );
  filter: brightness(2);
}
[data-glow]::after {
  background-image: radial-gradient(
    calc(var(--glow-spot-size) * 0.5) calc(var(--glow-spot-size) * 0.5) at
    calc(var(--glow-x, 0) * 1px) calc(var(--glow-y, 0) * 1px),
    hsl(0 100% 100% / var(--glow-light-opacity, 1)),
    transparent 100%
  );
}
[data-glow] [data-glow-outer] {
  position: absolute;
  inset: 0;
  will-change: filter;
  opacity: var(--glow-outer, 1);
  border-radius: inherit;
  border-width: calc(var(--glow-border-size) * 20);
  filter: blur(calc(var(--glow-border-size) * 10));
  background: none;
  pointer-events: none;
  border: none;
}
[data-glow] > [data-glow-outer]::before {
  inset: -10px;
  border-width: 10px;
}
`;

function injectStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const el = document.createElement('style');
  el.textContent = GLOW_CSS;
  document.head.appendChild(el);
}

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glowColor = 'blue',
  wrapper = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectStyle();
    const syncPointer = (e: PointerEvent) => {
      if (cardRef.current) {
        cardRef.current.style.setProperty('--glow-x', e.clientX.toFixed(2));
        cardRef.current.style.setProperty('--glow-xp', (e.clientX / window.innerWidth).toFixed(2));
        cardRef.current.style.setProperty('--glow-y', e.clientY.toFixed(2));
      }
    };
    document.addEventListener('pointermove', syncPointer);
    return () => document.removeEventListener('pointermove', syncPointer);
  }, []);

  const { base, spread } = glowColorMap[glowColor] ?? glowColorMap.blue;

  const inlineVars: React.CSSProperties & Record<string, string | number> = {
    '--glow-base': base,
    '--glow-spread': spread,
    '--glow-border-size': '2px',
    '--glow-spot-size': '200px',
    '--glow-outer': '1',
    '--glow-hue': `calc(var(--glow-base) + (var(--glow-xp, 0) * var(--glow-spread, 0)))`,
    '--glow-sat': '100',
    '--glow-lgt': '70',
    '--glow-border-opacity': '1',
    '--glow-light-opacity': '1',
    position: 'relative' as const,
    backgroundImage: `radial-gradient(
      var(--glow-spot-size) var(--glow-spot-size) at
      calc(var(--glow-x, 0) * 1px) calc(var(--glow-y, 0) * 1px),
      hsl(var(--glow-hue, 210) calc(var(--glow-sat, 100) * 1%) calc(var(--glow-lgt, 70) * 1%) / 0.06),
      transparent
    )`,
    backgroundAttachment: 'fixed',
    backgroundSize: 'calc(100% + 4px) calc(100% + 4px)',
    backgroundPosition: '50% 50%',
  };

  if (wrapper) {
    return (
      <div
        ref={cardRef}
        data-glow
        style={inlineVars}
        className={`relative rounded-[inherit] ${className}`}
      >
        <div data-glow-outer />
        {children}
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      data-glow
      style={{
        ...inlineVars,
        backgroundColor: 'hsl(0 0% 60% / 0.12)',
        border: '2px solid hsl(0 0% 60% / 0.12)',
        touchAction: 'none',
      }}
      className={`rounded-2xl relative grid grid-rows-[1fr_auto] shadow-[0_1rem_2rem_-1rem_black] p-4 gap-4 backdrop-blur-[5px] ${className}`}
    >
      <div data-glow-outer />
      {children}
    </div>
  );
};

export { GlowCard };
export type { GlowCardProps };
