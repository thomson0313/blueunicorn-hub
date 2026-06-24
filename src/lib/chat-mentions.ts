export const MENTION_EVERYONE = "Everyone";

/** Shared @mention chip styles (input + received messages). */
export const MENTION_HIGHLIGHT_CLASS = "rounded-sm bg-sky-100 text-sky-700";
/** @mention chip on the sender's colored bubble. */
export const MENTION_HIGHLIGHT_MINE_CLASS = "rounded-sm bg-sky-200/80 text-white";

export type MentionMember = {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
};

export function mentionHandle(member: Pick<MentionMember, "name"> & { username?: string | null }): string {
  const u = member.username?.trim();
  if (u) return u.replace(/^@/, "");
  return member.name.replace(/\s+/g, "");
}

export function detectMentionQuery(
  text: string,
  cursorPos: number
): { start: number; query: string } | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/@([\w]*)$/);
  if (!match) return null;
  return { start: before.length - match[0].length, query: match[1] };
}

export type MentionOption =
  | { kind: "everyone" }
  | { kind: "member"; member: MentionMember };

export function buildMentionOptions(
  members: MentionMember[],
  query: string
): MentionOption[] {
  const q = query.toLowerCase();
  const options: MentionOption[] = [];

  if (!q || MENTION_EVERYONE.toLowerCase().startsWith(q)) {
    options.push({ kind: "everyone" });
  }

  for (const member of members) {
    const handle = mentionHandle(member);
    const name = member.name.toLowerCase();
    if (!q || handle.toLowerCase().startsWith(q) || name.includes(q)) {
      options.push({ kind: "member", member });
    }
  }

  return options;
}

export function optionLabel(option: MentionOption): string {
  if (option.kind === "everyone") return MENTION_EVERYONE;
  return mentionHandle(option.member);
}

export type MessageContentPart =
  | { type: "text"; value: string }
  | { type: "mention"; value: string };

/** Split plain text into segments, highlighting completed @mentions. */
export function splitMentionContent(
  content: string,
  handles: Set<string>
): MessageContentPart[] {
  const parts: MessageContentPart[] = [];
  const re = /@(Everyone|[\w]+)/g;
  let last = 0;

  for (const match of content.matchAll(re)) {
    const idx = match.index ?? 0;
    const handle = match[1];
    const isComplete =
      handles.has(handle) &&
      (idx + match[0].length === content.length ||
        /[\s,.!?;:]/.test(content[idx + match[0].length] ?? ""));

    if (!isComplete) continue;

    if (idx > last) parts.push({ type: "text", value: content.slice(last, idx) });
    parts.push({ type: "mention", value: match[0] });
    last = idx + match[0].length;
  }

  if (last < content.length) parts.push({ type: "text", value: content.slice(last) });
  return parts.length ? parts : [{ type: "text", value: content }];
}

export function buildMentionHandleSet(members: MentionMember[]): Set<string> {
  const set = new Set<string>([MENTION_EVERYONE]);
  for (const m of members) set.add(mentionHandle(m));
  return set;
}

/** Highlight only valid @mentions in rendered messages. */
export function splitDisplayMentions(
  content: string,
  handles: Set<string>
): MessageContentPart[] {
  return splitMentionContent(content, handles);
}
