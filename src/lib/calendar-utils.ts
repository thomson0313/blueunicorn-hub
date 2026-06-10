import type { CalendarSchedule, CalendarScheduleType } from "@/lib/types";

export const HOUR_HEIGHT = 48;
export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type Ymd = { year: number; month: number; day: number };

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const DEFAULT_TIMEZONE = "UTC";

/** Validates a timezone string for Intl; falls back to UTC. */
export function normalizeTimeZone(tz: unknown): string {
  if (typeof tz !== "string" || !tz.trim()) return DEFAULT_TIMEZONE;
  const value = tz.trim();
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** Browser local IANA timezone; UTC during SSR or when detection fails. */
export function getBrowserTimezone(): string {
  if (typeof window === "undefined") return DEFAULT_TIMEZONE;
  try {
    return normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function listTimezoneOptions(): { value: string; label: string }[] {
  const local = getBrowserTimezone();
  const common = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Australia/Sydney",
  ];
  const unique = Array.from(new Set([local, ...common]));
  return unique.map((tz) => ({
    value: tz,
    label: tz === local ? `${tz} (local)` : tz,
  }));
}

export function getYmdInTimezone(date: Date, timeZone: string): Ymd {
  const tz = normalizeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? 1970);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 1);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 1);
  return { year, month, day };
}

export function getWeekdayInTimezone(date: Date, timeZone: string): number {
  const tz = normalizeTimeZone(timeZone);
  const label = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(date);
  return WEEKDAY_MAP[label] ?? 0;
}

export function addDaysYmd(ymd: Ymd, days: number): Ymd {
  const dt = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + days));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

export function getWeekSundayYmd(anchor: Date, timeZone: string): Ymd {
  const ymd = getYmdInTimezone(anchor, timeZone);
  const weekday = getWeekdayInTimezone(anchor, timeZone);
  return addDaysYmd(ymd, -weekday);
}

export function getWeekDays(anchor: Date, timeZone: string): Ymd[] {
  const start = getWeekSundayYmd(anchor, timeZone);
  return Array.from({ length: 7 }, (_, i) => addDaysYmd(start, i));
}

function getOffsetMs(date: Date, timeZone: string): number {
  const tz = normalizeTimeZone(timeZone);
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const zoned = new Date(date.toLocaleString("en-US", { timeZone: tz }));
  return zoned.getTime() - utc.getTime();
}

export function zonedDateTimeToUtc(ymd: Ymd, hour: number, minute: number, timeZone: string): Date {
  let utcGuess = Date.UTC(ymd.year, ymd.month - 1, ymd.day, hour, minute, 0, 0);
  for (let i = 0; i < 4; i++) {
    const offset = getOffsetMs(new Date(utcGuess), timeZone);
    utcGuess = Date.UTC(ymd.year, ymd.month - 1, ymd.day, hour, minute, 0, 0) - offset;
  }
  return new Date(utcGuess);
}

