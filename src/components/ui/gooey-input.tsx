"use client";

import {
  useState,
  useRef,
  useEffect,
  useId,
  useMemo,
  useCallback,
  type ChangeEvent,
} from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

function GooeyFilter({
  filterId,
  blur,
}: {
  filterId: string;
  blur: number;
}) {
  return (
    <svg className="absolute hidden h-0 w-0" aria-hidden>
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

const transition = {
  duration: 0.4,
  type: "spring" as const,
  bounce: 0.2,
};

export interface GooeyInputProps {
  placeholder?: string;
  className?: string;
  collapsedWidth?: number;
  expandedWidth?: number;
  gooeyBlur?: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

export function GooeyInput({
  placeholder = "Buscar...",
  className,
  collapsedWidth = 36,
  expandedWidth = 220,
  gooeyBlur = 5,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onOpenChange,
  disabled = false,
}: GooeyInputProps) {
  const reactId = useId();
  const safeId = reactId.replace(/:/g, "");
  const filterId = `gooey-filter-${safeId}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const prevExpandedRef = useRef(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);

  const isControlled = valueProp !== undefined;
  const searchText = isControlled ? valueProp : uncontrolledValue;

  const setSearchText = useCallback(
    (next: string) => {
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const setExpanded = useCallback(
    (next: boolean) => {
      setIsExpanded(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    } else if (prevExpandedRef.current) {
      setSearchText("");
    }
    prevExpandedRef.current = isExpanded;
  }, [isExpanded, setSearchText]);

  const widthVariants = useMemo(
    () => ({
      collapsed: { width: collapsedWidth },
      expanded: { width: expandedWidth },
    }),
    [collapsedWidth, expandedWidth],
  );

  const handleExpand = useCallback(() => {
    if (!disabled) setExpanded(true);
  }, [disabled, setExpanded]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value);
    },
    [setSearchText],
  );

  const handleBlur = useCallback(() => {
    if (!searchText) setExpanded(false);
  }, [searchText, setExpanded]);

  return (
    <div className={cn("relative flex items-center", className)}>
      <GooeyFilter filterId={filterId} blur={gooeyBlur} />

      <div
        className="relative flex h-8 items-center"
        style={{ filter: `url(#${filterId})` }}
      >
        <motion.button
          type="button"
          disabled={disabled}
          onClick={handleExpand}
          variants={widthVariants}
          initial="collapsed"
          animate={isExpanded ? "expanded" : "collapsed"}
          transition={transition}
          className="flex h-8 cursor-pointer items-center gap-2 rounded-xl border border-[var(--sgt-border-medium)] bg-[var(--sgt-bg-card)] px-2.5 text-slate-400 outline-none transition-colors hover:border-[var(--sgt-border-medium)] hover:bg-[var(--sgt-bg-surface)] focus-visible:border-amber-400/40 disabled:pointer-events-none disabled:opacity-50"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          {isExpanded && (
            <motion.input
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.2 }}
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={searchText}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={disabled}
              placeholder={placeholder}
              className="h-full min-w-0 flex-1 bg-transparent text-[11px] text-slate-200 outline-none placeholder:text-slate-500"
            />
          )}
        </motion.button>
      </div>
    </div>
  );
}
