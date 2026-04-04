import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Presentation,
  Database,
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  Activity,
  CircleDollarSign,
  ShieldCheck,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FileUploadSection } from "@/components/dashboard/FileUploadSection";
import { FinancialCard } from "@/components/dashboard/FinancialCard";
import { IndicatorCard } from "@/components/dashboard/IndicatorCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { useFinancialData } from "@/contexts/FinancialDataContext";

const Index = () => {
  const { resumo, indicadores, isProcessed } = useFinancialData();
  const { contasReceber, contasPagar } = resumo;

  const [presentationMode, setPresentationMode] = useState(false);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Erro ao entrar em fullscreen:", error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Erro ao sair do fullscreen:", error);
    }
  }, []);

  const enablePresentationMode = useCallback(async () => {
    setPresentationMode(true);
    await enterFullscreen();
  }, [enterFullscreen]);

  const disablePresentationMode = useCallback(async () => {
    setPresentationMode(false);
    await exitFullscreen();
  }, [exitFullscreen]);

  const togglePresentationMode = useCallback(async () => {
    if (presentationMode) {
      await disablePresentationMode();
    } else {
      await enablePresentationMode();
    }
  }, [presentationMode, enablePresentationMode, disablePresentationMode]);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      const isTyping =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable;

      if (isTyping) return;

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        await togglePresentationMode();
      }

      if (event.key === "Escape" && presentationMode) {
        event.preventDefault();
        await disablePresentationMode();
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setPresentationMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [presentationMode, togglePresentationMode, disablePresentationMode]);

  const dashboardVisible = isProcessed || presentationMode;

  const highlightCards = useMemo(
    () => [
      {
        title: "Contas a receber",
        value: contasReceber.saldoAReceber,
        description: "Total pendente de recebimento no período",
        icon: TrendingUp,
        accent: "emerald",
      },
      {
        title: "Contas a pagar",
        value: contasPagar.saldoAPagar,
        description: "Total pendente de pagamento no período",
        icon: TrendingDown,
        accent: "amber",
      },
      {
        title: "Base consolidada",
        value: isProcessed ? "Processado" : "Aguardando upload",
        description: isProcessed
          ? "Arquivos carregados e indicadores disponíveis"
          : "Envie as planilhas para preencher o painel",
        icon: Database,
        accent: "blue",
      },
    ],
    [contasReceber.saldoAReceber, contasPagar.saldoAPagar, isProcessed]
  );

  const accentClasses: Record<string, string> = {
    emerald:
      "border-emerald-500/20 bg-emerald-500/8 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.08)]",
    amber:
      "border-amber-500/20 bg-amber-500/8 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.08)]",
    blue:
      "border-blue-500/20 bg-blue-500/8 text-blue-300 shadow-[0_0_30px_rgba(59,130,246,0.08)]",
  };

  return (
    <div
      className={`min-h-screen overflow-hidden bg-[#020617] text-white transition-all duration-300 ${
        presentationMode
          ? "px-4 py-4 lg:px-6 lg:py-5"
          : "px-4 py-5 lg:px-8 lg:py-8 xl:px-10"
      }`}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:88px_88px]" />

      <div className="relative mx-auto flex max-w-[1700px] flex-col gap-6">
        <DashboardHeader />

        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(31,41,87,0.82)_0%,rgba(6,13,36,0.96)_55%,rgba(1,7,20,0.98)_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.18),transparent_20%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.08),transparent_20%)]" />

          <div className="relative grid gap-6 p-5 lg:p-7 xl:grid-cols-[1.6fr_0.8fr] xl:gap-7 xl:p-8">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Painel executivo redesenhado
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  Funcionalidades preservadas
                </div>
              </div>

              <div className="max-w-4xl space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl xl:text-6xl">
                  Central financeira com linguagem visual totalmente nova
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-300 md:text-lg">
                  Estrutura inspirada na referência que você enviou, com hero analítico,
                  cards em glassmorphism, hierarquia mais forte e leitura muito mais clara
                  para operação e apresentação.
                </p>
              </div>

              

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {highlightCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div
                      key={card.title}
                      className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82)_0%,rgba(9,14,33,0.96)_100%)] p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/15"
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_32%)]" />
                      <div className="relative mb-5 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                            {card.title}
                          </p>
                        </div>
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${accentClasses[card.accent]}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="relative space-y-2">
                        <p className="text-3xl font-bold tracking-tight text-white">
                          {card.value}
                        </p>
                        <p className="max-w-xs text-sm leading-6 text-slate-400">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.76)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl lg:p-6">
              <div className="flex h-full flex-col gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-white">
                      Leitura inteligente
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Consolidação rápida para navegação operacional e modo apresentação.
                    </p>
                  </div>

                  <button
                    onClick={togglePresentationMode}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                    title="Modo apresentação"
                    aria-label="Ativar modo apresentação"
                  >
                    <Presentation className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[#020817]/80 p-4">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-slate-400">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="text-sm">Monitoramento executivo em tempo real</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">
                      A receber em aberto
                    </p>
                    <p className="mt-3 text-4xl font-bold tracking-tight text-white">
                      {contasReceber.saldoAReceber}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      Volume pendente para entrada no caixa consolidado.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/[0.06] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">
                      A pagar em aberto
                    </p>
                    <p className="mt-3 text-4xl font-bold tracking-tight text-white">
                      {contasPagar.saldoAPagar}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      Compromissos ainda não liquidados dentro do período.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-blue-500/20 bg-blue-500/[0.06] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
                      Status da base
                    </p>
                    <p className="mt-3 text-2xl font-bold tracking-tight text-white">
                      {isProcessed ? "Base processada" : "Aguardando arquivos"}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {isProcessed
                        ? "Dados prontos para consumo, análise e apresentação."
                        : "Faça o upload para liberar a consolidação financeira."}
                    </p>
                  </div>
                </div>

                <div className="mt-auto rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <Activity className="h-4 w-4 text-cyan-300" />
                    Atalho de navegação rápida
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Pressione <span className="font-semibold text-white">F</span> para entrar em tela cheia.
                    Use <span className="font-semibold text-white">Esc</span> para sair do modo apresentação.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <div
          className={`space-y-6 transition-all duration-500 ${
            dashboardVisible
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-30"
          }`}
        >
          <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86)_0%,rgba(2,8,23,0.95)_100%)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] lg:p-7">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeader title="Contas a Receber" icon={TrendingUp} />
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <CircleDollarSign className="h-3.5 w-3.5" />
                Visão orientada a entrada de caixa
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_1.15fr_1.4fr]">
              <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.88)_0%,rgba(9,14,33,0.98)_100%)] p-5 backdrop-blur-md">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Valor a receber</p>
                    <h3 className="mt-3 text-4xl font-bold tracking-tight text-white">{contasReceber.valorAReceber}</h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-400">Total previsto para entrada de caixa na operação consolidada.</p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.88)_0%,rgba(9,14,33,0.98)_100%)] p-5 backdrop-blur-md">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Valor recebido</p>
                    <h3 className="mt-3 text-4xl font-bold tracking-tight text-white">{contasReceber.valorRecebido}</h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                    <CircleDollarSign className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-400">Montante efetivamente realizado dentro do período processado.</p>
              </div>

              <div className="group relative overflow-hidden rounded-[28px] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(7,20,26,0.95)_0%,rgba(8,33,30,0.88)_100%)] p-6 backdrop-blur-md">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_35%)]" />
                <div className="relative flex h-full flex-col justify-between gap-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">Saldo a receber</p>
                    <h3 className="mt-4 text-5xl font-bold tracking-tight text-white">{contasReceber.saldoAReceber}</h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">Valor ainda pendente de recebimento, com acesso direto ao detalhamento operacional.</p>
                  </div>
                  <a
                    href="/contas-a-receber"
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-400/15"
                  >
                    Ver detalhamento
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86)_0%,rgba(2,8,23,0.95)_100%)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] lg:p-7">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeader title="Contas a Pagar" icon={TrendingDown} />
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                <ArrowRight className="h-3.5 w-3.5" />
                Visão orientada a saída de caixa
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_1.15fr_1.4fr]">
              <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.88)_0%,rgba(9,14,33,0.98)_100%)] p-5 backdrop-blur-md">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Valor a pagar</p>
                    <h3 className="mt-3 text-4xl font-bold tracking-tight text-white">{contasPagar.valorAPagar}</h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-400">Total previsto de desembolso dentro da visão consolidada.</p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.88)_0%,rgba(9,14,33,0.98)_100%)] p-5 backdrop-blur-md">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Valor pago</p>
                    <h3 className="mt-3 text-4xl font-bold tracking-tight text-white">{contasPagar.valorPago}</h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-300">
                    <CircleDollarSign className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-400">Montante quitado até agora no recorte dos dados processados.</p>
              </div>

              <div className="group relative overflow-hidden rounded-[28px] border border-amber-500/20 bg-[linear-gradient(135deg,rgba(34,20,7,0.95)_0%,rgba(52,31,9,0.88)_100%)] p-6 backdrop-blur-md">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_35%)]" />
                <div className="relative flex h-full flex-col justify-between gap-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-300">Saldo a pagar</p>
                    <h3 className="mt-4 text-5xl font-bold tracking-tight text-white">{contasPagar.saldoAPagar}</h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">Compromissos ainda em aberto, com navegação direta para análise detalhada.</p>
                  </div>
                  <a
                    href="/contas-a-pagar"
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-400/15"
                  >
                    Ver detalhamento
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86)_0%,rgba(2,8,23,0.95)_100%)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] lg:p-7">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeader title="Indicadores Estratégicos" icon={BarChart3} />
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                <Activity className="h-3.5 w-3.5" />
                Performance comparada com expectativa
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {indicadores.map((ind) => (
                <IndicatorCard
                  key={ind.id}
                  nome={ind.nome}
                  percentualReal={ind.percentualReal}
                  percentualEsperado={ind.percentualEsperado}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Index;
