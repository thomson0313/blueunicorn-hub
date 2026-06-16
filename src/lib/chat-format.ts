/** Human-friendly message timestamp — Today shows time, Yesterday, weekday, or date. */
export function formatMessageTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfMsg.getTime()) / 86_400_000);

  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (diffDays === 0) return time;
  if (diffDays === 1) return `Yesterday ${time}`;
  if (diffDays > 1 && diffDays < 7) {
    const weekday = d.toLocaleDateString([], { weekday: "short" });
    return `${weekday} ${time}`;
  }
  const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
  const year =
    d.getFullYear() !== now.getFullYear()
      ? ` ${d.getFullYear()}`
      : "";
  return `${date}${year} ${time}`;
}

/** Long date for channel creation banners. */
export function formatChannelCreatedAt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Compact time for sidebar previews. */
export function formatPreviewTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfMsg.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)}\]'"])/gi;

export type MessageSegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

export function splitMessageContent(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let last = 0;
  for (const match of content.matchAll(URL_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) segments.push({ type: "text", value: content.slice(last, idx) });
    segments.push({ type: "link", value: match[0], href: match[0] });
    last = idx + match[0].length;
  }
  if (last < content.length) segments.push({ type: "text", value: content.slice(last) });
  return segments.length ? segments : [{ type: "text", value: content }];
}

export function truncatePreview(text: string, max = 48): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}
