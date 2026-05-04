import React from "react";
import { ChevronDown } from "lucide-react";

interface SectionDividerProps {
  numero: 2 | 3;
  titulo: string;
  subtitulo?: string;
  icon?: React.ElementType;
  color?: "violet" | "blue";
}

const COLOR_MAP = {
  violet: {
    border: "border-violet-500/20",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    line: "from-transparent via-violet-500/30 to-transparent",
    badge: "bg-violet-500/10 border-violet-500/20 text-violet-400",
  },
  blue: {
    border: "border-blue-500/20",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    line: "from-transparent via-blue-500/30 to-transparent",
    badge: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  },
};

export function SectionDivider({
  numero,
  titulo,
  subtitulo,
  icon: Icon,
  color = "violet",
}: SectionDividerProps) {
  const c = COLOR_MAP[color];

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Seta indicando scroll */}
      <div className="flex flex-col items-center gap-1 opacity-40">
        <ChevronDown className="h-4 w-4 text-white/30 animate-bounce" />
      </div>

      {/* Linha divisória com badge central */}
      <div className="relative w-full flex items-center gap-4">
        <div className={`flex-1 h-px bg-gradient-to-r ${c.line}`} />
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${c.badge} flex-shrink-0`}>
          {Icon && <Icon className={`h-3.5 w-3.5 ${c.text}`} />}
          <span className={`text-[11px] font-semibold uppercase tracking-widest ${c.text}`}>
            Sessão {numero} — {titulo}
          </span>
        </div>
        <div className={`flex-1 h-px bg-gradient-to-l ${c.line}`} />
      </div>

      {subtitulo && (
        <p className="text-[11px] text-white/30 text-center">{subtitulo}</p>
      )}
    </div>
  );
}
