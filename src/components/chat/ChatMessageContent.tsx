"use client";

import { useState } from "react";
import { AttachmentContextMenu } from "@/components/chat/AttachmentContextMenu";
import { ChatAttachmentPreviewModal } from "@/components/chat/ChatAttachmentPreviewModal";
import { downloadChatAttachment, type AttachmentLike } from "@/lib/chat-attachment-actions";
import {
  isAudioMime,
  isImageMime,
  isPdfMime,
  isPreviewableMime,
  isVideoMime,
} from "@/lib/chat-attachment-utils";
import { resolveChatAttachmentUrl } from "@/lib/chat-attachment-url";
import { splitMessageContent } from "@/lib/chat-format";
import { buildMentionHandleSet, MENTION_HIGHLIGHT_CLASS, MENTION_HIGHLIGHT_MINE_CLASS, splitMentionContent, type MentionMember } from "@/lib/chat-mentions";
import { closeAllChatContextMenus } from "@/lib/chat-context-menu";
import type { ChatMessage } from "@/lib/types";

export function ChatMessageContent({
  message,
  mine,
  pending = false,
  mentionMembers = [],
}: {
  message: ChatMessage;
  mine: boolean;
  pending?: boolean;
  mentionMembers?: MentionMember[];
}) {
  const attachments = message.attachments || [];
  const mentionHandles = buildMentionHandleSet(mentionMembers);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentLike | null>(null);
  const [attachmentMenu, setAttachmentMenu] = useState<{
    x: number;
    y: number;
    attachment: AttachmentLike;
  } | null>(null);

  function openPreview(att: AttachmentLike) {
    setPreviewAttachment(att);
  }

  function handleAttachmentClick(att: AttachmentLike) {
    if (isPreviewableMime(att.mimeType)) {
      openPreview(att);
    } else {
      void downloadChatAttachment(att.fileUrl, att.fileName);
    }
  }

  return (
    <div className="space-y-2 min-w-0 max-w-full overflow-hidden">
      {message.replyTo && (
        <div
          className={`text-xs rounded-lg px-2 py-1 border-l-2 min-w-0 ${
            mine ? "border-white/60 bg-white/10" : "border-brand-400 bg-slate-50"
          }`}
        >
          <div className="font-semibold opacity-80">{message.replyTo.senderName}</div>
          {message.replyTo.content ? (
            <div className="opacity-70 break-words whitespace-pre-wrap">{message.replyTo.content}</div>
          ) : null}
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
              <span key={i}>
                {splitMentionContent(seg.value, mentionHandles).map((part, j) =>
                  part.type === "mention" ? (
                    <span
                      key={j}
                      className={mine ? MENTION_HIGHLIGHT_MINE_CLASS : MENTION_HIGHLIGHT_CLASS}
                    >
                      {part.value}
                    </span>
                  ) : (
                    <span key={j}>{part.value}</span>
                  )
                )}
              </span>
            )
          )}
        </div>
      ) : null}

      {attachments.map((att) => (
        <AttachmentPreview
          key={att._id}
          attachment={att}
          mine={mine}
          pending={pending}
          onClick={() => handleAttachmentClick(att)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeAllChatContextMenus();
            setAttachmentMenu({ x: e.clientX, y: e.clientY, attachment: att });
          }}
        />
      ))}

      {message.editedAt && (
        <span className="text-[10px] opacity-60 italic">edited</span>
      )}

      {previewAttachment && (
        <ChatAttachmentPreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {attachmentMenu && (
        <AttachmentContextMenu
          x={attachmentMenu.x}
          y={attachmentMenu.y}
          attachment={attachmentMenu.attachment}
          onClose={() => setAttachmentMenu(null)}
          onPreview={
            isPreviewableMime(attachmentMenu.attachment.mimeType)
              ? () => openPreview(attachmentMenu.attachment)
              : undefined
          }
          onDownload={() =>
            void downloadChatAttachment(
              attachmentMenu.attachment.fileUrl,
              attachmentMenu.attachment.fileName
            )
          }
        />
      )}
    </div>
  );
}

function AttachmentPreview({
  attachment,
  mine,
  pending = false,
  onClick,
  onContextMenu,
}: {
  attachment: NonNullable<ChatMessage["attachments"]>[number];
  mine: boolean;
  pending?: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const fileUrl = resolveChatAttachmentUrl(attachment.fileUrl);
  const { fileName, mimeType } = attachment;
  const previewable = isPreviewableMime(mimeType);

  if (pending && isImageMime(mimeType)) {
    return (
      <div className="max-w-[140px]">
        <button
          type="button"
          onClick={onClick}
          onContextMenu={onContextMenu}
          className="block cursor-pointer rounded-lg overflow-hidden focus:outline-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-48 rounded-lg object-contain border border-white/20"
          />
        </button>
        <p className={`text-[10px] truncate mt-1 ${mine ? "text-white/80" : "text-slate-500"}`}>
          {fileName}
        </p>
      </div>
    );
  }

  if (pending && !isImageMime(mimeType)) {
    return (
      <div
        className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border max-w-full ${
          mine ? "border-white/30 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-700"
        }`}
        onContextMenu={onContextMenu}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="truncate max-w-[180px]">{fileName}</span>
      </div>
    );
  }

  if (isImageMime(mimeType)) {
    return (
      <button
        type="button"
        onClick={onClick}
        onContextMenu={onContextMenu}
        className="block cursor-pointer rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-400"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-full max-h-48 rounded-lg object-contain hover:opacity-95 transition"
        />
      </button>
    );
  }

  if (isVideoMime(mimeType)) {
    return (
      <button
        type="button"
        onClick={onClick}
        onContextMenu={onContextMenu}
        className="block relative cursor-pointer rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-400 group"
      >
        <video
          src={fileUrl}
          className="max-w-full max-h-48 rounded-lg pointer-events-none"
          preload="metadata"
          muted
        >
          <track kind="captions" />
        </video>
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
          <span className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white text-lg">
            ▶
          </span>
        </span>
      </button>
    );
  }

  if (isPdfMime(mimeType)) {
    return (
      <button
        type="button"
        onClick={onClick}
        onContextMenu={onContextMenu}
        className={`block w-full max-w-xs cursor-pointer rounded-lg overflow-hidden border text-left focus:outline-none focus:ring-2 focus:ring-brand-400 ${
          mine ? "border-white/30" : "border-slate-200"
        }`}
      >
        <iframe
          src={`${fileUrl}#page=1&view=FitH&toolbar=0&navpanes=0`}
          title={fileName}
          className="w-full h-44 pointer-events-none bg-white"
        />
        <div
          className={`px-2 py-1.5 text-[11px] truncate ${
            mine ? "bg-white/10 text-white/90" : "bg-slate-50 text-slate-600"
          }`}
        >
          {fileName}
        </div>
      </button>
    );
  }

  if (isAudioMime(mimeType)) {
    return (
      <div onContextMenu={onContextMenu}>
        <audio src={fileUrl} controls className="w-full max-w-xs" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-400 ${
        mine ? "border-white/30 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
      title={previewable ? "Preview" : "Download"}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="truncate max-w-[180px]">{fileName}</span>
      {!previewable && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60 shrink-0" aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
    </button>
  );
}
