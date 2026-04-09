import { useState, useEffect } from "react";
import { Database, Play, Trash2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface DBTable {
  name: string;
  rows: string;
  size: string;
  cols: { name: string; type: "PK" | "FK" | "col" }[];
}

const DB_TABLES: DBTable[] = [
  { name: "faturamento", rows: "1.2M", size: "284MB", cols: [{ name: "id", type: "PK" }, { name: "empresa_id", type: "FK" }, { name: "data_emissao", type: "col" }, { name: "valor_bruto", type: "col" }, { name: "valor_liquido", type: "col" }, { name: "status", type: "col" }, { name: "criado_em", type: "col" }] },
  { name: "clientes", rows: "48.3K", size: "12MB", cols: [{ name: "id", type: "PK" }, { name: "razao_social", type: "col" }, { name: "cnpj", type: "col" }, { name: "cidade", type: "col" }, { name: "uf", type: "col" }, { name: "ativo", type: "col" }] },
  { name: "motoristas", rows: "2.1K", size: "3MB", cols: [{ name: "id", type: "PK" }, { name: "nome", type: "col" }, { name: "cnh", type: "col" }, { name: "categoria", type: "col" }, { name: "status", type: "col" }, { name: "veiculo_id", type: "FK" }] },
  { name: "veiculos", rows: "890", size: "1.2MB", cols: [{ name: "id", type: "PK" }, { name: "placa", type: "col" }, { name: "modelo", type: "col" }, { name: "tipo", type: "col" }, { name: "tara_kg", type: "col" }, { name: "ativo", type: "col" }] },
  { name: "ocorrencias", rows: "156K", size: "45MB", cols: [{ name: "id", type: "PK" }, { name: "cte_id", type: "FK" }, { name: "tipo", type: "col" }, { name: "descricao", type: "col" }, { name: "data", type: "col" }, { name: "resolvido", type: "col" }] },
  { name: "usuarios", rows: "24", size: "0.1MB", cols: [{ name: "id", type: "PK" }, { name: "nome", type: "col" }, { name: "email", type: "col" }, { name: "role", type: "col" }, { name: "ativo", type: "col" }, { name: "ultimo_acesso", type: "col" }] },
];

export default function BancoDados() {
  const [selected, setSelected] = useState<DBTable | null>(null);
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<{ msg: string; type: "ok" | "warn" | "" }>({ msg: "", type: "" });
  const [qps, setQps] = useState(142);

  useEffect(() => {
    const t = setInterval(() => setQps(130 + Math.floor(Math.random() * 40)), 3000);
    return () => clearInterval(t);
  }, []);

  const runQuery = () => {
    if (!query.trim()) return;
    setQueryResult({ msg: "Executando…", type: "" });
    setTimeout(() => {
      if (/^select/i.test(query)) {
        setQueryResult({ msg: `✓ ${Math.floor(Math.random() * 500 + 10)} linhas retornadas em ${Math.floor(Math.random() * 300 + 50)}ms`, type: "ok" });
      } else {
        setQueryResult({ msg: "⚠ Operação de escrita requer aprovação do DBA.", type: "warn" });
      }
    }, 700);
  };

  const colTag = (type: "PK" | "FK" | "col") => {
    if (type === "PK") return <span className="w-5 h-4 flex items-center justify-center text-[9px] font-bold rounded bg-amber-500/15 text-amber-400 flex-shrink-0"><Key className="w-2.5 h-2.5" /></span>;
    if (type === "FK") return <span className="w-5 h-4 flex items-center justify-center text-[9px] font-bold rounded bg-purple-500/15 text-purple-400 flex-shrink-0">FK</span>;
    return <span className="w-5 flex-shrink-0" />;
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Tabelas", value: "47", sub: "schema public" },
          { label: "Tamanho total", value: "2.8GB", sub: "uso atual" },
          { label: "Queries/min", value: String(qps), sub: "média última hora", color: "text-emerald-400" },
          { label: "Conexões ativas", value: "18/100", sub: "pool ativo" },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-semibold ${s.color || "text-white"}`}>{s.value}</p>
            <p className="text-[11px] text-white/30 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Table list */}
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-400" /> Tabelas Principais
            </h3>
            <Button size="sm" variant="outline" className="text-xs border-white/10 text-white/50 hover:bg-white/5 hover:text-white h-7">
              + Nova tabela
            </Button>
          </div>
          <div className="space-y-1.5">
            {DB_TABLES.map((t) => (
              <div key={t.name} onClick={() => setSelected(t)}
                className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all
                  ${selected?.name === t.name
                    ? "border-blue-500/50 bg-blue-500/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"}`}>
                <div>
                  <p className="text-xs font-semibold text-white font-mono">{t.name}</p>
                  <p className="text-[10px] text-white/35 mt-0.5">{t.rows} registros · {t.size}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/35 border border-white/10">
                  {t.cols.length} cols
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail + Query */}
        <div className="space-y-4">
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              {selected ? `📊 ${selected.name}` : "← Selecione uma tabela"}
            </h3>
            {selected ? (
              <>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden mb-3">
                  <div className="flex items-center justify-between px-3 py-2 bg-white/[0.04] border-b border-white/[0.06]">
                    <span className="text-xs font-semibold text-white font-mono">{selected.name}</span>
                    <span className="text-[10px] text-white/35">{selected.rows} rows · {selected.size}</span>
                  </div>
                  {selected.cols.map((col) => (
                    <div key={col.name} className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.03] last:border-0">
                      {colTag(col.type)}
                      <span className="text-xs text-white font-mono">{col.name}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[`SELECT * FROM ${selected.name} LIMIT 100;`, `SELECT COUNT(*) FROM ${selected.name};`].map((q) => (
                    <Button key={q} size="sm" variant="outline" onClick={() => setQuery(q)}
                      className="text-[11px] border-white/10 text-white/50 hover:bg-white/5 hover:text-white h-7">
                      {q.startsWith("SELECT *") ? "SELECT *" : "COUNT"}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-white/30">Clique em uma tabela para inspecionar o schema.</p>
            )}
          </div>

          {/* Query editor */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Play className="w-4 h-4 text-emerald-400" /> Query Rápida
            </h3>
            <Textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={4}
              placeholder="SELECT * FROM faturamento WHERE data >= CURRENT_DATE - 30 LIMIT 100;"
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 text-xs font-mono resize-y" />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={runQuery} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1">
                <Play className="w-3 h-3" /> Executar
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setQuery(""); setQueryResult({ msg: "", type: "" }); }}
                className="text-xs border-white/10 text-white/50 hover:bg-white/5 hover:text-white h-8 gap-1">
                <Trash2 className="w-3 h-3" /> Limpar
              </Button>
            </div>
            {queryResult.msg && (
              <p className={`text-xs mt-2 font-mono ${queryResult.type === "ok" ? "text-emerald-400" : queryResult.type === "warn" ? "text-amber-400" : "text-white/40"}`}>
                {queryResult.msg}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
