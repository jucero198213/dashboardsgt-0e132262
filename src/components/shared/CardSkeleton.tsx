const Shimmer = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />
);

export function CardSkeleton() {
  return (
    <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.82)_0%,rgba(10,16,36,0.98)_100%)] p-3.5">
      <Shimmer className="mb-3 h-3 w-20" />
      <Shimmer className="mb-2 h-6 w-32" />
      <Shimmer className="h-3 w-24" />
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,53,0.72)_0%,rgba(11,17,35,0.94)_100%)] p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-10 w-10 rounded-2xl" />
      </div>
      <Shimmer className="mb-2 h-7 w-32" />
      <Shimmer className="h-3 w-20" />
    </div>
  );
}
