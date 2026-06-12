import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { RAW } from "@/lib/theme";
import sgtLogo from "@/assets/sgt-logo.png";

// ═══════════════════════════════════════════════════════════════════════════
//  MOCK — Saldo do tanque interno da empresa
//  Para conectar ao banco depois: substituir este objeto pela resposta da
//  API mantendo o mesmo formato (todas as telas leem apenas daqui).
// ═══════════════════════════════════════════════════════════════════════════
export const SALDO_TANQUE_MOCK = {
  combustivel:              "Diesel S10",
  capacidadeLitros:         15400,
  saldoAtualLitros:         11550,
  consumoMedioDiarioLitros: 850,
  recebidoMesLitros:        16000,
  abastecidoMesLitros:      8900,
  abastecidoDiaLitros:      850,
  ultimaRecargaData:        "08/06/2026",
  ultimaRecargaLitros:      8000,
  ultimaPlacaAbastecida:    "RDO1A23",
  ultimaPlacaLitros:        480,
  ultimaPlacaDataHora:      "10/06/2026 14:32",
};

// ═══════════════════════════════════════════════════════════════════════════
//  MOCK — Últimas movimentações do tanque interno
//  Mesma regra: substituir pelo retorno da API mantendo o formato.
// ═══════════════════════════════════════════════════════════════════════════
export const MOVIMENTACOES_TANQUE_MOCK: {
  dataHora: string;
  tipo: "Recarga" | "Abastecimento Frota";
  volumeLitros: number;
  responsavel: string;
  status: "Concluído" | "Em validação";
}[] = [
  { dataHora: "10/06/2026 14:32", tipo: "Abastecimento Frota", volumeLitros: 480,   responsavel: "RDO1A23 · Carlos Mendes",   status: "Concluído" },
  { dataHora: "10/06/2026 08:15", tipo: "Abastecimento Frota", volumeLitros: 370,   responsavel: "RDO4B56 · João Pereira",    status: "Concluído" },
  { dataHora: "08/06/2026 10:47", tipo: "Recarga",             volumeLitros: 8000,  responsavel: "Distribuidora Ipiranga SA", status: "Concluído" },
];

const fmtL = (v: number) => `${v.toLocaleString("pt-BR")} L`;

