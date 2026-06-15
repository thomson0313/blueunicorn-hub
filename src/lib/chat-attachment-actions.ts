"use client";

import { resolveChatAttachmentUrl } from "@/lib/chat-attachment-url";
import {
  isImageMime,
  isPdfMime,
  isVideoMime,
} from "@/lib/chat-attachment-utils";

export async function downloadChatAttachment(fileUrl: string, fileName: string) {
  const url = resolveChatAttachmentUrl(fileUrl);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export type AttachmentLike = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
};
