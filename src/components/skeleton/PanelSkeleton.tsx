import { Skeleton } from "./Skeleton";

export type PanelSkeletonVariant = "table" | "profile" | "chat" | "grid" | "list";

export function PanelSkeleton({
  variant = "table",
  rows = 5,
}: {
  variant?: PanelSkeletonVariant;
  rows?: number;
}) {
  if (variant === "profile") {
    return (
      <div className="max-w-2xl mx-auto space-y-6" aria-busy aria-label="Loading profile">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "chat") {
    return (
      <div className="space-y-4" aria-busy aria-label="Loading chat">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`flex gap-3 ${i % 2 ? "flex-row-reverse" : ""}`}>
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className={`h-12 ${i % 2 ? "w-2/5" : "w-3/5"}`} />
              </div>
            ))}
          </div>
          <div className="p-4">
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        aria-busy
        aria-label="Loading projects"
      >
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="space-y-3" aria-busy aria-label="Loading">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" aria-busy aria-label="Loading">
      <div className="bg-slate-50 px-5 py-3 flex gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
