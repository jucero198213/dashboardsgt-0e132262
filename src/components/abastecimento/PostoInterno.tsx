import { useState } from "react";
import { AnimatedCard } from "@/components/shared/AnimatedCard";
import { RAW } from "@/lib/theme";
import sgtLogo from "@/assets/sgt-logo.png";
import tanqueImg from "@/assets/tanque-industrial.png";

// ─── Configuração física do tanque (propriedade do equipamento) ───────────────
export const TANQUE_CONFIG = {
  combustivel:      "Diesel S10",
  capacidadeLitros: 15400,
};

// ─── Dados reais vindos do DW ────────────────────────────────────────────────
//  Saídas: /dw-abastecimento (postos SGT) · Entradas: /dw-compras (notas NFI)
//  Campos null = chamada de compras indisponível/falhou
export interface PostoInternoDados {
  abastecidoPeriodoLitros: number;
  abastecidoDiaLitros:     number;
  diaReferencia:           string | null;
  ultimaPlaca: { placa: string; litros: number; data: string } | null;
  recebidoPeriodoLitros:   number | null;
  ultimaRecarga: { data: string; litros: number; fornecedor: string | null } | null;
  saldoAtualLitros:        number | null;
  precoUltimaRecarga:      number | null;   // R$/L da última entrada de diesel
  qtdAbastecimentosDia:    number;          // nº de saídas no último dia
  qtdAbastecimentosPeriodo:number;          // nº de saídas no período
  movimentacoes: {
    data: string;
    tipo: "Recarga" | "Abastecimento Frota";
    volumeLitros: number;
    responsavel: string;
  }[];
}

const fmtL = (v: number) => `${Math.round(v).toLocaleString("pt-BR")} L`;

