import { useState } from "react";
import { Users, Search, Plus, Shield, Ban, CheckCircle, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface User {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Gerente" | "Analista" | "Visualizador";
  department: string;
  lastAccess: string;
  status: "Ativo" | "Inativo" | "Bloqueado";
  initials: string;
  color: string;
}

const INITIAL_USERS: User[] = [
  { id: 1, name: "Pedro Augusto", email: "pedro@sgtlog.com.br", role: "Admin", department: "TI", lastAccess: "Agora", status: "Ativo", initials: "PA", color: "#3b82f6" },
  { id: 2, name: "Carlos Mendes", email: "carlos@sgtlog.com.br", role: "Gerente", department: "Operações", lastAccess: "há 2h", status: "Ativo", initials: "CM", color: "#10b981" },
  { id: 3, name: "Ana Lima", email: "ana@sgtlog.com.br", role: "Analista", department: "Financeiro", lastAccess: "há 1h", status: "Ativo", initials: "AL", color: "#8b5cf6" },
  { id: 4, name: "Roberto Faria", email: "roberto@sgtlog.com.br", role: "Analista", department: "Comercial", lastAccess: "Ontem", status: "Ativo", initials: "RF", color: "#f59e0b" },
  { id: 5, name: "Fernanda Costa", email: "fern@sgtlog.com.br", role: "Visualizador", department: "RH", lastAccess: "há 3 dias", status: "Inativo", initials: "FC", color: "#14b8a6" },
  { id: 6, name: "Marcos Teixeira", email: "marcos@sgtlog.com.br", role: "Gerente", department: "TI", lastAccess: "—", status: "Bloqueado", initials: "MT", color: "#ef4444" },
  { id: 7, name: "Julia Rocha", email: "julia@sgtlog.com.br", role: "Analista", department: "Operações", lastAccess: "há 4h", status: "Ativo", initials: "JR", color: "#ec4899" },
];

const roleBadge: Record<string, string> = {
  Admin: "bg-red-500/10 text-red-400 border-red-500/20",
  Gerente: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Analista: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Visualizador: "bg-white/5 text-white/40 border-white/10",
};

const statusBadge: Record<string, string> = {
  Ativo: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Inativo: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Bloqueado: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function GestaoUsuarios() {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "Analista", department: "TI" });
  const [successMsg, setSuccessMsg] = useState(false);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchR = filterRole === "all" || u.role === filterRole;
    const matchS = filterStatus === "all" || u.status === filterStatus;
    return matchQ && matchR && matchS;
  });

  const toggleBlock = (id: number) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === "Bloqueado" ? "Ativo" : "Bloqueado" } : u
      )
    );
  };

  const addUser = () => {
    if (!newUser.name || !newUser.email) return;
    const initials = newUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    setUsers((prev) => [
      ...prev,
      { id: Date.now(), ...newUser, role: newUser.role as User["role"], lastAccess: "Agora", status: "Ativo", initials, color: "#3b82f6" },
    ]);
    setShowModal(false);
    setNewUser({ name: "", email: "", role: "Analista", department: "TI" });
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  return (
    <div className="space-y-5">
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4" /> Usuário criado com sucesso!
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: users.length, sub: "usuários" },
          { label: "Admins", value: users.filter(u => u.role === "Admin").length, sub: "nível máximo", color: "text-red-400" },
          { label: "Online agora", value: 7, sub: "sessões ativas", color: "text-emerald-400" },
          { label: "Bloqueados", value: users.filter(u => u.status === "Bloqueado").length, sub: "aguardando revisão", color: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.color || "text-white"}`}>{s.value}</p>
            <p className="text-[11px] text-white/30 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" /> Lista de Usuários
          </h3>
          <Button size="sm" onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1">
            <Plus className="w-3 h-3" /> Novo Usuário
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome ou e-mail…"
              className="pl-8 h-8 text-xs bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30" />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="h-8 text-xs w-[140px] bg-white/[0.04] border-white/[0.08] text-white/70">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a2236] border-white/10 text-white">
              <SelectItem value="all">Todos os roles</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Gerente">Gerente</SelectItem>
              <SelectItem value="Analista">Analista</SelectItem>
              <SelectItem value="Visualizador">Visualizador</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-[130px] bg-white/[0.04] border-white/[0.08] text-white/70">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a2236] border-white/10 text-white">
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Inativo">Inativo</SelectItem>
              <SelectItem value="Bloqueado">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Usuário", "Role", "Departamento", "Último acesso", "Status", "Ações"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-white/30 uppercase tracking-wider pb-2 px-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: u.color + "22", color: u.color }}>
                        {u.initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{u.name}</p>
                        <p className="text-[10px] text-white/30">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${roleBadge[u.role]}`}>{u.role}</span>
                  </td>
                  <td className="py-3 px-2 text-sm text-white">{u.department}</td>
                  <td className="py-3 px-2 text-[11px] text-white/40 font-mono">{u.lastAccess}</td>
                  <td className="py-3 px-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusBadge[u.status]}`}>{u.status}</span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/5">
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleBlock(u.id)}
                        className={`h-7 w-7 p-0 ${u.status === "Bloqueado" ? "text-emerald-400 hover:bg-emerald-500/10" : "text-red-400 hover:bg-red-500/10"}`}>
                        {u.status === "Bloqueado" ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-white/30 text-sm py-8">Nenhum usuário encontrado.</p>
          )}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-[#111c2e] border border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" /> Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div><Label className="text-xs text-white/50 uppercase tracking-wider">Nome completo</Label>
              <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Ex: Maria Silva"
                className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 h-9 text-sm" /></div>
            <div><Label className="text-xs text-white/50 uppercase tracking-wider">E-mail</Label>
              <Input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="maria@sgtlog.com.br"
                className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 h-9 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-white/50 uppercase tracking-wider">Role</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger className="mt-1.5 h-9 text-sm bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a2236] border-white/10 text-white">
                    <SelectItem value="Analista">Analista</SelectItem>
                    <SelectItem value="Gerente">Gerente</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Visualizador">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs text-white/50 uppercase tracking-wider">Departamento</Label>
                <Select value={newUser.department} onValueChange={(v) => setNewUser({ ...newUser, department: v })}>
                  <SelectTrigger className="mt-1.5 h-9 text-sm bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a2236] border-white/10 text-white">
                    <SelectItem value="TI">TI</SelectItem>
                    <SelectItem value="Operações">Operações</SelectItem>
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Comercial">Comercial</SelectItem>
                    <SelectItem value="RH">RH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowModal(false)} className="text-white/50 hover:text-white hover:bg-white/5 text-sm">Cancelar</Button>
            <Button onClick={addUser} className="bg-blue-600 hover:bg-blue-700 text-white text-sm">Criar usuário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
