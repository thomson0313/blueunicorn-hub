import type { ProjectStatus } from "@/lib/types";

/** Parse timeline field as end/due date (ISO YYYY-MM-DD or legacy text). */
export function parseTimelineDate(timeline: string): Date | null {
  const v = timeline?.trim();
  if (!v) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Format for display (e.g. 5/6/2026). */
export function formatTimelineDate(timeline: string): string {
  const v = timeline?.trim();
  if (!v) return "N/A";

  const dt = parseTimelineDate(v);
  if (!dt) return v;

  return dt.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

/** Value for `<input type="date" />`. */
export function timelineToInputValue(timeline: string): string {
  const v = timeline?.trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const dt = parseTimelineDate(v);
  if (!dt) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True when ≤20% of timeline (created → due) remains and project is in progress. */
export function isProjectUrgent(
  createdAt: string,
  timeline: string,
  status: ProjectStatus
): boolean {
  if (status !== "in_progress") return false;

  const end = parseTimelineDate(timeline);
  if (!end) return false;

  const start = new Date(createdAt);
  const now = new Date();
  if (Number.isNaN(start.getTime())) return false;

  const total = end.getTime() - start.getTime();
  if (total <= 0) return now >= end;

  const remaining = end.getTime() - now.getTime();
  if (remaining <= 0) return true;

  return remaining / total <= 0.2;
}
