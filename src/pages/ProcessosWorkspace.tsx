import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Passo {
  ordem: number;
  titulo: string;
  descricao: string;
  observacao?: string | null;
}

interface Processo {
  id: string;
  titulo: string;
  categoria: string;
  descricao: string;
  passos: Passo[];
  tags: string[];
}

const CATEGORIAS = ["Todas", "Frota", "Financeiro", "Operacional", "TI"];

const CATEGORIA_COLOR: Record<string, string> = {
  Frota:       "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Financeiro:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Operacional: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  TI:          "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

function ProcessoCard({ processo }: { processo: Processo }) {
  const [aberto, setAberto] = useState(false);
  const [passoAtivo, setPassoAtivo] = useState<number | null>(null);

  return (
    <div
      className="rounded-xl border transition-colors"
      style={{ borderColor: aberto ? "var(--sgt-border-default)" : "var(--sgt-border-subtle)", backgroundColor: "var(--sgt-bg-surface)" }}
    >
      {/* Cabeçalho do card */}
      <button
        type="button"
        className="w-full text-left px-4 py-3.5 flex items-start gap-3"
        onClick={() => setAberto(v => !v)}
      >
        <div className="mt-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${CATEGORIA_COLOR[processo.categoria] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30"}`}>
              {processo.categoria}
            </span>
            <span className="text-[10px] text-slate-500 tabular-nums">
              {processo.passos.length} passo{processo.passos.length !== 1 ? "s" : ""}
            </span>
          </div>
          <h3 className="text-sm font-semibold leading-snug" style={{ color: "var(--sgt-text-primary)" }}>
            {processo.titulo}
          </h3>
          <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--sgt-text-muted)" }}>
            {processo.descricao}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 mt-1 transition-transform ${aberto ? "rotate-180" : ""}`}
          style={{ color: "var(--sgt-text-muted)" }}
        />
      </button>

      {/* Passos */}
      {aberto && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--sgt-border-subtle)" }}>
          <div className="mt-3 flex flex-col gap-2">
            {processo.passos.map((passo) => {
              const ativo = passoAtivo === passo.ordem;
              return (
                <div key={passo.ordem} className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--sgt-border-subtle)" }}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-white/5 transition-colors"
                    onClick={() => setPassoAtivo(ativo ? null : passo.ordem)}
                  >
                    <span
                      className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: "var(--sgt-bg-elevated)", color: "var(--sgt-text-muted)", border: "1px solid var(--sgt-border-default)" }}
                    >
                      {passo.ordem}
                    </span>
                    <span className="flex-1 text-[12px] font-medium" style={{ color: "var(--sgt-text-secondary)" }}>
                      {passo.titulo}
                    </span>
                    <ChevronRight
                      className={`h-3.5 w-3.5 shrink-0 transition-transform ${ativo ? "rotate-90" : ""}`}
                      style={{ color: "var(--sgt-text-muted)" }}
                    />
                  </button>
                  {ativo && (
                    <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: "var(--sgt-border-subtle)", backgroundColor: "var(--sgt-bg-elevated)" }}>
                      <p className="text-[12px] leading-relaxed" style={{ color: "var(--sgt-text-secondary)" }}>
                        {passo.descricao}
                      </p>
                      {passo.observacao && (
                        <div className="mt-2 flex gap-2 rounded-md px-2.5 py-2 bg-amber-500/10 border border-amber-500/25">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                          <p className="text-[11px] text-amber-300 leading-relaxed">{passo.observacao}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Tags */}
          {processo.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {processo.tags.map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--sgt-bg-elevated)", color: "var(--sgt-text-muted)" }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProcessosWorkspace() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas");

  const { data: processos = [], isLoading, isError } = useQuery<Processo[]>({
    queryKey: ["processos"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("processos")
        .select("id, titulo, categoria, descricao, passos, tags")
        .eq("ativo", true)
        .order("categoria")
        .order("titulo");
      if (error) throw error;
      return data as Processo[];
    },
  });

  const filtrados = processos.filter(p => {
    const matchCat = categoria === "Todas" || p.categoria === categoria;
    const q = busca.toLowerCase();
    const matchBusca = !q
      || p.titulo.toLowerCase().includes(q)
      || p.descricao.toLowerCase().includes(q)
      || p.categoria.toLowerCase().includes(q)
      || p.tags?.some(t => t.toLowerCase().includes(q))
      || p.passos.some(s => s.titulo.toLowerCase().includes(q) || s.descricao.toLowerCase().includes(q));
    return matchCat && matchBusca;
  });

  return (
    <div className="flex h-[calc(100dvh-4rem)] sm:h-[100dvh] w-full flex-col" style={{ backgroundColor: "var(--sgt-bg-base)" }}>
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between border-b px-4 py-2"
        style={{ borderColor: "var(--sgt-border-subtle)", backgroundColor: "var(--sgt-bg-surface)" }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors hover:bg-white/8"
            style={{ borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" }}
          >
            <Home className="h-3.5 w-3.5" />
            Início
          </button>
          <span style={{ color: "var(--sgt-border-subtle)" }}>/</span>
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--sgt-text-primary)" }}>
              Processos
            </span>
          </div>
        </div>
        <span className="text-[11px]" style={{ color: "var(--sgt-text-muted)" }}>
          {filtrados.length} processo{filtrados.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filtros */}
      <div className="shrink-0 border-b px-4 py-2.5 flex items-center gap-3 flex-wrap" style={{ borderColor: "var(--sgt-border-subtle)", backgroundColor: "var(--sgt-bg-surface)" }}>
        {/* Busca */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "var(--sgt-text-muted)" }} />
          <input
            type="text"
            placeholder="Buscar processo..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-8 pr-3 h-7 rounded-lg border text-[12px] outline-none focus:ring-1 focus:ring-indigo-500/50"
            style={{ borderColor: "var(--sgt-border-subtle)", backgroundColor: "var(--sgt-bg-elevated)", color: "var(--sgt-text-primary)" }}
          />
        </div>
        {/* Categorias */}
        <div className="flex items-center gap-1.5">
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoria(cat)}
              className={`h-7 px-2.5 rounded-lg border text-[11px] font-medium transition-colors ${categoria === cat ? "border-indigo-500/60 bg-indigo-500/15 text-indigo-300" : "hover:bg-white/5"}`}
              style={categoria !== cat ? { borderColor: "var(--sgt-border-subtle)", color: "var(--sgt-text-muted)" } : undefined}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="h-5 w-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: "var(--sgt-text-muted)" }}>
            <AlertCircle className="h-6 w-6 text-red-400" />
            <p className="text-sm">Erro ao carregar processos.</p>
          </div>
        )}
        {!isLoading && !isError && filtrados.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: "var(--sgt-text-muted)" }}>
            <BookOpen className="h-6 w-6" />
            <p className="text-sm">Nenhum processo encontrado.</p>
          </div>
        )}
        {!isLoading && !isError && filtrados.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 max-w-6xl mx-auto">
            {filtrados.map(p => (
              <ProcessoCard key={p.id} processo={p} />
            ))}
          </div>
        )}
        {!isLoading && !isError && filtrados.length > 0 && (
          <p className="text-center text-[11px] mt-6" style={{ color: "var(--sgt-text-muted)" }}>
            <CheckCircle2 className="inline h-3 w-3 mr-1 text-emerald-400" />
            Processados a partir dos manuais oficiais Visual Rodopar (Datapar)
          </p>
        )}
      </div>
    </div>
  );
}
