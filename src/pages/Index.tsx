import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Presentation,
  Database,
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

  return (
    <div
      className={`min-h-screen bg-background transition-all duration-300 ${
        presentationMode ? "px-5 py-5 lg:px-8 lg:py-6" : "px-4 py-6 lg:px-8 lg:py-8 xl:px-10"
      }`}
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <DashboardHeader />

            {!presentationMode && (
              <div className="mb-6">
                <FileUploadSection />
              </div>
            )}

            <div
              className={`transition-all duration-500 ${
                dashboardVisible
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-2 opacity-30"
              }`}
            >
              <section className="mb-8">
                <SectionHeader title="Contas a Receber" icon={TrendingUp} />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <FinancialCard
                    title="Valor a Receber"
                    value={contasReceber.valorAReceber}
                    variant="receita"
                  />
                  <FinancialCard
                    title="Valor Recebido"
                    value={contasReceber.valorRecebido}
                    variant="receita"
                  />
                  <FinancialCard
                    title="Saldo a Receber"
                    value={contasReceber.saldoAReceber}
                    variant="saldo-receita"
                    linkTo="/contas-a-receber"
                  />
                </div>
              </section>

              <section className="mb-8">
                <SectionHeader title="Contas a Pagar" icon={TrendingDown} />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <FinancialCard
                    title="Valor a Pagar"
                    value={contasPagar.valorAPagar}
                    variant="despesa"
                  />
                  <FinancialCard
                    title="Valor Pago"
                    value={contasPagar.valorPago}
                    variant="despesa"
                  />
                  <FinancialCard
                    title="Saldo a Pagar"
                    value={contasPagar.saldoAPagar}
                    variant="saldo-despesa"
                    linkTo="/contas-a-pagar"
                  />
                </div>
              </section>

              <section>
                <SectionHeader title="Indicadores Estratégicos" icon={BarChart3} />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">
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

          {!presentationMode && (
            <aside className="xl:col-span-4">
              <div className="sticky top-6 rounded-[28px] border border-white/10 bg-card/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-md">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                      <Database className="h-3.5 w-3.5" />
                      Resumo executivo
                    </div>

                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                      Fevereiro
                    </h2>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                      Acompanhe rapidamente a consolidação financeira do período e
                      entre em modo apresentação com um clique.
                    </p>
                  </div>

                  <button
                    onClick={togglePresentationMode}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition-all hover:bg-white/10 hover:text-white"
                    title="Modo apresentação"
                    aria-label="Ativar modo apresentação"
                  >
                    <Presentation className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                      A receber em aberto
                    </p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                      {contasReceber.saldoAReceber}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Total pendente de recebimento no período.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">
                      A pagar em aberto
                    </p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                      {contasPagar.saldoAPagar}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Total pendente de pagamento no período.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                      Status dos dados
                    </p>
                    <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                      {isProcessed ? "Processado" : "Aguardando upload"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isProcessed
                        ? "Arquivos carregados e dashboard consolidado."
                        : "Envie as planilhas para atualizar os números."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Apresentação
                    </p>
                    <p className="mt-3 text-lg font-semibold text-foreground">
                      Atalho rápido
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pressione <span className="font-semibold text-foreground">F</span> para entrar
                      em tela cheia e ocultar a área de importação.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;