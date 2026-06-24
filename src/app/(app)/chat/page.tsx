"use client";

import { useState } from "react";
import { ChatConversation } from "@/components/chat/ChatConversation";
import { ChatRightSidebar } from "@/components/chat/ChatRightSidebar";
import { PanelLoader } from "@/components/PanelLoader";
import { useApp } from "@/components/AppProvider";
import { useChatSidebar } from "@/hooks/useChatSidebar";

export default function ChatPage() {
  const { onlineUserIds, unread, chatDrafts } = useApp();
  const { users, channels, previews, loading, refresh } = useChatSidebar();
  const [target, setTarget] = useState<string | null>(null);

  if (loading) {
    return <PanelLoader variant="chat" />;
  }

  return (
    <div className="relative h-[calc(100vh-9rem)]">
      <div className="h-full ml-80 bg-white rounded-xl border border-slate-200 flex flex-col min-h-0 overflow-hidden">
        {target ? (
          <ChatConversation
            target={target}
            users={users}
            channels={channels}
            className="flex-1"
            onChannelUpdated={() => void refresh()}
            onChannelDeleted={() => setTarget(null)}
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
        side="left"
        onClose={() => {}}
        users={users}
        channels={channels}
        previews={previews}
        onlineUserIds={onlineUserIds}
        unread={unread}
        chatDrafts={chatDrafts}
        activeTarget={target}
        onSelect={setTarget}
        onRefresh={() => void refresh()}
      />
    </div>
  );
}
