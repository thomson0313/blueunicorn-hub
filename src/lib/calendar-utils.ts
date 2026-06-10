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

export function listTimezoneOptions(localTz?: string): { value: string; label: string }[] {
  const local = normalizeTimeZone(localTz ?? DEFAULT_TIMEZONE);
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

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number };

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const tz = normalizeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  let hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  if (hour === 24) hour = 0;
  return {
    year: Number(parts.find((p) => p.type === "year")?.value ?? 1970),
    month: Number(parts.find((p) => p.type === "month")?.value ?? 1),
    day: Number(parts.find((p) => p.type === "day")?.value ?? 1),
    hour,
    minute: Number(parts.find((p) => p.type === "minute")?.value ?? 0),
  };
}

function compareZonedParts(
  parts: ZonedParts,
  ymd: Ymd,
  hour: number,
  minute: number
): number {
  if (parts.year !== ymd.year) return parts.year < ymd.year ? -1 : 1;
  if (parts.month !== ymd.month) return parts.month < ymd.month ? -1 : 1;
  if (parts.day !== ymd.day) return parts.day < ymd.day ? -1 : 1;
  if (parts.hour !== hour) return parts.hour < hour ? -1 : 1;
  if (parts.minute !== minute) return parts.minute < minute ? -1 : 1;
  return 0;
}

/** Converts a wall-clock time in `timeZone` to the corresponding UTC instant. */
export function zonedDateTimeToUtc(ymd: Ymd, hour: number, minute: number, timeZone: string): Date {
  const tz = normalizeTimeZone(timeZone);
  const rough = Date.UTC(ymd.year, ymd.month - 1, ymd.day, hour, minute);
  let lo = rough - 28 * 60 * 60 * 1000;
  let hi = rough + 28 * 60 * 60 * 1000;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const cmp = compareZonedParts(getZonedParts(new Date(mid), tz), ymd, hour, minute);
    if (cmp === 0) return new Date(mid);
    if (cmp < 0) lo = mid + 1;
    else hi = mid - 1;
  }

  for (let offset = -48; offset <= 48; offset++) {
    const candidate = rough + offset * 15 * 60 * 1000;
    const d = new Date(candidate);
    if (Number.isNaN(d.getTime())) continue;
    if (compareZonedParts(getZonedParts(d, tz), ymd, hour, minute) === 0) {
      return d;
    }
  }

  return new Date(rough);
}

export function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

export function safeToIso(date: Date): string {
  if (!isValidDate(date)) throw new RangeError("Invalid time value");
  return date.toISOString();
}

export function getWeekRangeUtc(anchor: Date, timeZone: string): { start: string; end: string } {
  const days = getWeekDays(anchor, timeZone);
  const start = safeToIso(zonedDateTimeToUtc(days[0], 0, 0, timeZone));
  const last = days[6];
  const end = safeToIso(zonedDateTimeToUtc(addDaysYmd(last, 1), 0, 0, timeZone));
  return { start, end };
}

export function getDayRangeUtc(ymd: Ymd, timeZone: string): { start: string; end: string } {
  const start = safeToIso(zonedDateTimeToUtc(ymd, 0, 0, timeZone));
  const end = safeToIso(zonedDateTimeToUtc(addDaysYmd(ymd, 1), 0, 0, timeZone));
  return { start, end };
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
  if (!startIso || !endIso) return "";
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (!isValidDate(start) || !isValidDate(end)) return "";
  const tz = normalizeTimeZone(timeZone);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export function formatTime(iso: string, timeZone: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!isValidDate(date)) return "";
  const tz = normalizeTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
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
  startMin: number;
  endMin: number;
  columnIndex: number;
  columnCount: number;
};

type TimeRange = { startMin: number; endMin: number };

function segmentsOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

