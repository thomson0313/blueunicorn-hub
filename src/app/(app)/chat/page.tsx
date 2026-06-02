"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useApp, useRealtimeMode } from "@/components/AppProvider";
import { Avatar } from "@/components/Avatar";
import type { PublicUser, ChatMessage } from "@/lib/types";

export default function ChatPage() {
  const { user, socket, onlineUserIds, unread, setActiveConversation, clearUnread } = useApp();
  const realtimeMode = useRealtimeMode();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [target, setTarget] = useState<string>("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastMessageAtRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []));
  }, []);

  const loadHistory = useCallback(async () => {
    const url =
      target === "general"
        ? "/api/messages?channel=general"
        : `/api/messages?channel=dm&with=${target}`;
    const res = await fetch(url);
    const data = await res.json();
    const list = (data.messages || []) as ChatMessage[];
    setMessages(list);
    lastMessageAtRef.current = list.length > 0 ? list[list.length - 1].createdAt : null;
  }, [target]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setActiveConversation(target);
    clearUnread(target);
    return () => setActiveConversation(null);
  }, [target, setActiveConversation, clearUnread]);

  // Socket live updates (local dev).
  useEffect(() => {
    if (realtimeMode !== "socket" || !socket) return;

    const onGeneral = (msg: ChatMessage) => {
      if (target === "general") {
        setMessages((prev) => [...prev, msg]);
        lastMessageAtRef.current = msg.createdAt;
      }
    };
    const onDm = (msg: ChatMessage) => {
      const other = msg.sender._id === user.sub ? msg.recipient : msg.sender._id;
      if (target !== "general" && other === target) {
        setMessages((prev) => [...prev, msg]);
        lastMessageAtRef.current = msg.createdAt;
      }
    };

    socket.on("general:message", onGeneral);
    socket.on("dm:message", onDm);
    return () => {
      socket.off("general:message", onGeneral);
      socket.off("dm:message", onDm);
    };
  }, [socket, target, user.sub, realtimeMode]);

  // HTTP polling for new messages (Vercel).
  useEffect(() => {
    if (realtimeMode !== "polling") return;

    let cancelled = false;

    const poll = async () => {
      const since = lastMessageAtRef.current;
      if (!since) return;
      const url =
        target === "general"
          ? `/api/messages?channel=general&since=${encodeURIComponent(since)}`
          : `/api/messages?channel=dm&with=${target}&since=${encodeURIComponent(since)}`;
      try {
        const res = await fetch(url);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const incoming = (data.messages || []) as ChatMessage[];
        if (incoming.length > 0) {
          setMessages((prev) => [...prev, ...incoming]);
          lastMessageAtRef.current = incoming[incoming.length - 1].createdAt;
        }
      } catch {
        /* ignore */
      }
    };

    const timer = setInterval(poll, 3_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [target, realtimeMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);

    try {
      if (realtimeMode === "socket" && socket) {
        if (target === "general") socket.emit("general:send", { content });
        else socket.emit("dm:send", { to: target, content });
        setDraft("");
        return;
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: target === "general" ? "general" : "dm",
          to: target === "general" ? undefined : target,
          content,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      const msg = data.message as ChatMessage;
      setMessages((prev) => [...prev, msg]);
      lastMessageAtRef.current = msg.createdAt;
      setDraft("");
    } catch {
      /* keep draft on failure */
    } finally {
      setSending(false);
    }
  }

  const targetName =
    target === "general" ? "General Channel" : users.find((u) => u._id === target)?.name || "Direct Message";

  const canSend = realtimeMode === "polling" || !!socket;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-9rem)]">
      <aside className="bg-white rounded-xl border border-slate-200 p-3 overflow-y-auto">
        <button
          onClick={() => setTarget("general")}
          className={`w-full text-left px-3 py-2 rounded-lg font-medium mb-2 flex items-center justify-between ${
            target === "general" ? "bg-brand-50 text-brand-700" : "hover:bg-slate-100 text-slate-700"
          }`}
        >
          <span># General Channel</span>
          {unread["general"] > 0 && (
            <span className="text-[11px] min-w-5 h-5 px-1.5 rounded-full bg-brand-500 text-white flex items-center justify-center">
              {unread["general"]}
            </span>
          )}
        </button>
        <div className="text-xs uppercase tracking-wide text-slate-400 px-3 mt-3 mb-1">Direct Messages</div>
        {users.map((u) => {
          const online = onlineUserIds.includes(u._id);
          return (
            <button
              key={u._id}
              onClick={() => setTarget(u._id)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${
                target === u._id ? "bg-brand-50 text-brand-700" : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              <span className="relative shrink-0">
                <Avatar name={u.name} src={u.avatarUrl} size={32} />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                    online ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  title={online ? "Online" : "Offline"}
                />
              </span>
              <span className="flex-1 truncate">{u.name}</span>
              {unread[u._id] > 0 && (
                <span className="text-[11px] min-w-5 h-5 px-1.5 rounded-full bg-brand-500 text-white flex items-center justify-center">
                  {unread[u._id]}
                </span>
              )}
              {u.role === "admin" && !unread[u._id] && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">admin</span>
              )}
            </button>
          );
        })}
      </aside>

      <section className="bg-white rounded-xl border border-slate-200 flex flex-col min-h-0">
        <header className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{targetName}</h2>
          {target !== "general" && (
            <Link href={`/u/${target}`} className="text-sm text-brand-600 hover:underline">
              View profile
            </Link>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-2 tg-chat-bg">
          {messages.length === 0 ? (
            <p className="text-slate-400 text-sm">No messages yet. Say hello.</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender._id === user.sub;
              return (
                <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm ${
                      mine ? "bg-brand-500 text-white rounded-br-md" : "bg-white text-slate-800 rounded-bl-md"
                    }`}
                  >
                    {!mine && (
                      <div className="text-xs font-semibold mb-0.5 text-brand-600">{m.sender.name}</div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    <div className={`text-[10px] mt-1 text-right ${mine ? "text-brand-100" : "text-slate-400"}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="p-3 border-t border-slate-200 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${targetName}`}
            disabled={!canSend}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          />
          <button
            disabled={!canSend || sending}
            className="bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg px-5 transition disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
