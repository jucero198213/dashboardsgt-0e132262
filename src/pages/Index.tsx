import { useCallback, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, BarChart3, Presentation } from "lucide-react";
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

  return (
    <div
      className={`min-h-screen bg-background transition-all duration-300 ${
        presentationMode ? "px-6 py-6 lg:px-10 xl:px-12" : "px-4 py-8 lg:px-8 xl:px-16"
      }`}
    >
      <div className="mx-auto max-w-7xl">
        <DashboardHeader />

        {presentationMode && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
            <div className="flex items-center gap-2">
              <Presentation className="h-4 w-4" />
              <span className="font-medium">Modo apresentação ativo</span>
            </div>
            <span className="opacity-80">Pressione F ou Esc para sair</span>
          </div>
        )}

        {!presentationMode && <FileUploadSection />}

        <div
          className={`transition-all duration-500 ${
            isProcessed ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-30"
          }`}
        >
          {/* Contas a Receber */}
          <section className="mb-10">
            <SectionHeader title="Contas a Receber" icon={TrendingUp} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

          {/* Contas a Pagar */}
          <section className="mb-10">
            <SectionHeader title="Contas a Pagar" icon={TrendingDown} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

          {/* Indicadores */}
          <section>
            <SectionHeader title="Indicadores Estratégicos" icon={BarChart3} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
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