/** Normalize stored attachment URLs so they work on VPS (via API route). */
export function resolveChatAttachmentUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("blob:")) return url;
  if (url.startsWith("/uploads/chat/")) {
    const name = url.slice("/uploads/chat/".length);
    return `/api/chat/files/${encodeURIComponent(name)}`;
  }
  return url;
}
