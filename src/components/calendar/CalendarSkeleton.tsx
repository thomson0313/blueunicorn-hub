import { Skeleton } from "@/components/skeleton/Skeleton";
import { HOUR_HEIGHT, HOURS } from "@/lib/calendar-utils";

const SKELETON_HOURS = HOURS.slice(8, 20);

type Props = {
  variant: "week" | "day";
  columnCount?: number;
};

export function CalendarSkeleton({ variant, columnCount = 4 }: Props) {
  const dayColumns = variant === "week" ? 7 : columnCount;
  const gridCols =
    variant === "week"
      ? "grid-cols-[4rem_repeat(7,1fr)]"
      : `grid-cols-[4rem_repeat(${dayColumns},1fr)]`;

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      aria-busy
      aria-label="Loading calendar"
    >
      <div className="overflow-x-auto">
        <div className={variant === "week" ? "min-w-[760px]" : undefined} style={variant === "day" ? { minWidth: Math.max(dayColumns * 120, 600) } : undefined}>
          <div className={`grid ${gridCols} border-b border-slate-200 bg-slate-50`}>
            <div className="p-2" />
            {Array.from({ length: dayColumns }).map((_, i) => (
              <div key={i} className="p-2 text-center border-l border-slate-200 space-y-1">
                {variant === "week" ? (
                  <>
                    <Skeleton className="h-3 w-8 mx-auto" />
                    <Skeleton className="h-3 w-12 mx-auto" />
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={`relative grid ${gridCols}`}>
            {SKELETON_HOURS.map((hour) => (
              <div key={hour} className="contents">
                <div
                  className="text-xs text-right pr-2 border-b border-slate-100 flex items-start justify-end"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <Skeleton className="h-3 w-10" />
                </div>
                {Array.from({ length: dayColumns }).map((_, col) => (
                  <div
                    key={`${hour}-${col}`}
                    className="border-l border-b border-slate-100"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}
              </div>
            ))}

            {variant === "week" && (
              <>
                <div
                  className="absolute z-10 rounded-md animate-pulse bg-slate-200/80"
                  style={{
                    top: HOUR_HEIGHT * 1.5,
                    left: "calc(4rem + ((100% - 4rem) / 7) * 1 + 2px)",
                    width: "calc((100% - 4rem) / 7 - 8px)",
                    height: HOUR_HEIGHT * 1.25,
                  }}
                />
                <div
                  className="absolute z-10 rounded-md animate-pulse bg-slate-200/80"
                  style={{
                    top: HOUR_HEIGHT * 3,
                    left: "calc(4rem + ((100% - 4rem) / 7) * 3 + 2px)",
                    width: "calc(((100% - 4rem) / 7 - 8px) / 2 - 2px)",
                    height: HOUR_HEIGHT,
                  }}
                />
                <div
                  className="absolute z-10 rounded-md animate-pulse bg-slate-200/80"
                  style={{
                    top: HOUR_HEIGHT * 3,
                    left: "calc(4rem + ((100% - 4rem) / 7) * 3 + ((100% - 4rem) / 7 - 8px) / 2 + 2px)",
                    width: "calc(((100% - 4rem) / 7 - 8px) / 2 - 2px)",
                    height: HOUR_HEIGHT,
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
