"use client";

import { isAudioMime, isImageMime, isVideoMime } from "@/lib/chat-storage";
import { splitMessageContent } from "@/lib/chat-format";
import type { ChatMessage } from "@/lib/types";

export function ChatMessageContent({
  message,
  mine,
}: {
  message: ChatMessage;
  mine: boolean;
}) {
  if (message.deletedAt) {
    return <p className="text-sm italic opacity-70">Message deleted</p>;
  }

  return (
    <div className="space-y-2">
      {message.replyTo && (
        <div
          className={`text-xs rounded-lg px-2 py-1 border-l-2 ${
            mine ? "border-white/60 bg-white/10" : "border-brand-400 bg-slate-50"
          }`}
        >
          <div className="font-semibold opacity-80">{message.replyTo.senderName}</div>
          <div className="opacity-70 truncate">
            {message.replyTo.deleted ? "Message deleted" : message.replyTo.content || "Attachment"}
          </div>
        </div>
      )}

      {message.content ? (
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {splitMessageContent(message.content).map((seg, i) =>
            seg.type === "link" ? (
              <a
                key={i}
                href={seg.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline ${mine ? "text-white" : "text-brand-600"}`}
              >
                {seg.value}
              </a>
            ) : (
              <span key={i}>{seg.value}</span>
            )
          )}
        </div>
      ) : null}

      {message.attachments?.map((att) => (
        <AttachmentPreview key={att._id} attachment={att} mine={mine} />
      ))}

      {message.editedAt && (
        <span className="text-[10px] opacity-60 italic">edited</span>
      )}
    </div>
  );
}

function AttachmentPreview({
  attachment,
  mine,
}: {
  attachment: NonNullable<ChatMessage["attachments"]>[number];
  mine: boolean;
}) {
  const { fileUrl, fileName, mimeType } = attachment;

  if (isImageMime(mimeType)) {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-full max-h-48 rounded-lg object-contain"
        />
      </a>
    );
  }

  if (isVideoMime(mimeType)) {
    return (
      <video src={fileUrl} controls className="max-w-full max-h-48 rounded-lg" preload="metadata">
        <track kind="captions" />
      </video>
    );
  }

  if (isAudioMime(mimeType)) {
    return <audio src={fileUrl} controls className="w-full max-w-xs" />;
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={fileName}
      className={`inline-flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg border ${
        mine ? "border-white/30 bg-white/10" : "border-slate-200 bg-slate-50"
      }`}
    >
      <span>📄</span>
      <span className="truncate max-w-[180px]">{fileName}</span>
    </a>
  );
}
