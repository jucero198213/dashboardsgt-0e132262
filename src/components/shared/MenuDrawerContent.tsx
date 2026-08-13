import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, Search, Star, Pencil, Check, X, ChevronRight,
  ExternalLink, Shield, LogOut, Sun, Moon, User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import { APP_NAV, type AppNavItem } from "./appNav";
import { useQuickAccess } from "./useQuickAccess";
import sgtLogo from "@/assets/sgt-logo.png";

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Corpo do drawer mobile (v2) — compartilhado por MobileNav e BottomNav.
 * Renderiza dentro de um <SheetContent>. Driven por APP_NAV (sync com a sidebar)
 * + Acesso Rápido com favoritos persistidos por usuário.
 */
export function MenuDrawerContent({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canAccess } = usePagePermissions();
  const { favItems, isFav, toggle, count, max } = useQuickAccess();

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notice, setNotice] = useState<{ text: string; warn: boolean } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const go = (item: AppNavItem) => {
    onClose();
    if (item.externalUrl)        window.open(item.externalUrl, "_blank", "noopener,noreferrer");
    else if (item.financeScreen) navigate(`/financeiro?s=${item.financeScreen}`);
    else if (item.to)            navigate(item.to);
  };

  const s = new URLSearchParams(location.search).get("s") ?? "painel";
  const isActive = (item: AppNavItem) => {
    if (item.financeScreen) return location.pathname === "/financeiro" && s === item.financeScreen;
    if (item.to) return location.pathname === item.to || location.pathname.startsWith(item.to + "/");
    return false;
  };

  const handleToggleFav = (id: string) => {
    const ok = toggle(id);
    if (!ok) {
      clearTimeout(noticeTimer.current);
      setNotice({ text: `Limite de ${max} atalhos. Remova um para adicionar outro.`, warn: true });
      noticeTimer.current = setTimeout(() => setNotice(null), 1600);
    }
  };

  const toggleEdit = () => setEditing((e) => !e);

  // Itens visíveis (permissão + esconde portais externos p/ diretoria), agrupados por seção.
  const sections = useMemo(() => {
    const visible = APP_NAV.filter(
      (item) =>
        (!item.module || canAccess(item.module)) &&
        (role !== "diretoria" || item.id !== "portal-visual"),
    );
    const q = norm(query.trim());
    const grouped: { title: string; items: AppNavItem[] }[] = [];
    visible.forEach((item) => {
      if (q && !norm(item.label).includes(q)) return;
      const title = item.section ?? grouped[grouped.length - 1]?.title ?? "Geral";
      const existing = grouped.find((g) => g.title === title);
      if (existing) existing.items.push(item);
      else grouped.push({ title, items: [item] });
    });
    return grouped;
  }, [canAccess, role, query]);

  const searching = query.trim().length > 0;
  const noResults = searching && sections.length === 0;
  const initials = (user?.email ?? "U")[0].toUpperCase();
  const homeActive = location.pathname === "/home";

  return (
    <div className="flex h-full flex-col">

      {/* ── Header: logo + busca ── */}
      <div className="border-b px-4 pb-3 pt-4"
        style={{ borderColor: "var(--sgt-border-subtle)", paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)" }}>
        <div className="mb-3 flex items-center gap-2">
          <img src={sgtLogo} alt="SGT" className="h-7 w-auto shrink-0 object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-extrabold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
              Workspace SGT
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">Menu</span>
          </div>
        </div>

        <div className="flex h-[42px] items-center gap-2 rounded-lg border bg-[var(--sgt-input-bg)] px-3 transition-colors focus-within:border-amber-400/50"
          style={{ borderColor: "var(--sgt-input-border)" }}>
          <Search className="h-4 w-4 shrink-0 text-[var(--sgt-text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar módulo..."
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--sgt-text-muted)]"
            style={{ color: "var(--sgt-text-primary)" }}
          />
          {searching && (
            <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca"
              className="shrink-0 text-[var(--sgt-text-muted)] transition-colors hover:text-[var(--sgt-text-secondary)]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Acesso Rápido (oculto durante busca) ── */}
      {!searching && (
        <div className="border-b px-4 pb-3 pt-3" style={{ borderColor: "var(--sgt-border-subtle)" }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--sgt-text-muted)" }}>
              Acesso rápido
            </span>
            <button type="button" onClick={toggleEdit}
              className="flex items-center gap-1.5 text-[12px] font-bold text-amber-400 transition-opacity active:opacity-70">
              {editing ? <><Check className="h-3.5 w-3.5" />Concluir</> : <><Pencil className="h-3.5 w-3.5" />Editar</>}
            </button>
          </div>

          {editing && (
            <p className={`mb-2 text-[11px] ${notice?.warn ? "font-semibold text-rose-400" : "text-[var(--sgt-text-muted)]"}`}>
              {notice?.text ?? `Toque na ⭐ dos módulos para fixar · até ${max}`}
            </p>
          )}

          {count === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--sgt-text-muted)" }}>
              Nenhum atalho fixado. Toque em <b className="text-amber-400">Editar</b> e marque seus módulos.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
              style={{ scrollbarWidth: "none" } as React.CSSProperties}>
              {favItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => (editing ? handleToggleFav(item.id) : go(item))}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border bg-[var(--sgt-input-bg)] py-1.5 pl-3 pr-3 transition-all active:scale-95"
                    style={{ borderColor: "var(--sgt-border-subtle)" }}
                  >
                    <Icon className="h-[15px] w-[15px] text-amber-400" />
                    <span className="whitespace-nowrap text-[12px] font-semibold" style={{ color: "var(--sgt-text-secondary)" }}>
                      {item.label}
                    </span>
                    {editing && (
                      <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white">
                        <X className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Navegação ── */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-none">

        {/* Início (oculto na busca) */}
        {!searching && (
          <div className="px-3 pb-1">
            <button type="button" onClick={() => { onClose(); navigate("/home"); }}
              className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2.5 text-left transition-all active:scale-[0.98] ${
                homeActive
                  ? "border-amber-400/30 bg-amber-400/[0.08]"
                  : "border-transparent hover:bg-white/[0.04] hover:border-[var(--sgt-border-subtle)]"
              }`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                homeActive ? "border-amber-400/30 bg-amber-400/10" : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]"
              }`}>
                <Home className={`h-4 w-4 ${homeActive ? "text-amber-400" : "text-[var(--sgt-text-muted)]"}`} />
              </div>
              <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>Início</span>
              {homeActive && <ChevronRight className="h-3.5 w-3.5 text-amber-400/60" />}
            </button>
          </div>
        )}

        {sections.map((section) => (
          <div key={section.title} className="px-3 pt-3 pb-1">
            <p className="px-1 pb-2 text-[9px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--sgt-text-muted)" }}>
              {section.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                const isPortal = !!item.portal;
                const fav = isFav(item.id);
                return (
                  <li key={item.id}>
                    <button type="button"
                      onClick={() => (editing ? handleToggleFav(item.id) : go(item))}
                      className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2.5 text-left transition-all active:scale-[0.98] ${
                        active
                          ? isPortal ? "border-cyan-400/40 bg-cyan-500/[0.12]" : "border-white/10 bg-white/[0.06]"
                          : "border-transparent hover:bg-white/[0.04] hover:border-[var(--sgt-border-subtle)]"
                      }`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                        isPortal
                          ? active ? "border-cyan-400/40 bg-cyan-500/[0.15]" : "border-cyan-500/20 bg-cyan-500/[0.08]"
                          : active ? "border-white/15 bg-white/[0.08]" : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)]"
                      }`}>
                        <Icon className={`h-4 w-4 ${isPortal ? (active ? "text-cyan-300" : "text-cyan-500") : "text-[var(--sgt-text-muted)]"}`} />
                      </div>
                      <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>
                        {item.label}
                      </span>

                      {editing ? (
                        <Star className={`h-[19px] w-[19px] shrink-0 transition-colors ${fav ? "fill-amber-400 text-amber-400" : "text-[var(--sgt-text-muted)]"}`} />
                      ) : (
                        <>
                          {typeof item.badge === "number" && item.badge > 0 && (
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white ${
                              item.badgeColor === "rose" ? "bg-rose-500" : "bg-rose-500"
                            }`}>
                              {item.badge}
                            </span>
                          )}
                          {isPortal
                            ? <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" style={{ color: "var(--sgt-text-muted)" }} />
                            : active && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {noResults && (
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: "var(--sgt-text-muted)" }}>
            Nenhum módulo encontrado.
          </div>
        )}
      </nav>

      {/* ── Footer do usuário ── */}
      <div className="border-t shrink-0" style={{ borderColor: "var(--sgt-border-subtle)" }}>
        {userOpen && (
          <div className="flex flex-col gap-0.5 border-b px-3 py-2"
            style={{ borderColor: "var(--sgt-border-subtle)", background: "var(--sgt-bg-section)" }}>
            <button type="button" onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all active:scale-[0.98] hover:bg-white/[0.04]">
              {theme === "dark" ? (
                <><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10">
                  <Sun className="h-3.5 w-3.5 text-amber-400" /></div>
                <span className="text-[12px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>Tema claro</span></>
              ) : (
                <><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10">
                  <Moon className="h-3.5 w-3.5 text-cyan-400" /></div>
                <span className="text-[12px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>Tema escuro</span></>
              )}
            </button>
            {isAdmin && (
              <button type="button" onClick={() => { onClose(); setUserOpen(false); navigate("/admin"); }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all active:scale-[0.98] hover:bg-white/[0.04]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10">
                  <Shield className="h-3.5 w-3.5 text-red-400" /></div>
                <span className="text-[12px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>Área Administrativa</span>
              </button>
            )}
            <button type="button" onClick={() => { onClose(); setUserOpen(false); signOut(); }}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all active:scale-[0.98] hover:bg-rose-500/[0.08]">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-400/25 bg-rose-400/10">
                <LogOut className="h-3.5 w-3.5 text-rose-400" /></div>
              <span className="text-[12px] font-semibold text-rose-300">Sair</span>
            </button>
          </div>
        )}

        {user && (
          <div style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)" }}>
            <button type="button" onClick={() => setUserOpen((o) => !o)}
              className="flex w-full items-center gap-3 px-4 py-3 transition-all active:scale-[0.98] hover:bg-white/[0.03]"
              style={{ WebkitTapHighlightColor: "transparent" }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-[13px] font-bold text-amber-300">
                {initials}
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[12px] font-semibold" style={{ color: "var(--sgt-text-primary)" }}>{user.email}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>
                  {isAdmin
                    ? <><Shield className="h-3 w-3 text-red-400" />Administrador</>
                    : role === "diretoria"
                      ? <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-violet-400">Diretoria</span>
                      : <><UserIcon className="h-3 w-3" />Usuário</>}
                </p>
              </div>
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200 ${userOpen ? "-rotate-90" : "rotate-90"}`} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
