/** Client-safe MIME helpers — keep separate from server-only chat-storage. */

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export function isVideoMime(mime: string): boolean {
  return mime.startsWith("video/");
}

export function isAudioMime(mime: string): boolean {
  return mime.startsWith("audio/");
}

export function isPdfMime(mime: string): boolean {
  return mime === "application/pdf" || mime.endsWith("/pdf");
}

/** Opens in full preview modal (image, video, PDF). */
export function isPreviewableMime(mime: string): boolean {
  return isImageMime(mime) || isVideoMime(mime) || isPdfMime(mime);
}

/** Shown inline in chat with visual preview (includes PDF first page). */
export function isInlinePreviewMime(mime: string): boolean {
  return isPreviewableMime(mime);
}

export function attachmentKindLabel(mime: string): string {
  if (isImageMime(mime)) return "Image";
  if (isVideoMime(mime)) return "Video";
  if (isPdfMime(mime)) return "PDF";
  if (isAudioMime(mime)) return "Audio";
  return "File";
}
