"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp, useRealtimeMode } from "@/components/AppProvider";
import { ActionButton } from "@/components/ActionButton";
import type { PublicUser, ChatMessage } from "@/lib/types";

export function ChatConversation({
  target,
  users,
  showProfileLink = true,
  className = "",
}: {
  target: string;
  users: PublicUser[];
  showProfileLink?: boolean;
  className?: string;
}) {
  const { user, socket, setActiveConversation, clearUnread } = useApp();
  const realtimeMode = useRealtimeMode();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastMessageAtRef = useRef<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const url =
      target === "general"
        ? "/api/messages?channel=general"
        : `/api/messages?channel=dm&with=${target}`;
    const res = await fetch(url);
    const data = await res.json();
    const list = (data.messages || []) as ChatMessage[];
    setMessages(list);
    lastMessageAtRef.current = list.length > 0 ? list[list.length - 1].createdAt : null;
    setLoading(false);
  }, [target]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setActiveConversation(target);
    clearUnread(target);
    return () => setActiveConversation(null);
  }, [target, setActiveConversation, clearUnread]);

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
      /* keep draft */
    } finally {
      setSending(false);
    }
  }

  const targetName =
    target === "general" ? "General Channel" : users.find((u) => u._id === target)?.name || "Direct Message";
  const canSend = (realtimeMode === "polling" || !!socket) && draft.trim().length > 0;

  return (
    <section className={`flex flex-col min-h-0 bg-white ${className}`}>
      {showProfileLink && target !== "general" && (
        <div className="px-4 py-2 border-b border-slate-100 text-right">
          <Link href={`/u/${target}`} className="text-xs text-brand-600 hover:underline">
            View profile
          </Link>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 tg-chat-bg min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-brand-100 border-t-brand-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No messages yet. Say hello.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender._id === user.sub;
            return (
              <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm ${
                    mine ? "bg-brand-500 text-white rounded-br-md" : "bg-white text-slate-800 rounded-bl-md"
                  }`}
                >
                  {!mine && (
                    <div className="text-xs font-semibold mb-0.5 text-brand-600">{m.sender.name}</div>
                  )}
                  <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>
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
      <form onSubmit={send} className="p-3 border-t border-slate-200 flex gap-2 shrink-0">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${targetName}`}
          disabled={realtimeMode !== "polling" && !socket}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
        />
        <ActionButton type="submit" disabled={!canSend} loading={sending} loadingText="Sending...">
          Send
        </ActionButton>
      </form>
    </section>
  );
}
