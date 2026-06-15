"use client";

import { QUICK_REACTIONS } from "@/lib/chat-emoji";
import type { ChatMessage } from "@/lib/types";

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
  onSelect,
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
  onSelect: () => void;
  onReact: (emoji: string) => void;
}) {
  const items = [
    { label: "Reply", action: onReply },
    ...(mine && !message.deletedAt ? [{ label: "Edit", action: onEdit }] : []),
    ...(mine && !message.deletedAt ? [{ label: "Delete", action: onDelete }] : []),
    { label: "Copy", action: onCopy },
    { label: "Select", action: onSelect },
  ];

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className="fixed z-50 min-w-[160px] bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-sm"
        style={{ left: x, top: y }}
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
              onClose();
            }}
            className={`w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer ${
              item.label === "Delete" ? "text-red-600" : "text-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
