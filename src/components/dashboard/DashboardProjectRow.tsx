import Link from "next/link";
import { ScoreAvatar } from "@/components/ScoreAvatar";
import { ProgressBar } from "@/components/ProgressBar";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { ProjectTimeHeatmap } from "@/components/projects/ProjectTimeHeatmap";
import { isProjectUrgent, formatTimelineDate } from "@/lib/project-timeline";
import { projectBudgetLabel, projectProgressLabel } from "@/lib/dashboard-stats";
import type { Project } from "@/lib/types";

export function DashboardProjectRow({
  project: p,
  projectsHref,
}: {
  project: Project;
  projectsHref: string;
}) {
  const urgent = isProjectUrgent(p.createdAt, p.timeline, p.status);
  const timeline = formatTimelineDate(p.timeline);

  return (
    <div
      className={`rounded-xl border p-4 ${
        urgent ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`${projectsHref}#${p._id}`}
              className="font-medium text-slate-800 hover:text-brand-600 hover:underline"
            >
              {p.title}
            </Link>
            <ProjectStatusBadge status={p.status} />
            {p.budgetType === "hourly" && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                Hourly
              </span>
            )}
            {urgent && (
              <span className="text-[10px] font-bold uppercase text-red-600">Urgent</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
            {p.fieldName && <span>{p.fieldName}</span>}
            <span>Budget: {projectBudgetLabel(p)}</span>
            {timeline !== "N/A" && <span>Due: {timeline}</span>}
          </div>
        </div>
        <span className="text-sm font-semibold text-slate-600 shrink-0">
          {projectProgressLabel(p)}
        </span>
      </div>

      {p.budgetType === "hourly" ? (
        <ProjectTimeHeatmap
          hoursByDate={p.timeByDate ?? {}}
          projectCreatedAt={p.createdAt}
          compact
        />
      ) : (
        <>
          <ProgressBar value={p.completionRate} />
          <div className="text-right text-sm text-slate-500 mt-1">{p.completionRate}%</div>
        </>
      )}
    </div>
  );
}

export function DashboardMemberCard({
  name,
  memberId,
  role,
  fieldName,
  avatarUrl,
  score,
  summary,
  projects,
  projectsHref,
}: {
  name: string;
  memberId: string;
  role: string;
  fieldName?: string | null;
  avatarUrl?: string | null;
  score: number;
  summary: ReturnType<typeof import("@/lib/dashboard-stats").summarizeProjects>;
  projects: Project[];
  projectsHref: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-start gap-4 mb-4">
        <ScoreAvatarInline name={name} src={avatarUrl} score={score} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link
                href={`/u/${memberId}`}
                className="font-semibold text-slate-900 hover:text-brand-600 hover:underline"
              >
                {name}
              </Link>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">
                  {role}
                </span>
                {fieldName && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                    {fieldName}
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-500 text-right space-y-0.5">
              <div>
                {summary.totalActive} active · {summary.inProgress} in progress · {summary.completed} done
              </div>
              {summary.hourlyCount > 0 && (
                <div>
                  {summary.hourlyCount} hourly · {summary.totalLoggedHours.toLocaleString()} hr logged
                </div>
              )}
              {summary.fixedCount > 0 && (
                <div>{summary.fixedCount} fixed · {summary.fixedAvgCompletion}% avg</div>
              )}
              {summary.urgent > 0 && (
                <div className="text-red-600 font-medium">{summary.urgent} urgent</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-slate-400">No active projects.</p>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <DashboardProjectRow key={p._id} project={p} projectsHref={projectsHref} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreAvatarInline({
  name,
  src,
  score,
}: {
  name: string;
  src?: string | null;
  score: number;
}) {
  return <ScoreAvatar name={name} src={src} size={48} score={score} />;
}
