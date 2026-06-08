"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { ChatSidebarList } from "@/components/chat/ChatSidebarList";
import { ChatConversation } from "@/components/chat/ChatConversation";
import { PanelLoader } from "@/components/PanelLoader";
import type { PublicUser } from "@/lib/types";

export function FloatingChat() {
  const pathname = usePathname();
  const { totalUnread, onlineUserIds, unread } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [widgetTarget, setWidgetTarget] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    setUsersLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setUsersLoading(false));
  }, [sidebarOpen]);

  function openSidebar() {
    setSidebarOpen(true);
  }

  function closeAll() {
    setSidebarOpen(false);
    setWidgetTarget(null);
    setMinimized(false);
  }

  function selectTarget(id: string) {
    setWidgetTarget(id);
    setMinimized(false);
  }

  function closeWidget() {
    setWidgetTarget(null);
    setMinimized(false);
  }

  const widgetTitle =
    widgetTarget === "general"
      ? "General Channel"
      : users.find((u) => u._id === widgetTarget)?.name || "Chat";

  const hideFab = pathname === "/chat";

  return (
    <>
      {sidebarOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/20 z-40 cursor-pointer"
            aria-label="Close chat sidebar"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] bg-white border-l border-slate-200 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
              <h2 className="font-semibold text-slate-900">Chat</h2>
              <button
                type="button"
                onClick={closeAll}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Close chat"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-3">
              {usersLoading ? (
                <PanelLoader variant="list" />
              ) : (
                <ChatSidebarList
                  users={users}
                  target={widgetTarget || "general"}
                  onlineUserIds={onlineUserIds}
                  unread={unread}
                  onSelect={selectTarget}
                />
              )}
            </div>
          </aside>
        </>
      )}

      {widgetTarget && (
        <div
          className={`fixed z-50 right-4 flex flex-col bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden transition-all ${
            minimized ? "bottom-20 w-72 h-12" : "bottom-20 w-[min(400px,calc(100vw-2rem))] h-[min(480px,calc(100vh-7rem))]"
          }`}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
            <span className="font-semibold text-sm text-slate-800 truncate pr-2">{widgetTitle}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setMinimized((m) => !m)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer text-lg leading-none"
                aria-label={minimized ? "Expand chat" : "Minimize chat"}
              >
                −
              </button>
              <button
                type="button"
                onClick={closeWidget}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
                aria-label="Close chat widget"
              >
                ×
              </button>
            </div>
          </div>
          {!minimized && (
            <ChatConversation
              target={widgetTarget}
              users={users}
              showProfileLink={widgetTarget !== "general"}
              className="flex-1 min-h-0"
            />
          )}
        </div>
      )}

      {!hideFab && (
        <button
          type="button"
          onClick={() => (sidebarOpen ? closeAll() : openSidebar())}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-lg flex items-center justify-center cursor-pointer transition"
          aria-label="Open chat"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      )}
    </>
  );
}
