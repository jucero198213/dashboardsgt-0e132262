import { useState, useEffect } from "react";
import { Database, Key, Play, Info } from "lucide-react";

const TABLES = [
  { name: "user_roles",   rows: "24",    size: "0.1MB", cols: [{ name: "id", type: "PK" }, { name: "user_id", type: "FK" }, { name: "role", type: "col" }, { name: "created_at", type: "col" }] },
  { name: "PAGDOCI",      rows: "1.2M",  size: "284MB", cols: [{ name: "NUMDOC", type: "PK" }, { name: "CODCLIFOR", type: "FK" }, { name: "DATVEN", type: "col" }, { name: "DATPAG", type: "col" }, { name: "VLRPAR", type: "col" }, { name: "VLRPAG", type: "col" }, { name: "SITUAC", type: "col" }] },
  { name: "RECDOCI",      rows: "980K",  size: "210MB", cols: [{ name: "NUMDUP", type: "PK" }, { name: "CODCLIFOR", type: "FK" }, { name: "DATVEN", type: "col" }, { name: "DATREC", type: "col" }, { name: "VLRPAR", type: "col" }, { name: "VLRREC", type: "col" }, { name: "SITUAC", type: "col" }] },
  { name: "PAGRAT",       rows: "1.1M",  size: "95MB",  cols: [{ name: "NUMDOC", type: "FK" }, { name: "CODCUS", type: "col" }, { name: "CODCGA", type: "col" }, { name: "VALOR", type: "col" }, { name: "ANALIT", type: "col" }] },
  { name: "RODFIL",       rows: "48",    size: "0.2MB", cols: [{ name: "CODFIL", type: "PK" }, { name: "CODEMP", type: "FK" }, { name: "NOMEAB", type: "col" }] },
  { name: "RODCUS",       rows: "156",   size: "0.5MB", cols: [{ name: "CODCUS", type: "PK" }, { name: "DESCRI", type: "col" }] },
];

type ColType = "PK" | "FK" | "col";

export default function BancoDados() {
  const [selected, setSelected] = useState<typeof TABLES[0] | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ msg: string; type: "ok" | "warn" | "" }>({ msg: "", type: "" });
  const [qps, setQps] = useState(142);

  useEffect(() => {
    const t = setInterval(() => setQps(130 + Math.floor(Math.random() * 40)), 3000);
    return () => clearInterval(t);
  }, []);

  const runQuery = () => {
    if (!query.trim()) return;
    setResult({ msg: "Executando…", type: "" });
    setTimeout(() => {
      if (/^select/i.test(query.trim())) {
        setResult({ msg: `✓ ${Math.floor(Math.random() * 500 + 10)} linhas retornadas em ${Math.floor(Math.random() * 200 + 50)}ms`, type: "ok" });
      } else {
        setResult({ msg: "⚠ Operações de escrita requerem aprovação do DBA.", type: "warn" });
      }
    }, 600);
  };

  const colTag = (type: ColType) => {
    if (type === "PK") return <span className="flex h-4 w-5 items-center justify-center rounded bg-amber-500/15 text-amber-400 shrink-0"><Key className="h-2.5 w-2.5" /></span>;
    if (type === "FK") return <span className="flex h-4 w-5 items-center justify-center rounded bg-violet-500/15 text-[8px] font-bold text-violet-400 shrink-0">FK</span>;
    return <span className="w-5 shrink-0" />;
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Tabelas", value: String(TABLES.length), sub: "schema" },
          { label: "Tamanho total", value: "~600MB", sub: "uso estimado" },
          { label: "Queries/min", value: String(qps), sub: "média", color: "text-emerald-400" },
          { label: "Conexões ativas", value: "18/100", sub: "pool ativo" },
        ].map((s) => (
          <div key={s.label} className="rounded-[16px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--sgt-text-muted)]">{s.label}</p>
            <p className={`mt-1 text-[15px] font-bold ${s.color ?? "sgt-text"}`}>{s.value}</p>
            <p className="text-[10px] text-[var(--sgt-text-muted)]">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        {/* Lista de tabelas */}
        <div className="rounded-[20px] border border-[var(--sgt-border-subtle)] sgt-bg-card p-4 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--sgt-text-muted)] mb-3">Tabelas</p>
          {TABLES.map((t) => (
            <button key={t.name} onClick={() => setSelected(t === selected ? null : t)}
              className={`w-full flex items-center justify-between rounded-[10px] px-3 py-2 text-sm transition-all ${
                selected?.name === t.name
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20"
                  : "sgt-text-2 hover:bg-[var(--sgt-row-hover)] hover:text-[var(--sgt-text-primary)]"
              }`}>
              <span className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 shrink-0" />
                <span className="font-mono text-[12px]">{t.name}</span>
              </span>
              <span className="text-[10px] text-[var(--sgt-text-muted)]">{t.rows}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* Schema da tabela selecionada */}
          {selected && (
            <div className="rounded-[20px] border border-[var(--sgt-border-subtle)] sgt-bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] sgt-text-2 mb-3">
                Schema — <span className="font-mono text-cyan-400">{selected.name}</span>
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {selected.cols.map((c) => (
                  <div key={c.name} className="flex items-center gap-2 rounded-[8px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-2">
                    {colTag(c.type as ColType)}
                    <span className="font-mono text-[12px] sgt-text">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Console SQL */}
          <div className="rounded-[20px] border border-[var(--sgt-border-subtle)] sgt-bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] sgt-text-2">Console SQL</p>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-semibold text-amber-400 flex items-center gap-1">
                <Info className="h-2.5 w-2.5" /> Read-only
              </span>
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SELECT * FROM user_roles LIMIT 10;"
              rows={4}
              className="w-full rounded-xl border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] px-4 py-3 font-mono text-sm sgt-text placeholder:text-[var(--sgt-text-faint)] focus:outline-none focus:border-cyan-500/50 resize-none"
            />
            <div className="flex items-center gap-3">
              <button onClick={runQuery}
                className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all">
                <Play className="h-3.5 w-3.5" /> Executar
              </button>
              {result.msg && (
                <span className={`text-sm ${result.type === "ok" ? "text-emerald-400" : result.type === "warn" ? "text-amber-400" : "sgt-text-2"}`}>
                  {result.msg}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}