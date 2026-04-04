import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Presentation,
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  Activity,
  CircleDollarSign,
  ShieldCheck,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
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

  const topMetrics = useMemo(
    () => [
      {
        label: "A RECEBER",
        value: contasReceber.saldoAReceber,
        helper: "Saldo pendente",
        icon: TrendingUp,
        tone: "emerald",
      },
      {
        label: "A PAGAR",
        value: contasPagar.saldoAPagar,
        helper: "Saldo pendente",
        icon: TrendingDown,
        tone: "amber",
      },
      {
        label: "RECEBIDO",
        value: contasReceber.valorRecebido,
        helper: "Entrada consolidada",
        icon: CircleDollarSign,
        tone: "cyan",
      },
      {
        label: "PAGO",
        value: contasPagar.valorPago,
        helper: "Saída consolidada",
        icon: Activity,
        tone: "violet",
      },
    ],
    [
      contasReceber.saldoAReceber,
      contasPagar.saldoAPagar,
      contasReceber.valorRecebido,
      contasPagar.valorPago,
    ]
  );

  const summaryCards = useMemo(
    () => [
      {
        label: "RECEBER",
        value: contasReceber.valorAReceber,
        helper: "Total previsto de entrada",
        tone: "emerald",
      },
      {
        label: "PAGAR",
        value: contasPagar.valorAPagar,
        helper: "Total previsto de saída",
        tone: "amber",
      },
      {
        label: "STATUS",
        value: isProcessed ? "ON" : "OFF",
        helper: isProcessed ? "Base processada" : "Aguardando dados",
        tone: "blue",
      },
    ],
    [contasReceber.valorAReceber, contasPagar.valorAPagar, isProcessed]
  );

  const toneStyles: Record<string, string> = {
    emerald: "border-emerald-500/20 text-emerald-300 bg-emerald-500/10",
    amber: "border-amber-500/20 text-amber-300 bg-amber-500/10",
    cyan: "border-cyan-500/20 text-cyan-300 bg-cyan-500/10",
    violet: "border-violet-500/20 text-violet-300 bg-violet-500/10",
    blue: "border-blue-500/20 text-blue-300 bg-blue-500/10",
  };

  return (
    <div
      className={`min-h-screen overflow-hidden bg-[#020617] text-white transition-all duration-300 ${
        presentationMode ? "px-4 py-4 lg:px-6 lg:py-5" : "px-4 py-5 lg:px-8 lg:py-8 xl:px-10"
      }`}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:88px_88px]" />

      <div className="relative mx-auto flex max-w-[1780px] flex-col gap-6">
        <DashboardHeader />

        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(24,34,84,0.90)_0%,rgba(6,13,36,0.98)_55%,rgba(1,7,20,1)_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.48)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(99,102,241,0.18),transparent_18%),radial-gradient(circle_at_85%_12%,rgba(14,165,233,0.08),transparent_18%)]" />

          <div className="relative grid gap-6 p-5 lg:p-7 xl:grid-cols-[1.75fr_0.78fr] xl:gap-7 xl:p-8">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Painel financeiro
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  Estrutura inspirada na referência
                </div>
              </div>

              <div className="max-w-4xl space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl xl:text-[56px] xl:leading-[1.02]">
                  Visão consolidada de contas a pagar e contas a receber
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-300 md:text-lg">
                  Uma leitura direta da operação, com foco nas métricas principais e nos indicadores estratégicos.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {topMetrics.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)] p-5"
                    >
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                          {item.label}
                        </p>
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${toneStyles[item.tone]}`}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[38px] font-bold leading-none tracking-tight text-white">{item.value}</p>
                        <p className="text-sm text-slate-400">{item.helper}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <div className="relative overflow-hidden rounded-[28px] border border-emerald-500/16 bg-[linear-gradient(180deg,rgba(11,18,38,0.76)_0%,rgba(7,12,29,0.98)_100%)] p-6">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_32%)]" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">Contas a receber</p>
                      <h2 className="mt-3 text-[40px] font-bold leading-none tracking-tight text-white">{contasReceber.saldoAReceber}</h2>
                      <p className="mt-3 text-sm text-slate-400">Saldo principal em aberto</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">Previsto</p>
                      <p className="mt-2 text-2xl font-bold tracking-tight text-white">{contasReceber.valorAReceber}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">Recebido</p>
                      <p className="mt-2 text-2xl font-bold tracking-tight text-white">{contasReceber.valorRecebido}</p>
                    </div>
                  </div>

                  <a
                    href="/contas-a-receber"
                    className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-400/15"
                  >
                    Ver detalhamento
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>

                <div className="relative overflow-hidden rounded-[28px] border border-amber-500/16 bg-[linear-gradient(180deg,rgba(11,18,38,0.76)_0%,rgba(7,12,29,0.98)_100%)] p-6">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.08),transparent_32%)]" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-300">Contas a pagar</p>
                      <h2 className="mt-3 text-[40px] font-bold leading-none tracking-tight text-white">{contasPagar.saldoAPagar}</h2>
                      <p className="mt-3 text-sm text-slate-400">Saldo principal em aberto</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">Previsto</p>
                      <p className="mt-2 text-2xl font-bold tracking-tight text-white">{contasPagar.valorAPagar}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">Pago</p>
                      <p className="mt-2 text-2xl font-bold tracking-tight text-white">{contasPagar.valorPago}</p>
                    </div>
                  </div>

                  <a
                    href="/contas-a-pagar"
                    className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-400/15"
                  >
                    Ver detalhamento
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            <aside className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.76)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl lg:p-6">
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[30px] font-semibold tracking-tight text-white">Indicadores</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Resumo lateral no padrão da referência.</p>
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

                

                <div className="mt-2 space-y-4">
                  {indicadores.map((ind, index) => {
                    const positive = ind.percentualReal >= ind.percentualEsperado;
                    const progress = Math.min((ind.percentualReal / Math.max(ind.percentualEsperado, 1)) * 100, 100);

                    return (
                      <div
                        key={ind.id}
                        className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.88)_0%,rgba(9,14,33,0.98)_100%)] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            {ind.nome}
                          </p>
                          <span className={`text-xs font-semibold ${positive ? "text-emerald-300" : "text-amber-300"}`}>
                            {ind.percentualReal}%
                          </span>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${positive ? "bg-emerald-400" : "bg-amber-400"}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Pressione <span className="font-semibold text-white">F</span> para entrar em tela cheia e <span className="font-semibold text-white">Esc</span> para sair.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        
      </div>
    </div>
  );
};

export default Index;
