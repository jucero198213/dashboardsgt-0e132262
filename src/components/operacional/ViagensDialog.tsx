import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RAW } from "@/lib/theme";
import { FileText, Truck, User, Package, MapPin } from "lucide-react";

interface ViagemRow {
  veiculo: string;
  veiculo2?: string | null;
  motorista: string | null;
  rota: string;
  percCompleto: number;
  totalItens: number;
  itensReal: number;
  codDoc: string | null;
  tipoDoc: string | null;
  filialDoc: string | null;
  emManutencao: boolean;
  temAtraso: boolean;
  descSituacao: string | null;
  classiVei: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle?: string;
  rows: ViagemRow[];
}

const tagCarga = (v: ViagemRow) => {
  if (v.totalItens > 0 || v.itensReal > 0) return { label: "Carregado", color: RAW.accent.emerald };
  return { label: "Vazio", color: RAW.accent.amber };
};
const tagDoc = (v: ViagemRow) => {
  const has = !!v.codDoc;
  return has
    ? { label: `${v.tipoDoc ?? "DOC"} ${v.codDoc}`, color: RAW.accent.cyan }
    : { label: "Sem manifesto", color: RAW.accent.rose };
};

export function ViagensDialog({ open, onOpenChange, title, subtitle, rows }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}>
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold uppercase tracking-[0.18em] text-cyan-300">
            {title}
          </DialogTitle>
          {subtitle && (
            <p className="text-[11px] text-slate-400">{subtitle} • {rows.length} registro(s)</p>
          )}
        </DialogHeader>

        <div className="overflow-auto flex-1 -mx-6 px-6">
          {rows.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-[13px]">Nenhum registro.</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-[var(--sgt-bg-card)] z-10">
                <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-500 border-b" style={{ borderColor: RAW.borderDefault }}>
                  <th className="py-2 pr-3"><Truck className="inline w-3 h-3 mr-1" />Veículo</th>
                  <th className="py-2 pr-3"><User className="inline w-3 h-3 mr-1" />Motorista</th>
                  <th className="py-2 pr-3"><MapPin className="inline w-3 h-3 mr-1" />Rota</th>
                  <th className="py-2 pr-3"><Package className="inline w-3 h-3 mr-1" />Carga</th>
                  <th className="py-2 pr-3"><FileText className="inline w-3 h-3 mr-1" />Manifesto</th>
                  <th className="py-2 pr-3 text-right">% concl.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v, i) => {
                  const carga = tagCarga(v);
                  const doc = tagDoc(v);
                  return (
                    <tr key={i} className="border-b hover:bg-white/[0.02]" style={{ borderColor: `${RAW.borderDefault}55` }}>
                      <td className="py-2 pr-3 font-mono font-bold text-cyan-300">
                        {v.veiculo}
                        {v.veiculo2 && <span className="text-slate-500 font-normal"> / {v.veiculo2}</span>}
                      </td>
                      <td className="py-2 pr-3 text-slate-300">{v.motorista ?? "—"}</td>
                      <td className="py-2 pr-3 text-slate-400">{v.rota}</td>
                      <td className="py-2 pr-3">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${carga.color}1a`, color: carga.color }}>
                          {carga.label}
                          {v.totalItens > 0 && <span className="opacity-70">({v.itensReal}/{v.totalItens})</span>}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${doc.color}1a`, color: doc.color }}>
                          {doc.label}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right font-bold text-slate-200">{v.percCompleto.toFixed(0)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
