import { useEffect, useState } from "react";
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
import { Trash2, CheckCircle2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Ticket, TicketInput, TicketPrioridade, TicketStatus,
  createTicket, updateTicket, deleteTicket,
  PRIORIDADE_LABEL, STATUS_LABEL,
} from "@/lib/ticketsApi";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket | null;
  defaultDate?: string; // YYYY-MM-DD
  onSaved: () => void;
}

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
});

export function TicketModal({ open, onOpenChange, ticket, defaultDate, onSaved }: Props) {
  const [form, setForm] = useState<TicketInput>(empty(defaultDate));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
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
      });
    } else {
      setForm(empty(defaultDate));
    }
  }, [ticket, defaultDate, open]);

  const set = <K extends keyof TicketInput>(k: K, v: TicketInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!form.data_chamado) {
      toast.error("Data é obrigatória");
      return;
    }
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
      };
      if (ticket) {
        await updateTicket(ticket.id, payload);
        toast.success("Chamado atualizado");
      } else {
        await createTicket(payload);
        toast.success("Chamado criado");
      }
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
            <DialogTitle>{ticket ? "Editar chamado" : "Novo chamado"}</DialogTitle>
            <DialogDescription>
              {ticket ? "Atualize os dados do chamado." : "Preencha as informações do novo chamado."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input id="titulo" value={form.titulo} onChange={(e) => set("titulo", e.target.value)} maxLength={200} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" rows={3} value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="cliente">Cliente / Setor</Label>
                <Input id="cliente" value={form.cliente_setor ?? ""} onChange={(e) => set("cliente_setor", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="resp">Responsável</Label>
                <Input id="resp" value={form.responsavel ?? ""} onChange={(e) => set("responsavel", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="data">Data *</Label>
                <Input id="data" type="date" value={form.data_chamado} onChange={(e) => set("data_chamado", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hora">Horário</Label>
                <Input id="hora" type="time" value={form.horario_chamado ?? ""} onChange={(e) => set("horario_chamado", e.target.value || null)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={(v) => set("prioridade", v as TicketPrioridade)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORIDADE_LABEL) as TicketPrioridade[]).map((p) => (
                      <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v as TicketStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea id="obs" rows={2} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
            <div className="flex gap-2">
              {ticket && (
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
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
              <Button type="button" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                {ticket ? "Salvar" : "Criar"}
              </Button>
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
