"use client";

import { useMemo } from "react";
import { Avatar } from "@/components/Avatar";
import { ChatMessageContent } from "@/components/chat/ChatMessageContent";
import { DeliveryStatusIcon } from "@/components/chat/DeliveryStatusIcon";
import { formatMessageTime } from "@/lib/chat-format";
import type { ChatMessage } from "@/lib/types";

export function ChatMessageBubble({
  message,
  mine,
  showSender,
  peerReadAt,
  connected,
  avatarUrl,
  editing,
  editDraft,
  onEditDraftChange,
  onSaveEdit,
  onCancelEdit,
  onContextMenu,
  onReaction,
  currentUserId,
}: {
  message: ChatMessage;
  mine: boolean;
  showSender: boolean;
  peerReadAt?: string | null;
  connected: boolean;
  avatarUrl?: string | null;
  editing?: boolean;
  editDraft?: string;
  onEditDraftChange?: (value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onContextMenu: (e: React.MouseEvent, message: ChatMessage) => void;
  onReaction?: (emoji: string) => void;
  currentUserId: string;
}) {
  const groupedReactions = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of message.reactions || []) {
      const g = map.get(r.emoji) || { count: 0, mine: false };
      g.count += 1;
      if (r.userId === currentUserId) g.mine = true;
      map.set(r.emoji, g);
    }
    return map;
  }, [message.reactions, currentUserId]);

  return (
    <div
      className={`flex items-end gap-2 min-w-0 ${mine ? "flex-row-reverse" : "flex-row"}`}
      onContextMenu={(e) => {
        if (editing) return;
        e.preventDefault();
        onContextMenu(e, message);
      }}
    >
      <span className="shrink-0 mb-1">
        <Avatar name={message.sender.name} src={avatarUrl} size={32} />
      </span>

      <div className={`min-w-0 max-w-[78%] w-full ${mine ? "items-end" : "items-start"} flex flex-col`}>
        {showSender && !mine && (
          <div className="text-xs font-semibold mb-0.5 text-brand-600 px-1">{message.sender.name}</div>
        )}

        <div
          className={`rounded-2xl px-3.5 py-2 shadow-sm min-w-0 max-w-full overflow-hidden ${
            mine ? "bg-brand-500 text-white rounded-br-md" : "bg-white text-slate-800 rounded-bl-md"
          }`}
        >
          {editing ? (
            <div className="space-y-2 min-w-0">
              <textarea
                value={editDraft ?? ""}
                onChange={(e) => onEditDraftChange?.(e.target.value)}
                rows={2}
                className={`w-full min-w-0 max-w-full text-sm rounded-lg px-2 py-1.5 focus:outline-none resize-none break-words ${
                  mine
                    ? "bg-white/95 text-slate-900 border border-white/40 placeholder:text-slate-400"
                    : "bg-slate-50 text-slate-900 border border-slate-300"
                }`}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className={`text-xs cursor-pointer ${
                    mine ? "text-white/80 hover:text-white" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveEdit}
                  className={`text-xs font-medium cursor-pointer ${
                    mine ? "text-white hover:text-white/90" : "text-brand-600 hover:text-brand-700"
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <ChatMessageContent message={message} mine={mine} />
              <div
                className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                  mine ? "text-brand-100" : "text-slate-400"
                }`}
              >
                <span>{formatMessageTime(message.createdAt)}</span>
                {mine && (
                  <DeliveryStatusIcon message={message} peerReadAt={peerReadAt} connected={connected} />
                )}
              </div>
            </>
          )}
        </div>

        {!editing && (message.reactions?.length || 0) > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
            {[...groupedReactions.entries()].map(([emoji, g]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReaction?.(emoji)}
                className={`text-xs px-1.5 py-0.5 rounded-full border cursor-pointer ${
                  g.mine ? "bg-brand-100 border-brand-300" : "bg-white border-slate-200"
                }`}
              >
                {emoji} {g.count}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