// ─────────────────────────────────────────────────────────────────────────────
//  Posto de combustível corporativo — desenho 100% CSS (sem ícones/imagens)
// ─────────────────────────────────────────────────────────────────────────────
export function PostoInterno({ dados, presentation = false }: { dados: PostoInternoDados; presentation?: boolean }) {
  const saldoReal = dados.saldoAtualLitros != null;
  // Saldo exibido limitado ao intervalo físico do tanque
  const saldoLitros = saldoReal
    ? Math.max(0, Math.min(TANQUE_CONFIG.capacidadeLitros, dados.saldoAtualLitros!))
    : 0;
  const pct = Math.max(0, Math.min(100, (saldoLitros / TANQUE_CONFIG.capacidadeLitros) * 100));

  const nivel = pct < 25
    ? { cor: "#f87171", rgb: "248,113,113", label: "Nível crítico" }
    : pct < 50
    ? { cor: "#fbbf24", rgb: "251,191,36", label: "Nível de atenção" }
    : { cor: "#34d399", rgb: "52,211,153", label: "Nível saudável" };

  // ─── Valores do display retro-digital ──────────────────────────────────────
  // TODO(integração): hoje vêm do DW via prop `dados`. Para mockar/preview, basta
  // sobrescrever os campos abaixo. Os valores de referência do layout estão nos
  // comentários (image_2.png).
  const display = {
    litrosDia:    Math.round(dados.abastecidoDiaLitros),                 // ex.: 5.883
    data:         dados.diaReferencia ?? "—",                            // ex.: 14/06/2026
    precoRecarga: dados.precoUltimaRecarga != null                       // ex.: R$ 4,50
      ? `R$ ${dados.precoUltimaRecarga.toFixed(2).replace(".", ",")}`
      : "—",
    abastDia:     dados.qtdAbastecimentosDia,                            // ex.: 13
    abastPeriodo: dados.qtdAbastecimentosPeriodo,                        // ex.: 297
  };

  // ─── Movimentações: 6 por padrão, expansível ───────────────────────────────
  const MOVS_COLAPSADO = 6;
  const [movsExpandido, setMovsExpandido] = useState(false);
  const movsVisiveis = movsExpandido
    ? dados.movimentacoes
    : dados.movimentacoes.slice(0, MOVS_COLAPSADO);
  const temMaisMovs = dados.movimentacoes.length > MOVS_COLAPSADO;

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
        className={presentation
          ? "flex h-full min-h-0 flex-col overflow-hidden p-0"
          : "rounded-[14px] sm:rounded-[16px] border border-white/10 p-4 sm:p-6"}
        style={presentation ? undefined : { background: "var(--sgt-bg-card)" }}
      >
        {/* ── Header da seção ── */}
        {!presentation && (
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
        )}

        <div className={
          presentation
            ? "flex min-h-0 flex-1 flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 py-2 [perspective:1400px]"
            : "flex flex-col lg:flex-row items-center lg:items-end justify-center gap-12 lg:gap-16 py-10"
        }>

          {/* ═════════ TANQUE DE ARMAZENAMENTO — render 3D (imagem) ═══════════
              A carcaça é uma imagem PNG de face LIMPA (sem display/rótulos). O
              painel abaixo é o próprio display (dados ao vivo do DW), montado
              centralizado na face. Rótulos em HTML logo abaixo da imagem.
              Ajuste left/top/w do display e left/top/bottom da barra p/ alinhar. */}
          <div
            className={presentation ? "flex flex-col items-center" : "flex flex-col items-center"}
            style={presentation ? {
              transform: "perspective(1400px) translateZ(-40px) translateX(2px) scale(0.85)",
              transformOrigin: "center right",
              filter: "brightness(0.86) saturate(0.92) blur(0.3px) drop-shadow(0 18px 28px rgba(0,0,0,0.55))",
              opacity: 0.95,
            } : undefined}
          >
            <div className={presentation ? "relative w-[260px] select-none" : "relative w-[440px] select-none"}>
              <img
                src={tanqueImg}
                alt="Tanque de Armazenamento — Diesel S10"
                className="block w-full"
                draggable={false}
              />

              {/* Display dinâmico — painel montado na face limpa do tanque */}
              <div className={presentation
                ? "absolute left-[52%] top-[48%] z-10 flex w-[46%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[10px] border border-white/10 bg-[rgba(6,10,16,0.96)] px-2 py-2 text-center shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_2px_16px_rgba(0,0,0,0.9)]"
                : "absolute left-[52%] top-[48%] z-10 flex w-[46%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[14px] border border-white/10 bg-[rgba(6,10,16,0.96)] px-3 py-4 text-center shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_2px_16px_rgba(0,0,0,0.9)]"
              }>
                <div className={presentation
                  ? "font-mono text-[28px] font-black leading-none tabular-nums tracking-[-0.03em] text-slate-100 [text-shadow:0_0_18px_rgba(255,255,255,0.22)]"
                  : "font-mono text-[46px] font-black leading-none tabular-nums tracking-[-0.03em] text-slate-100 [text-shadow:0_0_18px_rgba(255,255,255,0.22)]"
                }>
                  {pct.toFixed(0)}%
                </div>
                <div className={presentation
                  ? "mt-1 whitespace-nowrap font-mono text-[10px] font-semibold tabular-nums text-slate-300/90"
                  : "mt-2.5 whitespace-nowrap font-mono text-[13px] font-semibold tabular-nums text-slate-300/90"
                }>
                  {saldoReal ? fmtL(saldoLitros) : "—"} / {fmtL(TANQUE_CONFIG.capacidadeLitros)}
                </div>
                <div
                  className={presentation
                    ? "mt-1.5 inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]"
                    : "mt-3 inline-flex whitespace-nowrap rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                  }
                  style={{ color: nivel.cor, borderColor: `rgba(${nivel.rgb},0.4)`, background: `rgba(${nivel.rgb},0.14)` }}
                >
                  {nivel.label}
                </div>
              </div>

              {/* ── Medidor de nível (sight glass) ── */}
              <div className={presentation
                ? "absolute left-[82%] top-[22%] bottom-[20%] z-10 w-[9px] -translate-x-1/2 overflow-hidden rounded-full border border-white/20 bg-[rgba(2,4,8,0.6)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.85),0_1px_0_rgba(255,255,255,0.1)]"
                : "absolute left-[82%] top-[22%] bottom-[20%] z-10 w-[12px] -translate-x-1/2 overflow-hidden rounded-full border border-white/20 bg-[rgba(2,4,8,0.6)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.85),0_1px_0_rgba(255,255,255,0.1)]"
              }>
                <div
                  className="absolute inset-x-0 bottom-0 rounded-full bg-[linear-gradient(180deg,#fde047,#f59e0b_55%,#b45309)] shadow-[0_0_10px_rgba(251,191,36,0.7)] transition-[height] duration-700 ease-out"
                  style={{ height: `${pct}%` }}
                />
                <div className="pointer-events-none absolute inset-y-0 left-[1.5px] w-[2px] rounded-full bg-white/25" />
              </div>
            </div>

            {/* Identificação — a imagem nova tem face limpa, sem rótulos */}
            <div className={presentation ? "hidden" : "mt-3 text-center"}>
              <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-slate-400">Tanque de Armazenamento</p>
              <p className="mt-1 text-[12px] font-semibold text-amber-400/70">{TANQUE_CONFIG.combustivel}</p>
            </div>
          </div>

          {/* ═════════ LINHA DE TRANSFERÊNCIA ════════════════════════════════
              Duto metálico curto, reto e horizontal com visor de vidro central
              mostrando o diesel dourado fluindo. Container estreito (w-[180px])
              + `-mx-16` (cancela o gap do flex) mantêm tanque e bomba próximos
              e o duto encaixado entre eles. Ajuste w-* / pb-* para reposicionar. */}
          <div className={`relative z-0 -mx-16 w-[180px] ${presentation ? "hidden" : "hidden lg:flex"} flex-col items-center justify-center pb-[0px]`}>
            <div className="relative h-[140px] w-full">
              {/* duto simples — tubo reto com visor central de diesel */}
              <div className="absolute inset-x-0 top-[15px] flex -translate-y-1/2 items-center">
                {/* tubo esquerdo */}
                <div className="h-[10px] flex-1 rounded-l-sm bg-[linear-gradient(180deg,#8a94a3,#3a4453_55%,#1b2129)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]" />

                {/* visor central com fluxo de diesel */}
                <div className="relative z-10 h-[14px] w-[44px] shrink-0 overflow-hidden rounded-[3px] border border-white/15 bg-black/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)]">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,#fcd34d_0%,#f59e0b_55%,#b45309_100%)] opacity-85" />
                  <div className="sgt-anim absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-amber-100/90 to-transparent" style={{ animation: "sgt-fuel-flow 1.8s linear infinite" }} />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                </div>

                {/* tubo direito */}
                <div className="h-[10px] flex-1 rounded-r-sm bg-[linear-gradient(180deg,#8a94a3,#3a4453_55%,#1b2129)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]" />
              </div>
            </div>
          </div>


          {/* ═════════ BOMBA CORPORATIVA — vintage dark-chrome ═════════ */}
          <div
            className={presentation ? "relative z-20 flex flex-col items-center gap-3" : "flex flex-col items-center gap-4"}
            style={presentation ? {
              transform: "perspective(1400px) translateZ(40px) scale(1.02)",
              transformOrigin: "center left",
              filter: "drop-shadow(0 28px 36px rgba(0,0,0,0.7)) drop-shadow(0 0 16px rgba(251,191,36,0.08))",
            } : undefined}
          >
            <div className="relative flex flex-col items-center">
              {/* Halo ambiente quente atrás de toda a bomba */}
              <div className="pointer-events-none absolute -inset-10 rounded-[60px] bg-[radial-gradient(ellipse_at_50%_18%,rgba(251,191,36,0.07),transparent_68%)]" />

              {/* ───────── TOPO: disco backlit SGT ───────── */}
              <div className="relative z-20 flex flex-col items-center">
                {/* Backlight — halo quente limpo atrás do disco */}
                <div className="pointer-events-none absolute -inset-5 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.22),rgba(251,191,36,0.06)_45%,transparent_70%)] blur-md" />
                {/* Disco de metal polido branco/dourado */}
                <div className={presentation
                  ? "relative flex h-[84px] w-[84px] flex-col items-center justify-center rounded-full border-[3px] border-amber-200/70 bg-[conic-gradient(from_130deg,#ffffff,#e8edf3,#fef3c7,#fcd34d,#fff7e6,#e8edf3,#ffffff)] shadow-[0_0_30px_-2px_rgba(251,191,36,0.3),inset_0_3px_8px_rgba(255,255,255,0.95),inset_0_-12px_22px_rgba(180,120,20,0.28)]"
                  : "relative flex h-[128px] w-[128px] flex-col items-center justify-center rounded-full border-[3px] border-amber-200/70 bg-[conic-gradient(from_130deg,#ffffff,#e8edf3,#fef3c7,#fcd34d,#fff7e6,#e8edf3,#ffffff)] shadow-[0_0_30px_-2px_rgba(251,191,36,0.3),inset_0_3px_8px_rgba(255,255,255,0.95),inset_0_-12px_22px_rgba(180,120,20,0.28)]"
                }>
                  {/* aro dourado interno */}
                  <div className={presentation
                    ? "pointer-events-none absolute inset-[5px] rounded-full border border-amber-400/50 shadow-[inset_0_0_8px_rgba(251,191,36,0.25)]"
                    : "pointer-events-none absolute inset-[7px] rounded-full border border-amber-400/50 shadow-[inset_0_0_8px_rgba(251,191,36,0.25)]"
                  } />
                  {/* reflexo de vidro */}
                  <div className={presentation
                    ? "pointer-events-none absolute left-4 top-4 h-5 w-8 -rotate-12 rounded-full bg-white/70 blur-[3px]"
                    : "pointer-events-none absolute left-6 top-5 h-7 w-11 -rotate-12 rounded-full bg-white/70 blur-[3px]"
                  } />
                  <span className={presentation
                    ? "relative text-[7px] font-black uppercase tracking-[0.32em] text-amber-800/90"
                    : "relative text-[8px] font-black uppercase tracking-[0.32em] text-amber-800/90"
                  }>Posto SGT</span>
                  {/* logo tingido de ouro */}
                  <img
                    src={sgtLogo}
                    alt="SGT"
                    className={presentation
                      ? "relative my-0.5 h-5 w-auto object-contain drop-shadow-[0_1px_2px_rgba(120,80,0,0.4)]"
                      : "relative my-1 h-7 w-auto object-contain drop-shadow-[0_1px_2px_rgba(120,80,0,0.4)]"
                    }
                    style={{ filter: "sepia(1) saturate(2.4) hue-rotate(-6deg) brightness(0.92) contrast(1.05)" }}
                  />
                  <span className={presentation
                    ? "relative text-[6px] font-bold uppercase tracking-[0.28em] text-amber-700/80"
                    : "relative text-[7px] font-bold uppercase tracking-[0.28em] text-amber-700/80"
                  }>Diesel S10</span>
                </div>
                {/* Pescoço cromado escuro conectando disco ao corpo */}
                <div className={presentation
                  ? "relative z-10 -mt-1 h-4 w-10 rounded-b-md border-x border-b border-white/10 bg-[linear-gradient(90deg,#1b212b,#3a4554_45%,#4a5666_55%,#1b212b)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                  : "relative z-10 -mt-1 h-7 w-16 rounded-b-md border-x border-b border-white/10 bg-[linear-gradient(90deg,#1b212b,#3a4554_45%,#4a5666_55%,#1b212b)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                } />
              </div>

              {/* ───────── CORPO + BASE + MANGUEIRA (âncora) ───────── */}
              <div className="relative -mt-px">
                {/* "Ombro" superior do corpo (dark chrome) */}
                <div className={presentation
                  ? "mx-auto h-2.5 w-[150px] rounded-t-[16px] border-x border-t border-white/10 bg-[linear-gradient(180deg,#3a4453,#222a35)]"
                  : "mx-auto h-4 w-[206px] rounded-t-[22px] border-x border-t border-white/10 bg-[linear-gradient(180deg,#3a4453,#222a35)]"
                } />

                {/* Corpo da bomba — metal fosco antracite */}
                <div className={presentation
                  ? "relative z-10 mx-auto flex h-[260px] w-[176px] flex-col overflow-hidden rounded-t-[18px] rounded-b-[8px] border border-white/10 bg-[linear-gradient(108deg,#161b24_0%,#252e3a_16%,#39434f_50%,#212a35_82%,#11151c_100%)] shadow-[0_26px_64px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "relative z-10 mx-auto flex h-[392px] w-[244px] flex-col overflow-hidden rounded-t-[26px] rounded-b-[10px] border border-white/10 bg-[linear-gradient(108deg,#161b24_0%,#252e3a_16%,#39434f_50%,#212a35_82%,#11151c_100%)] shadow-[0_26px_64px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.08)]"
                }>
                  {/* textura metálica escovada (fosca) */}
                  <div className="pointer-events-none absolute inset-0 opacity-[0.05] bg-[repeating-linear-gradient(90deg,transparent_0,transparent_2px,#ffffff_3px,transparent_4px)]" />
                  {/* reflexos dark-chrome nas bordas */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-[16px] bg-gradient-to-r from-white/12 to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-[20px] bg-gradient-to-l from-black/45 to-transparent" />

                  {/* ── Bezel cromado escuro do display ── */}
                  <div className={presentation
                    ? "relative mx-2.5 mt-3.5 rounded-xl border border-white/15 bg-[linear-gradient(160deg,#566273,#2c343f_55%,#12161d)] p-[5px] shadow-[0_5px_16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.28)]"
                    : "relative mx-3.5 mt-5 rounded-2xl border border-white/15 bg-[linear-gradient(160deg,#566273,#2c343f_55%,#12161d)] p-[6px] shadow-[0_5px_16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.28)]"
                  }>
                    {/* Tela retro-digital */}
                    <div className="relative overflow-hidden rounded-lg border border-amber-500/20 bg-[linear-gradient(180deg,#1a1305_0%,#0a0700_100%)] px-2.5 py-2 shadow-[inset_0_2px_18px_rgba(0,0,0,0.95)]">
                      {/* scanlines + glow âmbar */}
                      <div className="pointer-events-none absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(0,0,0,0.7)_3px)]" />
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_65%,rgba(251,191,36,0.12),transparent_72%)]" />
                      {/* Linha topo: rótulo + data + LED */}
                      <div className="relative mb-1 flex items-center justify-between gap-2">
                        <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-amber-500/70">Abastecido no dia</span>
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-[8px] font-bold tabular-nums text-amber-400/90 [text-shadow:0_0_6px_rgba(251,191,36,0.5)]">{display.data}</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.95)]" />
                        </span>
                      </div>
                      {/* Número principal */}
                      <div className="relative flex flex-col gap-0.5">
                        <span className={presentation
                          ? "font-mono text-[26px] font-black leading-none tabular-nums text-amber-300 [text-shadow:0_0_18px_rgba(251,191,36,0.7),0_0_3px_rgba(251,191,36,0.9)]"
                          : "font-mono text-[34px] font-black leading-none tabular-nums text-amber-300 [text-shadow:0_0_18px_rgba(251,191,36,0.7),0_0_3px_rgba(251,191,36,0.9)]"
                        }>
                          {display.litrosDia.toLocaleString("pt-BR")}
                        </span>
                        <span className="text-[9px] font-bold tracking-[0.12em] text-amber-500/80">LITROS</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Painéis embutidos empilhados (caixas metálicas) ── */}
                  <div className="mx-2.5 mt-2.5 flex flex-col gap-1.5">
                    {[
                      { v: display.precoRecarga,                         l: "R$/L recarga" },
                      { v: display.abastDia.toLocaleString("pt-BR"),     l: "Abast. dia" },
                      { v: display.abastPeriodo.toLocaleString("pt-BR"), l: "Abast. período" },
                    ].map(c => (
                      <div
                        key={c.l}
                        className={presentation
                          ? "flex items-center justify-between rounded-lg border border-black/50 bg-[linear-gradient(180deg,rgba(0,0,0,0.65),rgba(0,0,0,0.88))] px-2.5 py-1.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.85),0_1px_0_rgba(255,255,255,0.06)]"
                          : "flex items-center justify-between rounded-lg border border-black/50 bg-[linear-gradient(180deg,rgba(0,0,0,0.65),rgba(0,0,0,0.88))] px-3.5 py-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.85),0_1px_0_rgba(255,255,255,0.06)]"
                        }
                      >
                        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-amber-600/60">{c.l}</span>
                        <span className={presentation
                          ? "font-mono text-[14px] font-bold tabular-nums text-amber-300/90 [text-shadow:0_0_8px_rgba(251,191,36,0.5)]"
                          : "font-mono text-[16px] font-bold tabular-nums text-amber-300/90 [text-shadow:0_0_8px_rgba(251,191,36,0.5)]"
                        }>{c.v}</span>
                      </div>
                    ))}
                  </div>

                  {/* espaço do corpo */}
                  <div className="flex-1" />

                  {/* ── Placa de identificação (metal escuro embutido) ── */}
                  <div className={presentation
                    ? "relative mx-2.5 mb-3 rounded-md border border-white/10 bg-[linear-gradient(180deg,#3a4350,#1a2028)] px-2 py-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-2px_6px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.5)]"
                    : "relative mx-3.5 mb-4 rounded-md border border-white/10 bg-[linear-gradient(180deg,#3a4350,#1a2028)] px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-2px_6px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.5)]"
                  }>
                    <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-200 [text-shadow:0_1px_0_rgba(0,0,0,0.7)]">Diesel S10</p>
                    <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500">Bomba 01 — Uso Interno</p>
                  </div>
                </div>

                {/* ── Base metálica escura texturizada ── */}
                <div className={presentation
                  ? "relative z-10 mx-auto flex w-[220px] flex-col items-center"
                  : "relative z-10 mx-auto flex w-[300px] flex-col items-center"
                }>
                  <div className={presentation
                    ? "-mt-0.5 h-2 w-[186px] rounded-t-md border-x border-t border-white/10 bg-[linear-gradient(180deg,#3a4350,#222a35)]"
                    : "-mt-0.5 h-3 w-[252px] rounded-t-md border-x border-t border-white/10 bg-[linear-gradient(180deg,#3a4350,#222a35)]"
                  } />
                  <div className="relative h-7 w-full overflow-hidden rounded-md border border-black/55 bg-[linear-gradient(180deg,#2a313c,#0e1219)] shadow-[0_16px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]">
                    {/* ranhuras da base */}
                    <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_9px,rgba(0,0,0,0.55)_10px,transparent_11px)]" />
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.05] to-transparent" />
                  </div>
                </div>

                {/* ── Mangueira trançada + bocal polido (SVG, lado direito) ──
                    Ancorada à direita do corpo: faz um loop e descansa o bocal
                    no suporte lateral. Coordenadas internas do SVG controlam o
                    alinhamento; ajuste right/top apenas para reposicionar. */}
                <svg
                  viewBox="0 0 150 360"
                  className={presentation
                    ? "pointer-events-none absolute right-[-30px] top-[80px] z-0 h-[250px] w-[110px]"
                    : "pointer-events-none absolute right-[-46px] top-[120px] z-0 h-[360px] w-[150px]"
                  }
                  fill="none"
                >
                  <defs>
                    <linearGradient id="sgt-hose" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#070708" />
                      <stop offset="0.5" stopColor="#30333a" />
                      <stop offset="1" stopColor="#070708" />
                    </linearGradient>
                    <linearGradient id="sgt-chrome" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#eef2f7" />
                      <stop offset="0.4" stopColor="#94a3b8" />
                      <stop offset="0.62" stopColor="#3b4655" />
                      <stop offset="1" stopColor="#e2e8f0" />
                    </linearGradient>
                    <linearGradient id="sgt-nozzle" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#dbe2ea" />
                      <stop offset="0.5" stopColor="#647082" />
                      <stop offset="1" stopColor="#2b3340" />
                    </linearGradient>
                  </defs>

                  {/* mangueira — desce do corpo da bomba e segura o bocal ──────
                      Um único traçado em catenária, da esquerda (saída da bomba)
                      até o conector do bocal, com base escura + gradiente +
                      brilho + textura trançada por cima. */}
                  <path d="M6 44 C -8 120, 26 174, 74 172" stroke="#0a0a0c" strokeWidth="16" strokeLinecap="round" />
                  <path d="M6 44 C -8 120, 26 174, 74 172" stroke="url(#sgt-hose)" strokeWidth="13" strokeLinecap="round" />
                  <path d="M6 44 C -8 120, 26 174, 74 172" stroke="rgba(255,255,255,0.16)" strokeWidth="2.5" strokeLinecap="round" transform="translate(-1.5,-1.6)" />
                  <path d="M6 44 C -8 120, 26 174, 74 172" stroke="rgba(0,0,0,0.5)" strokeWidth="13" strokeLinecap="round" strokeDasharray="1.6 5.5" />

                  {/* ── BOCAL (pistola de abastecimento) ──────────────────────
                      Desenhado com o bico apontando para baixo; o conector da
                      mangueira fica no topo e o gatilho na lateral. */}
                  <g transform="translate(78,168) rotate(12)">
                    {/* colar conector (a mangueira entra aqui) */}
                    <rect x="-11" y="-17" width="22" height="21" rx="7" fill="url(#sgt-nozzle)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />

                    {/* bico — tubo afilado apontando para baixo */}
                    <path d="M-3 40 C -6 58, -8 74, -5 88 q 2 6 8 4 q 5 -2 4 -8 C 8 64, 9 54, 7 40 Z" fill="url(#sgt-chrome)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
                    <rect x="-7" y="38" width="17" height="6" rx="3" fill="#aeb9c7" />
                    <rect x="-6" y="83" width="13" height="5" rx="2.2" fill="#cbd5e1" />

                    {/* corpo / punho */}
                    <rect x="-15" y="-1" width="34" height="46" rx="15" fill="url(#sgt-nozzle)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

                    {/* protetor do gatilho (alça em D) */}
                    <path d="M17 18 q 16 14 4 34 q -6 8 -14 4" stroke="url(#sgt-chrome)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                    {/* gatilho */}
                    <path d="M14 20 q 8 10 2 22" stroke="#0f172a" strokeWidth="3.5" fill="none" strokeLinecap="round" />

                    {/* brilho no corpo */}
                    <rect x="-10" y="4" width="6" height="33" rx="3" fill="rgba(255,255,255,0.4)" />
                  </g>
                </svg>
              </div>
            </div>

            {/* Texto externo flutuante */}
            <div className={presentation ? "hidden" : "text-center"}>
              <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-slate-400">Bomba Corporativa</p>
              <p className="mt-1 text-[12px] font-semibold text-slate-600">Frota própria</p>
            </div>
          </div>

          {/* ═════════ PAINEL DE STATUS ═════════
              Normal: 4 cards (Recebido, Abastecido, Última Recarga, Última Placa).
              Presentation: 3 cards — Última Recarga + Última Placa viram uma única
              "Última Movimentação", garantindo encaixe sem scroll. */}
          {(() => {
            const recargaSub = dados.ultimaRecarga
              ? `${fmtL(dados.ultimaRecarga.litros)} · ${dados.ultimaRecarga.data}`
              : "sem registros no período";
            const placaSub = dados.ultimaPlaca
              ? `${dados.ultimaPlaca.placa} · ${fmtL(dados.ultimaPlaca.litros)}${dados.ultimaPlaca.data ? ` · ${dados.ultimaPlaca.data}` : ""}`
              : "não informada";

            type CardDef = {
              label: string;
              valor?: string;
              destaque?: string;
              sub?: string;
              glow?: boolean;
              tall?: boolean;
            };

            const cards: CardDef[] = presentation
              ? [
                  { label: "Total Recebido (Período)",   valor: dados.recebidoPeriodoLitros != null ? fmtL(dados.recebidoPeriodoLitros) : "—", destaque: "#fbbf24" },
                  { label: "Total Abastecido (Período)", valor: fmtL(dados.abastecidoPeriodoLitros), destaque: "#94a3b8" },
                  // Última Movimentação — sem valor solto; mostra duas linhas estruturadas
                  { label: "Última Movimentação", glow: true, tall: true,
                    sub: `Recarga: ${recargaSub}\nPlaca: ${placaSub}` },
                ]
              : [
                  { label: "Total Recebido (Período)",   valor: dados.recebidoPeriodoLitros != null ? fmtL(dados.recebidoPeriodoLitros) : "—", destaque: "#fbbf24" },
                  { label: "Total Abastecido (Período)", valor: fmtL(dados.abastecidoPeriodoLitros), destaque: "#94a3b8" },
                  { label: "Última Recarga",             valor: dados.ultimaRecarga ? fmtL(dados.ultimaRecarga.litros) : "—", destaque: "#a78bfa", sub: dados.ultimaRecarga ? `em ${dados.ultimaRecarga.data}${dados.ultimaRecarga.fornecedor ? ` · ${dados.ultimaRecarga.fornecedor.split(" ")[0]}` : ""}` : "Sem recargas no período" },
                  { label: "Última Placa Abastecida",    valor: dados.ultimaPlaca?.placa ?? "—", destaque: "#22d3ee", sub: dados.ultimaPlaca ? `${fmtL(dados.ultimaPlaca.litros)} · ${dados.ultimaPlaca.data}` : "Sem registros no período", glow: true },
                ];

            return (
              <div className={
                presentation
                  ? "flex w-full max-w-[260px] min-h-0 flex-col justify-center gap-2.5 lg:w-[240px] lg:self-center"
                  : "grid w-full max-w-[520px] grid-cols-2 gap-3 lg:w-[300px] lg:grid-cols-1 lg:self-center"
              }>
                {cards.map(c => (
                  <div
                    key={c.label}
                    className={
                      presentation
                        ? "rounded-[12px] border border-white/10 bg-white/[0.025] px-4 py-3 transition-colors duration-300 hover:border-white/[0.18]"
                        : "rounded-[14px] border border-white/10 bg-white/[0.025] px-5 py-4 transition-colors duration-300 hover:border-white/[0.18]"
                    }
                    style={c.glow ? { boxShadow: "0 0 22px -8px rgba(34,211,238,0.35)" } : undefined}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{c.label}</p>
                    {c.valor && (
                      <p className={`mt-1.5 ${presentation ? "text-[22px]" : "text-[22px]"} font-black leading-none tabular-nums tracking-[-0.02em]`} style={{ color: c.destaque }}>
                        {c.valor}
                      </p>
                    )}
                    {c.sub && (
                      <p className={`${c.valor ? "mt-1.5" : "mt-2"} whitespace-pre-line text-[12px] font-semibold leading-snug text-slate-300/85`}>
                        {c.sub}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>


        {!presentation && (<>
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
                  {["Data", "Tipo", "Volume (L)", "Responsável / Fornecedor", "Status"].map((h, i) => (
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
                {dados.movimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-slate-600">
                      Nenhum abastecimento interno no período selecionado
                    </td>
                  </tr>
                ) : (
                  movsVisiveis.map((m, i) => {
                    const recarga = m.tipo === "Recarga";
                    return (
                      <tr
                        key={i}
                        className="border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.025]"
                      >
                        <td className="px-4 py-2.5">
                          <span className="text-[12px] tabular-nums text-slate-400">{m.data}</span>
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
                            {recarga ? "+" : "−"}{Math.round(m.volumeLitros).toLocaleString("pt-BR")} L
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[12px] text-slate-300">{m.responsavel}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.06] px-2 py-0.5 text-[9px] font-semibold text-emerald-400/90">
                            Concluído
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Botão expandir / recolher movimentações */}
          {temMaisMovs && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => setMovsExpandido(v => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/[0.08] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300 transition-colors hover:border-amber-400/40 hover:bg-amber-500/[0.14]"
              >
                {movsExpandido
                  ? "Ver menos"
                  : `Ver mais (${dados.movimentacoes.length - MOVS_COLAPSADO})`}
                <span className={`text-[9px] transition-transform ${movsExpandido ? "rotate-180" : ""}`}>▼</span>
              </button>
            </div>
          )}
        </div>

        {/* Nota de integração */}
        <div className="mt-3 flex items-center justify-center">
          <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-[9px] text-slate-600">
            {saldoReal
              ? "Dados reais do DW · Saldo direto da ESTRAZ (SALFIS do registro mais recente — razão de estoque de diesel)"
              : "Dados do DW indisponíveis no momento (falha ao consultar posto interno)"}
          </span>
        </div>
        </>)}
      </div>
    </AnimatedCard>
  );
}
