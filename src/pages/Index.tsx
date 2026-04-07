import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Presentation,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { formatCurrency } from "@/data/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const {
    resumo,
    indicadores,
    fetchFromDW,
    isFetchingDw,
    dwError,
    dwFilter,
    setDwFilter,
    filiais,
    empresas,
    isProcessed,
  } = useFinancialData();

  const { contasReceber, contasPagar } = resumo;

  const [presentationMode, setPresentationMode] = useState(false);

  // Filiais filtradas pela empresa selecionada
  const filiaisFiltradas = useMemo(
    () =>
      dwFilter.empresa
        ? filiais.filter((f) => f.empresa === dwFilter.empresa)
        : filiais,
    [filiais, dwFilter.empresa]
  );

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
        icon: TrendingUp,
        tone: "cyan",
      },
      {
        label: "PAGO",
        value: contasPagar.valorPago,
        helper: "Saída consolidada",
        icon: TrendingDown,
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

  const toneStyles: Record<string, string> = {
    emerald:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.05)]",
    amber:
      "border-amber-500/20 bg-amber-500/10 text-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.05)]",
    cyan:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.05)]",
    violet:
      "border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-[0_0_0_1px_rgba(167,139,250,0.05)]",
  };

  return (
    <div
      className={`min-h-screen overflow-hidden bg-[#020617] text-white transition-all duration-300 ${
        presentationMode
          ? "h-screen w-screen p-0"
          : "px-4 py-5 lg:px-8 lg:py-8 xl:px-10"
      }`}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:88px_88px]" />

      <div
        className={`relative flex flex-col ${
          presentationMode
            ? "h-full w-full max-w-none"
            : "mx-auto max-w-[1780px] gap-6"
        }`}
      >
        {!presentationMode && <DashboardHeader />}

        <section
          className={`relative overflow-hidden border border-white/10 bg-[linear-gradient(135deg,rgba(22,32,78,0.94)_0%,rgba(7,14,38,0.985)_54%,rgba(2,8,23,1)_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.48)] ${
            presentationMode ? "h-full w-full rounded-none" : "rounded-[34px]"
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(99,102,241,0.22),transparent_18%),radial-gradient(circle_at_84%_12%,rgba(14,165,233,0.10),transparent_18%),radial-gradient(circle_at_48%_100%,rgba(16,185,129,0.05),transparent_20%)]" />

          <div
            className={`relative grid ${
              presentationMode
                ? "h-full xl:grid-cols-[1.92fr_0.78fr] gap-4 p-5 lg:p-6"
                : "gap-6 p-5 lg:p-7 xl:grid-cols-[1.75fr_0.78fr] xl:gap-7 xl:p-8"
            }`}
          >
            <div
              className={`${
                presentationMode
                  ? "flex h-full min-h-0 flex-col gap-3"
                  : "space-y-6"
              }`}
            >
              <div
                className={`${
                  presentationMode
                    ? "flex items-start justify-between gap-6"
                    : "space-y-5"
                }`}
              >
                <div className="space-y-4">
                  {/* ── Filtros DW ─────────────────────────────────────── */}
                  <div className="flex flex-wrap items-end gap-2">
                    {/* Data Início */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        De
                      </span>
                      <input
                        type="date"
                        value={dwFilter.dataInicio}
                        onChange={(e) => setDwFilter("dataInicio", e.target.value)}
                        className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-slate-300 outline-none transition-all hover:border-white/20 hover:bg-white/10 focus:border-cyan-400/40 focus:bg-white/10 [color-scheme:dark]"
                      />
                    </div>

                    {/* Data Fim */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Até
                      </span>
                      <input
                        type="date"
                        value={dwFilter.dataFim}
                        onChange={(e) => setDwFilter("dataFim", e.target.value)}
                        className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-slate-300 outline-none transition-all hover:border-white/20 hover:bg-white/10 focus:border-cyan-400/40 focus:bg-white/10 [color-scheme:dark]"
                      />
                    </div>

                    {/* Empresa */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Empresa
                      </span>
                      <Select
                        value={dwFilter.empresa ?? "__all__"}
                        onValueChange={(v) =>
                          setDwFilter("empresa", v === "__all__" ? null : v)
                        }
                      >
                        <SelectTrigger className="h-9 w-[140px] rounded-xl border-white/10 bg-white/5 text-xs text-slate-300 transition-all hover:border-white/20 hover:bg-white/10">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas</SelectItem>
                          {empresas.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filial */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Filial
                      </span>
                      <Select
                        value={dwFilter.filial ?? "__all__"}
                        onValueChange={(v) =>
                          setDwFilter("filial", v === "__all__" ? null : v)
                        }
                      >
                        <SelectTrigger className="h-9 w-[150px] rounded-xl border-white/10 bg-white/5 text-xs text-slate-300 transition-all hover:border-white/20 hover:bg-white/10">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas</SelectItem>
                          {filiaisFiltradas.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Botão Atualizar */}
                    <button
                      onClick={() => void fetchFromDW()}
                      disabled={isFetchingDw}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-xs font-semibold text-cyan-300 transition-all hover:border-cyan-300/30 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${isFetchingDw ? "animate-spin" : ""}`}
                      />
                      {isFetchingDw ? "Buscando..." : "Atualizar"}
                    </button>
                  </div>

                  {/* Erro DW */}
                  {dwError && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {dwError}
                    </div>
                  )}

                  <div className="max-w-4xl">
                    <h1
                      className={`font-semibold tracking-tight text-white ${
                        presentationMode
                          ? "text-[56px] leading-[0.96] 2xl:text-[64px]"
                          : "text-4xl md:text-5xl xl:text-[56px] xl:leading-[1.02]"
                      }`}
                    >
                      Análise Consolidada
                    </h1>

                    {presentationMode && (
                      <p className="mt-3 max-w-2xl text-[15px] text-slate-400">
                        Panorama executivo do período, com leitura rápida das
                        entradas, saídas e distribuição dos principais
                        indicadores.
                      </p>
                    )}

                    {!presentationMode && isProcessed && (
                      <p className="mt-3 text-sm text-slate-400">
                        Dados atualizados ·{" "}
                        <span className="font-medium text-slate-200">
                          {dwFilter.dataInicio} → {dwFilter.dataFim}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {presentationMode && (
                  <div className="hidden xl:flex xl:shrink-0 xl:items-center">
                    <button
                      onClick={togglePresentationMode}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                      title="Sair do modo apresentação"
                      aria-label="Sair do modo apresentação"
                    >
                      <Presentation className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div
                className={`grid md:grid-cols-2 xl:grid-cols-4 ${
                  presentationMode ? "gap-3" : "gap-4"
                }`}
              >
                {topMetrics.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className={`group relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.82)_0%,rgba(10,16,36,0.98)_100%)] transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(25,36,86,0.88)_0%,rgba(12,18,40,1)_100%)] hover:shadow-[0_20px_42px_rgba(0,0,0,0.30)] ${
                        presentationMode ? "p-4" : "p-5"
                      }`}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_30%)]" />

                      <div className="relative flex h-full flex-col justify-between">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
                            {item.label}
                          </p>

                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-105 ${toneStyles[item.tone]}`}
                          >
                            <Icon className="h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110" />
                          </div>
                        </div>

                        <div className={presentationMode ? "mt-3" : "mt-6"}>
                          <p className={`font-bold leading-none tracking-[-0.03em] text-white truncate min-w-0 ${presentationMode ? "text-2xl xl:text-[28px]" : "text-2xl md:text-3xl xl:text-[36px] 2xl:text-[42px]"}`}>
                            {formatCurrency(item.value)}
                          </p>
                          <p className="mt-3 text-sm text-slate-400">
                            {item.helper}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className={`grid min-h-0 xl:grid-cols-2 ${
                  presentationMode ? "flex-1 gap-3" : "gap-5"
                }`}
              >
                <div
                  className={`group relative overflow-hidden rounded-[30px] border border-emerald-500/16 bg-[linear-gradient(180deg,rgba(11,18,38,0.82)_0%,rgba(6,11,28,0.99)_100%)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-[linear-gradient(180deg,rgba(14,24,46,0.92)_0%,rgba(8,14,32,1)_100%)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.32)] ${
                    presentationMode ? "flex h-full min-h-0 flex-col p-5" : "p-6"
                  }`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.11),transparent_34%)]" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent_0%,rgba(16,185,129,0.03)_100%)]" />

                  <div className="relative flex h-full min-h-0 flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
                          Contas a receber
                        </p>
                        <h2 className="mt-4 text-3xl font-bold leading-none tracking-[-0.03em] text-white md:text-4xl xl:text-[42px] 2xl:text-[46px] truncate min-w-0">
                          {formatCurrency(contasReceber.saldoAReceber)}
                        </h2>
                        <p className="mt-3 text-sm text-slate-400">
                          Saldo principal em aberto
                        </p>
                      </div>

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 transition-all duration-300 group-hover:scale-105 group-hover:border-emerald-400/30 group-hover:bg-emerald-400/15">
                        <TrendingUp className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-4">
                      <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 group-hover:border-white/12 group-hover:bg-white/[0.055]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                          Previsto
                        </p>
                        <p className="mt-3 text-xl font-bold leading-none tracking-[-0.03em] text-white md:text-2xl xl:text-[30px] 2xl:text-[34px] truncate min-w-0">
                          {formatCurrency(contasReceber.valorAReceber)}
                        </p>
                      </div>

                      <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 group-hover:border-white/12 group-hover:bg-white/[0.055]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                          Recebido
                        </p>
                        <p className="mt-3 text-xl font-bold leading-none tracking-[-0.03em] text-white md:text-2xl xl:text-[30px] 2xl:text-[34px] truncate min-w-0">
                          {formatCurrency(contasReceber.valorRecebido)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto pt-8">
                      <div className="flex items-center justify-between rounded-[24px] border border-emerald-400/14 bg-[linear-gradient(180deg,rgba(16,185,129,0.09)_0%,rgba(16,185,129,0.03)_100%)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/75">
                            Ação rápida
                          </p>
                          <p className="mt-1 text-sm text-slate-300">
                            Abrir detalhamento completo
                          </p>
                        </div>

                        <Link
                          to="/contas-a-receber"
                          className="inline-flex items-center gap-2 rounded-full border border-emerald-400/22 bg-emerald-400/12 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-400/18 hover:shadow-[0_10px_24px_rgba(16,185,129,0.12)]"
                        >
                          Ver detalhamento
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`group relative overflow-hidden rounded-[30px] border border-amber-500/16 bg-[linear-gradient(180deg,rgba(11,18,38,0.82)_0%,rgba(6,11,28,0.99)_100%)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/30 hover:bg-[linear-gradient(180deg,rgba(14,24,46,0.92)_0%,rgba(8,14,32,1)_100%)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.32)] ${
                    presentationMode ? "flex h-full min-h-0 flex-col p-7" : "p-6"
                  }`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.11),transparent_34%)]" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent_0%,rgba(245,158,11,0.03)_100%)]" />

                  <div className="relative flex h-full min-h-0 flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-300">
                          Contas a pagar
                        </p>
                        <h2 className="mt-4 text-3xl font-bold leading-none tracking-[-0.03em] text-white md:text-4xl xl:text-[42px] 2xl:text-[46px] truncate min-w-0">
                          {formatCurrency(contasPagar.saldoAPagar)}
                        </h2>
                        <p className="mt-3 text-sm text-slate-400">
                          Saldo principal em aberto
                        </p>
                      </div>

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300 transition-all duration-300 group-hover:scale-105 group-hover:border-amber-400/30 group-hover:bg-amber-400/15">
                        <TrendingDown className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-4">
                      <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 group-hover:border-white/12 group-hover:bg-white/[0.055]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                          Previsto
                        </p>
                        <p className="mt-3 text-xl font-bold leading-none tracking-[-0.03em] text-white md:text-2xl xl:text-[30px] 2xl:text-[34px] truncate min-w-0">
                          {formatCurrency(contasPagar.valorAPagar)}
                        </p>
                      </div>

                      <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 group-hover:border-white/12 group-hover:bg-white/[0.055]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                          Pago
                        </p>
                        <p className="mt-3 text-xl font-bold leading-none tracking-[-0.03em] text-white md:text-2xl xl:text-[30px] 2xl:text-[34px] truncate min-w-0">
                          {formatCurrency(contasPagar.valorPago)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto pt-8">
                      <div className="flex items-center justify-between rounded-[24px] border border-amber-400/14 bg-[linear-gradient(180deg,rgba(245,158,11,0.09)_0%,rgba(245,158,11,0.03)_100%)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/75">
                            Ação rápida
                          </p>
                          <p className="mt-1 text-sm text-slate-300">
                            Abrir detalhamento completo
                          </p>
                        </div>

                        <Link
                          to="/contas-a-pagar"
                          className="inline-flex items-center gap-2 rounded-full border border-amber-400/22 bg-amber-400/12 px-4 py-2.5 text-sm font-semibold text-amber-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-400/18 hover:shadow-[0_10px_24px_rgba(245,158,11,0.12)]"
                        >
                          Ver detalhamento
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside
              className={`rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,22,43,0.94)_0%,rgba(10,16,34,0.88)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl ${
                presentationMode ? "h-full p-6" : "p-5 lg:p-6"
              }`}
            >
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[32px] font-semibold tracking-tight text-white">
                      Indicadores
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Resumo lateral no padrão da referência.
                    </p>
                  </div>

                  {!presentationMode && (
                    <button
                      onClick={togglePresentationMode}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                      title="Modo apresentação"
                      aria-label="Ativar modo apresentação"
                    >
                      <Presentation className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div
                  className={`mt-6 grid min-h-0 gap-3 ${
                    presentationMode ? "content-start" : ""
                  }`}
                >
                  {indicadores.map((ind) => {
                    const positive =
                      ind.percentualReal >= ind.percentualEsperado;
                    const progress = Math.min(
                      (ind.percentualReal /
                        Math.max(ind.percentualEsperado, 1)) *
                        100,
                      100
                    );

                    return (
                      <Link
                        key={ind.id}
                        to={`/indicadores/${ind.id}`}
                        className="group relative overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.88)_0%,rgba(9,14,33,0.98)_100%)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(24,34,84,0.95)_0%,rgba(12,18,40,1)_100%)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.32)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
                            {ind.nome}
                          </p>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold ${
                                positive
                                  ? "text-emerald-300"
                                  : "text-amber-300"
                              }`}
                            >
                              {ind.percentualReal}%
                            </span>

                            <ArrowRight className="h-4 w-4 text-slate-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" />
                          </div>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              positive ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </Link>
                    );
                  })}
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