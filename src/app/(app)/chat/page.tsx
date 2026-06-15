"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatConversation } from "@/components/chat/ChatConversation";
import { ChatRightSidebar } from "@/components/chat/ChatRightSidebar";
import { PanelLoader } from "@/components/PanelLoader";
import { useApp } from "@/components/AppProvider";
import type { ChatChannel, ChatConversationPreview, PublicUser } from "@/lib/types";

export default function ChatPage() {
  const { onlineUserIds, unread } = useApp();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [previews, setPreviews] = useState<ChatConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [usersRes, channelsRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/chat/channels"),
    ]);
    const usersData = await usersRes.json();
    const channelsData = await channelsRes.json();
    setUsers(usersData.users || []);
    setChannels(channelsData.channels || []);
    setPreviews(channelsData.previews || []);
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return <PanelLoader variant="chat" />;
  }

  return (
    <div className="relative h-[calc(100vh-9rem)]">
      <div className="h-full mr-80 bg-white rounded-xl border border-slate-200 flex flex-col min-h-0 overflow-hidden">
        {target ? (
          <ChatConversation
            target={target}
            users={users}
            channels={channels}
            className="flex-1"
            onMessageDeleted={() => void refresh()}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-slate-400 text-sm text-center">
              Please select a chat to start…
            </p>
          </div>
        )}
      </div>
      <ChatRightSidebar
        open
        embedded
        onClose={() => {}}
        users={users}
        channels={channels}
        previews={previews}
        onlineUserIds={onlineUserIds}
        unread={unread}
        activeTarget={target}
        onSelect={setTarget}
        onRefresh={() => void refresh()}
      />
    </div>
  );
}
