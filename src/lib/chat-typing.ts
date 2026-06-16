/** Format multiple typing users for the chat header. */
export function formatTypingLabel(names: string[]): string | null {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length === 0) return null;
  if (unique.length === 1) return `${unique[0]} is typing…`;
  if (unique.length === 2) return `${unique[0]} and ${unique[1]} are typing…`;
  return `${unique[0]} and ${unique.length - 1} others are typing…`;
}
