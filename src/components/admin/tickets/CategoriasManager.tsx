import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Save, Tag, X, Check, EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  TicketCategoria, fetchCategorias, criarCategoria, atualizarCategoria,
  categoriaBadgeStyle, DEFAULT_CATEGORIA_COR,
} from "@/lib/ticketCategoriasApi";

export function CategoriasManager() {
  const [cats, setCats] = useState<TicketCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState(DEFAULT_CATEGORIA_COR);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCor, setEditCor] = useState(DEFAULT_CATEGORIA_COR);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCats(await fetchCategorias(false));
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const criar = async () => {
    const nome = novoNome.trim();
    if (!nome) { toast.error("Informe o nome da categoria"); return; }
    setSaving(true);
    try {
      await criarCategoria(nome, novaCor);
      setNovoNome("");
      setNovaCor(DEFAULT_CATEGORIA_COR);
      toast.success("Categoria criada");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar categoria");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: TicketCategoria) => {
    setEditId(c.id);
    setEditNome(c.nome);
    setEditCor(c.cor ?? DEFAULT_CATEGORIA_COR);
  };

  const salvarEdicao = async () => {
    if (!editId) return;
    const nome = editNome.trim();
    if (!nome) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    try {
      await atualizarCategoria(editId, { nome, cor: editCor });
      setEditId(null);
      toast.success("Categoria atualizada");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar");
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (c: TicketCategoria) => {
    setSaving(true);
    try {
      await atualizarCategoria(c.id, { ativo: !c.ativo });
      toast.success(c.ativo ? "Categoria desativada" : "Categoria reativada");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Nova categoria */}
      <div className="rounded-2xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] p-3 sm:p-4 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--sgt-text-muted)]">
          <Tag className="h-3.5 w-3.5" /> Nova categoria
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="grid gap-1.5 flex-1">
            <Label htmlFor="cat-nome">Nome</Label>
            <Input
              id="cat-nome" value={novoNome} maxLength={60}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex: Telefonia"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cat-cor">Cor</Label>
            <input
              id="cat-cor" type="color" value={novaCor}
              onChange={(e) => setNovaCor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded-lg border border-[var(--sgt-border-subtle)] bg-transparent p-1"
            />
          </div>
          <Button onClick={criar} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Adicionar
          </Button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : cats.length === 0 ? (
        <p className="text-center text-sm text-[var(--sgt-text-muted)] py-10">Nenhuma categoria cadastrada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cats.map((c) => (
            <div
              key={c.id}
              className={`rounded-2xl border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-2.5 flex flex-wrap items-center gap-2 ${c.ativo ? "" : "opacity-55"}`}
            >
              {editId === c.id ? (
                <>
                  <input
                    type="color" value={editCor}
                    onChange={(e) => setEditCor(e.target.value)}
                    className="h-8 w-12 cursor-pointer rounded-lg border border-[var(--sgt-border-subtle)] bg-transparent p-0.5"
                  />
                  <Input
                    value={editNome} maxLength={60}
                    onChange={(e) => setEditNome(e.target.value)}
                    className="h-8 flex-1 min-w-[140px]"
                  />
                  <Button size="sm" onClick={salvarEdicao} disabled={saving} className="h-8 bg-amber-500 hover:bg-amber-600 text-black">
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditId(null)} className="h-8">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full border font-semibold"
                    style={categoriaBadgeStyle(c.cor)}
                  >
                    {c.nome}
                  </span>
                  {!c.ativo && (
                    <span className="text-[10px] uppercase tracking-wider text-[var(--sgt-text-muted)]">inativa</span>
                  )}
                  <div className="flex-1" />
                  <Button size="sm" variant="ghost" onClick={() => startEdit(c)} className="h-8 text-[12px]">
                    Editar
                  </Button>
                  <Button
                    size="sm" variant="outline" onClick={() => toggleAtivo(c)} disabled={saving}
                    className="h-8 text-[12px] border-[var(--sgt-border-subtle)]"
                  >
                    {c.ativo ? <><EyeOff className="h-3.5 w-3.5 mr-1" /> Desativar</> : <><Eye className="h-3.5 w-3.5 mr-1" /> Reativar</>}
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
