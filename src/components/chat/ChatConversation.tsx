"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp, useRealtimeMode } from "@/components/AppProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ChatComposer, type OutgoingAttachment } from "@/components/chat/ChatComposer";
import { ChatConversationHeader } from "@/components/chat/ChatConversationHeader";
import { ChannelCreatedBanner, type ChannelMeta } from "@/components/chat/ChannelCreatedBanner";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { ChatMessageContextMenu } from "@/components/chat/ChatMessageContextMenu";
import { dmConversationKey, parseChatTarget, targetLabel } from "@/lib/chat-target";
import { closeAllChatContextMenus } from "@/lib/chat-context-menu";
import {
  getConversationCache,
  patchCachedMessage,
  removeCachedMessage,
  setConversationCache,
} from "@/lib/chat-conversation-cache";
import { messageToPreviewTarget } from "@/lib/chat-preview-sync";
import { formatTypingLabel } from "@/lib/chat-typing";
import { resolveChatAttachmentUrl } from "@/lib/chat-attachment-url";
import { downloadChatAttachment } from "@/lib/chat-attachment-actions";
import type { ChatChannel, ChatMessage, PublicUser } from "@/lib/types";

export function ChatConversation({
  target,
  users,
  channels = [],
  showHeader = true,
  className = "",
  onTypingChange,
  searchOpen: searchOpenProp,
  onSearchOpenChange,
  onMessageDeleted,
  onChannelUpdated,
  onChannelDeleted,
  onHeaderStateChange,
}: {
  target: string;
  users: PublicUser[];
  channels?: ChatChannel[];
  showHeader?: boolean;
  className?: string;
  onTypingChange?: (label: string | null) => void;
  searchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
  onMessageDeleted?: () => void;
  onChannelUpdated?: () => void;
  onChannelDeleted?: () => void;
  onHeaderStateChange?: (state: {
    typingLabel: string | null;
    channelMembers: { name: string; avatarUrl?: string | null }[];
  }) => void;
}) {
  const { user, socket, socketConnected, avatarUrl, onlineUserIds, setActiveConversation, clearUnread, chatDrafts, setChatDraft } = useApp();
  const realtimeMode = useRealtimeMode();
  const connected = realtimeMode === "polling" || socketConnected;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [searchOpenLocal, setSearchOpenLocal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const [peerReadAt, setPeerReadAt] = useState<string | null>(null);
  const [channelMeta, setChannelMeta] = useState<ChannelMeta | null>(null);
  const [channelMembers, setChannelMembers] = useState<
    { name: string; avatarUrl?: string | null }[]
  >([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const searchOpen = searchOpenProp ?? searchOpenLocal;
  const setSearchOpen = onSearchOpenChange ?? setSearchOpenLocal;

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const typingUsersRef = useRef<Map<string, { name: string; timer: number }>>(new Map());
  const lastMessageAtRef = useRef<string | null>(null);
  const typingEmitRef = useRef<number | null>(null);
  const targetRef = useRef(target);
  const messagesRef = useRef(messages);
  const peerReadAtRef = useRef(peerReadAt);
  const channelMetaRef = useRef(channelMeta);
  const channelMembersRef = useRef(channelMembers);
  const parsed = parseChatTarget(target);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    peerReadAtRef.current = peerReadAt;
  }, [peerReadAt]);
  useEffect(() => {
    channelMetaRef.current = channelMeta;
  }, [channelMeta]);
  useEffect(() => {
    channelMembersRef.current = channelMembers;
  }, [channelMembers]);

  const convKey =
    parsed.kind === "general"
      ? "general"
      : parsed.kind === "channel"
        ? `channel:${parsed.channelId}`
        : dmConversationKey(user.sub, parsed.userId);

  const markRead = useCallback(
    (lastReadAt: string) => {
      void fetch("/api/chat/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationKey: convKey, lastReadAt }),
      });
      if (socket?.connected) {
        socket.emit("chat:read", { conversationKey: convKey, lastReadAt });
      }
    },
    [convKey, socket]
  );

  const loadHistory = useCallback(async () => {
    const cached = getConversationCache(target);
    if (cached) {
      setMessages(cached.messages);
      setPeerReadAt(cached.peerReadAt);
      setChannelMeta(cached.channelMeta);
      setChannelMembers(cached.channelMembers);
      lastMessageAtRef.current = cached.lastMessageAt;
      setLoading(false);
      if (cached.messages.length) markRead(cached.messages[cached.messages.length - 1].createdAt);
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/messages?target=${encodeURIComponent(target)}`);
    const data = await res.json();
    const list = (data.messages || []) as ChatMessage[];
    setMessages(list);
    if (data.peerReadAt) setPeerReadAt(data.peerReadAt);
    if (data.channelMeta) setChannelMeta(data.channelMeta as ChannelMeta);
    else setChannelMeta(null);
    if (data.channelMembers) {
      setChannelMembers(
        (data.channelMembers as { name: string; avatarUrl?: string | null }[]) || []
      );
    } else {
      setChannelMembers([]);
    }
    lastMessageAtRef.current = list.length > 0 ? list[list.length - 1].createdAt : null;
    setLoading(false);
    if (list.length) markRead(list[list.length - 1].createdAt);

    setConversationCache(target, {
      messages: list,
      peerReadAt: data.peerReadAt ?? null,
      channelMeta: (data.channelMeta as ChannelMeta) ?? null,
      channelMembers:
        (data.channelMembers as { name: string; avatarUrl?: string | null }[]) || [],
      lastMessageAt: lastMessageAtRef.current,
    });
  }, [target, markRead]);

  useEffect(() => {
    const prevTarget = targetRef.current;
    if (prevTarget !== target) {
      setConversationCache(prevTarget, {
        messages: messagesRef.current,
        peerReadAt: peerReadAtRef.current,
        channelMeta: channelMetaRef.current,
        channelMembers: channelMembersRef.current,
        lastMessageAt: lastMessageAtRef.current,
      });
      targetRef.current = target;
    }

    void loadHistory();
    setReplyTo(null);
    setEditId(null);
    setEditDraft("");
    setSearchQuery("");
    setMenu(null);
    typingUsersRef.current.forEach((v) => window.clearTimeout(v.timer));
    typingUsersRef.current.clear();
    setTypingLabel(null);
    onTypingChange?.(null);
    atBottomRef.current = true;
    setShowScrollDown(false);

    return () => {
      setConversationCache(target, {
        messages: messagesRef.current,
        peerReadAt: peerReadAtRef.current,
        channelMeta: channelMetaRef.current,
        channelMembers: channelMembersRef.current,
        lastMessageAt: lastMessageAtRef.current,
      });
    };
  }, [target, loadHistory, onTypingChange]);

  useEffect(() => {
    setActiveConversation(target);
    clearUnread(target);
    return () => setActiveConversation(null);
  }, [target, setActiveConversation, clearUnread]);

  useEffect(() => {
    onHeaderStateChange?.({ typingLabel, channelMembers });
  }, [typingLabel, channelMembers, onHeaderStateChange]);

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
    patchCachedMessage(targetRef.current, msg);
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m._id !== messageId));
    removeCachedMessage(targetRef.current, messageId);
    onMessageDeleted?.();
  }, [onMessageDeleted]);

  useEffect(() => {
    if (realtimeMode !== "socket" || !socket) return;

    const match = (msg: ChatMessage) => {
      if (parsed.kind === "general") return !msg.channelId && !msg.recipient;
      if (parsed.kind === "channel") return msg.channelId === parsed.channelId;
      const other = msg.sender._id === user.sub ? msg.recipient : msg.sender._id;
      return other === parsed.userId;
    };

    const matchMessageDelete = (payload: {
      messageId: string;
      channelType: string;
      channelId?: string;
      recipient?: string;
      senderId: string;
    }) => {
      if (parsed.kind === "general") return payload.channelType === "general";
      if (parsed.kind === "channel") return payload.channelId === parsed.channelId;
      const peer = payload.senderId === user.sub ? payload.recipient : payload.senderId;
      return peer === parsed.userId;
    };

    const onDeleted = (payload: {
      messageId: string;
      channelType: string;
      channelId?: string;
      recipient?: string;
      senderId: string;
    }) => {
      if (!matchMessageDelete(payload)) {
        let t = "general";
        if (payload.channelType === "channel" && payload.channelId) {
          t = `channel:${payload.channelId}`;
        } else if (payload.channelType === "dm") {
          t = payload.senderId === user.sub ? payload.recipient || "" : payload.senderId;
        }
        removeCachedMessage(t, payload.messageId);
        return;
      }
      removeMessage(payload.messageId);
    };

    const onUpdated = (msg: ChatMessage) => {
      const msgTarget = messageToPreviewTarget(msg, user.sub);
      if (match(msg)) upsertMessage(msg);
      else if (getConversationCache(msgTarget)) patchCachedMessage(msgTarget, msg);
    };

    const onAny = (msg: ChatMessage) => {
      const msgTarget = messageToPreviewTarget(msg, user.sub);
      if (!match(msg)) {
        if (getConversationCache(msgTarget)) patchCachedMessage(msgTarget, msg);
        return;
      }
      setMessages((prev) => {
        const pendingIdx = prev.findIndex(
          (m) => m.pending && m.sender._id === user.sub && m.content === msg.content
        );
        if (pendingIdx >= 0) {
          const next = [...prev];
          next[pendingIdx] = { ...msg, pending: false };
          return next;
        }
        const idx = prev.findIndex((m) => m._id === msg._id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...msg, pending: false };
          return next;
        }
        return [...prev, msg];
      });
      lastMessageAtRef.current = msg.createdAt;
      if (msg.sender._id !== user.sub) {
        markRead(msg.createdAt);
      }
    };

    const syncTypingLabel = () => {
      const names = [...typingUsersRef.current.values()].map((v) => v.name);
      const label = formatTypingLabel(names);
      setTypingLabel(label);
      onTypingChange?.(label);
    };

    const onTyping = (payload: { target: string; userName: string; typing: boolean; userId: string }) => {
      if (payload.userId === user.sub) return;
      if (parsed.kind === "dm") {
        if (payload.userId !== parsed.userId) return;
      } else if (payload.target !== target) {
        return;
      }

      const existing = typingUsersRef.current.get(payload.userId);
      if (existing) window.clearTimeout(existing.timer);

      if (payload.typing) {
        const timer = window.setTimeout(() => {
          typingUsersRef.current.delete(payload.userId);
          syncTypingLabel();
        }, 3000);
        typingUsersRef.current.set(payload.userId, { name: payload.userName, timer });
      } else {
        typingUsersRef.current.delete(payload.userId);
      }
      syncTypingLabel();
    };

    const onRead = (payload: { conversationKey: string; userId: string; lastReadAt?: string }) => {
      if (payload.conversationKey !== convKey) return;
      if (payload.userId === user.sub) return;
      if (parsed.kind === "dm") {
        if (payload.userId !== parsed.userId) return;
        setPeerReadAt(payload.lastReadAt || new Date().toISOString());
        return;
      }
      if (parsed.kind === "general" || parsed.kind === "channel") {
        const next = payload.lastReadAt || new Date().toISOString();
        setPeerReadAt((prev) => (!prev || next > prev ? next : prev));
      }
    };

    socket.on("general:message", onAny);
    socket.on("dm:message", onAny);
    socket.on("channel:message", onAny);
    socket.on("chat:message-updated", onUpdated);
    socket.on("chat:message-deleted", onDeleted);
    socket.on("chat:typing", onTyping);
    socket.on("chat:read", onRead);
    socket.on("chat:channel-deleted", (payload: { channelId: string }) => {
      if (parsed.kind === "channel" && parsed.channelId === payload.channelId) {
        onChannelDeleted?.();
      }
    });

    return () => {
      socket.off("general:message", onAny);
      socket.off("dm:message", onAny);
      socket.off("channel:message", onAny);
      socket.off("chat:message-updated", onUpdated);
      socket.off("chat:message-deleted", onDeleted);
      socket.off("chat:typing", onTyping);
      socket.off("chat:read", onRead);
      socket.off("chat:channel-deleted");
    };
  }, [
    socket,
    target,
    user.sub,
    realtimeMode,
    parsed,
    convKey,
    upsertMessage,
    removeMessage,
    onTypingChange,
    markRead,
    onMessageDeleted,
    onChannelDeleted,
  ]);

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
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, editId]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = atBottom;
    setShowScrollDown(!atBottom);
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    atBottomRef.current = true;
    setShowScrollDown(false);
  }

  function notifyTyping() {
    if (!socket?.connected) return;
    socket.emit("chat:typing", { target, typing: true });
    if (typingEmitRef.current) window.clearTimeout(typingEmitRef.current);
    typingEmitRef.current = window.setTimeout(() => {
      socket.emit("chat:typing", { target, typing: false });
    }, 2000);
  }

  async function sendMessage(payload: { content: string; attachments: OutgoingAttachment[] }) {
    if (realtimeMode === "socket" && !socketConnected) return;
    const parentId = replyTo?._id;
    const tempId = `temp-${Date.now()}`;
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
            deleted: false,
          }
        : null,
    };

    setMessages((prev) => [...prev, optimistic]);
    setReplyTo(null);
    setChatDraft(target, "");
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
    const snapshot = messagesRef.current.find((m) => m._id === messageId);
    if (snapshot) {
      const reactions = [...(snapshot.reactions || [])];
      const idx = reactions.findIndex((r) => r.userId === user.sub && r.emoji === emoji);
      if (idx >= 0) reactions.splice(idx, 1);
      else reactions.push({ emoji, userId: user.sub, userName: user.name });
      upsertMessage({ ...snapshot, reactions });
    }

    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (res.ok && data.message) upsertMessage(data.message);
      else if (snapshot) upsertMessage(snapshot);
    } catch {
      if (snapshot) upsertMessage(snapshot);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/messages/${deleteTarget._id}`, { method: "DELETE" });
      if (res.ok) removeMessage(deleteTarget._id);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
      setMenu(null);
    }
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

  async function copyMessageImage(message: ChatMessage) {
    const img = message.attachments?.find((a) => a.mimeType.startsWith("image/"));
    if (!img) return;
    try {
      const url = resolveChatAttachmentUrl(img.fileUrl);
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch {
      /* clipboard unsupported */
    }
  }

  function downloadMessageAttachments(message: ChatMessage) {
    for (const att of message.attachments || []) {
      void downloadChatAttachment(att.fileUrl, att.fileName);
    }
  }

  function senderAvatar(senderId: string) {
    if (senderId === user.sub) return avatarUrl;
    return users.find((u) => u._id === senderId)?.avatarUrl;
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
    <section className={`flex flex-col min-h-0 min-w-0 overflow-x-hidden bg-white ${className}`}>
      {showHeader && (
        <ChatConversationHeader
          target={target}
          users={users}
          channels={channels}
          channelMembers={channelMembers}
          onlineUserIds={onlineUserIds}
          connected={connected}
          typingLabel={typingLabel}
          searchOpen={searchOpen}
          onToggleSearch={() => setSearchOpen(!searchOpen)}
          userId={user.sub}
          userRole={user.role}
          onChannelUpdated={onChannelUpdated}
          onChannelDeleted={onChannelDeleted}
        />
      )}

      {searchOpen && (
        <div className="px-3 py-2 border-b border-slate-100 shrink-0">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in this chat…"
            autoFocus
            className="w-full text-sm rounded-lg border border-slate-300 px-3 py-1.5 focus:outline-none"
          />
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden p-4 space-y-3 tg-chat-bg min-w-0"
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-brand-100 border-t-brand-500 animate-spin" />
            </div>
          ) : (
            <>
              {(parsed.kind === "general" || parsed.kind === "channel") && channelMeta && (
                <ChannelCreatedBanner meta={channelMeta} />
              )}
              {filtered.length === 0 && !(parsed.kind === "general" || parsed.kind === "channel") ? (
                <p className="text-slate-400 text-sm text-center py-8">
                  {searchOpen && searchQuery.trim() ? "No matching messages." : "No messages yet. Say hello."}
                </p>
              ) : (
                filtered.map((m) => {
                  const mine = m.sender._id === user.sub;
                  return (
                    <ChatMessageBubble
                      key={m._id}
                      message={m}
                      mine={mine}
                      showSender={parsed.kind !== "dm"}
                      peerReadAt={peerReadAt}
                      connected={connected}
                      avatarUrl={senderAvatar(m.sender._id)}
                      editing={editId === m._id}
                      editDraft={editId === m._id ? editDraft : undefined}
                      onEditDraftChange={setEditDraft}
                      onSaveEdit={() => void saveEdit()}
                      onCancelEdit={() => {
                        setEditId(null);
                        setEditDraft("");
                      }}
                      onContextMenu={(e, msg) => {
                        e.preventDefault();
                        closeAllChatContextMenus();
                        setMenu({ x: e.clientX, y: e.clientY, message: msg });
                      }}
                      onReaction={(emoji) => void reactToMessage(m._id, emoji)}
                      currentUserId={user.sub}
                    />
                  );
                })
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {showScrollDown && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 z-10 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer"
            aria-label="Scroll to latest messages"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>

      <ChatComposer
        placeholder={`Message ${label}`}
        canSend={connected}
        draft={chatDrafts[target] ?? ""}
        onDraftChange={(text) => setChatDraft(target, text)}
        replyTo={
          replyTo
            ? { senderName: replyTo.sender.name, content: replyTo.content }
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
          onDelete={() => setDeleteTarget(menu.message)}
          onCopy={() => void navigator.clipboard.writeText(menu.message.content)}
          onCopyImage={() => void copyMessageImage(menu.message)}
          onDownloadAttachments={() => downloadMessageAttachments(menu.message)}
          onReact={(emoji) => void reactToMessage(menu.message._id, emoji)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete message?"
        message="This message will be permanently removed for everyone in this chat."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}
