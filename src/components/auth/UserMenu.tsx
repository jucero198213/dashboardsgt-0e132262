import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { LogOut, Shield, User, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const initials = (user.email ?? "U")[0].toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10 text-[10px] font-bold text-cyan-300">
          {initials}
        </div>
        <span className="hidden sm:inline max-w-[120px] truncate">{user.email}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-[rgba(14,20,40,0.98)] shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
          <div className="border-b border-white/5 px-4 py-3">
            <p className="text-xs font-medium text-white truncate">{user.email}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
              {isAdmin ? (
                <>
                  <Shield className="h-3 w-3 text-red-400" />
                  Administrador
                </>
              ) : (
                <>
                  <User className="h-3 w-3" />
                  Usuário
                </>
              )}
            </p>
          </div>

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Shield className="h-3.5 w-3.5 text-red-400" />
              Área Administrativa
            </Link>
          )}

          <button
            onClick={() => { setOpen(false); signOut(); }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-slate-300 transition-colors hover:bg-white/5 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
