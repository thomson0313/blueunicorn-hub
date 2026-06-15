export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"] as const;

export type EmojiCategory = {
  id: string;
  label: string;
  emojis: string[];
};

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩",
      "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫",
      "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😌", "😔",
      "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "🤯", "🤠",
      "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺",
      "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫",
    ],
  },
  {
    id: "gestures",
    label: "Gestures",
    emojis: [
      "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👋",
      "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "🤝", "🙏", "💪", "🦾", "🦿", "🦵", "🦶", "👂",
    ],
  },
  {
    id: "objects",
    label: "Objects",
    emojis: [
      "💼", "📁", "📂", "🗂️", "📅", "📆", "🗒️", "📝", "✏️", "📌", "📎", "🔗", "📧", "💻",
      "🖥️", "⌨️", "🖱️", "💾", "💿", "📱", "☎️", "📞", "🔋", "🔌", "💡", "🔦", "🕯️", "🧯",
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓",
      "💗", "💖", "💘", "💝", "⭐", "🌟", "✨", "⚡", "🔥", "💥", "✅", "❌", "❓", "❗",
    ],
  },
];

/** Common :shortcode: → emoji for inline autocomplete. */
export const EMOJI_SHORTCODES: Record<string, string> = {
  smile: "😄",
  grin: "😁",
  joy: "😂",
  rofl: "🤣",
  wink: "😉",
  blush: "😊",
  heart: "❤️",
  fire: "🔥",
  thumbsup: "👍",
  thumbsdown: "👎",
  clap: "👏",
  pray: "🙏",
  ok: "👌",
  wave: "👋",
  thinking: "🤔",
  cry: "😢",
  sob: "😭",
  angry: "😠",
  rage: "😡",
  star: "⭐",
  check: "✅",
  x: "❌",
  question: "❓",
  exclamation: "❗",
  party: "🎉",
  rocket: "🚀",
  eyes: "👀",
  muscle: "💪",
  hundred: "💯",
};

export function filterShortcodes(query: string): { code: string; emoji: string }[] {
  const q = query.toLowerCase();
  return Object.entries(EMOJI_SHORTCODES)
    .filter(([code]) => code.startsWith(q))
    .slice(0, 8)
    .map(([code, emoji]) => ({ code, emoji }));
}

export function filterEmojis(query: string, categoryId?: string): string[] {
  const q = query.trim().toLowerCase();
  const pool = categoryId
    ? EMOJI_CATEGORIES.find((c) => c.id === categoryId)?.emojis ?? []
    : EMOJI_CATEGORIES.flatMap((c) => c.emojis);
  if (!q) return pool;
  // Native emoji search is limited — match shortcodes that map to emojis in pool.
  const fromCodes = Object.entries(EMOJI_SHORTCODES)
    .filter(([code]) => code.includes(q))
    .map(([, e]) => e)
    .filter((e) => pool.includes(e));
  return [...new Set(fromCodes)].slice(0, 24);
}

const RECENT_KEY = "chat-recent-emojis";

export function getRecentEmojis(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function pushRecentEmoji(emoji: string): void {
  if (typeof window === "undefined") return;
  const prev = getRecentEmojis().filter((e) => e !== emoji);
  localStorage.setItem(RECENT_KEY, JSON.stringify([emoji, ...prev].slice(0, 24)));
}
