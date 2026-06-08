import { Skeleton } from "./Skeleton";

export function LockedPlatformSkeleton({ isAdmin = false }: { isAdmin?: boolean }) {
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50" aria-hidden>
        <div className="hidden md:block fixed left-0 top-10 bottom-0 w-56 border-r border-slate-200 bg-white p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
        <div className="md:ml-56 pt-14 md:pt-10">
          <div className="md:hidden h-14 border-b border-slate-200 bg-white px-4 flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-32" />
          </div>
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <Skeleton className="h-8 w-56" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" aria-hidden>
      <div className="bg-gradient-to-r from-brand-700/40 to-brand-500/40 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg bg-white/30" />
          <Skeleton className="h-5 w-28 bg-white/30" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg bg-white/30" />
          <Skeleton className="h-9 w-9 rounded-lg bg-white/30" />
          <Skeleton className="h-9 w-24 rounded-lg bg-white/30" />
        </div>
      </div>
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      </main>
    </div>
  );
}
