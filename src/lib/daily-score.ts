import { activeProjects } from "@/lib/dashboard-stats";
import { parseProjectCreatedDate, toDateKey } from "@/lib/project-time-heatmap";
import { parseTimelineDate } from "@/lib/project-timeline";
import type { Project } from "@/lib/types";

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function scoreRingColor(score: number): string {
  if (score >= 85) return "#10b981";
  if (score >= 70) return "#3b82f6";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

export function scoreTextClass(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-blue-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

export function fixedProjectScore(p: Project, now = new Date()): number {
  const start = parseProjectCreatedDate(p.createdAt);
  const due = parseTimelineDate(p.timeline);
  const progress = p.completionRate;

  if (!due) return clampScore(progress);

  const startMs = start.getTime();
  const dueMs = due.getTime();
  const nowMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  const totalSpan = dueMs - startMs;
  const elapsed = nowMs - startMs;

  if (totalSpan <= 0 || elapsed <= 0) return clampScore(progress);

  const ratio = totalSpan / elapsed;
  return clampScore(progress * ratio);
}

export function hourlyProjectScore(p: Project, todayKey = toDateKey(new Date())): number {
  const hours = p.timeByDate?.[todayKey] ?? 0;
  return clampScore((hours * 100) / 8);
}

export function userDailyScore(projects: Project[], now = new Date()): number {
  const todayKey = toDateKey(now);
  const active = activeProjects(projects).filter((p) => p.status !== "canceled");

  const fixed = active.filter((p) => p.budgetType === "fixed");
  const hourly = active.filter((p) => p.budgetType === "hourly");

  const fixedAvg =
    fixed.length > 0
      ? fixed.reduce((sum, p) => sum + fixedProjectScore(p, now), 0) / fixed.length
      : null;
  const hourlyAvg =
    hourly.length > 0
      ? hourly.reduce((sum, p) => sum + hourlyProjectScore(p, todayKey), 0) / hourly.length
      : null;

  if (fixedAvg !== null && hourlyAvg !== null) return clampScore((fixedAvg + hourlyAvg) / 2);
  if (fixedAvg !== null) return clampScore(fixedAvg);
  if (hourlyAvg !== null) return clampScore(hourlyAvg);
  return 0;
}

export function teamAverageScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return clampScore(scores.reduce((a, b) => a + b, 0) / scores.length);
}
