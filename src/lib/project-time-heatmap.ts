export const HEATMAP_WEEKS = 24;

export type DayCell = {
  date: string;
  hours: number;
  inRange: boolean;
};

export type HeatmapGrid = {
  weeks: DayCell[][];
  maxHours: number;
  totalHours: number;
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

export function formatWorkDateLabel(key: string): string {
  const d = parseDateKey(key);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function startOfWeekSunday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() - date.getDay());
  return date;
}

export function buildHeatmapGrid(hoursByDate: Record<string, number>, anchor = new Date()): HeatmapGrid {
  const endSunday = startOfWeekSunday(anchor);
  const startSunday = new Date(endSunday);
  startSunday.setDate(startSunday.getDate() - (HEATMAP_WEEKS - 1) * 7);

  const todayKey = toDateKey(anchor);
  let maxHours = 0;
  let totalHours = 0;

  const weeks: DayCell[][] = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const column: DayCell[] = [];
    for (let day = 0; day < 7; day++) {
      const cellDate = new Date(startSunday);
      cellDate.setDate(startSunday.getDate() + w * 7 + day);
      const key = toDateKey(cellDate);
      const hours = hoursByDate[key] ?? 0;
      if (hours > maxHours) maxHours = hours;
      totalHours += hours;
      column.push({
        date: key,
        hours,
        inRange: key <= todayKey,
      });
    }
    weeks.push(column);
  }

  return { weeks, maxHours, totalHours };
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

export function sanitizeHoursInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts[0]}.${parts.slice(1).join("")}`;
}
