"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp, useRealtimeMode } from "@/components/AppProvider";
import { ChatComposer, type OutgoingAttachment } from "@/components/chat/ChatComposer";
import { ChatConversationHeader } from "@/components/chat/ChatConversationHeader";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { ChatMessageContextMenu } from "@/components/chat/ChatMessageContextMenu";
import { dmConversationKey, parseChatTarget, targetLabel } from "@/lib/chat-target";
import type { ChatChannel, ChatMessage, PublicUser } from "@/lib/types";

export function ChatConversation({
  target,
  users,
  channels = [],
  showHeader = true,
  className = "",
  onTypingChange,
  openSearch,
}: {
  target: string;
  users: PublicUser[];
  channels?: ChatChannel[];
  showHeader?: boolean;
  className?: string;
  onTypingChange?: (name: string | null) => void;
  openSearch?: boolean;
}) {
  const { user, socket, setActiveConversation, clearUnread } = useApp();
  const realtimeMode = useRealtimeMode();
  const connected = realtimeMode === "polling" || !!socket?.connected;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingName, setTypingName] = useState<string | null>(null);
  const [peerReadAt, setPeerReadAt] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastMessageAtRef = useRef<string | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const parsed = parseChatTarget(target);

  const convKey =
    parsed.kind === "general"
      ? "general"
      : parsed.kind === "channel"
        ? `channel:${parsed.channelId}`
        : dmConversationKey(user.sub, parsed.userId);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/messages?target=${encodeURIComponent(target)}`);
    const data = await res.json();
    const list = (data.messages || []) as ChatMessage[];
    setMessages(list);
    lastMessageAtRef.current = list.length > 0 ? list[list.length - 1].createdAt : null;
    setLoading(false);
    if (list.length) {
      void fetch("/api/chat/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationKey: convKey, lastReadAt: list[list.length - 1].createdAt }),
      });
    }
  }, [target, convKey]);

  useEffect(() => {
    if (openSearch) setSearchOpen(true);
  }, [openSearch]);

  useEffect(() => {
    void loadHistory();
    setReplyTo(null);
    setEditId(null);
    setSelectMode(false);
    setSelectedIds(new Set());
    setSearchOpen(false);
    setTypingName(null);
  }, [loadHistory]);

  useEffect(() => {
    setActiveConversation(target);
    clearUnread(target);
    return () => setActiveConversation(null);
  }, [target, setActiveConversation, clearUnread]);

  const upsertMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m._id === msg._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...msg, pending: false };
        return next;
      }
      return [...prev, msg];
    });
    lastMessageAtRef.current = msg.createdAt;
  }, []);

  useEffect(() => {
    if (realtimeMode !== "socket" || !socket) return;

    const match = (msg: ChatMessage) => {
      if (parsed.kind === "general") return !msg.channelId && !msg.recipient;
      if (parsed.kind === "channel") return msg.channelId === parsed.channelId;
      const other = msg.sender._id === user.sub ? msg.recipient : msg.sender._id;
      return other === parsed.userId;
    };

    const onAny = (msg: ChatMessage) => {
      if (!match(msg)) return;
      upsertMessage(msg);
      if (msg.sender._id !== user.sub) {
        void fetch("/api/chat/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationKey: convKey, lastReadAt: msg.createdAt }),
        });
      }
    };

    const onUpdated = (msg: ChatMessage) => {
      if (match(msg)) upsertMessage(msg);
    };

    const onTyping = (payload: { target: string; userName: string; typing: boolean; userId: string }) => {
      if (payload.target !== target || payload.userId === user.sub) return;
      const name = payload.typing ? payload.userName : null;
      setTypingName(name);
      onTypingChange?.(name);
    };

    const onRead = (payload: { conversationKey: string; userId: string; lastReadAt?: string }) => {
      if (payload.conversationKey !== convKey) return;
      if (parsed.kind === "dm" && payload.userId === parsed.userId) {
        setPeerReadAt(payload.lastReadAt || new Date().toISOString());
      }
    };

    socket.on("general:message", onAny);
    socket.on("dm:message", onAny);
    socket.on("channel:message", onAny);
    socket.on("chat:message-updated", onUpdated);
    socket.on("chat:typing", onTyping);
    socket.on("chat:read", onRead);

    return () => {
      socket.off("general:message", onAny);
      socket.off("dm:message", onAny);
      socket.off("channel:message", onAny);
      socket.off("chat:message-updated", onUpdated);
      socket.off("chat:typing", onTyping);
      socket.off("chat:read", onRead);
    };
  }, [socket, target, user.sub, realtimeMode, parsed, convKey, upsertMessage, onTypingChange]);

  useEffect(() => {
    if (realtimeMode !== "polling") return;
    let cancelled = false;
    const poll = async () => {
      const since = lastMessageAtRef.current;
      if (!since) return;
      try {
        const res = await fetch(
          `/api/messages?target=${encodeURIComponent(target)}&since=${encodeURIComponent(since)}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        for (const msg of (data.messages || []) as ChatMessage[]) upsertMessage(msg);
      } catch {
        /* ignore */
      }
    };
    const timer = setInterval(poll, 3_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [target, realtimeMode, upsertMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const typingEmitRef = useRef<number | null>(null);

  function notifyTyping() {
    if (!socket) return;
    socket.emit("chat:typing", { target, typing: true });
    if (typingEmitRef.current) window.clearTimeout(typingEmitRef.current);
    typingEmitRef.current = window.setTimeout(() => {
      socket.emit("chat:typing", { target, typing: false });
    }, 2000);
  }

  async function sendMessage(payload: { content: string; attachments: OutgoingAttachment[] }) {
    const parentId = replyTo?._id;
    const tempId = `temp-${Date.now()}`;
    if (realtimeMode !== "socket" || !socket) {
      const optimistic: ChatMessage = {
        _id: tempId,
        sender: { _id: user.sub, name: user.name, role: user.role },
        recipient: parsed.kind === "dm" ? parsed.userId : undefined,
        channelId: parsed.kind === "channel" ? parsed.channelId : undefined,
        parentId,
        content: payload.content,
        createdAt: new Date().toISOString(),
        attachments: payload.attachments.map((a, i) => ({
          _id: `temp-att-${i}`,
          ...a,
        })),
        pending: true,
        replyTo: replyTo
          ? {
              _id: replyTo._id,
              content: replyTo.content,
              senderName: replyTo.sender.name,
              deleted: !!replyTo.deletedAt,
            }
          : null,
      };
      setMessages((prev) => [...prev, optimistic]);
    }
    setReplyTo(null);
    notifyTyping();

    const body: Record<string, unknown> = {
      content: payload.content,
      parentId,
      attachments: payload.attachments,
    };

    if (realtimeMode === "socket" && socket) {
      if (parsed.kind === "general") {
        socket.emit("general:send", body);
      } else if (parsed.kind === "dm") {
        socket.emit("dm:send", { ...body, to: parsed.userId });
      } else {
        socket.emit("channel:send", { ...body, channelId: parsed.channelId });
      }
      return;
    }

    if (parsed.kind === "general") body.channel = "general";
    else if (parsed.kind === "dm") {
      body.channel = "dm";
      body.to = parsed.userId;
    } else {
      body.channel = "channel";
      body.channelId = parsed.channelId;
    }

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      return;
    }
    setMessages((prev) => prev.map((m) => (m._id === tempId ? data.message : m)));
    lastMessageAtRef.current = data.message.createdAt;
  }

  async function reactToMessage(messageId: string, emoji: string) {
    const res = await fetch(`/api/messages/${messageId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    const data = await res.json();
    if (res.ok && data.message) upsertMessage(data.message);
  }

  async function deleteMessage(id: string) {
    const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok && data.message) upsertMessage(data.message);
  }

  async function saveEdit() {
    if (!editId || !editDraft.trim()) return;
    const res = await fetch(`/api/messages/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editDraft.trim() }),
    });
    const data = await res.json();
    if (res.ok && data.message) upsertMessage(data.message);
    setEditId(null);
    setEditDraft("");
  }

  const filtered = searchOpen && searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const label = targetLabel(
    target,
    users,
    channels.map((c) => ({ _id: c._id, name: c.name }))
  );

  return (
    <section className={`flex flex-col min-h-0 bg-white ${className}`}>
      {showHeader && (
        <ChatConversationHeader
          target={target}
          users={users}
          channels={channels}
          onlineUserIds={[]}
          connected={connected}
          typingName={typingName}
          onSearchInChat={() => setSearchOpen((o) => !o)}
          onDeleteChat={() => setMessages([])}
        />
      )}

      {searchOpen && (
        <div className="px-3 py-2 border-b border-slate-100">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in this chat…"
            className="w-full text-sm rounded-lg border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      )}

      {selectMode && selectedIds.size > 0 && (
        <div className="px-3 py-2 bg-brand-50 text-sm text-brand-800 border-b border-brand-100 flex justify-between">
          <span>{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={() => {
              const text = messages
                .filter((m) => selectedIds.has(m._id))
                .map((m) => m.content)
                .join("\n");
              void navigator.clipboard.writeText(text);
              setSelectMode(false);
              setSelectedIds(new Set());
            }}
            className="text-brand-700 font-medium cursor-pointer"
          >
            Copy selected
          </button>
        </div>
      )}

      {editId && (
        <div className="px-3 py-2 border-b border-slate-100 flex gap-2">
          <input
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            className="flex-1 text-sm rounded-lg border border-slate-300 px-3 py-1.5"
          />
          <button type="button" onClick={() => void saveEdit()} className="text-sm text-brand-600 cursor-pointer">
            Save
          </button>
          <button type="button" onClick={() => setEditId(null)} className="text-sm text-slate-500 cursor-pointer">
            Cancel
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2 tg-chat-bg min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-brand-100 border-t-brand-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No messages yet. Say hello.</p>
        ) : (
          filtered.map((m) => {
            const mine = m.sender._id === user.sub;
            return (
              <div key={m._id} className="group">
                <ChatMessageBubble
                  message={m}
                  mine={mine}
                  showSender={parsed.kind !== "dm"}
                  selected={selectedIds.has(m._id)}
                  selectMode={selectMode}
                  peerReadAt={peerReadAt}
                  connected={connected}
                  onContextMenu={(e, msg) => setMenu({ x: e.clientX, y: e.clientY, message: msg })}
                  onToggleSelect={() =>
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(m._id)) next.delete(m._id);
                      else next.add(m._id);
                      return next;
                    })
                  }
                  onReaction={(emoji) => void reactToMessage(m._id, emoji)}
                  currentUserId={user.sub}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <ChatComposer
        placeholder={`Message ${label}`}
        disabled={!connected || !!editId}
        replyTo={
          replyTo
            ? { senderName: replyTo.sender.name, content: replyTo.content || "Attachment" }
            : null
        }
        onCancelReply={() => setReplyTo(null)}
        onSend={sendMessage}
        onActivity={notifyTyping}
      />

      {menu && (
        <ChatMessageContextMenu
          x={menu.x}
          y={menu.y}
          message={menu.message}
          mine={menu.message.sender._id === user.sub}
          onClose={() => setMenu(null)}
          onReply={() => setReplyTo(menu.message)}
          onEdit={() => {
            setEditId(menu.message._id);
            setEditDraft(menu.message.content);
          }}
          onDelete={() => void deleteMessage(menu.message._id)}
          onCopy={() => void navigator.clipboard.writeText(menu.message.content)}
          onSelect={() => {
            setSelectMode(true);
            setSelectedIds(new Set([menu.message._id]));
          }}
          onReact={(emoji) => void reactToMessage(menu.message._id, emoji)}
        />
      )}
    </section>
  );
}
