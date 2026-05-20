export function BackgroundEffects() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere bg-[radial-gradient(ellipse_80%_50%_at_50%_-8%,rgba(160,100,4,0.10),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 sgt-atmosphere dark:opacity-100 opacity-[0.10]" style={{ background: "radial-gradient(ellipse 115% 115% at 50% 50%, transparent 10%, rgba(2,3,12,0.55) 100%)" }} />
    </>
  );
}
