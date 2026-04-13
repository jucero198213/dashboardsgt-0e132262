import { cn } from "@/lib/utils";

const Shimmer = ({ className = "" }: { className?: string }) => (
  <div
    className={cn("relative overflow-hidden rounded-xl", className)}
    style={{ background: "var(--sgt-skeleton-bg)" }}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent dark:via-white/[0.06] light:via-white/40" />
  </div>
);

export function CardSkeleton() {
  return (
    <div className="rounded-[20px] border p-3.5" style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}>
      <Shimmer className="mb-3 h-3 w-20" />
      <Shimmer className="mb-2 h-6 w-32" />
      <Shimmer className="h-3 w-24" />
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-[20px] border p-4 sm:p-5" style={{ background: "var(--sgt-bg-card)", borderColor: "var(--sgt-border-subtle)" }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-10 w-10 rounded-2xl" />
      </div>
      <Shimmer className="mb-2 h-7 w-32" />
      <Shimmer className="h-3 w-20" />
    </div>
  );
}
