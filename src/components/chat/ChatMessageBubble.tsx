"use client";

import { useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { Avatar } from "@/components/Avatar";
import { ChatMessageContent } from "@/components/chat/ChatMessageContent";
import { DeliveryStatusIcon } from "@/components/chat/DeliveryStatusIcon";
import { isImageMime } from "@/lib/chat-attachment-utils";
import { resolveChatAttachmentUrl } from "@/lib/chat-attachment-url";
import { formatMessageTime } from "@/lib/chat-format";
import type { MentionMember } from "@/lib/chat-mentions";
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
  mentionMembers = [],
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
  mentionMembers?: MentionMember[];
}) {
  const editRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const bubbleWidthRef = useRef(0);
  const attachments = message.attachments || [];

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

  useLayoutEffect(() => {
    if (!editing && bubbleRef.current) {
      bubbleWidthRef.current = bubbleRef.current.offsetWidth;
    }
  });

  useEffect(() => {
    if (!editing) return;
    const ta = editRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 480)}px`;
  }, [editDraft, editing]);

  const bubbleStyle =
    editing && bubbleWidthRef.current > 0
      ? { minWidth: bubbleWidthRef.current }
      : undefined;

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

      <div className={`min-w-0 w-fit max-w-[78%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
        {showSender && !mine && (
          <div className="text-xs font-semibold mb-0.5 text-brand-600 px-1">{message.sender.name}</div>
        )}

        <div
          ref={bubbleRef}
          style={bubbleStyle}
          className={`rounded-2xl px-3.5 py-2 shadow-sm min-w-0 max-w-full ${
            mine ? "bg-brand-500 text-white rounded-br-md" : "bg-white text-slate-800 rounded-bl-md"
          }`}
        >
          {editing ? (
            <div className="space-y-2 min-w-0">
              <textarea
                ref={editRef}
                value={editDraft ?? ""}
                onChange={(e) => onEditDraftChange?.(e.target.value)}
                rows={1}
                className={`block w-full min-w-0 text-sm leading-relaxed whitespace-pre-wrap resize-none focus:outline-none bg-transparent overflow-hidden ${
                  mine
                    ? "text-white placeholder:text-white/50 caret-white"
                    : "text-slate-800 placeholder:text-slate-400"
                }`}
                autoFocus
              />
              {attachments.length > 0 && (
                <div className={`space-y-1.5 pt-1 border-t ${mine ? "border-white/20" : "border-slate-200"}`}>
                  {attachments.map((att) => (
                    <div key={att._id} className="flex items-center gap-2 min-w-0 opacity-90">
                      {isImageMime(att.mimeType) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={resolveChatAttachmentUrl(att.fileUrl)}
                          alt={att.fileName}
                          className="h-10 w-10 rounded object-cover shrink-0"
                        />
                      ) : (
                        <span className="h-10 w-10 rounded bg-black/10 flex items-center justify-center shrink-0 text-xs">
                          📎
                        </span>
                      )}
                      <span className="text-xs truncate">{att.fileName}</span>
                    </div>
                  ))}
                </div>
              )}
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
              <ChatMessageContent message={message} mine={mine} pending={message.pending} mentionMembers={mentionMembers} />
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
