const UNITS: { limit: number; divisor: number; name: Intl.RelativeTimeFormatUnit }[] = [
  { limit: 60, divisor: 1, name: "second" },
  { limit: 3600, divisor: 60, name: "minute" },
  { limit: 86400, divisor: 3600, name: "hour" },
  { limit: 604800, divisor: 86400, name: "day" },
  { limit: 2629800, divisor: 604800, name: "week" },
  { limit: 31557600, divisor: 2629800, name: "month" },
  { limit: Infinity, divisor: 31557600, name: "year" },
];

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((now - then) / 1000));
  if (secs < 10) return "just now";

  for (const u of UNITS) {
    if (secs < u.limit) {
      const value = Math.floor(secs / u.divisor);
      return rtf.format(-value, u.name);
    }
  }
  return rtf.format(0, "second");
}
