import type { Project, ProjectStatus } from "./types";

/** In-progress project with no progress (fixed) or no logged time (hourly). */
export function isProjectNew(
  p: Pick<Project, "status" | "budgetType" | "completionRate" | "totalLoggedHours">
): boolean {
  if (p.status !== "in_progress") return false;
  if (p.budgetType === "hourly") return (p.totalLoggedHours ?? 0) === 0;
  return p.completionRate === 0;
}

/** When progress hits 100%, mark completed unless already terminal. */
export function applyProgressStatus(
  completionRate: number,
  currentStatus: ProjectStatus
): ProjectStatus {
  if (completionRate >= 100 && currentStatus === "in_progress") {
    return "completed";
  }
  return currentStatus;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
  archived: "Archived",
  upcoming: "Upcoming",
};

export const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  canceled: "bg-amber-50 text-amber-800",
  archived: "bg-slate-100 text-slate-600",
  upcoming: "bg-violet-50 text-violet-700",
};

export const PROJECT_NEW_BADGE_STYLE = "bg-violet-50 text-violet-700";
