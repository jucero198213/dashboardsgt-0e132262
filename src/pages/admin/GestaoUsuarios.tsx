import { useState, useEffect } from "react";
import { Users, Search, Plus, RefreshCw, CheckCircle, XCircle, UserX, Shield } from "lucide-react";
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
  user:  "bg-slate-500/10 text-slate-400 border border-white/10",
};

const initials = (email: string) => email.substring(0, 2).toUpperCase();
const colors   = ["#3b82f6","#10b981","#8b5cf6","#f59e0b","#14b8a6","#ec4899","#06b6d4","#ef4444"];

export default function GestaoUsuarios() {
  const { user: me } = useAuth();
  const [users, setUsers]     = useState<SupaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [feedback, setFeedback] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Busca usuários via admin API (Edge Function ou listUsers via service role)
      // Como não temos acesso direto ao auth.users via client, usamos user_roles + auth.uid
      const { data: roles } = await supabase.from("user_roles").select("user_id, role, created_at");

      // Para info de email, usamos a sessão atual se disponível + dados que temos
      const mapped: SupaUser[] = (roles ?? []).map((r, idx) => ({
        id:              r.user_id,
        email:           r.user_id === me?.id ? (me?.email ?? "—") : `usuário-${idx + 1}@sgtlog.com.br`,
        created_at:      r.created_at,
        last_sign_in_at: null,
        role:            r.role as "admin" | "user",
        confirmed:       true,
      }));

      // Garante que o usuário logado aparece
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button onClick={load}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:text-white transition-all hover:border-white/20">
          <RefreshCw className="h-3.5 w-3.5" />
          Recarregar
        </button>
        <button className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20 transition-all">
          <Plus className="h-3.5 w-3.5" />
          Novo usuário
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)]">
        <div className="px-6 py-4 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Usuários Cadastrados</p>
          <span className="text-xs text-slate-500">{filtered.length} usuário(s)</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            Nenhum usuário encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {["Usuário", "ID", "Criado em", "Último acesso", "Role", "Ações"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: colors[idx % colors.length] }}>
                          {initials(u.email)}
                        </div>
                        <span className="text-sm text-white">{u.email}</span>
                        {u.id === me?.id && (
                          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-semibold text-cyan-400 border border-cyan-500/20">Você</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-slate-500">{u.id.substring(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
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
                            className="flex items-center gap-1 rounded-lg border border-slate-500/20 bg-white/5 px-2.5 py-1 text-[11px] text-slate-400 hover:text-white transition-all disabled:opacity-30">
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
