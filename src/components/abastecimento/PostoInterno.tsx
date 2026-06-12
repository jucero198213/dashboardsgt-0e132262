import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { RAW } from "@/lib/theme";

// ═══════════════════════════════════════════════════════════════════════════
//  MOCK — Saldo do tanque interno da empresa
//  Para conectar ao banco depois: substituir este objeto pela resposta da
//  API mantendo o mesmo formato (todas as telas leem apenas daqui).
// ═══════════════════════════════════════════════════════════════════════════
export const SALDO_TANQUE_MOCK = {
  combustivel:              "Diesel S10",
  capacidadeLitros:         60000,
  saldoAtualLitros:         45000,
  consumoMedioDiarioLitros: 1850,
  ultimaRecargaData:        "05/06/2026",
  ultimaRecargaLitros:      28000,
  abastecidoMesLitros:      12450,
};

const fmtL = (v: number) => `${v.toLocaleString("pt-BR")} L`;

// ─────────────────────────────────────────────────────────────────────────────
//  Posto de combustível corporativo — desenho 100% CSS (sem ícones/imagens)
// ─────────────────────────────────────────────────────────────────────────────
export function PostoInterno() {
  const t = SALDO_TANQUE_MOCK;
  const pct = Math.max(0, Math.min(100, (t.saldoAtualLitros / t.capacidadeLitros) * 100));
  const autonomiaDias = t.consumoMedioDiarioLitros > 0
    ? Math.floor(t.saldoAtualLitros / t.consumoMedioDiarioLitros)
    : 0;

  const nivel = pct < 25
    ? { cor: "#f87171", rgb: "248,113,113", label: "Nível crítico" }
    : pct < 50
    ? { cor: "#fbbf24", rgb: "251,191,36", label: "Nível de atenção" }
    : { cor: "#34d399", rgb: "52,211,153", label: "Nível saudável" };

  return (
    <AnimatedCard delay={300}>
      <div
        className="rounded-[14px] sm:rounded-[16px] border p-4 sm:p-6"
        style={{ background: "var(--sgt-bg-card)", borderColor: RAW.borderDefault }}
      >
        {/* ── Header da seção ── */}
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
            Posto Interno — Estação Corporativa
          </span>
          <div className="flex-1 h-px" style={{ background: RAW.borderDefault }} />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/[0.08] px-2.5 py-0.5 text-[9px] font-bold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Operacional
          </span>
        </div>

        <div className="flex flex-col lg:flex-row items-center lg:items-end justify-center gap-10 lg:gap-12 py-6">

          {/* ═════════ TANQUE DE ARMAZENAMENTO ═════════ */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {/* Respiro / válvula superior */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-4 w-8 rounded-t-lg border border-white/10 bg-gradient-to-b from-slate-600/80 to-slate-700/80 z-10" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-5 w-24 rounded-full border border-white/10 bg-gradient-to-b from-slate-700/70 to-slate-800/70 z-10" />

              {/* Corpo do tanque (vidro) */}
              <div className="relative h-[300px] w-[210px] overflow-hidden rounded-[26px] border border-white/[0.12] bg-white/[0.025] backdrop-blur shadow-[inset_0_2px_18px_rgba(0,0,0,0.5),0_18px_50px_rgba(0,0,0,0.45)]">

                {/* Líquido — preenchimento proporcional ao saldo */}
                <div
                  className="absolute inset-x-0 bottom-0 transition-all duration-1000 ease-out"
                  style={{ height: `${pct}%` }}
                >
                  {/* Superfície do líquido */}
                  <div className="absolute -top-2.5 inset-x-0 h-5 rounded-[100%] bg-amber-300/40 blur-[6px] animate-pulse" />
                  <div className="absolute -top-1 inset-x-2 h-2 rounded-[100%] bg-amber-200/50" />
                  {/* Corpo do diesel */}
                  <div className="h-full w-full bg-gradient-to-b from-amber-400/70 via-amber-500/55 to-amber-700/65" />
                  {/* Bolhas sutis */}
                  <div className="absolute bottom-6 left-8 h-2 w-2 rounded-full bg-white/20 animate-pulse" />
                  <div className="absolute bottom-16 right-10 h-1.5 w-1.5 rounded-full bg-white/15 animate-pulse [animation-delay:300ms]" />
                  <div className="absolute bottom-28 left-14 h-1 w-1 rounded-full bg-white/15 animate-pulse [animation-delay:700ms]" />
                </div>

                {/* Brilho de vidro */}
                <div className="absolute left-4 top-4 bottom-4 w-2.5 rounded-full bg-white/[0.07]" />
                <div className="absolute left-8 top-6 bottom-10 w-1 rounded-full bg-white/[0.04]" />

                {/* Réguas de nível */}
                {[75, 50, 25].map(m => (
                  <div key={m} className="absolute inset-x-0" style={{ bottom: `${m}%` }}>
                    <div className="flex items-center gap-1.5 px-2">
                      <div className="h-px flex-1 bg-white/[0.10]" />
                      <span className="text-[8px] font-bold tabular-nums text-slate-400/80">{m}%</span>
                    </div>
                  </div>
                ))}

                {/* Leitura central */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                  <span className="text-[36px] font-black leading-none tabular-nums tracking-[-0.04em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                    {pct.toFixed(0)}%
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
                    {fmtL(t.saldoAtualLitros)} / {fmtL(t.capacidadeLitros)}
                  </span>
                  <span
                    className="mt-0.5 rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em]"
                    style={{
                      color: nivel.cor,
                      borderColor: `rgba(${nivel.rgb},0.35)`,
                      background: `rgba(${nivel.rgb},0.12)`,
                    }}
                  >
                    {nivel.label}
                  </span>
                </div>
              </div>

              {/* Pés do tanque */}
              <div className="flex justify-between px-7 -mt-0.5">
                <div className="h-5 w-4 rounded-b-md border-x border-b border-white/10 bg-slate-800/80" />
                <div className="h-5 w-4 rounded-b-md border-x border-b border-white/10 bg-slate-800/80" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-slate-400">Tanque de Armazenamento</p>
              <p className="text-[10px] font-semibold text-amber-400/70 mt-0.5">{t.combustivel}</p>
            </div>
          </div>

          {/* ═════════ DUTO DE LIGAÇÃO ═════════ */}
          <div className="hidden lg:flex flex-col items-center gap-1.5 pb-32">
            <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-slate-600">Duto</span>
            <div className="relative h-2.5 w-28 overflow-hidden rounded-full border border-white/[0.08] bg-slate-800/80">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/45 to-transparent animate-pulse" />
            </div>
          </div>

          {/* ═════════ BOMBA CORPORATIVA ═════════ */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {/* Mangueira (curva) */}
              <div className="absolute -right-9 top-16 h-36 w-12 rounded-br-[36px] border-b-[5px] border-r-[5px] border-slate-600/90" />
              {/* Bico de abastecimento */}
              <div className="absolute -right-[42px] top-9 flex flex-col items-center">
                <div className="h-8 w-3.5 rounded-t-md border border-white/10 bg-gradient-to-b from-slate-500/90 to-slate-600/90" />
                <div className="-mt-0.5 h-3 w-5 rounded-sm border border-white/10 bg-slate-600/90" />
              </div>

              {/* Corpo da bomba */}
              <div className="relative h-[270px] w-[160px] overflow-hidden rounded-[20px] border border-white/[0.12] bg-gradient-to-b from-slate-800/90 to-slate-900/95 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                {/* Faixa de identidade */}
                <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />

                {/* Placa SGT */}
                <div className="mx-3 mt-3 rounded-md border border-white/[0.06] bg-white/[0.03] py-1.5 text-center">
                  <span className="text-[9px] font-black uppercase tracking-[0.32em] text-amber-300">SGT</span>
                </div>

                {/* Display digital */}
                <div className="mx-3 mt-3 rounded-lg border border-amber-400/25 bg-black/70 p-3 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
                  <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">Abastecido no mês</p>
                  <p className="font-mono text-[20px] font-bold leading-none tabular-nums text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]">
                    {t.abastecidoMesLitros.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-right text-[9px] font-bold tracking-[0.18em] text-amber-500/80">LITROS</p>
                </div>

                {/* Teclado decorativo */}
                <div className="mx-3 mt-3 grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-4 rounded-[4px] border border-white/[0.07] bg-white/[0.04]" />
                  ))}
                </div>

                {/* Slot do bico */}
                <div className="absolute right-2 top-24 h-16 w-2 rounded-full border border-white/[0.06] bg-black/50" />

                {/* Rodapé da bomba */}
                <div className="absolute inset-x-0 bottom-0 flex h-8 items-center justify-center border-t border-white/[0.06] bg-black/30">
                  <span className="text-[7px] font-bold uppercase tracking-[0.3em] text-slate-600">Bomba 01 · Uso interno</span>
                </div>
              </div>

              {/* Base da bomba */}
              <div className="mx-auto -mt-0.5 h-3 w-[180px] rounded-b-xl border border-white/[0.08] bg-slate-800/90" />
            </div>

            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-slate-400">Bomba Corporativa</p>
              <p className="text-[10px] font-semibold text-slate-600 mt-0.5">Frota própria</p>
            </div>
          </div>

          {/* ═════════ PAINEL DE STATUS ═════════ */}
          <div className="grid w-full max-w-[440px] grid-cols-2 gap-2.5 lg:w-[210px] lg:grid-cols-1 lg:pb-12">
            {[
              { label: "Saldo Atual",       valor: fmtL(t.saldoAtualLitros),                       destaque: nivel.cor },
              { label: "Capacidade Total",  valor: fmtL(t.capacidadeLitros),                       destaque: "#94a3b8" },
              { label: "Autonomia Estimada", valor: `≈ ${autonomiaDias} dias`,                     destaque: "#22d3ee", sub: `${fmtL(t.consumoMedioDiarioLitros)}/dia` },
              { label: "Última Recarga",    valor: fmtL(t.ultimaRecargaLitros),                    destaque: "#a78bfa", sub: t.ultimaRecargaData },
            ].map(c => (
              <div
                key={c.label}
                className="rounded-[12px] border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5 backdrop-blur transition-all duration-300 hover:border-white/[0.14]"
              >
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">{c.label}</p>
                <p className="mt-1 text-[15px] font-black leading-none tabular-nums tracking-[-0.02em]" style={{ color: c.destaque }}>
                  {c.valor}
                </p>
                {c.sub && <p className="mt-1 text-[9px] font-semibold text-slate-600">{c.sub}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Nota de integração */}
        <div className="mt-2 flex items-center justify-center">
          <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-[9px] text-slate-600">
            Saldo do tanque com dados simulados — aguardando integração com o banco
          </span>
        </div>
      </div>
    </AnimatedCard>
  );
}
