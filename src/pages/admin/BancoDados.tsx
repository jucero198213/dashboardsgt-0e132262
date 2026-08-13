import { useState, useEffect } from "react";
import { Database, Key, Play, Info, HardDrive, Cpu, Link } from "lucide-react";
import { AnimatedCard } from "@/components/shared/AnimatedCard";

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
    if (type === "PK") return <span className="flex h-5 w-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-400 shrink-0 border border-amber-500/20"><Key className="h-3 w-3" /></span>;
    if (type === "FK") return <span className="flex h-5 w-6 items-center justify-center rounded-md bg-violet-500/15 text-[9px] font-bold text-violet-400 shrink-0 border border-violet-500/20">FK</span>;
    return <span className="w-6 shrink-0" />;
  };

  const stats = [
    { label: "Tabelas", value: String(TABLES.length), icon: Database, color: "text-cyan-400", gradient: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(59,130,246,0.04))", border: "border-cyan-500/20" },
    { label: "Tamanho", value: "~600MB", icon: HardDrive, color: "text-violet-400", gradient: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.04))", border: "border-violet-500/20" },
    { label: "Queries/min", value: String(qps), icon: Cpu, color: "text-emerald-400", gradient: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.04))", border: "border-emerald-500/20" },
    { label: "Conexões", value: "18/100", icon: Link, color: "text-amber-400", gradient: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,88,12,0.04))", border: "border-amber-500/20" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Indicadores ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Indicadores</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <AnimatedCard key={s.label} delay={i * 60} className={`rounded-[16px] border ${s.border} overflow-hidden`}>
            <div className="px-4 py-3.5 flex items-center gap-3" style={{ background: s.gradient }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] shrink-0">
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--sgt-text-muted)]">{s.label}</p>
                <p className={`text-[16px] font-bold tabular-nums ${s.color}`}>{s.value}</p>
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* ── Explorador ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sgt-text-muted)]">Explorador</span>
        <div className="flex-1 h-px" style={{ background: "var(--sgt-divider)" }} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        {/* Lista de tabelas */}
        <AnimatedCard delay={240} className="rounded-[20px] overflow-hidden border border-[var(--sgt-border-subtle)]">
          <div
            className="p-4 space-y-1.5 h-full"
            style={{ background: "linear-gradient(180deg, rgba(139,92,246,0.06) 0%, transparent 100%)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-3.5 w-3.5 text-violet-400" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--sgt-text-muted)]">Tabelas</p>
              <span className="ml-auto text-[10px] text-[var(--sgt-text-faint)]">{TABLES.length}</span>
            </div>
            {TABLES.map((t) => (
              <button key={t.name} onClick={() => setSelected(t === selected ? null : t)}
                className={`w-full flex items-center justify-between rounded-[12px] px-3 py-2.5 text-sm transition-all ${
                  selected?.name === t.name
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25"
                    : "sgt-text-2 hover:bg-[var(--sgt-row-hover)] hover:text-[var(--sgt-text-primary)]"
                }`}>
                <span className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="font-mono text-[12px]">{t.name}</span>
                </span>
                <span className="text-[10px] text-[var(--sgt-text-muted)] font-mono">{t.rows}</span>
              </button>
            ))}
          </div>
        </AnimatedCard>

        <div className="space-y-4">
          {/* Schema da tabela selecionada */}
          {selected && (
            <AnimatedCard delay={0} className="rounded-[20px] overflow-hidden border border-cyan-500/20">
              <div
                className="p-5"
                style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(59,130,246,0.03) 100%)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Database className="h-4 w-4 text-cyan-400" />
                  <p className="text-[12px] font-semibold uppercase tracking-[0.2em] sgt-text-2">
                    Schema — <span className="font-mono text-cyan-400">{selected.name}</span>
                  </p>
                  <span className="ml-auto rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
                    {selected.cols.length} colunas
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {selected.cols.map((c) => (
                    <div key={c.name} className="flex items-center gap-2 rounded-[10px] border border-[var(--sgt-border-subtle)] bg-[var(--sgt-input-bg)] px-3 py-2.5">
                      {colTag(c.type as ColType)}
                      <span className="font-mono text-[12px] sgt-text">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedCard>
          )}

          {/* Console SQL */}
          <AnimatedCard delay={320} className="rounded-[20px] overflow-hidden border border-amber-500/15">
            <div
              className="p-5 space-y-3"
              style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(234,88,12,0.03) 100%)" }}
            >
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-amber-400" />
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] sgt-text-2">Console SQL</p>
                <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-semibold text-amber-400 flex items-center gap-1">
                  <Info className="h-2.5 w-2.5" /> Read-only
                </span>
              </div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SELECT * FROM user_roles LIMIT 10;"
                rows={4}
                className="w-full rounded-xl border border-[var(--sgt-input-border)] bg-[var(--sgt-input-bg)] px-4 py-3 font-mono text-sm sgt-text placeholder:text-[var(--sgt-text-faint)] focus:outline-none focus:border-amber-500/40 resize-none"
              />
              <div className="flex items-center gap-3">
                <button onClick={runQuery}
                  className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/25 transition-all">
                  <Play className="h-3.5 w-3.5" /> Executar
                </button>
                {result.msg && (
                  <span className={`text-sm ${result.type === "ok" ? "text-emerald-400" : result.type === "warn" ? "text-amber-400" : "sgt-text-2"}`}>
                    {result.msg}
                  </span>
                )}
              </div>
            </div>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
}
