import { CircleDot, Wrench, BarChart3, AlertTriangle, Clock } from "lucide-react";

const CARDS = [
  {
    icon: CircleDot,
    label: "Controle de Pneus",
    desc: "Cadastro e rastreamento de pneus por veículo, posição e DOT.",
  },
  {
    icon: Wrench,
    label: "Manutenções e Trocas",
    desc: "Histórico de trocas, recapagens e descarte por unidade.",
  },
  {
    icon: BarChart3,
    label: "Indicadores de Desempenho",
    desc: "KM rodado por pneu, custo por km e análise de vida útil.",
  },
  {
    icon: AlertTriangle,
    label: "Alertas de Vencimento",
    desc: "Notificações automáticas de pneus próximos ao limite de uso.",
  },
  {
    icon: Clock,
    label: "Agendamento de Revisões",
    desc: "Programação de inspeções periódicas integradas à manutenção.",
  },
];

export default function Pneus() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: "var(--sgt-bg-base, #0f0f0f)" }}
    >
      {/* ícone central */}
      <div
        className="flex h-20 w-20 items-center justify-center rounded-2xl mb-6"
        style={{
          background: "color-mix(in srgb, var(--sb-accent, #F59E0B) 12%, transparent)",
          border: "1px solid color-mix(in srgb, var(--sb-accent, #F59E0B) 30%, transparent)",
        }}
      >
        <CircleDot
          className="h-10 w-10"
          style={{ color: "var(--sb-accent, #F59E0B)" }}
        />
      </div>

      {/* título */}
      <h1
        className="text-3xl font-bold mb-2 text-center"
        style={{ color: "var(--sgt-text-primary, #fff)" }}
      >
        Módulo de Pneus
      </h1>
      <p
        className="text-base text-center max-w-md mb-2"
        style={{ color: "var(--sgt-text-muted, #aaa)" }}
      >
        Em desenvolvimento
      </p>
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold mb-12"
        style={{
          background: "color-mix(in srgb, #F59E0B 15%, transparent)",
          color: "#F59E0B",
          border: "1px solid color-mix(in srgb, #F59E0B 30%, transparent)",
        }}
      >
        <Clock className="h-3 w-3" />
        Em breve
      </span>

      {/* cards de funcionalidades previstas */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARDS.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex gap-4 items-start rounded-xl p-4"
            style={{
              background: "var(--sgt-card-bg, #1a1a1a)",
              border: "1px solid var(--sgt-border-subtle, #2a2a2a)",
            }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: "color-mix(in srgb, var(--sb-accent, #F59E0B) 10%, transparent)",
              }}
            >
              <Icon
                className="h-4 w-4"
                style={{ color: "var(--sb-accent, #F59E0B)", opacity: 0.8 }}
              />
            </div>
            <div>
              <p
                className="text-sm font-semibold mb-0.5"
                style={{ color: "var(--sgt-text-primary, #fff)" }}
              >
                {label}
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--sgt-text-muted, #888)" }}
              >
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
