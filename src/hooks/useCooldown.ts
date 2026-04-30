import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hora

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function useCooldown(storageKey: string) {
  const { isAdmin } = useAuth();

  const getRemaining = () => {
    if (isAdmin) return 0;
    try {
      const last = parseInt(localStorage.getItem(storageKey) ?? "0", 10);
      if (!last) return 0;
      const rem = COOLDOWN_MS - (Date.now() - last);
      return rem > 0 ? rem : 0;
    } catch { return 0; }
  };

  const [remaining, setRemaining] = useState<number>(getRemaining);

  // Countdown tick
  useEffect(() => {
    if (isAdmin || remaining <= 0) return;
    const iv = window.setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r <= 0) clearInterval(iv);
    }, 1000);
    return () => clearInterval(iv);
  }, [remaining, isAdmin]);

  const start = () => {
    if (isAdmin) return;
    try { localStorage.setItem(storageKey, String(Date.now())); } catch { /* ignora */ }
    setRemaining(COOLDOWN_MS);
  };

  const canFetch = isAdmin || remaining <= 0;
  const countdown = formatCountdown(remaining);

  return { canFetch, remaining, countdown, start, isAdmin };
}
