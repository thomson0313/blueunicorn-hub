import { resolveChatAttachmentUrl } from "@/lib/chat-attachment-url";

export type UploadedAttachment = {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
};

export async function uploadChatAttachmentFile(file: File): Promise<UploadedAttachment> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/chat/attachments", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return {
    fileName: data.attachment.fileName,
    fileUrl: resolveChatAttachmentUrl(data.attachment.url),
    mimeType: data.attachment.mimeType,
    fileSize: data.attachment.fileSize,
  };
}
