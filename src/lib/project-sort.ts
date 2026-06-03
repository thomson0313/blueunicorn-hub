import type { Project } from "@/lib/types";
import { parseTimelineDate } from "@/lib/project-timeline";

export type ProjectSortKey = "default" | "budget" | "timeline" | "progress";

function parseBudgetNumber(budget: string): number {
  const digits = budget.replace(/[^0-9.]/g, "");
  const n = parseFloat(digits);
  return Number.isNaN(n) ? 0 : n;
}

export function sortProjects(projects: Project[], key: ProjectSortKey): Project[] {
  if (key === "default") return projects;

  const copy = [...projects];

  if (key === "progress") {
    return copy.sort((a, b) => b.completionRate - a.completionRate);
  }

  if (key === "budget") {
    return copy.sort((a, b) => parseBudgetNumber(b.budget) - parseBudgetNumber(a.budget));
  }

  if (key === "timeline") {
    return copy.sort((a, b) => {
      const da = parseTimelineDate(a.timeline)?.getTime() ?? Infinity;
      const db = parseTimelineDate(b.timeline)?.getTime() ?? Infinity;
      return da - db;
    });
  }

  return copy;
}
