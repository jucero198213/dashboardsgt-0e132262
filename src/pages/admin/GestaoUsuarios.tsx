import { useState, useEffect } from "react";
import { Search, Plus, RefreshCw, CheckCircle, XCircle, UserX, Shield, X, Copy, Trash2,
  Landmark, Briefcase, Truck, ShoppingCart, UserCog, Headphones, Sparkles, Globe, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { type AppModule, ALL_MODULES } from "@/hooks/usePagePermissions";


const MODULE_META: Record<AppModule, { label: string; icon: React.ElementType; color: string; border: string; bg: string }> = {
  financeiro: { label: "Financeiro", icon: Landmark,    color: "text-amber-300",  border: "border-amber-400/30",  bg: "bg-amber-400/10"  },
  gestao:     { label: "Gestão",     icon: Briefcase,   color: "text-violet-300", border: "border-violet-400/30", bg: "bg-violet-400/10" },
  operacao:   { label: "Operação",   icon: Truck,       color: "text-cyan-300",   border: "border-cyan-400/30",   bg: "bg-cyan-400/10"   },
  compras:    { label: "Compras",    icon: ShoppingCart,color: "text-emerald-300",border: "border-emerald-400/30",bg: "bg-emerald-400/10"},
  rh:         { label: "RH",         icon: UserCog,     color: "text-pink-300",   border: "border-pink-400/30",   bg: "bg-pink-400/10"   },
  suporte:             { label: "Suporte",         icon: Headphones, color: "text-blue-300",    border: "border-blue-400/30",    bg: "bg-blue-400/10"    },
  "portal-receitaflow":{ label: "ReceitaFlow",     icon: Sparkles,   color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "portal-visual":     { label: "Visual Rodopar",  icon: Globe,      color: "text-cyan-300",    border: "border-cyan-400/30",    bg: "bg-cyan-400/10"    },
  "portal-wr":         { label: "Portal WR SGT",   icon: Monitor,    color: "text-emerald-300", border: "border-emerald-400/30", bg: "bg-emerald-400/10" },
};

interface SupaUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: "admin" | "user" | "diretoria";
  confirmed: boolean;
  modules: Set<AppModule>;
}

const roleStyle: Record<string, string> = {
  admin:     "bg-red-500/10 text-red-400 border border-red-500/20",
  diretoria: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  user:      "bg-slate-500/10 sgt-text-2 border border-[var(--sgt-border-subtle)]",
};

const initials = (email: string) => email.substring(0, 2).toUpperCase();
const colors   = ["#3b82f6","#10b981","#8b5cf6","#f59e0b","#14b8a6","#ec4899","#06b6d4","#ef4444"];

export default function GestaoUsuarios() {
  const { user: me } = useAuth();
  const [users, setUsers]     = useState<SupaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [feedback, setFeedback] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin" | "diretoria">("user");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: roles }, { data: pagePerms }, listRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role, created_at"),
        supabase.from("page_permissions").select("user_id, page"),
        supabase.functions.invoke("list-users"),
      ]);

      // Mapa de emails reais vindos da Edge Function
      const emailMap = new Map<string, string>();
      if (!listRes.error && listRes.data?.users) {
        (listRes.data.users as { id: string; email: string }[]).forEach(u => {
          emailMap.set(u.id, u.email);
        });
      }

      const modulesByUser = new Map<string, Set<AppModule>>();
      (pagePerms ?? []).forEach((p) => {
        if (!ALL_MODULES.includes(p.page as AppModule)) return;
        const set = modulesByUser.get(p.user_id) ?? new Set<AppModule>();
        set.add(p.page as AppModule);
        modulesByUser.set(p.user_id, set);
      });

      const mapped: SupaUser[] = (roles ?? []).map((r) => ({
        id:              r.user_id,
        email:           emailMap.get(r.user_id) ?? me?.email ?? "—",
        created_at:      r.created_at,
        last_sign_in_at: null,
        role:            r.role as "admin" | "user" | "diretoria",
        confirmed:       true,
        modules:         modulesByUser.get(r.user_id) ?? new Set<AppModule>(),
      }));
      if (me && !mapped.find((u) => u.id === me.id)) {
        mapped.unshift({
          id: me.id, email: me.email ?? "—",
          created_at: me.created_at ?? new Date().toISOString(),
          last_sign_in_at: me.last_sign_in_at ?? null,
          role: "admin", confirmed: !!me.email_confirmed_at,
          modules: new Set<AppModule>(ALL_MODULES),
        });
      }
      setUsers(mapped);
    } catch (e) {
      setFeedback({ msg: "Erro ao carregar usuários.", type: "err" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, newRole: "admin" | "user" | "diretoria") => {
    // Delete all existing role rows for this user, then insert the new one.
    // (upsert without an id always INSERTs, creating duplicate rows and
    //  breaking maybeSingle() in fetchRole)
    const { error: delErr } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (delErr) { setFeedback({ msg: "Erro ao alterar role.", type: "err" }); return; }

    const { error: insErr } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole } as any);
    if (insErr) { setFeedback({ msg: "Erro ao alterar role.", type: "err" }); return; }

    setFeedback({ msg: "Role atualizada com sucesso.", type: "ok" });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    setTimeout(() => setFeedback(null), 3000);
  };

  const toggleModule = async (userId: string, mod: AppModule, currentlyHas: boolean) => {
    if (currentlyHas) {
      const { error } = await supabase
        .from("page_permissions")
        .delete()
        .eq("user_id", userId)
        .eq("page", mod as never);
      if (error) { setFeedback({ msg: "Erro ao revogar permissão.", type: "err" }); return; }
    } else {
      const { error } = await supabase
        .from("page_permissions")
        .insert({ user_id: userId, page: mod } as never);
      if (error) { setFeedback({ msg: "Erro ao conceder permissão.", type: "err" }); return; }
    }
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId) return u;
      const next = new Set(u.modules);
      if (currentlyHas) next.delete(mod); else next.add(mod);
      return { ...u, modules: next };
    }));
    setFeedback({ msg: "Permissão atualizada.", type: "ok" });
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (error || data?.error) {
        setFeedback({ msg: data?.error || "Erro ao excluir usuário.", type: "err" });
      } else {
        setFeedback({ msg: "Usuário excluído com sucesso.", type: "ok" });
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch {
      setFeedback({ msg: "Erro ao excluir usuário.", type: "err" });
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail) {
      setFeedback({ msg: "Preencha o email.", type: "err" });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: newEmail, role: newRole },
      });

      if (error || data?.error) {
        setFeedback({ msg: data?.error || "Erro ao criar usuário.", type: "err" });
      } else {
        setGeneratedCode(data?.access_code || null);
        setFeedback({ msg: "Usuário criado com sucesso!", type: "ok" });
        setNewEmail("");
        setNewRole("user");
        load();
      }
    } catch (e) {
      setFeedback({ msg: "Erro ao criar usuário.", type: "err" });
    } finally {
      setCreating(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {feedback && (
        <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm border ${
          feedback.type === "ok"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {feedback.type === "ok" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {feedback.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--sgt-text-muted)]" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email..."
            className="w-full rounded-xl border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] py-2 pl-9 pr-4 text-sm sgt-text placeholder:text-[var(--sgt-text-faint)] focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button onClick={load}
          className="flex items-center gap-2 rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-2 text-sm sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all hover:border-[var(--sgt-border-medium)]">
          <RefreshCw className="h-3.5 w-3.5" />
          Recarregar
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20 transition-all">
          <Plus className="h-3.5 w-3.5" />
          Novo usuário
        </button>
      </div>

      {/* Modal Criar Usuário */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--sgt-border-subtle)] sgt-bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--sgt-divider)] px-6 py-4">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold sgt-text">
                  {generatedCode ? "Código de acesso gerado" : "Cadastrar novo usuário"}
                </h3>
              </div>
              <button onClick={() => { setShowModal(false); setNewEmail(""); setNewRole("user"); setGeneratedCode(null); }}
                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--sgt-input-hover)]">
                <X className="h-4 w-4 sgt-text-2" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-5">
              {generatedCode ? (
                <>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <p className="text-[12px] text-emerald-300 leading-relaxed">
                      Usuário criado com sucesso! Envie o código abaixo para o usuário. Ele usará esse código junto com seu email na tela de <strong>Primeiro Acesso</strong>.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">Código de acesso</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em] text-amber-300">
                        {generatedCode}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedCode);
                          setFeedback({ msg: "Código copiado!", type: "ok" });
                          setTimeout(() => setFeedback(null), 2000);
                        }}
                        className="rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-3 text-sm sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all"
                        title="Copiar código"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <p className="text-[12px] text-amber-300 leading-relaxed">
                      ⚠️ Este código só pode ser usado uma vez. Guarde-o em local seguro até enviar ao usuário.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Info */}
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <p className="text-[12px] text-amber-300 leading-relaxed">
                      Ao cadastrar, um código de acesso será gerado. Envie esse código ao usuário para que ele defina sua senha no <strong>Primeiro Acesso</strong>.
                    </p>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">Email</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="usuario@empresa.com.br"
                      className="w-full rounded-xl border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] px-4 py-2.5 text-sm sgt-text placeholder:text-[var(--sgt-text-faint)] focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Role */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">Permissão</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNewRole("user")}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                          newRole === "user"
                            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                            : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] sgt-text-2"
                        }`}
                      >
                        Usuário
                      </button>
                      <button
                        onClick={() => setNewRole("diretoria")}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                          newRole === "diretoria"
                            ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                            : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] sgt-text-2"
                        }`}
                      >
                        Diretoria
                      </button>
                      <button
                        onClick={() => setNewRole("admin")}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                          newRole === "admin"
                            ? "border-red-500/30 bg-red-500/10 text-red-400"
                            : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] sgt-text-2"
                        }`}
                      >
                        Admin
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[var(--sgt-divider)] px-6 py-4">
              {generatedCode ? (
                <button
                  onClick={() => { setShowModal(false); setGeneratedCode(null); }}
                  className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 transition-all"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Fechar
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { setShowModal(false); setNewEmail(""); setNewRole("user"); }}
                    className="rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-2 text-sm sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateUser}
                    disabled={creating || !newEmail}
                    className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {creating ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    {creating ? "Cadastrando..." : "Cadastrar"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-hidden rounded-[20px] border border-[var(--sgt-border-subtle)] sgt-bg-card">
        <div className="px-6 py-4 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] sgt-text-2">Usuários Cadastrados</p>
          <span className="text-xs text-[var(--sgt-text-muted)]">{filtered.length} usuário(s)</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm sgt-text-2">
            Nenhum usuário encontrado
          </div>
        ) : (
          <>
            {/* ── Cards mobile (< md) ── */}
            <div className="md:hidden divide-y divide-[var(--sgt-divider)]">
              {filtered.map((u, idx) => (
                <div key={u.id} className="p-4 space-y-3">
                  {/* Cabeçalho do card */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold [color:var(--sgt-text-primary)]"
                        style={{ background: colors[idx % colors.length] }}>
                        {initials(u.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm sgt-text">{u.email}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleStyle[u.role]}`}>{u.role}</span>
                          {u.id === me?.id && <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-semibold text-cyan-400 border border-cyan-500/20">Você</span>}
                        </div>
                      </div>
                    </div>
                    {/* Ações */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {u.role === "admin" ? (
                        <button onClick={() => changeRole(u.id, "user")} disabled={u.id === me?.id}
                          className="flex items-center gap-1 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2.5 py-1.5 text-[11px] sgt-text-2 transition-all disabled:opacity-30">
                          <UserX className="h-3 w-3" /> User
                        </button>
                      ) : u.role === "diretoria" ? (
                        <>
                          <button onClick={() => changeRole(u.id, "user")}
                            className="flex items-center gap-1 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2.5 py-1.5 text-[11px] sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all">
                            <UserX className="h-3 w-3" /> User
                          </button>
                          <button onClick={() => changeRole(u.id, "admin")}
                            className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300 hover:bg-red-500/20 transition-all">
                            <Shield className="h-3 w-3" /> Admin
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => changeRole(u.id, "diretoria")}
                            className="flex items-center gap-1 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1.5 text-[11px] text-violet-300 hover:bg-violet-500/20 transition-all">
                            Dir.
                          </button>
                          <button onClick={() => changeRole(u.id, "admin")}
                            className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300 hover:bg-red-500/20 transition-all">
                            <Shield className="h-3 w-3" /> Admin
                          </button>
                        </>
                      )}
                      {u.id !== me?.id && (
                        <button onClick={() => setDeleteConfirm(u.id)}
                          className="flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Módulos */}
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)] mb-2">Módulos</p>
                    {u.role === "admin" ? (
                      <span className="text-[11px] italic text-[var(--sgt-text-muted)]">acesso total</span>
                    ) : u.role === "diretoria" ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-violet-400">
                        <Briefcase className="h-3.5 w-3.5" />
                        Gestão — automático
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_MODULES.map((mod) => {
                          const meta = MODULE_META[mod];
                          const ModIcon = meta.icon;
                          const has = u.modules.has(mod);
                          return (
                            <button key={mod} onClick={() => toggleModule(u.id, mod, has)}
                              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
                                has ? `${meta.border} ${meta.bg} ${meta.color}` : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-[var(--sgt-text-muted)]"
                              }`}>
                              <ModIcon className="h-3.5 w-3.5" /> {meta.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Tabela desktop (≥ md) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--sgt-divider)]">
                    {["Usuário", "ID", "Criado em", "Role", "Módulos", "Ações"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, idx) => (
                    <tr key={u.id} className="border-b border-[var(--sgt-divider)] hover:bg-[var(--sgt-row-hover)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold [color:var(--sgt-text-primary)]"
                            style={{ background: colors[idx % colors.length] }}>
                            {initials(u.email)}
                          </div>
                          <span className="text-sm sgt-text">{u.email}</span>
                          {u.id === me?.id && (
                            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-semibold text-cyan-400 border border-cyan-500/20">Você</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] text-[var(--sgt-text-muted)]">{u.id.substring(0, 8)}…</span>
                      </td>
                      <td className="px-4 py-3 text-sm sgt-text-2">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${roleStyle[u.role]}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.role === "admin" ? (
                          <span className="text-[11px] italic text-[var(--sgt-text-muted)]">acesso total</span>
                        ) : u.role === "diretoria" ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-400">
                            <Briefcase className="h-3 w-3" />
                            Gestão — automático
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {ALL_MODULES.map((mod) => {
                              const meta = MODULE_META[mod];
                              const ModIcon = meta.icon;
                              const has = u.modules.has(mod);
                              return (
                                <button key={mod} onClick={() => toggleModule(u.id, mod, has)}
                                  title={has ? `Revogar ${meta.label}` : `Liberar ${meta.label}`}
                                  className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-all ${
                                    has ? `${meta.border} ${meta.bg} ${meta.color} hover:opacity-80` : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-[var(--sgt-text-muted)] hover:text-[var(--sgt-text-secondary)]"
                                  }`}>
                                  <ModIcon className="h-3 w-3" /> {meta.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.role === "admin" ? (
                            <button onClick={() => changeRole(u.id, "user")} disabled={u.id === me?.id}
                              className="flex items-center gap-1 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2.5 py-1 text-[11px] sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all disabled:opacity-30">
                              <UserX className="h-3 w-3" /> User
                            </button>
                          ) : u.role === "diretoria" ? (
                            <>
                              <button onClick={() => changeRole(u.id, "user")}
                                className="flex items-center gap-1 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2.5 py-1 text-[11px] sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all">
                                <UserX className="h-3 w-3" /> User
                              </button>
                              <button onClick={() => changeRole(u.id, "admin")}
                                className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-300 hover:bg-red-500/20 transition-all">
                                <Shield className="h-3 w-3" /> Admin
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => changeRole(u.id, "diretoria")}
                                className="flex items-center gap-1 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-300 hover:bg-violet-500/20 transition-all">
                                Dir.
                              </button>
                              <button onClick={() => changeRole(u.id, "admin")}
                                className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-300 hover:bg-red-500/20 transition-all">
                                <Shield className="h-3 w-3" /> Admin
                              </button>
                            </>
                          )}
                          {u.id !== me?.id && (
                            <button onClick={() => setDeleteConfirm(u.id)}
                              className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-400 hover:bg-red-500/20 transition-all">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal Confirmar Exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--sgt-border-subtle)] sgt-bg-card shadow-2xl">
            <div className="flex items-center gap-2 border-b border-[var(--sgt-divider)] px-6 py-4">
              <Trash2 className="h-4 w-4 text-red-400" />
              <h3 className="text-sm font-semibold sgt-text">Excluir usuário</h3>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm sgt-text-2">
                Tem certeza que deseja excluir este usuário? Esta ação é <strong className="text-red-400">irreversível</strong>.
              </p>
              <p className="text-xs font-mono text-[var(--sgt-text-muted)]">
                {users.find((u) => u.id === deleteConfirm)?.email}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[var(--sgt-divider)] px-6 py-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-2 text-sm sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirm)}
                disabled={deleting}
                className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
