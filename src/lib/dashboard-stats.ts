import { isProjectUrgent } from "@/lib/project-timeline";
import { formatHours } from "@/lib/project-time-heatmap";
import { formatProjectBudgetDisplay } from "@/lib/project-budget";
import type { Project, PublicUser } from "@/lib/types";

export function projectOwnerId(owner: Project["owner"]): string {
  return typeof owner === "string" ? owner : owner._id;
}

export function activeProjects(projects: Project[]): Project[] {
  return projects.filter((p) => p.status !== "archived" && p.status !== "upcoming");
}

export function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export type DashboardSummary = {
  totalActive: number;
  inProgress: number;
  completed: number;
  canceled: number;
  urgent: number;
  fixedCount: number;
  hourlyCount: number;
  fixedAvgCompletion: number;
  totalLoggedHours: number;
};

export function summarizeProjects(projects: Project[]): DashboardSummary {
  const active = activeProjects(projects);
  const fixed = active.filter((p) => p.budgetType === "fixed");
  const hourly = active.filter((p) => p.budgetType === "hourly");

  return {
    totalActive: active.length,
    inProgress: active.filter((p) => p.status === "in_progress").length,
    completed: active.filter((p) => p.status === "completed").length,
    canceled: active.filter((p) => p.status === "canceled").length,
    urgent: active.filter((p) => isProjectUrgent(p.createdAt, p.timeline, p.status)).length,
    fixedCount: fixed.length,
    hourlyCount: hourly.length,
    fixedAvgCompletion: avg(fixed.map((p) => p.completionRate)),
    totalLoggedHours: hourly.reduce((sum, p) => sum + (p.totalLoggedHours ?? 0), 0),
  };
}

export function groupProjectsByOwner(projects: Project[]): Map<string, Project[]> {
  const map = new Map<string, Project[]>();
  for (const p of activeProjects(projects)) {
    const key = projectOwnerId(p.owner);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

export function memberSummaries(
  members: PublicUser[],
  byOwner: Map<string, Project[]>
): { member: PublicUser; projects: Project[]; summary: DashboardSummary }[] {
  return members
    .filter((m) => m.role === "member")
    .map((member) => {
      const projects = byOwner.get(member._id) ?? [];
      return { member, projects, summary: summarizeProjects(projects) };
    })
    .sort((a, b) => a.member.name.localeCompare(b.member.name));
}

export function formatLoggedHours(hours: number): string {
  return `${formatHours(hours)} hr`;
}

export function projectProgressLabel(p: Project): string {
  if (p.budgetType === "hourly") {
    const h = p.totalLoggedHours ?? 0;
    return h > 0 ? `${formatHours(h)} hr logged` : "No time logged yet";
  }
  return `${p.completionRate}%`;
}

export function projectBudgetLabel(p: Project): string {
  return formatProjectBudgetDisplay(p);
}
