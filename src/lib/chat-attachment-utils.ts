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
