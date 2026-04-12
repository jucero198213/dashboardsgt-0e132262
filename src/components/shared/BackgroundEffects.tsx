export function BackgroundEffects() {
  return (
    <>
      {/* Luz âmbar no topo — identidade financeira/executiva */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(160,100,4,0.22),transparent_60%)]" />
      {/* Contraluz fria no rodapé-direito — profundidade */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_105%,rgba(6,182,212,0.07),transparent_60%)]" />
      {/* Vinheta perimetral — impede o fundo de parecer flat */}
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.68) 100%)" }} />
    </>
  );
}
