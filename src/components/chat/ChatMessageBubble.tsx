"use client";

import { useMemo } from "react";
import { ChatMessageContent } from "@/components/chat/ChatMessageContent";
import { DeliveryStatusIcon } from "@/components/chat/DeliveryStatusIcon";
import { formatMessageTime } from "@/lib/chat-format";
import { QUICK_REACTIONS } from "@/lib/chat-emoji";
import type { ChatMessage } from "@/lib/types";

export function ChatMessageBubble({
  message,
  mine,
  showSender,
  selected,
  selectMode,
  peerReadAt,
  connected,
  onContextMenu,
  onToggleSelect,
  onReaction,
  currentUserId,
}: {
  message: ChatMessage;
  mine: boolean;
  showSender: boolean;
  selected?: boolean;
  selectMode?: boolean;
  peerReadAt?: string | null;
  connected: boolean;
  currentUserId: string;
  onContextMenu: (e: React.MouseEvent, message: ChatMessage) => void;
  onToggleSelect?: () => void;
  onReaction?: (emoji: string) => void;
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
      className={`flex ${mine ? "justify-end" : "justify-start"} ${selected ? "ring-2 ring-brand-400 rounded-2xl" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, message);
      }}
      onClick={selectMode ? onToggleSelect : undefined}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm ${
          mine ? "bg-brand-500 text-white rounded-br-md" : "bg-white text-slate-800 rounded-bl-md"
        }`}
      >
        {showSender && !mine && (
          <div className="text-xs font-semibold mb-0.5 text-brand-600">{message.sender.name}</div>
        )}
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
        {(message.reactions?.length || 0) > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {[...groupedReactions.entries()].map(([emoji, g]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReaction?.(emoji)}
                className={`text-xs px-1.5 py-0.5 rounded-full border cursor-pointer ${
                  g.mine ? "bg-brand-400/30 border-brand-300" : "bg-black/5 border-transparent"
                }`}
              >
                {emoji} {g.count}
              </button>
            ))}
          </div>
        )}
        {onReaction && (
          <div className="flex gap-0.5 mt-1 opacity-0 group-hover:opacity-100">
            {QUICK_REACTIONS.slice(0, 4).map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReaction(emoji)}
                className="text-sm hover:scale-110 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
