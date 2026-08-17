import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, CheckCircle2, Save, Loader2, Lock, Paperclip } from "lucide-react";
import { TicketThread } from "./TicketThread";
import { AnexosGrid, PendingFilesGrid } from "./TicketAnexos";
import { SlaBadge } from "./SlaBadge";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { toast } from "sonner";
import {
  Ticket, TicketInput, TicketPrioridade, TicketStatus,
  createTicket, updateTicket, deleteTicket,
  PRIORIDADE_LABEL, STATUS_LABEL,
} from "@/lib/ticketsApi";
import { TicketCategoria, fetchCategorias } from "@/lib/ticketCategoriasApi";
import { TicketAnexo, fetchAnexos, uploadAnexos, validarArquivo, TIPOS_ACEITOS } from "@/lib/ticketAnexosApi";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket | null;
  defaultDate?: string;
  onSaved: () => void;
}

const NENHUMA = "__nenhuma__";

const empty = (date?: string): TicketInput => ({
  titulo: "",
  descricao: "",
  cliente_setor: "",
  responsavel: "",
  data_chamado: date ?? new Date().toISOString().slice(0, 10),
  horario_chamado: null,
  prioridade: "media",
  status: "aberto",
  observacoes: "",
  categoria_id: null,
});

export function TicketModal({ open, onOpenChange, ticket, defaultDate, onSaved }: Props) {
  const { isAdmin } = useAuth();
  const [form, setForm] = useState<TicketInput>(empty(defaultDate));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [categorias, setCategorias] = useState<TicketCategoria[]>([]);
  const [anexos, setAnexos] = useState<TicketAnexo[]>([]);
  const [pendentes, setPendentes] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Usuário pode editar apenas se: novo chamado OU é admin
  const podeEditar = !ticket || isAdmin;
  // Apenas admin pode mudar status, responsável, observações internas
  const somenteAdmin = !isAdmin;

  useEffect(() => {
    if (!open) return;
    fetchCategorias(true)
      .then(setCategorias)
      .catch(() => setCategorias([]));
  }, [open]);

  useEffect(() => {
    setPendentes([]);
    if (ticket) {
      setForm({
        titulo: ticket.titulo,
        descricao: ticket.descricao ?? "",
        cliente_setor: ticket.cliente_setor ?? "",
        responsavel: ticket.responsavel ?? "",
        data_chamado: ticket.data_chamado,
        horario_chamado: ticket.horario_chamado ? ticket.horario_chamado.slice(0, 5) : null,
        prioridade: ticket.prioridade,
        status: ticket.status,
        observacoes: ticket.observacoes ?? "",
        categoria_id: ticket.categoria_id ?? null,
      });
      fetchAnexos(ticket.id).then(setAnexos).catch(() => setAnexos([]));
    } else {
      setForm(empty(defaultDate));
      setAnexos([]);
    }
  }, [ticket, defaultDate, open]);

  const set = <K extends keyof TicketInput>(k: K, v: TicketInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const validos: File[] = [];
    for (const f of Array.from(list)) {
      const erro = validarArquivo(f);
      if (erro) toast.error(erro);
      else validos.push(f);
    }
    if (validos.length) setPendentes((p) => [...p, ...validos]);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Anexos da thread (mensagem_id preenchido) não aparecem no formulário
  const anexosDoChamado = anexos.filter((a) => !a.mensagem_id);

  const save = async () => {
    if (!form.titulo.trim()) { toast.error("Título é obrigatório"); return; }
    if (!form.data_chamado) { toast.error("Data é obrigatória"); return; }
    setSaving(true);
    try {
      const payload: TicketInput = {
        ...form,
        titulo: form.titulo.trim(),
        descricao: form.descricao || null,
        cliente_setor: form.cliente_setor || null,
        responsavel: form.responsavel || null,
        observacoes: form.observacoes || null,
        horario_chamado: form.horario_chamado || null,
        categoria_id: form.categoria_id || null,
      };
      let alvo = ticket;
      if (ticket) {
        await updateTicket(ticket.id, payload);
      } else {
        alvo = await createTicket(payload);
      }
      if (pendentes.length && alvo) {
        try {
          await uploadAnexos(alvo.id, pendentes);
        } catch (e: any) {
          toast.error(e?.message ?? "Erro ao enviar anexos");
        }
      }
      toast.success(ticket ? "Chamado atualizado" : "Chamado criado com sucesso!");
      setPendentes([]);
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar chamado");
    } finally {
      setSaving(false);
    }
  };

  const handleConcluir = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      await updateTicket(ticket.id, { ...form, status: "concluido" });
      toast.success("Chamado concluído");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao concluir");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      await deleteTicket(ticket.id);
      toast.success("Chamado excluído");
      onSaved();
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao excluir");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {ticket
                ? isAdmin ? "Editar chamado" : "Visualizar chamado"
                : "Abrir novo chamado"}
              {ticket && <SlaBadge ticket={ticket} />}
            </DialogTitle>
            <DialogDescription>
              {ticket
                ? isAdmin
                  ? "Atualize os dados e status do chamado."
                  : "Detalhes do seu chamado. Apenas admins podem alterar o status."
                : "Preencha as informações para abrir um chamado."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Título */}
            <div className="grid gap-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo" value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                maxLength={200} disabled={!podeEditar}
              />
            </div>

            {/* Categoria */}
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select
                value={form.categoria_id ?? NENHUMA}
                onValueChange={(v) => set("categoria_id", v === NENHUMA ? null : v)}
                disabled={!podeEditar}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUMA}>Sem categoria</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: c.cor ?? "#94a3b8" }}
                        />
                        {c.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao" rows={3}
                value={form.descricao ?? ""}
                onChange={(e) => set("descricao", e.target.value)}
                disabled={!podeEditar}
              />
            </div>

            {/* Cliente/Setor + Responsável */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="cliente">Cliente / Setor</Label>
                <Input
                  id="cliente" value={form.cliente_setor ?? ""}
                  onChange={(e) => set("cliente_setor", e.target.value)}
                  disabled={!podeEditar}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="resp" className="flex items-center gap-1.5">
                  Responsável
                  {somenteAdmin && ticket && <Lock className="h-3 w-3 text-slate-500" />}
                </Label>
                <Input
                  id="resp" value={form.responsavel ?? ""}
                  onChange={(e) => set("responsavel", e.target.value)}
                  disabled={!isAdmin}
                  placeholder={!isAdmin ? "Definido pelo admin" : ""}
                />
              </div>
            </div>

            {/* Data + Horário */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="data">Data *</Label>
                <DatePickerInput
                  value={form.data_chamado}
                  onChange={(v) => set("data_chamado", v)}
                  placeholder="Selecionar"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hora">Horário</Label>
                <Input
                  id="hora" type="time"
                  value={form.horario_chamado ?? ""}
                  onChange={(e) => set("horario_chamado", e.target.value || null)}
                  disabled={!podeEditar}
                />
              </div>
            </div>

            {/* Prioridade + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <Select
                  value={form.prioridade}
                  onValueChange={(v) => set("prioridade", v as TicketPrioridade)}
                  disabled={!podeEditar}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORIDADE_LABEL) as TicketPrioridade[]).map((p) => (
                      <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  Status
                  {somenteAdmin && ticket && <Lock className="h-3 w-3 text-slate-500" />}
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as TicketStatus)}
                  disabled={!isAdmin}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observações — visível para todos, editável só pelo admin */}
            <div className="grid gap-2">
              <Label htmlFor="obs" className="flex items-center gap-1.5">
                Observações
                {somenteAdmin && ticket && <Lock className="h-3 w-3 text-slate-500" />}
              </Label>
              <Textarea
                id="obs" rows={2}
                value={form.observacoes ?? ""}
                onChange={(e) => set("observacoes", e.target.value)}
                disabled={!isAdmin}
                placeholder={!isAdmin && ticket ? "Notas internas do admin" : ""}
              />
            </div>

            {/* Anexos */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> Imagens anexadas
              </Label>
              <AnexosGrid anexos={anexosDoChamado} />
              <PendingFilesGrid
                files={pendentes}
                onRemove={(i) => setPendentes((p) => p.filter((_, idx) => idx !== i))}
              />
              <input
                ref={fileRef}
                type="file"
                accept={TIPOS_ACEITOS.join(",")}
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="w-fit border-[var(--sgt-border-subtle)]"
              >
                <Paperclip className="h-3.5 w-3.5 mr-1" /> Adicionar imagem
              </Button>
              <p className="text-[10px] text-[var(--sgt-text-muted)]">
                JPG, PNG, GIF ou WEBP — até 5MB por arquivo.
              </p>
            </div>
          </div>

          {/* Thread de mensagens — só aparece em tickets existentes */}
          {ticket && <TicketThread ticketId={ticket.id} />}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
            {/* Ações admin — só aparecem para admins */}
            <div className="flex gap-2">
              {ticket && isAdmin && (
                <>
                  <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={saving}>
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                  {ticket.status !== "concluido" && (
                    <Button type="button" variant="outline" onClick={handleConcluir} disabled={saving} className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                {podeEditar ? "Cancelar" : "Fechar"}
              </Button>
              {(podeEditar || pendentes.length > 0) && (
                <Button type="button" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  {ticket ? "Salvar" : "Abrir chamado"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O chamado "{ticket?.titulo}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-rose-600 hover:bg-rose-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