// ─────────────────────────────────────────────────────────────────────────────
//  Posto de combustível corporativo — desenho 100% CSS (sem ícones/imagens)
// ─────────────────────────────────────────────────────────────────────────────
export function PostoInterno() {
  const t = SALDO_TANQUE_MOCK;
  const pct = Math.max(0, Math.min(100, (t.saldoAtualLitros / t.capacidadeLitros) * 100));

  const nivel = pct < 25
    ? { cor: "#f87171", rgb: "248,113,113", label: "Nível crítico" }
    : pct < 50
    ? { cor: "#fbbf24", rgb: "251,191,36", label: "Nível de atenção" }
    : { cor: "#34d399", rgb: "52,211,153", label: "Nível saudável" };

  return (
    <AnimatedCard delay={300}>
      {/* Keyframes locais — fluxo do duto e movimento do líquido */}
      <style>{`
        @keyframes sgt-fuel-flow {
          0%   { transform: translateX(-110%); }
          100% { transform: translateX(330%); }
        }
        @keyframes sgt-swell {
          0%, 100% { transform: translate(0%, 0px); }
          50%      { transform: translate(3.5%, 2px); }
        }
        @keyframes sgt-swell-rev {
          0%, 100% { transform: translate(0%, 1px); }
          50%      { transform: translate(-3.5%, -1.5px); }
        }
        @keyframes sgt-liquid-bob {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(3px); }
        }
        @keyframes sgt-bubble-rise {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          15%  { opacity: 0.55; }
          85%  { opacity: 0.35; }
          100% { transform: translateY(-220px) scale(1.2); opacity: 0; }
        }
        /* Promove elementos animados para camadas próprias da GPU (evita
           repaints no Safari/WebKit) */
        .sgt-anim {
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        /* Acessibilidade + economia: desliga as animações decorativas
           quando o sistema pede menos movimento */
        @media (prefers-reduced-motion: reduce) {
          .sgt-anim { animation: none !important; }
        }
      `}</style>

      <div
        className="rounded-[14px] sm:rounded-[16px] border border-white/10 p-4 sm:p-6"
        style={{ background: "var(--sgt-bg-card)" }}
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

        <div className="flex flex-col lg:flex-row items-center lg:items-end justify-center gap-12 lg:gap-16 py-10">

          {/* ═════════ TANQUE DE ARMAZENAMENTO ═════════ */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {/* Respiro / válvula superior */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-5 w-10 rounded-t-lg border border-white/10 bg-gradient-to-b from-slate-600/80 to-slate-700/80 z-10" />
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-6 w-32 rounded-full border border-white/10 bg-gradient-to-b from-slate-700/70 to-slate-800/70 z-10" />

              {/* Corpo do tanque (vidro) */}
              <div className="relative h-[420px] w-[300px] overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.025] shadow-[inset_0_2px_18px_rgba(0,0,0,0.5),0_18px_50px_rgba(0,0,0,0.45)]" style={{ contain: "paint" }}>

                {/* Líquido — preenchimento proporcional ao saldo */}
                <div
                  className="sgt-anim absolute inset-x-0 bottom-0"
                  style={{ height: `${pct}%`, animation: "sgt-liquid-bob 4.5s ease-in-out infinite" }}
                >
                  {/* Superfície ondulando — duas elipses largas balançando em oposição */}
                  <div
                    className="sgt-anim absolute -top-2 left-[-55%] h-5 w-[210%] rounded-[100%] bg-gradient-to-b from-amber-400/70 to-amber-400/0"
                    style={{ animation: "sgt-swell 6.5s ease-in-out infinite" }}
                  />
                  <div
                    className="sgt-anim absolute -top-[5px] left-[-55%] h-4 w-[210%] rounded-[100%] bg-amber-300/30"
                    style={{ animation: "sgt-swell-rev 9s ease-in-out infinite" }}
                  />
                  {/* Brilho suave acompanhando a superfície */}
                  <div
                    className="sgt-anim absolute top-[2px] left-[-55%] h-[3px] w-[210%] rounded-[100%] bg-amber-200/30"
                    style={{ animation: "sgt-swell 6.5s ease-in-out infinite" }}
                  />
                  {/* Corpo do diesel */}
                  <div className="h-full w-full bg-gradient-to-b from-amber-400/70 via-amber-500/55 to-amber-700/65" />
                  {/* Bolhas subindo */}
                  <div className="sgt-anim absolute bottom-4 left-8 h-2 w-2 rounded-full bg-white/25" style={{ animation: "sgt-bubble-rise 4.2s ease-in infinite" }} />
                  <div className="sgt-anim absolute bottom-2 right-10 h-1.5 w-1.5 rounded-full bg-white/20" style={{ animation: "sgt-bubble-rise 5.6s ease-in infinite", animationDelay: "1.4s" }} />
                  <div className="sgt-anim absolute bottom-6 left-1/2 h-1 w-1 rounded-full bg-white/20" style={{ animation: "sgt-bubble-rise 6.4s ease-in infinite", animationDelay: "2.8s" }} />
                  <div className="sgt-anim absolute bottom-3 right-16 h-1 w-1 rounded-full bg-white/15" style={{ animation: "sgt-bubble-rise 4.9s ease-in infinite", animationDelay: "3.5s" }} />
                </div>

                {/* Brilho de vidro */}
                <div className="absolute left-5 top-5 bottom-5 w-3 rounded-full bg-white/[0.07]" />
                <div className="absolute left-10 top-8 bottom-12 w-1.5 rounded-full bg-white/[0.04]" />

                {/* Réguas de nível */}
                {[75, 50, 25].map(m => (
                  <div key={m} className="absolute inset-x-0" style={{ bottom: `${m}%` }}>
                    <div className="flex items-center gap-2 px-3">
                      <div className="h-px flex-1 bg-white/[0.10]" />
                      <span className="text-[10px] font-bold tabular-nums text-slate-400/80">{m}%</span>
                    </div>
                  </div>
                ))}

                {/* Leitura central */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <span className="text-[56px] font-black leading-none tabular-nums tracking-[-0.04em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                    {pct.toFixed(0)}%
                  </span>
                  <span className="text-[15px] font-bold tabular-nums text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
                    {fmtL(t.saldoAtualLitros)} / {fmtL(t.capacidadeLitros)}
                  </span>
                  <span
                    className="mt-1 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
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
              <div className="flex justify-between px-10 -mt-0.5">
                <div className="h-6 w-5 rounded-b-md border-x border-b border-white/10 bg-slate-800/80" />
                <div className="h-6 w-5 rounded-b-md border-x border-b border-white/10 bg-slate-800/80" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-slate-400">Tanque de Armazenamento</p>
              <p className="text-[12px] font-semibold text-amber-400/70 mt-1">{t.combustivel}</p>
            </div>
          </div>

          {/* ═════════ DUTO DE LIGAÇÃO — fluxo animado ═════════ */}
          <div className="hidden lg:flex flex-col items-center gap-2 pb-48">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-600">Duto</span>
            <div className="relative h-3.5 w-44 overflow-hidden rounded-full border border-white/10 bg-slate-800/80">
              {/* Pulso de combustível percorrendo o duto */}
              <div
                className="sgt-anim absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-amber-400/70 to-transparent"
                style={{ animation: "sgt-fuel-flow 1.8s linear infinite" }}
              />
              <div
                className="sgt-anim absolute inset-y-0 w-1/4 rounded-full bg-gradient-to-r from-transparent via-amber-300/40 to-transparent"
                style={{ animation: "sgt-fuel-flow 1.8s linear infinite", animationDelay: "0.9s" }}
              />
            </div>
          </div>

          {/* ═════════ BOMBA CORPORATIVA ═════════ */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {/* Corpo da bomba */}
              <div className="relative h-[380px] w-[230px] overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-slate-800/80 to-slate-900/85 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                {/* Faixa de identidade */}
                <div className="h-2.5 w-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />

                {/* Placa com a logo */}
                <div className="mx-4 mt-4 flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] py-3">
                  <img
                    src={sgtLogo}
                    alt="SGT"
                    className="block h-12 w-auto object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                  />
                </div>

                {/* Display digital */}
                <div className="mx-4 mt-4 rounded-xl border border-amber-400/25 bg-black/70 p-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Abastecido no dia</p>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-mono text-[34px] font-bold leading-none tabular-nums text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.45)]">
                      {t.abastecidoDiaLitros.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-[11px] font-bold tracking-[0.18em] text-amber-500/80">LITROS</p>
                  </div>
                </div>

                {/* Teclado decorativo */}
                <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-6 rounded-[5px] border border-white/[0.07] bg-white/[0.04]" />
                  ))}
                </div>

                {/* Rodapé da bomba */}
                <div className="absolute inset-x-0 bottom-0 flex h-10 items-center justify-center border-t border-white/[0.06] bg-black/30">
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-600">Bomba 01 · Uso interno</span>
                </div>
              </div>

              {/* Base da bomba */}
              <div className="mx-auto -mt-0.5 h-4 w-[260px] rounded-b-xl border border-white/[0.08] bg-slate-800/90" />

              {/* ── Mangueira — segmentos alinhados ───────────────────────────
                  linha vertical em x=260..266 (centro 263); o bico (w-5,
                  right -43px) fica centrado no mesmo eixo; o cotovelo
                  horizontal entra no corpo da bomba. */}
              {/* Cotovelo inferior (entra no corpo) */}
              <div className="absolute right-[-36px] bottom-[74px] h-[6px] w-[48px] rounded-full bg-slate-600/90" />
              {/* Segmento vertical */}
              <div className="absolute right-[-36px] top-[100px] bottom-[74px] w-[6px] rounded-full bg-slate-600/90" />
              {/* Bico de abastecimento (na ponta superior da linha) */}
              <div className="absolute right-[-43px] top-[60px] flex w-5 flex-col items-center">
                <div className="h-11 w-5 rounded-t-md border border-white/10 bg-gradient-to-b from-slate-500/90 to-slate-600/90" />
                <div className="-mt-0.5 h-4 w-7 rounded-sm border border-white/10 bg-slate-600/90" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-slate-400">Bomba Corporativa</p>
              <p className="text-[12px] font-semibold text-slate-600 mt-1">Frota própria</p>
            </div>
          </div>

          {/* ═════════ PAINEL DE STATUS ═════════ */}
          <div className="grid w-full max-w-[520px] grid-cols-2 gap-3 lg:w-[300px] lg:grid-cols-1 lg:pb-16">
            {[
              { label: "Total Recebido (Mês)",   valor: fmtL(t.recebidoMesLitros),   destaque: "#fbbf24" },
              { label: "Total Abastecido (Mês)", valor: fmtL(t.abastecidoMesLitros), destaque: "#94a3b8" },
              { label: "Última Recarga",         valor: fmtL(t.ultimaRecargaLitros), destaque: "#a78bfa", sub: `em ${t.ultimaRecargaData}` },
              { label: "Última Placa Abastecida", valor: t.ultimaPlacaAbastecida, destaque: "#22d3ee", sub: `${fmtL(t.ultimaPlacaLitros)} · ${t.ultimaPlacaDataHora}`, glow: true },
            ].map(c => (
              <div
                key={c.label}
                className="rounded-[14px] border border-white/10 bg-white/[0.025] px-5 py-4 transition-colors duration-300 hover:border-white/[0.18]"
                style={c.glow ? { boxShadow: "0 0 22px -8px rgba(34,211,238,0.35)" } : undefined}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{c.label}</p>
                <p className="mt-1.5 text-[22px] font-black leading-none tabular-nums tracking-[-0.02em]" style={{ color: c.destaque }}>
                  {c.valor}
                </p>
                {c.sub && <p className="mt-1.5 text-[11px] font-semibold text-slate-600">{c.sub}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* ═════════ ÚLTIMAS MOVIMENTAÇÕES DO TANQUE ═════════ */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
              Últimas Movimentações do Tanque
            </span>
            <div className="flex-1 h-px" style={{ background: RAW.borderDefault }} />
          </div>

          <div className="overflow-x-auto rounded-[12px] border border-white/10 bg-white/[0.015]">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {["Data/Hora", "Tipo", "Volume (L)", "Responsável / Fornecedor", "Status"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 ${i === 2 ? "text-right" : i === 4 ? "text-center" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOVIMENTACOES_TANQUE_MOCK.map((m, i) => {
                  const recarga = m.tipo === "Recarga";
                  return (
                    <tr
                      key={i}
                      className="border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.025]"
                    >
                      <td className="px-4 py-2.5">
                        <span className="text-[12px] tabular-nums text-slate-400">{m.dataHora}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                            recarga
                              ? "border-emerald-400/25 bg-emerald-500/[0.08] text-emerald-300"
                              : "border-amber-400/25 bg-amber-500/[0.08] text-amber-300"
                          }`}
                        >
                          <span className={`h-1 w-1 rounded-full ${recarga ? "bg-emerald-400" : "bg-amber-400"}`} />
                          {m.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-mono text-[12px] font-bold tabular-nums ${recarga ? "text-emerald-300" : "text-amber-300"}`}>
                          {recarga ? "+" : "−"}{m.volumeLitros.toLocaleString("pt-BR")} L
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[12px] text-slate-300">{m.responsavel}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                            m.status === "Concluído"
                              ? "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-400/90"
                              : "border-slate-400/20 bg-slate-500/[0.08] text-slate-400"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nota de integração */}
        <div className="mt-3 flex items-center justify-center">
          <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-[9px] text-slate-600">
            Saldo e movimentações com dados simulados — aguardando integração com o banco
          </span>
        </div>
      </div>
    </AnimatedCard>
  );
}
