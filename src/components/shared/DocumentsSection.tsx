import React, { useState, useMemo } from "react";
import {
  FileText, Search, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown, Download, Filter
} from "lucide-react";

export interface DocumentColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
}

interface DocumentsSectionProps<T extends Record<string, unknown>> {
  titulo?: string;
  subtitulo?: string;
  dados: T[];
  colunas: DocumentColumn<T>[];
  itensPorPagina?: number;
  searchPlaceholder?: string;
  searchKeys?: (keyof T | string)[];
  onExport?: () => void;
  emptyMessage?: string;
  loading?: boolean;
}

type SortDir = "asc" | "desc" | null;

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === "asc") return <ArrowUp className="h-3 w-3 text-emerald-400" />;
  if (dir === "desc") return <ArrowDown className="h-3 w-3 text-emerald-400" />;
  return <ArrowUpDown className="h-3 w-3 text-white/20" />;
}

export function DocumentsSection<T extends Record<string, unknown>>({
  titulo = "Detalhamento",
  subtitulo = "Documentos e registros do período",
  dados,
  colunas,
  itensPorPagina = 15,
  searchPlaceholder = "Buscar...",
  searchKeys = [],
  onExport,
  emptyMessage = "Nenhum documento encontrado",
  loading = false,
}: DocumentsSectionProps<T>) {
  const [search, setSearch] = useState("");
  const [pagina, setPagina] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // Filtragem
  const filtrados = useMemo(() => {
    if (!search.trim()) return dados;
    const q = search.toLowerCase();
    return dados.filter(row =>
      searchKeys.some(k => {
        const val = row[k as keyof T];
        return String(val ?? "").toLowerCase().includes(q);
      })
    );
  }, [dados, search, searchKeys]);

  // Ordenação
  const ordenados = useMemo(() => {
    if (!sortKey || !sortDir) return filtrados;
    return [...filtrados].sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      const cmp = String(va).localeCompare(String(vb), "pt-BR", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtrados, sortKey, sortDir]);

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / itensPorPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const paginados = ordenados.slice(inicio, inicio + itensPorPagina);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : d === "desc" ? null : "asc");
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPagina(1);
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    setPagina(1);
  };

  // Páginas visíveis
  const paginasVisiveis = useMemo(() => {
    const pages: number[] = [];
    const delta = 2;
    for (let i = Math.max(1, paginaAtual - delta); i <= Math.min(totalPaginas, paginaAtual + delta); i++) {
      pages.push(i);
    }
    return pages;
  }, [paginaAtual, totalPaginas]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <FileText className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-white/90">{titulo}</h3>
            <p className="text-[11px] text-white/40">{subtitulo}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pl-8 pr-3 rounded-lg border border-white/10 bg-white/[0.04] text-[12px] text-white/80 placeholder:text-white/25 focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.06] transition-all w-48"
            />
          </div>

          {/* Contador */}
          <div className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/8 bg-white/[0.03]">
            <Filter className="h-3 w-3 text-white/30" />
            <span className="text-[11px] text-white/40">
              {filtrados.length} de {dados.length}
            </span>
          </div>

          {/* Export */}
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/10 bg-white/[0.04] text-white/50 text-[11px] hover:bg-white/[0.08] hover:text-white/70 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.03]">
                {colunas.map(col => (
                  <th
                    key={String(col.key)}
                    className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/40 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${col.sortable ? "cursor-pointer hover:text-white/60 select-none" : ""}`}
                    style={{ width: col.width }}
                    onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                  >
                    <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : ""}`}>
                      {col.label}
                      {col.sortable && <SortIcon dir={sortKey === String(col.key) ? sortDir : null} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5 animate-pulse">
                    {colunas.map((col, j) => (
                      <td key={j} className="px-3 py-2.5">
                        <div className="h-3 rounded bg-white/5 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginados.length === 0 ? (
                <tr>
                  <td colSpan={colunas.length} className="px-3 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-white/10" />
                      <p className="text-[12px] text-white/30">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginados.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                  >
                    {colunas.map(col => {
                      const val = row[col.key as keyof T];
                      return (
                        <td
                          key={String(col.key)}
                          className={`px-3 py-2.5 text-white/70 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
                        >
                          {col.render ? col.render(val, row) : String(val ?? "-")}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-white/8 bg-white/[0.02]">
            <p className="text-[11px] text-white/30">
              {inicio + 1}–{Math.min(inicio + itensPorPagina, ordenados.length)} de {ordenados.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="h-7 w-7 rounded-lg border border-white/8 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {paginasVisiveis[0] > 1 && (
                <>
                  <button onClick={() => setPagina(1)} className="h-7 w-7 rounded-lg border border-white/8 text-[11px] text-white/40 hover:bg-white/[0.06] transition-all">1</button>
                  {paginasVisiveis[0] > 2 && <span className="text-white/20 text-[11px] px-1">…</span>}
                </>
              )}

              {paginasVisiveis.map(p => (
                <button
                  key={p}
                  onClick={() => setPagina(p)}
                  className={`h-7 w-7 rounded-lg border text-[11px] transition-all ${p === paginaAtual
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-medium"
                    : "border-white/8 text-white/40 hover:bg-white/[0.06]"
                    }`}
                >
                  {p}
                </button>
              ))}

              {paginasVisiveis[paginasVisiveis.length - 1] < totalPaginas && (
                <>
                  {paginasVisiveis[paginasVisiveis.length - 1] < totalPaginas - 1 && (
                    <span className="text-white/20 text-[11px] px-1">…</span>
                  )}
                  <button onClick={() => setPagina(totalPaginas)} className="h-7 w-7 rounded-lg border border-white/8 text-[11px] text-white/40 hover:bg-white/[0.06] transition-all">{totalPaginas}</button>
                </>
              )}

              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
                className="h-7 w-7 rounded-lg border border-white/8 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
