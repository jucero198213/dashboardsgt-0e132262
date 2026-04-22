import { useNavigate, useParams } from "react-router-dom";
import { HomeButton } from "@/components/shared/HomeButton";
import { Construction } from "lucide-react";
import sgtLogo from "@/assets/sgt-logo.png";

const MODULE_LABELS: Record<string, string> = {
  "rh":                "RH",
  "contas-a-pagar":    "Contas a Pagar",
  "contas-a-receber":  "Contas a Receber",
  "compras":           "Compras",
  "manutencao":        "Manutenção",
  "operacional":       "Operacional",
  "faturamento":       "Faturamento",
  "abastecimento":     "Abastecimento",
  "frota":             "Frota",
  "executivo":         "Executivo",
};

export default function EmDesenvolvimento() {
  const navigate = useNavigate();
  const { modulo } = useParams<{ modulo: string }>();
  const label = MODULE_LABELS[modulo ?? ""] ?? "Módulo";

  return (
    <div
      className="flex flex-col transition-all duration-300 min-h-[100dvh] xl:h-[100dvh] overflow-auto xl:overflow-hidden px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 xl:px-3 xl:py-2"
      style={{ backgroundColor: "var(--sgt-bg-base)", color: "var(--sgt-text-primary)" }}
    >
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(160,100,4,0.18),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_50%_40%_at_100%_105%,rgba(6,182,212,0.06),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 dark:opacity-100" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.68) 100%)" }} />

      <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden w-full">
        <section
          className="relative flex-1 min-h-0 flex flex-col border transition-all duration-300 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-auto xl:overflow-hidden"
          style={{ background: "var(--sgt-bg-section)", borderColor: "var(--sgt-border-subtle)", boxShadow: "var(--sgt-section-shadow)" }}
        >
          {/* Navbar */}
          <div className="hidden sm:flex items-center gap-2 md:gap-3 p-2 sm:p-3 lg:p-4 py-3">
            <span className="flex items-center gap-2 text-[17px] font-extrabold tracking-[-0.03em] dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-slate-400 dark:bg-clip-text dark:text-transparent leading-none">
              <span>{label}</span>
              <img src={sgtLogo} alt="SGT" className="block h-6 w-auto shrink-0 object-contain" />
            </span>
            <div className="flex-1" />
            <HomeButton />
          </div>

          <div className="h-px" style={{ background: "var(--sgt-divider)" }} />

          {/* Conteúdo */}
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="flex flex-col items-center gap-6 text-center max-w-md">

              {/* Ícone animado */}
              <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-amber-400/20 bg-amber-400/[0.06]">
                <div className="absolute inset-0 rounded-3xl animate-pulse bg-amber-400/[0.04]" />
                <Construction className="h-10 w-10 text-amber-400/70 relative" />
              </div>

              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-4 py-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300">
                  Em desenvolvimento
                </span>
              </div>

              {/* Título */}
              <div>
                <h1 className="text-[2rem] font-black tracking-[-0.04em] dark:text-white text-slate-800">
                  {label}
                </h1>
                <p className="mt-3 text-[14px] leading-relaxed dark:text-slate-400 text-slate-500">
                  Este módulo está sendo desenvolvido e em breve estará disponível no Workspace SGT.
                </p>
              </div>

              {/* Botão voltar */}
              <button
                onClick={() => navigate("/home")}
                className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.12] px-6 text-[13px] font-semibold text-amber-200 transition-all hover:-translate-y-0.5 hover:border-amber-400/50 hover:bg-amber-400/[0.2] hover:shadow-[0_8px_28px_rgba(245,158,11,0.2)]"
              >
                Voltar ao Workspace
              </button>
            </div>
          </div>

        </section>
      </div>
    </div>
  );
}