function layoutSegmentColumns<T extends TimeRange>(
  segments: T[]
): (T & { columnIndex: number; columnCount: number })[] {
  if (segments.length === 0) return [];

  const result = segments.map((seg) => ({ ...seg, columnIndex: 0, columnCount: 1 }));
  const visited = new Set<number>();

  for (let i = 0; i < segments.length; i++) {
    if (visited.has(i)) continue;

    const cluster: number[] = [];
    const queue = [i];
    visited.add(i);

    while (queue.length > 0) {
      const idx = queue.pop()!;
      cluster.push(idx);
      for (let j = 0; j < segments.length; j++) {
        if (visited.has(j)) continue;
        if (segmentsOverlap(segments[idx], segments[j])) {
          visited.add(j);
          queue.push(j);
        }
      }
    }

    if (cluster.length === 1) continue;

    const sorted = [...cluster].sort(
      (a, b) => segments[a].startMin - segments[b].startMin || segments[a].endMin - segments[b].endMin
    );
    const columnEnds: number[] = [];
    const assignments = new Map<number, number>();

    for (const idx of sorted) {
      const seg = segments[idx];
      let col = 0;
      while (col < columnEnds.length && columnEnds[col] > seg.startMin) {
        col++;
      }
      if (col === columnEnds.length) {
        columnEnds.push(seg.endMin);
      } else {
        columnEnds[col] = Math.max(columnEnds[col], seg.endMin);
      }
      assignments.set(idx, col);
    }

    const columnCount = columnEnds.length;
    for (const idx of cluster) {
      result[idx].columnIndex = assignments.get(idx) ?? 0;
      result[idx].columnCount = columnCount;
    }
  }

  return result;
}

function minutesSinceMidnight(date: Date, timeZone: string): number {
  const tz = normalizeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  let hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  if (hour === 24) hour = 0;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function buildWeekScheduleSegments(
  schedules: CalendarSchedule[],
  weekDays: Ymd[],
  timeZone: string
): ScheduleSegment[] {
  const raw: Omit<ScheduleSegment, "columnIndex" | "columnCount">[] = [];
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
      raw.push({ schedule, dayIndex, topPx, heightPx, startMin, endMin });
    }
  }

  const byDay = new Map<number, typeof raw>();
  for (const seg of raw) {
    const list = byDay.get(seg.dayIndex) ?? [];
    list.push(seg);
    byDay.set(seg.dayIndex, list);
  }

  const segments: ScheduleSegment[] = [];
  for (const daySegs of byDay.values()) {
    segments.push(...layoutSegmentColumns(daySegs));
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

export function addHoursToIso(startIso: string, hours: number): string {
  if (!startIso) return "";
  const start = new Date(startIso);
  if (!isValidDate(start)) return "";
  return safeToIso(new Date(start.getTime() + hours * 60 * 60 * 1000));
}

export function defaultEndIso(startIso: string, _type: CalendarScheduleType): string {
  return addHoursToIso(startIso, 1);
}

export function enforceEventEnd(startIso: string): string {
  return addHoursToIso(startIso, 1);
}

export function toDatetimeLocalValue(iso: string, timeZone: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!isValidDate(date)) return "";
  const p = getZonedParts(date, timeZone);
  const y = String(p.year);
  const m = String(p.month).padStart(2, "0");
  const d = String(p.day).padStart(2, "0");
  const h = String(p.hour).padStart(2, "0");
  const min = String(p.minute).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function datetimeLocalInTimezoneToUtc(value: string, timeZone: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) throw new Error("Invalid datetime");
  const ymd: Ymd = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return safeToIso(zonedDateTimeToUtc(ymd, Number(m[4]), Number(m[5]), timeZone));
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
  startMin: number;
  endMin: number;
  columnIndex: number;
  columnCount: number;
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
  const raw: Omit<AdminDaySegment, "columnIndex" | "columnCount">[] = [];

  for (const schedule of schedules) {
    const start = new Date(schedule.startsAt);
    const end = new Date(schedule.endsAt);
    if (end <= dayStart || start >= dayEnd) continue;
    const segStart = start < dayStart ? dayStart : start;
    const segEnd = end > dayEnd ? dayEnd : end;
    const startMin = minutesSinceMidnight(segStart, timeZone);
    const endMin = minutesSinceMidnight(segEnd, timeZone);
    const memberIndex = indexByUser.get(schedule.userId) ?? 0;
    raw.push({
      schedule,
      memberIndex,
      topPx: (startMin / 60) * HOUR_HEIGHT,
      heightPx: Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 4),
      startMin,
      endMin,
      colorClass: memberColorClass(schedule.userId, memberIndex),
    });
  }

  const byMember = new Map<number, typeof raw>();
  for (const seg of raw) {
    const list = byMember.get(seg.memberIndex) ?? [];
    list.push(seg);
    byMember.set(seg.memberIndex, list);
  }

  const segments: AdminDaySegment[] = [];
  for (const memberSegs of byMember.values()) {
    segments.push(...layoutSegmentColumns(memberSegs));
  }
  return segments;
}
