/** Parsed chat destination — general, DM, or custom channel. */
export type ParsedChatTarget =
  | { kind: "general" }
  | { kind: "dm"; userId: string }
  | { kind: "channel"; channelId: string };

const CHANNEL_PREFIX = "channel:";

export function parseChatTarget(raw: string): ParsedChatTarget {
  if (raw === "general") return { kind: "general" };
  if (raw.startsWith(CHANNEL_PREFIX)) {
    return { kind: "channel", channelId: raw.slice(CHANNEL_PREFIX.length) };
  }
  return { kind: "dm", userId: raw };
}

export function formatChannelTarget(channelId: string): string {
  return `${CHANNEL_PREFIX}${channelId}`;
}

/** Stable key for unread badges and read cursors. */
export function conversationKey(raw: string): string {
  const t = parseChatTarget(raw);
  if (t.kind === "general") return "general";
  if (t.kind === "channel") return `channel:${t.channelId}`;
  return `dm:${[t.userId].join(":")}`; // caller should pass sorted dm key for reads
}

export function dmConversationKey(userA: string, userB: string): string {
  return `dm:${[userA, userB].sort().join(":")}`;
}

export function targetLabel(
  raw: string,
  users: { _id: string; name: string }[],
  channels: { _id: string; name: string }[]
): string {
  const t = parseChatTarget(raw);
  if (t.kind === "general") return "General";
  if (t.kind === "channel") {
    return channels.find((c) => c._id === t.channelId)?.name || "Channel";
  }
  return users.find((u) => u._id === t.userId)?.name || "Direct Message";
}
