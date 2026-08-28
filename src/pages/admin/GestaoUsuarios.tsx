import { useState, useEffect, useMemo } from "react";
import { Search, Plus, RefreshCw, CheckCircle, XCircle, UserX, Shield, X, Trash2,
  Landmark, Briefcase, Truck, ShoppingCart, UserCog, Headphones, Sparkles, Globe, BotMessageSquare,
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, RefreshCcw, FileBarChart, Activity, TrendingUp,
  Scale, Building2, Users, Tag, MapPin, Wrench, Fuel, Wallet, Banknote,
  LineChart, ChevronDown, CheckSquare, Square, MinusSquare, UserPlus, Pencil, Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { type AppPage, ALL_PAGES, PAGE_GROUPS } from "@/hooks/usePagePermissions";
import { type Departamento, DEPARTAMENTO_LABEL, DEPARTAMENTO_COLOR } from "@/hooks/useProfiles";
import { GooeyInput } from "@/components/ui/gooey-input";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { logActivity } from "@/lib/activityLogApi";


const PAGE_META: Record<AppPage, { label: string; icon: React.ElementType; color: string; border: string; bg: string }> = {
  "fin-painel":       { label: "Painel Financeiro", icon: LayoutDashboard, color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "fin-pagar":        { label: "Contas a Pagar",    icon: ArrowDownCircle, color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "fin-receber":      { label: "Contas a Receber",  icon: ArrowUpCircle,   color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "fin-conciliacao":  { label: "Conciliação",       icon: RefreshCcw,      color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "fin-realizado":    { label: "Realizado",         icon: Activity,        color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "fin-previsto":     { label: "Previsto",          icon: TrendingUp,      color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "fin-relatorios":   { label: "Relatórios",        icon: FileBarChart,    color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "ext-fiscal":       { label: "Fiscal",            icon: Scale,           color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "fin-fornecedores": { label: "Fornecedores",      icon: Building2,       color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "fin-clientes":     { label: "Clientes",          icon: Users,           color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "fin-categorias":   { label: "Categorias",        icon: Tag,             color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "fin-bancos":       { label: "Bancos",            icon: Landmark,        color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "ext-executivo":    { label: "Painel Executivo",   icon: Briefcase,       color: "text-violet-300",  border: "border-violet-400/30",  bg: "bg-violet-400/10"  },
  "ext-indicadores":  { label: "Indicadores",       icon: LineChart,       color: "text-violet-300",  border: "border-violet-400/30",  bg: "bg-violet-400/10"  },
  "ext-faturamento":  { label: "Faturamento",       icon: Banknote,        color: "text-violet-300",  border: "border-violet-400/30",  bg: "bg-violet-400/10"  },
  "ext-operacional":  { label: "Operacional",       icon: MapPin,          color: "text-cyan-300",    border: "border-cyan-400/30",    bg: "bg-cyan-400/10"    },
  "ext-frota":        { label: "Gestão de Frota",   icon: Truck,           color: "text-cyan-300",    border: "border-cyan-400/30",    bg: "bg-cyan-400/10"    },
  "ext-fin-frota":    { label: "Financiamentos",    icon: Wallet,          color: "text-cyan-300",    border: "border-cyan-400/30",    bg: "bg-cyan-400/10"    },
  "ext-manutencao":   { label: "Manutenção",        icon: Wrench,          color: "text-cyan-300",    border: "border-cyan-400/30",    bg: "bg-cyan-400/10"    },
  "ext-abastecimento":{ label: "Abastecimento",     icon: Fuel,            color: "text-cyan-300",    border: "border-cyan-400/30",    bg: "bg-cyan-400/10"    },
  "ext-pneus":        { label: "Pneus",             icon: Truck,           color: "text-cyan-300",    border: "border-cyan-400/30",    bg: "bg-cyan-400/10"    },

  "ext-compras":      { label: "Compras",           icon: ShoppingCart,    color: "text-emerald-300", border: "border-emerald-400/30", bg: "bg-emerald-400/10" },
  "ext-rh":           { label: "RH",                icon: UserCog,         color: "text-pink-300",    border: "border-pink-400/30",    bg: "bg-pink-400/10"    },
  "ext-chamados":     { label: "Chamados",          icon: Headphones,      color: "text-blue-300",    border: "border-blue-400/30",    bg: "bg-blue-400/10"    },
  "portal-receitaflow":{ label: "ReceitaFlow",      icon: Sparkles,        color: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/10"   },
  "portal-visual":    { label: "Visual Rodopar",    icon: Globe,           color: "text-cyan-300",    border: "border-cyan-400/30",    bg: "bg-cyan-400/10"    },
  "sofia-ai":         { label: "Sofia AI",          icon: BotMessageSquare,color: "text-rose-300",    border: "border-rose-400/30",    bg: "bg-rose-400/10"    },
};

const GROUP_COLORS: Record<string, { text: string; border: string; bg: string; accent: string }> = {
  "Financeiro":       { text: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-400/5",   accent: "bg-amber-400"   },
  "Outras Análises":  { text: "text-amber-300",   border: "border-amber-400/20",   bg: "bg-amber-400/5",   accent: "bg-amber-400"   },
  "Gestão":           { text: "text-violet-300",  border: "border-violet-400/30",  bg: "bg-violet-400/5",  accent: "bg-violet-400"  },
  "Operação":         { text: "text-cyan-300",    border: "border-cyan-400/30",    bg: "bg-cyan-400/5",    accent: "bg-cyan-400"    },
  "Compras":          { text: "text-emerald-300", border: "border-emerald-400/30", bg: "bg-emerald-400/5", accent: "bg-emerald-400" },
  "RH":               { text: "text-pink-300",    border: "border-pink-400/30",    bg: "bg-pink-400/5",    accent: "bg-pink-400"    },
  "Suporte":          { text: "text-blue-300",    border: "border-blue-400/30",    bg: "bg-blue-400/5",    accent: "bg-blue-400"    },
  "Portais":          { text: "text-cyan-300",    border: "border-cyan-400/20",    bg: "bg-cyan-400/5",    accent: "bg-cyan-400"    },
  "IA":               { text: "text-rose-300",    border: "border-rose-400/30",    bg: "bg-rose-400/5",    accent: "bg-rose-400"    },
};

interface SupaUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: "admin" | "user" | "diretoria";
  confirmed: boolean;
  pages: Set<AppPage>;
  display_name: string | null;
  departamento: Departamento | null;
}

const roleStyle: Record<string, string> = {
  admin:     "bg-red-500/10 text-red-400 border border-red-500/20",
  diretoria: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  user:      "bg-slate-500/10 sgt-text-2 border border-[var(--sgt-border-subtle)]",
};

const emailInitials = (email: string) => email.substring(0, 2).toUpperCase();
const colors = ["#3b82f6","#10b981","#8b5cf6","#f59e0b","#14b8a6","#ec4899","#06b6d4","#ef4444"];

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
  const [inviteSent, setInviteSent] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [replicateFromId, setReplicateFromId] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileDepto, setProfileDepto] = useState<Departamento | "">("");
  const [savingProfile, setSavingProfile] = useState(false);

  const flash = (msg: string, type: "ok" | "err", ms = 3000) => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), ms);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: roles }, { data: pagePerms }, { data: profileRows }, listRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role, created_at"),
        supabase.from("page_permissions").select("user_id, page"),
        supabase.from("profiles").select("id, display_name, departamento"),
        supabase.functions.invoke("list-users"),
      ]);

      const emailMap = new Map<string, string>();
      if (!listRes.error && listRes.data?.users) {
        (listRes.data.users as { id: string; email: string }[]).forEach(u => {
          emailMap.set(u.id, u.email);
        });
      }

      const profileMap = new Map<string, { display_name: string | null; departamento: Departamento | null }>();
      (profileRows ?? []).forEach((p: { id: string; display_name: string | null; departamento: string | null }) => {
        profileMap.set(p.id, { display_name: p.display_name, departamento: p.departamento as Departamento | null });
      });

      const pagesByUser = new Map<string, Set<AppPage>>();
      (pagePerms ?? []).forEach((p) => {
        if (!ALL_PAGES.includes(p.page as AppPage)) return;
        const set = pagesByUser.get(p.user_id) ?? new Set<AppPage>();
        set.add(p.page as AppPage);
        pagesByUser.set(p.user_id, set);
      });

      const mapped: SupaUser[] = (roles ?? []).map((r) => {
        const prof = profileMap.get(r.user_id);
        return {
          id:              r.user_id,
          email:           emailMap.get(r.user_id) ?? "—",
          created_at:      r.created_at,
          last_sign_in_at: null,
          role:            r.role as "admin" | "user" | "diretoria",
          confirmed:       true,
          pages:           pagesByUser.get(r.user_id) ?? new Set<AppPage>(),
          display_name:    prof?.display_name ?? null,
          departamento:    prof?.departamento ?? null,
        };
      });
      if (me && !mapped.find((u) => u.id === me.id)) {
        mapped.unshift({
          id: me.id, email: me.email ?? "—",
          created_at: me.created_at ?? new Date().toISOString(),
          last_sign_in_at: me.last_sign_in_at ?? null,
          role: "admin", confirmed: !!me.email_confirmed_at,
          pages: new Set<AppPage>(ALL_PAGES),
          display_name: profileMap.get(me.id)?.display_name ?? null,
          departamento: profileMap.get(me.id)?.departamento ?? null,
        });
      }
      setUsers(mapped);
    } catch {
      flash("Erro ao carregar usuários.", "err");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, role: "admin" | "user" | "diretoria") => {
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) { flash("Erro ao alterar role.", "err"); return; }
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role } as any);
    if (insErr) { flash("Erro ao alterar role.", "err"); return; }
    flash("Role atualizada com sucesso.", "ok");
    const alvo = users.find((u) => u.id === userId);
    logActivity("role_changed", `Alterou role de ${alvo?.email ?? userId} para ${role}`, { target_user_id: userId, role }).catch(() => {});
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
  };


  const togglePage = async (userId: string, page: AppPage, currentlyHas: boolean) => {
    if (currentlyHas) {
      const { error } = await supabase.from("page_permissions").delete().eq("user_id", userId).eq("page", page as never);
      if (error) { flash("Erro ao revogar permissão.", "err"); return; }
    } else {
      const { error } = await supabase.from("page_permissions").insert({ user_id: userId, page } as never);
      if (error) { flash("Erro ao conceder permissão.", "err"); return; }
    }
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId) return u;
      const next = new Set(u.pages);
      if (currentlyHas) next.delete(page); else next.add(page);
      return { ...u, pages: next };
    }));
  };

  const toggleGroup = async (userId: string, groupPages: AppPage[], userPages: Set<AppPage>) => {
    const allHas = groupPages.every(p => userPages.has(p));
    const ops = groupPages.map(p => {
      const has = userPages.has(p);
      if (allHas && has) return togglePage(userId, p, true);
      if (!allHas && !has) return togglePage(userId, p, false);
      return Promise.resolve();
    });
    await Promise.all(ops);
  };

  const toggleAll = async (userId: string, userPages: Set<AppPage>) => {
    const allHas = ALL_PAGES.every(p => userPages.has(p));
    const ops = ALL_PAGES.map(p => {
      const has = userPages.has(p);
      if (allHas && has) return togglePage(userId, p, true);
      if (!allHas && !has) return togglePage(userId, p, false);
      return Promise.resolve();
    });
    await Promise.all(ops);
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", { body: { user_id: userId } });
      if (error || data?.error) {
        flash(data?.error || "Erro ao excluir usuário.", "err");
      } else {
        flash("Usuário excluído com sucesso.", "ok");
        const alvo = users.find((u) => u.id === userId);
        logActivity("user_deleted", `Excluiu usuário: ${alvo?.email ?? userId}`, { target_user_id: userId }).catch(() => {});
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }

    } catch {
      flash("Erro ao excluir usuário.", "err");
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail) { flash("Preencha o email.", "err"); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", { body: { email: newEmail, role: newRole } });
      if (error || data?.error) {
        flash(data?.error || "Erro ao criar usuário.", "err");
      } else {
        const newUserId = data?.user_id;
        logActivity("user_created", `Convidou usuário: ${newEmail}`, { target_user_id: newUserId, role: newRole }).catch(() => {});

        if (replicateFromId && newUserId) {
          const sourceUser = users.find(u => u.id === replicateFromId);
          if (sourceUser && sourceUser.pages.size > 0) {
            const rows = [...sourceUser.pages].map(page => ({ user_id: newUserId, page }));
            await supabase.from("page_permissions").insert(rows as never);
          }
        }
        setInviteSent(true);
        flash(
          replicateFromId
            ? "Convite enviado com permissões replicadas!"
            : "Convite enviado por email!",
          "ok", 5000,
        );
        load();
      }
    } catch {
      flash("Erro ao criar usuário.", "err");
    } finally {
      setCreating(false);
    }
  };

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const startEditProfile = (u: SupaUser) => {
    setEditingProfileId(u.id);
    setProfileName(u.display_name ?? "");
    setProfileDepto((u.departamento ?? "") as Departamento | "");
  };

  const saveProfile = async (userId: string) => {
    setSavingProfile(true);
    try {
      const fields: Record<string, unknown> = {
        id: userId,
        display_name: profileName || null,
        departamento: profileDepto || null,
      };
      const { error } = await supabase.from("profiles").upsert(fields as never, { onConflict: "id" });
      if (error) { flash("Erro ao salvar perfil.", "err"); return; }
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, display_name: profileName || null, departamento: (profileDepto || null) as Departamento | null } : u
      ));
      flash("Perfil atualizado!", "ok");
      setEditingProfileId(null);
    } catch {
      flash("Erro ao salvar perfil.", "err");
    } finally {
      setSavingProfile(false);
    }
  };

  const permUser = permUserId ? users.find(u => u.id === permUserId) : null;

  const permCount = (u: SupaUser) => {
    if (u.role === "admin") return ALL_PAGES.length;
    return u.pages.size;
  };

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

      {/* ── Ferramentas ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Ferramentas</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <GooeyInput placeholder="Buscar por email..." value={search} onValueChange={(v) => setSearch(v)} />
        <button onClick={load}
          className="flex items-center gap-2 rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-2 text-sm sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all hover:border-[var(--sgt-border-medium)]">
          <RefreshCw className="h-3.5 w-3.5" /> Recarregar
        </button>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20 transition-all">
          <Plus className="h-3.5 w-3.5" /> Novo usuário
        </button>
      </div>

      {/* Modal Criar Usuário */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--sgt-border-subtle)] sgt-bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--sgt-divider)] px-6 py-4">
              <div className="flex items-center gap-2">
                {replicateFromId && !inviteSent ? <UserPlus className="h-4 w-4 text-violet-400" /> : <Plus className="h-4 w-4 text-emerald-400" />}
                <h3 className="text-sm font-semibold sgt-text">
                  {inviteSent ? "Convite enviado" : replicateFromId ? "Replicar usuário" : "Cadastrar novo usuário"}
                </h3>
              </div>
              <button onClick={() => { setShowModal(false); setNewEmail(""); setNewRole("user"); setReplicateFromId(null); setInviteSent(false); }}
                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--sgt-input-hover)]">
                <X className="h-4 w-4 sgt-text-2" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {inviteSent ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-300">Convite enviado!</p>
                  </div>
                  <p className="text-[12px] text-emerald-300/80 leading-relaxed">
                    Um email foi enviado para <strong>{newEmail}</strong> com um link para criar a conta. O usuário só precisa clicar no link e definir sua senha.
                  </p>
                </div>
              ) : (
                <>
                  {replicateFromId && (() => {
                    const src = users.find(u => u.id === replicateFromId);
                    return src ? (
                      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
                        <p className="text-[12px] text-violet-300 leading-relaxed">
                          Novo usuário receberá as mesmas <strong>{src.pages.size} telas</strong> liberadas de <strong>{src.email}</strong>. Basta preencher o email abaixo.
                        </p>
                      </div>
                    ) : null;
                  })()}
                  {!replicateFromId && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                      <p className="text-[12px] text-amber-300 leading-relaxed">
                        Um email será enviado para o usuário com um link para criar a conta e definir sua senha.
                      </p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">Email</label>
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="usuario@empresa.com.br"
                      className="w-full rounded-xl border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] px-4 py-2.5 text-sm sgt-text placeholder:text-[var(--sgt-text-faint)] focus:outline-none focus:border-cyan-500/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">Permissão</label>
                    <div className="flex gap-2">
                      {(["user", "diretoria", "admin"] as const).map(r => (
                        <button key={r} onClick={() => setNewRole(r)}
                          className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                            newRole === r
                              ? r === "admin" ? "border-red-500/30 bg-red-500/10 text-red-400"
                                : r === "diretoria" ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                                : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                              : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] sgt-text-2"
                          }`}>
                          {r === "user" ? "Usuário" : r === "diretoria" ? "Diretoria" : "Admin"}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[var(--sgt-divider)] px-6 py-4">
              {inviteSent ? (
                <button onClick={() => { setShowModal(false); setNewEmail(""); setNewRole("user"); setReplicateFromId(null); setInviteSent(false); }}
                  className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 transition-all">
                  <CheckCircle className="h-3.5 w-3.5" /> Fechar
                </button>
              ) : (
                <>
                  <button onClick={() => { setShowModal(false); setNewEmail(""); setNewRole("user"); setReplicateFromId(null); }}
                    className="rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-2 text-sm sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all">
                    Cancelar
                  </button>
                  <button onClick={handleCreateUser} disabled={creating || !newEmail}
                    className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    {creating ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" /> : <Plus className="h-3.5 w-3.5" />}
                    {creating ? "Enviando convite..." : "Enviar convite"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Usuários Cadastrados ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Usuários Cadastrados</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <AnimatedCard delay={80} className="overflow-hidden rounded-[20px] border border-[var(--sgt-border-subtle)] sgt-bg-card">
        <div className="px-6 py-4 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] sgt-text-2">Usuários Cadastrados</p>
          <span className="text-xs text-[var(--sgt-text-muted)]">{filtered.length} usuário(s)</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm sgt-text-2">Nenhum usuário encontrado</div>
        ) : (
          <div className="divide-y divide-[var(--sgt-divider)]">
            {filtered.map((u, idx) => (
              <div key={u.id} className="p-4 md:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold [color:var(--sgt-text-primary)]"
                      style={{ background: colors[idx % colors.length] }}>
                      {emailInitials(u.email)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm sgt-text font-medium">
                          {u.display_name || u.email}
                        </p>
                        {u.display_name && (
                          <span className="text-[10px] text-[var(--sgt-text-muted)] truncate max-w-[180px]">{u.email}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleStyle[u.role]}`}>{u.role}</span>
                        {u.departamento && (() => {
                          const dc = DEPARTAMENTO_COLOR[u.departamento];
                          return (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${dc.bg} ${dc.text} border ${dc.border}`}>
                              {DEPARTAMENTO_LABEL[u.departamento]}
                            </span>
                          );
                        })()}
                        {u.id === me?.id && <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-semibold text-cyan-400 border border-cyan-500/20">Você</span>}
                        <span className="text-[10px] text-[var(--sgt-text-muted)]">
                          {u.role === "admin" ? `${ALL_PAGES.length}/${ALL_PAGES.length} telas` : `${u.pages.size}/${ALL_PAGES.length} telas`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button onClick={() => editingProfileId === u.id ? setEditingProfileId(null) : startEditProfile(u)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                        editingProfileId === u.id
                          ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                          : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] sgt-text-2 hover:text-[var(--sgt-text-primary)] hover:border-[var(--sgt-border-medium)]"
                      }`}>
                      <Pencil className="h-3 w-3" />
                      Perfil
                    </button>
                    {u.role !== "admin" && (
                      <>
                        <button onClick={() => setPermUserId(permUserId === u.id ? null : u.id)}
                          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                            permUserId === u.id
                              ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                              : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] sgt-text-2 hover:text-[var(--sgt-text-primary)] hover:border-[var(--sgt-border-medium)]"
                          }`}>
                          <Shield className="h-3 w-3" />
                          Permissões
                        </button>
                        <button onClick={() => { setReplicateFromId(u.id); setNewRole(u.role); setShowModal(true); }}
                          className="flex items-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] font-semibold text-violet-300 hover:bg-violet-500/20 transition-all">
                          <UserPlus className="h-3 w-3" />
                          Replicar
                        </button>
                      </>
                    )}
                    {/* Role actions */}
                    {u.role === "admin" ? (
                      <button onClick={() => changeRole(u.id, "user")} disabled={u.id === me?.id}
                        className="flex items-center gap-1 rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2.5 py-1.5 text-[11px] sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all disabled:opacity-30">
                        <UserX className="h-3 w-3" /> Rebaixar
                      </button>
                    ) : u.role === "diretoria" ? (
                      <>
                        <button onClick={() => changeRole(u.id, "user")}
                          className="flex items-center gap-1 rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-2.5 py-1.5 text-[11px] sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all">
                          <UserX className="h-3 w-3" /> User
                        </button>
                        <button onClick={() => changeRole(u.id, "admin")}
                          className="flex items-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300 hover:bg-red-500/20 transition-all">
                          <Shield className="h-3 w-3" /> Admin
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => changeRole(u.id, "diretoria")}
                          className="flex items-center gap-1 rounded-xl border border-violet-500/20 bg-violet-500/10 px-2.5 py-1.5 text-[11px] text-violet-300 hover:bg-violet-500/20 transition-all">
                          Dir.
                        </button>
                        <button onClick={() => changeRole(u.id, "admin")}
                          className="flex items-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300 hover:bg-red-500/20 transition-all">
                          <Shield className="h-3 w-3" /> Admin
                        </button>
                      </>
                    )}
                    {u.id !== me?.id && (
                      <button onClick={() => setDeleteConfirm(u.id)}
                        className="flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Painel de perfil expandido ── */}
                {editingProfileId === u.id && (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-400/10">
                      <Pencil className="h-4 w-4 text-amber-400" />
                      <span className="text-[12px] font-bold sgt-text">Editar Perfil</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">Nome de exibição</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Ex: João Silva"
                          className="w-full rounded-xl border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] px-3 py-2 text-sm sgt-text placeholder:text-[var(--sgt-text-faint)] focus:outline-none focus:border-amber-400/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">Departamento</label>
                        <select
                          value={profileDepto}
                          onChange={(e) => setProfileDepto(e.target.value as Departamento | "")}
                          className="w-full rounded-xl border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] px-3 py-2 text-sm sgt-text focus:outline-none focus:border-amber-400/50"
                        >
                          <option value="">Sem departamento</option>
                          {(Object.keys(DEPARTAMENTO_LABEL) as Departamento[]).map(d => (
                            <option key={d} value={d}>{DEPARTAMENTO_LABEL[d]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 px-4 pb-4">
                      <button onClick={() => setEditingProfileId(null)}
                        className="rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-1.5 text-[11px] sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all">
                        Cancelar
                      </button>
                      <button onClick={() => saveProfile(u.id)} disabled={savingProfile}
                        className="flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-400/20 transition-all disabled:opacity-40">
                        {savingProfile ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" /> : <Save className="h-3 w-3" />}
                        Salvar
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Painel de permissões expandido ── */}
                {permUserId === u.id && u.role !== "admin" && (
                  <div className="mt-4 rounded-2xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-bg-section)] overflow-hidden">
                    {/* Header do painel */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--sgt-divider)]">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-cyan-400" />
                        <span className="text-[12px] font-bold sgt-text">Controle de Acesso por Tela</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--sgt-text-muted)]">
                          {u.pages.size}/{ALL_PAGES.length} ativas
                        </span>
                        <button onClick={() => toggleAll(u.id, u.pages)}
                          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition-all ${
                            ALL_PAGES.every(p => u.pages.has(p))
                              ? "border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
                              : u.pages.size > 0
                                ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
                                : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] sgt-text-2 hover:text-[var(--sgt-text-primary)]"
                          }`}>
                          {ALL_PAGES.every(p => u.pages.has(p)) ? (
                            <><CheckSquare className="h-3 w-3" /> Desmarcar tudo</>
                          ) : (
                            <><Square className="h-3 w-3" /> Marcar tudo</>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Grupos de telas */}
                    <div className="divide-y divide-[var(--sgt-divider)]">
                      {PAGE_GROUPS.map(group => {
                        const gc = GROUP_COLORS[group.label] ?? GROUP_COLORS["Financeiro"];
                        const groupHasAll = group.pages.every(p => u.pages.has(p));
                        const groupHasSome = group.pages.some(p => u.pages.has(p));
                        const groupHasCount = group.pages.filter(p => u.pages.has(p)).length;
                        const isCollapsed = collapsedGroups[`${u.id}-${group.label}`];

                        return (
                          <div key={group.label}>
                            {/* Header do grupo */}
                            <div className={`flex items-center gap-3 px-5 py-2.5 ${gc.bg} cursor-pointer select-none`}
                              onClick={() => setCollapsedGroups(prev => ({ ...prev, [`${u.id}-${group.label}`]: !prev[`${u.id}-${group.label}`] }))}>
                              <div className={`w-1 h-5 rounded-full ${gc.accent} opacity-60`} />
                              <ChevronDown className={`h-3.5 w-3.5 ${gc.text} opacity-60 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                              <span className={`text-[11px] font-bold uppercase tracking-[0.15em] ${gc.text}`}>{group.label}</span>
                              <span className="text-[10px] text-[var(--sgt-text-muted)]">{groupHasCount}/{group.pages.length}</span>
                              <div className="flex-1" />
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleGroup(u.id, group.pages, u.pages); }}
                                className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all ${
                                  groupHasAll
                                    ? `${gc.border} ${gc.bg} ${gc.text} hover:opacity-80`
                                    : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-[var(--sgt-text-muted)] hover:text-[var(--sgt-text-secondary)]"
                                }`}>
                                {groupHasAll ? <CheckSquare className="h-2.5 w-2.5" /> : groupHasSome ? <MinusSquare className="h-2.5 w-2.5" /> : <Square className="h-2.5 w-2.5" />}
                                {groupHasAll ? "Tudo" : "Selecionar"}
                              </button>
                            </div>

                            {/* Telas do grupo */}
                            {!isCollapsed && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 p-3">
                                {group.pages.map(page => {
                                  const meta = PAGE_META[page];
                                  const Icon = meta.icon;
                                  const has = u.pages.has(page);
                                  return (
                                    <button key={page} onClick={() => togglePage(u.id, page, has)}
                                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                                        has
                                          ? `${meta.border} ${meta.bg} ${meta.color}`
                                          : "border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] text-[var(--sgt-text-muted)] hover:text-[var(--sgt-text-secondary)] hover:border-[var(--sgt-border-medium)]"
                                      }`}>
                                      <Icon className="h-3.5 w-3.5 shrink-0" />
                                      <span className="text-[11px] font-semibold truncate">{meta.label}</span>
                                      <div className="ml-auto shrink-0">
                                        {has ? <CheckSquare className="h-3.5 w-3.5 opacity-70" /> : <Square className="h-3.5 w-3.5 opacity-40" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </AnimatedCard>

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
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                className="rounded-xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-2 text-sm sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-all">
                Cancelar
              </button>
              <button onClick={() => handleDeleteUser(deleteConfirm)} disabled={deleting}
                className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {deleting ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" /> : <Trash2 className="h-3.5 w-3.5" />}
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