export function getWeekRangeUtc(anchor: Date, timeZone: string): { start: string; end: string } {
  const days = getWeekDays(anchor, timeZone);
  const start = zonedDateTimeToUtc(days[0], 0, 0, timeZone);
  const last = days[6];
  const end = zonedDateTimeToUtc(addDaysYmd(last, 1), 0, 0, timeZone);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function getDayRangeUtc(ymd: Ymd, timeZone: string): { start: string; end: string } {
  const start = zonedDateTimeToUtc(ymd, 0, 0, timeZone);
  const end = zonedDateTimeToUtc(addDaysYmd(ymd, 1), 0, 0, timeZone);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function formatYmd(ymd: Ymd): string {
  const m = String(ymd.month).padStart(2, "0");
  const d = String(ymd.day).padStart(2, "0");
  return `${ymd.year}-${m}-${d}`;
}

export function parseYmd(value: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function ymdToDateInput(ymd: Ymd): string {
  return formatYmd(ymd);
}

export function formatTimeRange(startIso: string, endIso: string, timeZone: string): string {
  const tz = normalizeTimeZone(timeZone);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`;
}

export function formatTime(iso: string, timeZone: string): string {
  const tz = normalizeTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatDayHeader(ymd: Ymd, timeZone: string): string {
  const tz = normalizeTimeZone(timeZone);
  const date = zonedDateTimeToUtc(ymd, 12, 0, tz);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function isSameYmd(a: Ymd, b: Ymd): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function isTodayYmd(ymd: Ymd, timeZone: string, now = new Date()): boolean {
  return isSameYmd(ymd, getYmdInTimezone(now, timeZone));
}

export type ScheduleSegment = {
  schedule: CalendarSchedule;
  dayIndex: number;
  topPx: number;
  heightPx: number;
};

function minutesSinceMidnight(date: Date, timeZone: string): number {
  const tz = normalizeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function buildWeekScheduleSegments(
  schedules: CalendarSchedule[],
  weekDays: Ymd[],
  timeZone: string
): ScheduleSegment[] {
  const segments: ScheduleSegment[] = [];
  for (const schedule of schedules) {
    const start = new Date(schedule.startsAt);
    const end = new Date(schedule.endsAt);
    for (let dayIndex = 0; dayIndex < weekDays.length; dayIndex++) {
      const day = weekDays[dayIndex];
      const dayStart = zonedDateTimeToUtc(day, 0, 0, timeZone);
      const dayEnd = zonedDateTimeToUtc(addDaysYmd(day, 1), 0, 0, timeZone);
      if (end <= dayStart || start >= dayEnd) continue;
      const segStart = start < dayStart ? dayStart : start;
      const segEnd = end > dayEnd ? dayEnd : end;
      const startMin = minutesSinceMidnight(segStart, timeZone);
      const endMin = minutesSinceMidnight(segEnd, timeZone);
      const topPx = (startMin / 60) * HOUR_HEIGHT;
      const heightPx = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 4);
      segments.push({ schedule, dayIndex, topPx, heightPx });
    }
  }
  return segments;
}

export function getCurrentTimeLine(
  weekDays: Ymd[],
  timeZone: string,
  now = new Date()
): { dayIndex: number; topPx: number } | null {
  const today = getYmdInTimezone(now, timeZone);
  const dayIndex = weekDays.findIndex((d) => isSameYmd(d, today));
  if (dayIndex < 0) return null;
  const minutes = minutesSinceMidnight(now, timeZone);
  return { dayIndex, topPx: (minutes / 60) * HOUR_HEIGHT };
}

export function getCurrentTimeLineDay(topPx: number): number {
  return topPx;
}

export function defaultEndIso(startIso: string, type: CalendarScheduleType): string {
  const start = new Date(startIso);
  const hours = type === "event" ? 1 : 1;
  return new Date(start.getTime() + hours * 60 * 60 * 1000).toISOString();
}

export function enforceEventEnd(startIso: string): string {
  const start = new Date(startIso);
  return new Date(start.getTime() + 60 * 60 * 1000).toISOString();
}

export function toDatetimeLocalValue(iso: string, timeZone: string): string {
  const tz = normalizeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const min = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function datetimeLocalInTimezoneToUtc(value: string, timeZone: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) throw new Error("Invalid datetime");
  const ymd: Ymd = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return zonedDateTimeToUtc(ymd, Number(m[4]), Number(m[5]), timeZone).toISOString();
}

const MEMBER_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-fuchsia-500",
];

export function memberColorClass(userId: string, index: number): string {
  const hash = userId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return MEMBER_COLORS[(hash + index) % MEMBER_COLORS.length];
}

export type AdminDaySegment = {
  schedule: CalendarSchedule & { userName: string };
  memberIndex: number;
  topPx: number;
  heightPx: number;
  colorClass: string;
};

export function buildAdminDaySegments(
  schedules: (CalendarSchedule & { userName: string; userId: string })[],
  memberOrder: { id: string; name: string }[],
  ymd: Ymd,
  timeZone: string
): AdminDaySegment[] {
  const dayStart = zonedDateTimeToUtc(ymd, 0, 0, timeZone);
  const dayEnd = zonedDateTimeToUtc(addDaysYmd(ymd, 1), 0, 0, timeZone);
  const indexByUser = new Map(memberOrder.map((m, i) => [m.id, i]));
  const segments: AdminDaySegment[] = [];

  for (const schedule of schedules) {
    const start = new Date(schedule.startsAt);
    const end = new Date(schedule.endsAt);
    if (end <= dayStart || start >= dayEnd) continue;
    const segStart = start < dayStart ? dayStart : start;
    const segEnd = end > dayEnd ? dayEnd : end;
    const startMin = minutesSinceMidnight(segStart, timeZone);
    const endMin = minutesSinceMidnight(segEnd, timeZone);
    const memberIndex = indexByUser.get(schedule.userId) ?? 0;
    segments.push({
      schedule,
      memberIndex,
      topPx: (startMin / 60) * HOUR_HEIGHT,
      heightPx: Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 4),
      colorClass: memberColorClass(schedule.userId, memberIndex),
    });
  }
  return segments;
}
