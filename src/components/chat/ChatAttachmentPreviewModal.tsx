"use client";

import { createPortal } from "react-dom";
import { resolveChatAttachmentUrl } from "@/lib/chat-attachment-url";
import { downloadChatAttachment, type AttachmentLike } from "@/lib/chat-attachment-actions";
import { isImageMime, isPdfMime, isVideoMime } from "@/lib/chat-attachment-utils";

export function ChatAttachmentPreviewModal({
  attachment,
  onClose,
}: {
  attachment: AttachmentLike;
  onClose: () => void;
}) {
  const fileUrl = resolveChatAttachmentUrl(attachment.fileUrl);
  const { fileName, mimeType } = attachment;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-900 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-800 shrink-0">
          <p className="text-sm text-white truncate font-medium">{fileName}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void downloadChatAttachment(attachment.fileUrl, fileName)}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer"
            >
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer text-xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-auto">
          {isImageMime(mimeType) && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-[calc(90vh-4rem)] object-contain rounded-lg"
            />
          )}
          {isVideoMime(mimeType) && (
            <video
              src={fileUrl}
              controls
              autoPlay
              className="max-w-full max-h-[calc(90vh-4rem)] rounded-lg"
            >
              <track kind="captions" />
            </video>
          )}
          {isPdfMime(mimeType) && (
            <iframe
              src={`${fileUrl}#page=1&view=FitH`}
              title={fileName}
              className="w-full h-[calc(90vh-5rem)] min-h-[420px] rounded-lg bg-white"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
