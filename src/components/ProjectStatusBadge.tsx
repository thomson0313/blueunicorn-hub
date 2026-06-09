import type { Project, ProjectStatus } from "@/lib/types";
import {
  PROJECT_NEW_BADGE_STYLE,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_STYLES,
  isProjectNew,
} from "@/lib/project-rules";

export function ProjectStatusBadge({
  status,
  project,
}: {
  status: ProjectStatus;
  project?: Pick<Project, "status" | "budgetType" | "completionRate" | "totalLoggedHours">;
}) {
  if (project && isProjectNew(project)) {
    return (
      <span
        className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${PROJECT_NEW_BADGE_STYLE}`}
      >
        New
      </span>
    );
  }

  return (
    <span
      className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${PROJECT_STATUS_STYLES[status]}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
