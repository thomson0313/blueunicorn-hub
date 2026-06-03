import { formatTimelineDate, isProjectUrgent } from "@/lib/project-timeline";
import type { ProjectStatus } from "@/lib/types";

export function ProjectTimelineDisplay({
  timeline,
  createdAt,
  status,
}: {
  timeline: string;
  createdAt: string;
  status: ProjectStatus;
}) {
  const label = formatTimelineDate(timeline);
  const urgent = isProjectUrgent(createdAt, timeline, status);

  if (label === "N/A") {
    return <span className="text-slate-500">Timeline: N/A</span>;
  }

  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <span className="text-slate-500">Timeline:</span>
      <span
        className={`inline-flex items-center gap-2 ${
          urgent ? "text-red-600 font-semibold border-r-2 border-red-500 pr-2" : "text-slate-600"
        }`}
      >
        {label}
        {urgent && (
          <span className="urgent-badge text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-500 px-2 py-0.5 rounded-full">
            Urgent
          </span>
        )}
      </span>
    </span>
  );
}
