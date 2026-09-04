import { useState, useEffect, useCallback } from "react";
import {
  Database, Key, HardDrive, RefreshCw, Table2, Columns3, Rows3, Lock,
  ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { logActivity } from "@/lib/activityLogApi";
import {
  listTables, describeTable, readTable,
  type TableInfo, type ColumnInfo, type TableData,
} from "@/lib/databaseAdminApi";

const PER_PAGE = 50;

function formatNumber(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function formatCell(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function BancoDados() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"schema" | "dados">("schema");

  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);

  const [data, setData] = useState<TableData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [page, setPage] = useState(1);

  const carregarTabelas = useCallback(async () => {
    setLoadingTables(true);
    setErro(null);
    try {
      setTables(await listTables());
    } catch (e) {
      setErro((e as Error).message || "Falha ao carregar tabelas");
    } finally {
      setLoadingTables(false);
    }
  }, []);

  useEffect(() => { carregarTabelas(); }, [carregarTabelas]);

  // Schema da tabela selecionada
  useEffect(() => {
    if (!selected) { setColumns([]); return; }
    let ativo = true;
    setLoadingColumns(true);
    describeTable(selected)
      .then((c) => { if (ativo) setColumns(c); })
      .catch((e) => { if (ativo) setErro((e as Error).message); })
      .finally(() => { if (ativo) setLoadingColumns(false); });
    return () => { ativo = false; };
  }, [selected]);

  // Dados da tabela selecionada
  useEffect(() => {
    if (!selected || tab !== "dados") return;
    let ativo = true;
    setLoadingData(true);
    readTable(selected, page, PER_PAGE)
      .then((d) => { if (ativo) setData(d); })
      .catch((e) => { if (ativo) setErro((e as Error).message); })
      .finally(() => { if (ativo) setLoadingData(false); });
    return () => { ativo = false; };
  }, [selected, tab, page]);

  const selecionarTabela = (name: string) => {
    setSelected(name);
    setTab("schema");
    setPage(1);
    setData(null);
    logActivity("database_viewed", `Visualizou tabela: ${name}`, { table_name: name });
  };

  const totalRegistros = tables.reduce((acc, t) => acc + Number(t.row_count || 0), 0);

  const stats = [
    { label: "Tabelas", value: formatNumber(tables.length), icon: Database, color: "text-cyan-400", gradient: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(59,130,246,0.04))", border: "border-cyan-500/20" },
    { label: "Registros", value: formatNumber(totalRegistros), icon: HardDrive, color: "text-violet-400", gradient: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.04))", border: "border-violet-500/20" },
    { label: "Colunas", value: formatNumber(tables.reduce((a, t) => a + Number(t.column_count || 0), 0)), icon: Columns3, color: "text-emerald-400", gradient: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.04))", border: "border-emerald-500/20" },
    { label: "Modo", value: "Somente leitura", icon: Lock, color: "text-amber-400", gradient: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,88,12,0.04))", border: "border-amber-500/20" },
  ];

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;
  const colunasDados = data?.rows?.length ? Object.keys(data.rows[0]) : columns.map((c) => c.column_name);

  return (
    <div className="space-y-4">
      {/* ── Indicadores ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Indicadores</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
        <button
          onClick={carregarTabelas}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--sgt-border-subtle)] px-2.5 py-1 text-[11px] sgt-text-2 hover:text-[var(--sgt-text-primary)] transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${loadingTables ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <AnimatedCard key={s.label} delay={i * 60} className={`rounded-[16px] border ${s.border} overflow-hidden`}>
            <div className="px-4 py-3.5 flex items-center gap-3" style={{ background: s.gradient }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] shrink-0">
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--sgt-text-muted)]">{s.label}</p>
                <p className={`text-[16px] font-bold tabular-nums truncate ${s.color}`}>{s.value}</p>
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {erro && (
        <div className="rounded-[14px] border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {/* ── Explorador ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Explorador</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        {/* Lista de tabelas */}
        <AnimatedCard delay={240} className="rounded-[20px] overflow-hidden border border-[var(--sgt-border-subtle)]">
          <div className="p-4 space-y-1.5 h-full" style={{ background: "linear-gradient(180deg, rgba(139,92,246,0.06) 0%, transparent 100%)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-3.5 w-3.5 text-violet-400" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--sgt-text-muted)]">Tabelas</p>
              <span className="ml-auto text-[10px] text-[var(--sgt-text-faint)]">{tables.length}</span>
            </div>

            {loadingTables ? (
              <div className="flex items-center gap-2 py-6 justify-center text-[12px] sgt-text-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
              </div>
            ) : tables.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-[var(--sgt-text-muted)]">Nenhuma tabela encontrada.</p>
            ) : (
              <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                {tables.map((t) => (
                  <button
                    key={t.table_name}
                    onClick={() => selecionarTabela(t.table_name)}
                    className={`w-full flex items-center justify-between rounded-[12px] px-3 py-2.5 text-sm transition-all ${
                      selected === t.table_name
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25"
                        : "sgt-text-2 hover:bg-[var(--sgt-row-hover)] hover:text-[var(--sgt-text-primary)]"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Table2 className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="font-mono text-[12px] truncate">{t.table_name}</span>
                    </span>
                    <span className="ml-2 shrink-0 text-right">
                      <span className="block text-[10px] font-mono text-[var(--sgt-text-muted)]">{formatNumber(Number(t.row_count))} reg.</span>
                      <span className="block text-[9px] font-mono text-[var(--sgt-text-faint)]">{t.column_count} col.</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </AnimatedCard>

        {/* Detalhes */}
        <AnimatedCard delay={300} className="rounded-[20px] overflow-hidden border border-cyan-500/20">
          <div className="p-5" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(59,130,246,0.03) 100%)" }}>
            {!selected ? (
              <div className="py-16 text-center">
                <Database className="mx-auto h-8 w-8 text-[var(--sgt-text-faint)] mb-3" />
                <p className="text-sm sgt-text-2">Selecione uma tabela para ver o schema e os dados.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Table2 className="h-4 w-4 text-cyan-400" />
                  <p className="text-[12px] font-semibold uppercase tracking-[0.2em] sgt-text-2">
                    <span className="font-mono text-cyan-400 normal-case tracking-normal">{selected}</span>
                  </p>
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-400 flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" /> Somente leitura
                  </span>

                  <div className="ml-auto flex rounded-xl border border-[var(--sgt-border-subtle)] overflow-hidden">
                    {(["schema", "dados"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                          tab === t ? "bg-cyan-500/15 text-cyan-300" : "sgt-text-2 hover:text-[var(--sgt-text-primary)]"
                        }`}
                      >
                        {t === "schema" ? "Schema" : "Dados"}
                      </button>
                    ))}
                  </div>
                </div>

                {tab === "schema" ? (
                  loadingColumns ? (
                    <div className="flex items-center gap-2 py-10 justify-center text-[12px] sgt-text-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando schema…
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-[14px] border border-[var(--sgt-border-subtle)]">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-[0.15em] text-[var(--sgt-text-muted)]">
                            <th className="px-3 py-2.5 font-semibold">Coluna</th>
                            <th className="px-3 py-2.5 font-semibold">Tipo</th>
                            <th className="px-3 py-2.5 font-semibold">Nullable</th>
                            <th className="px-3 py-2.5 font-semibold">Default</th>
                          </tr>
                        </thead>
                        <tbody>
                          {columns.map((c) => (
                            <tr key={c.column_name} className="border-t border-[var(--sgt-border-subtle)]">
                              <td className="px-3 py-2.5">
                                <span className="flex items-center gap-2">
                                  {c.is_primary_key && (
                                    <span className="flex h-5 w-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-400 shrink-0 border border-amber-500/20">
                                      <Key className="h-3 w-3" />
                                    </span>
                                  )}
                                  {!c.is_primary_key && c.is_foreign_key && (
                                    <span className="flex h-5 w-6 items-center justify-center rounded-md bg-violet-500/15 text-[9px] font-bold text-violet-400 shrink-0 border border-violet-500/20">FK</span>
                                  )}
                                  {!c.is_primary_key && !c.is_foreign_key && <span className="w-6 shrink-0" />}
                                  <span className="font-mono sgt-text">{c.column_name}</span>
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-[11px] text-cyan-300/80">
                                {c.data_type}{c.max_length ? `(${c.max_length})` : ""}
                              </td>
                              <td className="px-3 py-2.5 text-[11px] sgt-text-2">{c.is_nullable === "YES" ? "sim" : "não"}</td>
                              <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--sgt-text-muted)] max-w-[240px] truncate">
                                {c.column_default ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] sgt-text-2">
                      <Rows3 className="h-3.5 w-3.5 text-cyan-400" />
                      {data ? `${formatNumber(data.total)} registros` : "—"}
                    </div>

                    {loadingData ? (
                      <div className="flex items-center gap-2 py-10 justify-center text-[12px] sgt-text-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando dados…
                      </div>
                    ) : !data || data.rows.length === 0 ? (
                      <p className="py-10 text-center text-[12px] text-[var(--sgt-text-muted)]">Nenhum registro nesta tabela.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-[14px] border border-[var(--sgt-border-subtle)]">
                        <table className="min-w-full text-left text-[11px] whitespace-nowrap">
                          <thead>
                            <tr className="text-[10px] uppercase tracking-[0.12em] text-[var(--sgt-text-muted)]">
                              {colunasDados.map((c) => (
                                <th key={c} className="px-3 py-2.5 font-semibold font-mono">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.rows.map((row, i) => (
                              <tr key={i} className="border-t border-[var(--sgt-border-subtle)] hover:bg-[var(--sgt-row-hover)]">
                                {colunasDados.map((c) => (
                                  <td key={c} className="px-3 py-2 font-mono sgt-text-2 max-w-[260px] truncate">
                                    {formatCell(row[c])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {data && data.total > data.per_page && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[var(--sgt-text-muted)]">
                          Página {data.page} de {totalPaginas}
                        </span>
                        <div className="flex gap-2">
                          <button
                            disabled={page <= 1 || loadingData}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="flex items-center gap-1 rounded-lg border border-[var(--sgt-border-subtle)] px-3 py-1.5 text-[11px] sgt-text-2 disabled:opacity-40 hover:text-[var(--sgt-text-primary)] transition-colors"
                          >
                            <ChevronLeft className="h-3 w-3" /> Anterior
                          </button>
                          <button
                            disabled={page >= totalPaginas || loadingData}
                            onClick={() => setPage((p) => p + 1)}
                            className="flex items-center gap-1 rounded-lg border border-[var(--sgt-border-subtle)] px-3 py-1.5 text-[11px] sgt-text-2 disabled:opacity-40 hover:text-[var(--sgt-text-primary)] transition-colors"
                          >
                            Próximo <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}
