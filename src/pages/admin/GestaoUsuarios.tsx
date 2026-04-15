import { useState, useEffect } from "react";
import { Users, Search, Plus, RefreshCw, CheckCircle, XCircle, UserX, Shield, X, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SupaUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: "admin" | "user";
  confirmed: boolean;
}

const roleStyle: Record<string, string> = {
  admin: "bg-red-500/10 text-red-400 border border-red-500/20",
  user:  "bg-slate-500/10 sgt-text-2 border border-[var(--sgt-border-subtle)]",
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
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [showPassword, setShowPassword] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role, created_at");
      const mapped: SupaUser[] = (roles ?? []).map((r, idx) => ({
        id:              r.user_id,
        email:           r.user_id === me?.id ? (me?.email ?? "—") : `usuário-${idx + 1}@sgtlog.com.br`,
        created_at:      r.created_at,
        last_sign_in_at: null,
        role:            r.role as "admin" | "user",
        confirmed:       true,
      }));
      if (me && !mapped.find((u) => u.id === me.id)) {
        mapped.unshift({
          id: me.id, email: me.email ?? "—",
          created_at: me.created_at ?? new Date().toISOString(),
          last_sign_in_at: me.last_sign_in_at ?? null,
          role: "admin", confirmed: !!me.email_confirmed_at,
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

  const changeRole = async (userId: string, newRole: "admin" | "user") => {
    const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role: newRole });
    if (error) { setFeedback({ msg: "Erro ao alterar role.", type: "err" }); return; }
    setFeedback({ msg: "Role atualizada com sucesso.", type: "ok" });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) {
      setFeedback({ msg: "Preencha email e senha.", type: "err" });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({ msg: "Senha deve ter no mínimo 6 caracteres.", type: "err" });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: newEmail, password: newPassword, role: newRole },
      });

      if (error || data?.error) {
        setFeedback({ msg: data?.error || "Erro ao criar usuário.", type: "err" });
      } else {
        setFeedback({ msg: "Usuário criado com sucesso!", type: "ok" });
        setShowModal(false);
        setNewEmail("");
        setNewPassword("");
        setNewRole("user");
        setShowPassword(false);
        load();
      }
    } catch (e) {
      setFeedback({ msg: "Erro ao criar usuário.", type: "err" });
    } finally {
      setCreating(false);
      setTimeout(() => setFeedback(null), 3000);
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
                <h3 className="text-sm font-semibold sgt-text">Criar novo usuário</h3>
              </div>
              <button onClick={() => { setShowModal(false); setNewEmail(""); setNewPassword(""); setNewRole("user"); setShowPassword(false); }}
                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--sgt-input-hover)]">
                <X className="h-4 w-4 sgt-text-2" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-5">
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

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] px-4 py-2.5 pr-10 text-sm sgt-text placeholder:text-[var(--sgt-text-faint)] focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sgt-text-muted)] hover:text-[var(--sgt-text-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">Permissão</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewRole("user")}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                      newRole === "user"
                        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                        : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] sgt-text-2"
                    }`}
                  >
                    Usuário
                  </button>
                  <button
                    onClick={() => setNewRole("admin")}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                      newRole === "admin"
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] sgt-text-2"
                    }`}
                  >
                    Administrador
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[var(--sgt-divider)] px-6 py-4">
              <button
                onClick={() => { setShowModal(false); setNewEmail(""); setNewPassword(""); setNewRole("user"); setShowPassword(false); }}
                className="rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-2 text-sm sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                disabled={creating || !newEmail || !newPassword}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {creating ? "Criando..." : "Criar usuário"}
              </button>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--sgt-divider)]">
                  {["Usuário", "ID", "Criado em", "Último acesso", "Role", "Ações"].map((h) => (
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
                    <td className="px-4 py-3 text-sm sgt-text-2">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${roleStyle[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {u.role !== "admin" ? (
                          <button onClick={() => changeRole(u.id, "admin")}
                            className="flex items-center gap-1 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-300 hover:bg-violet-500/20 transition-all">
                            <Shield className="h-3 w-3" /> Admin
                          </button>
                        ) : (
                          <button onClick={() => changeRole(u.id, "user")} disabled={u.id === me?.id}
                            className="flex items-center gap-1 rounded-lg border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2.5 py-1 text-[11px] sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all disabled:opacity-30">
                            <UserX className="h-3 w-3" /> User
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
