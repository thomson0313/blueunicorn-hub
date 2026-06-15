"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { anchoredPosition } from "@/lib/anchored-position";
import { isImageMime } from "@/lib/chat-attachment-utils";
import { QUICK_REACTIONS } from "@/lib/chat-emoji";
import type { ChatMessage } from "@/lib/types";

const MENU_WIDTH = 220;
const MENU_HEIGHT = 280;

export function ChatMessageContextMenu({
  x,
  y,
  message,
  mine,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onCopy,
  onCopyImage,
  onReact,
}: {
  x: number;
  y: number;
  message: ChatMessage;
  mine: boolean;
  onClose: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onCopyImage?: () => void;
  onReact: (emoji: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  const hasAttachments = (message.attachments?.length ?? 0) > 0;
  const hasText = !!message.content?.trim();
  const hasImage = message.attachments?.some((a) => isImageMime(a.mimeType));

  useLayoutEffect(() => {
    const el = ref.current;
    const w = el?.offsetWidth || MENU_WIDTH;
    const h = el?.offsetHeight || MENU_HEIGHT;
    setPos(anchoredPosition(x, y, w, h));
  }, [x, y]);

  const items = [
    { label: "Reply", action: onReply },
    ...(mine && hasText && !hasAttachments ? [{ label: "Edit", action: onEdit }] : []),
    ...(mine ? [{ label: "Delete", action: onDelete }] : []),
    ...(hasText && !hasAttachments ? [{ label: "Copy", action: onCopy }] : []),
    ...(hasImage && onCopyImage ? [{ label: "Copy image", action: onCopyImage }] : []),
  ];

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[200] cursor-default"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        ref={ref}
        className="fixed z-[201] min-w-[160px] bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-sm"
        style={{ left: pos.left, top: pos.top }}
      >
        <div className="px-2 py-1.5 flex gap-1 border-b border-slate-100 mb-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReact(emoji);
                onClose();
              }}
              className="w-8 h-8 rounded hover:bg-slate-100 text-base cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              item.action();
              if (item.label !== "Delete") onClose();
            }}
            className={`w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer ${
              item.label === "Delete" ? "text-red-600" : "text-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>,
    document.body
  );
}
