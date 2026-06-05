export type DayCell = {
  date: string;
  hours: number;
  inRange: boolean;
};

export type HeatmapGrid = {
  weeks: DayCell[][];
  maxHours: number;
  totalHours: number;
  weekCount: number;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function parseProjectCreatedDate(createdAt: string): Date {
  const d = new Date(createdAt);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatWorkDateLabel(key: string): string {
  const d = parseDateKey(key);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function startOfWeekSunday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() - date.getDay());
  return date;
}

export function buildHeatmapGrid(
  hoursByDate: Record<string, number>,
  opts: { projectCreatedAt: string; anchor?: Date }
): HeatmapGrid {
  const anchor = opts.anchor ?? new Date();
  const created = parseProjectCreatedDate(opts.projectCreatedAt);
  const createdKey = toDateKey(created);
  const todayKey = toDateKey(anchor);

  const startSunday = startOfWeekSunday(created);
  const endSunday = startOfWeekSunday(anchor);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weekCount = Math.max(
    1,
    Math.floor((endSunday.getTime() - startSunday.getTime()) / msPerWeek) + 1
  );

  let maxHours = 0;
  let totalHours = 0;
  const weeks: DayCell[][] = [];

  for (let w = 0; w < weekCount; w++) {
    const column: DayCell[] = [];
    for (let day = 0; day < 7; day++) {
      const cellDate = new Date(startSunday);
      cellDate.setDate(startSunday.getDate() + w * 7 + day);
      const key = toDateKey(cellDate);
      const inRange = key >= createdKey && key <= todayKey;
      const hours = inRange ? (hoursByDate[key] ?? 0) : 0;
      if (inRange && hours > maxHours) maxHours = hours;
      if (inRange) totalHours += hours;
      column.push({ date: key, hours, inRange });
    }
    weeks.push(column);
  }

  return { weeks, maxHours, totalHours, weekCount };
}

const LEVEL_COLORS = [
  "bg-slate-100",
  "bg-blue-200",
  "bg-blue-400",
  "bg-blue-600",
  "bg-blue-800",
];

export function heatmapLevel(hours: number, maxHours: number): number {
  if (hours <= 0) return 0;
  if (maxHours <= 0) return 1;
  const ratio = hours / maxHours;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

export function heatmapColorClass(hours: number, maxHours: number, inRange: boolean): string {
  if (!inRange) return "bg-slate-50";
  return LEVEL_COLORS[heatmapLevel(hours, maxHours)];
}

export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function todayDateInputValue(): string {
  return toDateKey(new Date());
}

export function projectCreatedDateInputValue(createdAt: string): string {
  return toDateKey(parseProjectCreatedDate(createdAt));
}

export function sanitizeHoursInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

export function assertValidWorkDate(workDate: string, projectCreatedAt: string, today = new Date()): void {
  const createdKey = projectCreatedDateInputValue(projectCreatedAt);
  const todayKey = toDateKey(today);
  if (workDate < createdKey) {
    throw new Error("Date cannot be before the project was created");
  }
  if (workDate > todayKey) {
    throw new Error("Future dates are not allowed");
  }
}
