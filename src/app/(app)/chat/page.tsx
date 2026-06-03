"use client";

import { useEffect, useState } from "react";
import { ChatSidebarList } from "@/components/chat/ChatSidebarList";
import { ChatConversation } from "@/components/chat/ChatConversation";
import { PanelLoader } from "@/components/PanelLoader";
import { useApp } from "@/components/AppProvider";
import type { PublicUser } from "@/lib/types";

export default function ChatPage() {
  const { onlineUserIds, unread } = useApp();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState("general");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PanelLoader label="Loading chat..." />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-9rem)]">
      <aside className="bg-white rounded-xl border border-slate-200 p-3 overflow-y-auto">
        <ChatSidebarList
          users={users}
          target={target}
          onlineUserIds={onlineUserIds}
          unread={unread}
          onSelect={setTarget}
        />
      </aside>
      <section className="bg-white rounded-xl border border-slate-200 flex flex-col min-h-0 overflow-hidden">
        <header className="px-5 py-3 border-b border-slate-200">
          <h1 className="font-semibold text-slate-900">Chat</h1>
        </header>
        <ChatConversation target={target} users={users} className="flex-1" />
      </section>
    </div>
  );
}
