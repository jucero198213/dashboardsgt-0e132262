import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  BookOpen,
  Search,
  AlertCircle,
  ArrowLeft,
  Truck,
  DollarSign,
  Settings,
  Monitor,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Images,
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
  galeria: string[];
}

const CATEGORIAS = ["Todas", "Frota", "Financeiro", "Operacional", "TI"];

const CATEGORIA_STYLE: Record<string, { pill: string; icon: string; dot: string; step: string }> = {
  Frota:       { pill: "bg-blue-500/15 text-blue-300 border-blue-500/30",    icon: "text-blue-400",    dot: "bg-blue-500",    step: "bg-blue-500/20 border-blue-500/40 text-blue-300" },
  Financeiro:  { pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: "text-emerald-400", dot: "bg-emerald-500", step: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
  Operacional: { pill: "bg-amber-500/15 text-amber-300 border-amber-500/30",  icon: "text-amber-400",   dot: "bg-amber-500",   step: "bg-amber-500/20 border-amber-500/40 text-amber-300" },
  TI:          { pill: "bg-purple-500/15 text-purple-300 border-purple-500/30", icon: "text-purple-400",  dot: "bg-purple-500",  step: "bg-purple-500/20 border-purple-500/40 text-purple-300" },
};

const FALLBACK_STYLE = { pill: "bg-slate-500/15 text-slate-300 border-slate-500/30", icon: "text-slate-400", dot: "bg-slate-500", step: "bg-slate-500/20 border-slate-500/40 text-slate-300" };

function CategoriaIcon({ cat, className }: { cat: string; className?: string }) {
  const cls = `${className ?? "h-4 w-4"} ${(CATEGORIA_STYLE[cat] ?? FALLBACK_STYLE).icon}`;
  if (cat === "Frota") return <Truck className={cls} />;
  if (cat === "Financeiro") return <DollarSign className={cls} />;
  if (cat === "Operacional") return <Settings className={cls} />;
  if (cat === "TI") return <Monitor className={cls} />;
  return <BookOpen className={cls} />;
}

function Galeria({ imgs }: { imgs: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!imgs || imgs.length === 0) return null;
  const prev = () => setIdx(i => (i - 1 + imgs.length) % imgs.length);
  const next = () => setIdx(i => (i + 1) % imgs.length);
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 mb-3">
        <Images className="h-3.5 w-3.5 text-indigo-400" />
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--sgt-text-muted)" }}>
          Capturas do manual ({imgs.length})
        </p>
      </div>
      <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: "var(--sgt-border-subtle)", backgroundColor: "var(--sgt-bg-elevated)" }}>
        <img
          src={imgs[idx]}
          alt={`Captura ${idx + 1}`}
          className="w-full object-contain max-h-80"
          style={{ backgroundColor: "var(--sgt-bg-elevated)" }}
        />
        {imgs.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-white" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-white" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {imgs.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/50 text-white/80 tabular-nums">
          {idx + 1}/{imgs.length}
        </div>
      </div>
      {/* Miniaturas */}
      {imgs.length > 1 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {imgs.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className={`shrink-0 h-12 w-20 rounded border overflow-hidden transition-all ${
                i === idx ? "border-indigo-500/70 ring-1 ring-indigo-500/50" : "border-white/10 opacity-50 hover:opacity-80"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProcessoDetalhe({ processo, onVoltar }: { processo: Processo; onVoltar?: () => void }) {
  const style = CATEGORIA_STYLE[processo.categoria] ?? FALLBACK_STYLE;
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topo do detalhe */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b" style={{ borderColor: "var(--sgt-border-subtle)" }}>
        {onVoltar && (
          <button
            type="button"
            onClick={onVoltar}
            className="flex items-center gap-1.5 text-[11px] mb-3 hover:opacity-80 transition-opacity"
            style={{ color: "var(--sgt-text-muted)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar à lista
          </button>
        )}
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${style.pill}`}>
            <CategoriaIcon cat={processo.categoria} className="h-3 w-3" />
            {processo.categoria}
          </span>
          <span className="text-[11px] tabular-nums" style={{ color: "var(--sgt-text-muted)" }}>
            {processo.passos.length} passo{processo.passos.length !== 1 ? "s" : ""}
          </span>
        </div>
        <h2 className="text-base font-bold leading-snug mb-1" style={{ color: "var(--sgt-text-primary)" }}>
          {processo.titulo}
        </h2>
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--sgt-text-muted)" }}>
          {processo.descricao}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--sgt-text-muted)" }}>
          Passo a passo
        </p>
        <div className="flex flex-col">
          {processo.passos.map((passo, idx) => {
            const isLast = idx === processo.passos.length - 1;
            return (
              <div key={passo.ordem} className="flex gap-4">
                {/* Trilha vertical */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold border shrink-0 ${style.step}`}
                  >
                    {passo.ordem}
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 my-1" style={{ backgroundColor: "var(--sgt-border-subtle)", minHeight: "1.5rem" }} />
                  )}
                </div>

                {/* Conteúdo */}
                <div className={`flex-1 min-w-0 ${isLast ? "pb-2" : "pb-5"}`}>
                  <h3 className="text-[13px] font-semibold leading-snug mb-1" style={{ color: "var(--sgt-text-primary)" }}>
                    {passo.titulo}
                  </h3>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--sgt-text-secondary)" }}>
                    {passo.descricao}
                  </p>
                  {passo.observacao && (
                    <div className="mt-2 flex gap-2 rounded-lg px-3 py-2 bg-amber-500/10 border border-amber-500/25">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                      <p className="text-[11px] text-amber-300 leading-relaxed">{passo.observacao}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tags */}
        {processo.tags?.length > 0 && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-1.5" style={{ borderColor: "var(--sgt-border-subtle)" }}>
            {processo.tags.map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--sgt-bg-elevated)", color: "var(--sgt-text-muted)" }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <Galeria imgs={processo.galeria} />

        <p className="mt-5 text-[10px]" style={{ color: "var(--sgt-text-muted)" }}>
          <CheckCircle2 className="inline h-3 w-3 mr-1 text-emerald-400" />
          Extraído dos manuais oficiais Visual Rodopar (Datapar)
        </p>
      </div>
    </div>
  );
}

function ProcessoListItem({
  processo,
  selecionado,
  onClick,
}: {
  processo: Processo;
  selecionado: boolean;
  onClick: () => void;
}) {
  const style = CATEGORIA_STYLE[processo.categoria] ?? FALLBACK_STYLE;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
        selecionado
          ? "border-indigo-500/50 bg-indigo-500/10"
          : "border-transparent hover:border-white/10 hover:bg-white/5"
      }`}
    >
      <div className={`mt-0.5 h-5 w-5 rounded flex items-center justify-center shrink-0 ${style.step} border`}>
        <CategoriaIcon cat={processo.categoria} className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-medium leading-snug ${selecionado ? "text-indigo-200" : ""}`} style={selecionado ? undefined : { color: "var(--sgt-text-secondary)" }}>
          {processo.titulo}
        </p>
        <p className="text-[10px] tabular-nums mt-0.5" style={{ color: "var(--sgt-text-muted)" }}>
          {processo.passos.length} passo{processo.passos.length !== 1 ? "s" : ""}
        </p>
      </div>
    </button>
  );
}

export default function ProcessosWorkspace() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [mobileDetalhe, setMobileDetalhe] = useState(false);

  const { data: processos = [], isLoading, isError } = useQuery<Processo[]>({
    queryKey: ["processos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("id, titulo, categoria, descricao, passos, tags, galeria")
        .eq("ativo", true)
        .order("categoria")
        .order("titulo");
      if (error) throw error;
      return data as unknown as Processo[];
    },
  });

  const filtrados = processos.filter(p => {
    const matchCat = categoria === "Todas" || p.categoria === categoria;
    const q = busca.toLowerCase();
    const matchBusca = !q
      || p.titulo.toLowerCase().includes(q)
      || p.descricao.toLowerCase().includes(q)
      || p.tags?.some(t => t.toLowerCase().includes(q))
      || p.passos.some(s => s.titulo.toLowerCase().includes(q) || s.descricao.toLowerCase().includes(q));
    return matchCat && matchBusca;
  });

  const selecionado = processos.find(p => p.id === selecionadoId) ?? filtrados[0] ?? null;

  function selecionar(id: string) {
    setSelecionadoId(id);
    setMobileDetalhe(true);
  }

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
          {filtrados.length} de {processos.length}
        </span>
      </div>

      {/* Layout principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar (lista) ── */}
        <div
          className={`flex flex-col border-r shrink-0 overflow-hidden ${mobileDetalhe ? "hidden" : "flex"} sm:flex w-full sm:w-64 md:w-72`}
          style={{ borderColor: "var(--sgt-border-subtle)", backgroundColor: "var(--sgt-bg-surface)" }}
        >
          {/* Busca */}
          <div className="shrink-0 p-3 border-b" style={{ borderColor: "var(--sgt-border-subtle)" }}>
            <div className="relative">
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
          </div>

          {/* Filtro por categoria */}
          <div className="shrink-0 px-3 py-2 border-b flex flex-wrap gap-1" style={{ borderColor: "var(--sgt-border-subtle)" }}>
            {CATEGORIAS.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoria(cat)}
                className={`h-6 px-2 rounded text-[10px] font-medium transition-colors ${
                  categoria === cat
                    ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300"
                    : "border border-transparent hover:bg-white/5"
                }`}
                style={categoria !== cat ? { color: "var(--sgt-text-muted)" } : undefined}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Lista de processos */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading && (
              <div className="flex items-center justify-center h-20">
                <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              </div>
            )}
            {isError && (
              <div className="flex flex-col items-center justify-center h-20 gap-1">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-[11px]" style={{ color: "var(--sgt-text-muted)" }}>Erro ao carregar</p>
              </div>
            )}
            {!isLoading && !isError && filtrados.length === 0 && (
              <p className="text-center text-[11px] py-8" style={{ color: "var(--sgt-text-muted)" }}>
                Nenhum processo encontrado.
              </p>
            )}
            {!isLoading && !isError && filtrados.map(p => (
              <ProcessoListItem
                key={p.id}
                processo={p}
                selecionado={p.id === selecionado?.id}
                onClick={() => selecionar(p.id)}
              />
            ))}
          </div>
        </div>

        {/* ── Painel de detalhe ── */}
        <div
          className={`flex-1 overflow-hidden ${mobileDetalhe ? "flex" : "hidden"} sm:flex flex-col`}
          style={{ backgroundColor: "var(--sgt-bg-base)" }}
        >
          {selecionado ? (
            <ProcessoDetalhe
              processo={selecionado}
              onVoltar={mobileDetalhe ? () => setMobileDetalhe(false) : undefined}
            />
          ) : (
            !isLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--sgt-text-muted)" }}>
                <BookOpen className="h-8 w-8 opacity-30" />
                <p className="text-sm">Selecione um processo à esquerda</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
