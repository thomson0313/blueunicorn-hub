"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { ChatConversation } from "@/components/chat/ChatConversation";
import { ChatPopupHeader } from "@/components/chat/ChatConversationHeader";
import { ChatRightSidebar } from "@/components/chat/ChatRightSidebar";
import { PanelLoader } from "@/components/PanelLoader";
import type { ChatChannel, ChatConversationPreview, PublicUser } from "@/lib/types";

const SIDEBAR_WIDTH = "20rem"; // w-80

export function FloatingChat() {
  const pathname = usePathname();
  const { totalUnread, onlineUserIds, unread, socketConnected, user } = useApp();
  const connected = socketConnected;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [popupTarget, setPopupTarget] = useState<string | null>(null);
  const [popupMinimized, setPopupMinimized] = useState(false);
  const [popupHeader, setPopupHeader] = useState<{
    typingLabel: string | null;
    channelMembers: { name: string; avatarUrl?: string | null }[];
  }>({ typingLabel: null, channelMembers: [] });
  const [searchOpen, setSearchOpen] = useState(false);

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [previews, setPreviews] = useState<ChatConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshLists = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, channelsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/chat/channels"),
      ]);
      const usersData = await usersRes.json();
      const channelsData = await channelsRes.json();
      setUsers(usersData.users || []);
      setChannels(channelsData.channels || []);
      setPreviews(channelsData.previews || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  function openConversation(target: string) {
    setPopupTarget(target);
    setPopupMinimized(false);
    setSearchOpen(false);
    setPopupHeader({ typingLabel: null, channelMembers: [] });
  }

  const hideFab = pathname === "/chat";

  const popupRight = sidebarOpen ? SIDEBAR_WIDTH : "1rem";

  return (
    <>
      <ChatRightSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        users={users}
        channels={channels}
        previews={previews}
        onlineUserIds={onlineUserIds}
        unread={unread}
        activeTarget={popupTarget}
        loading={loading && users.length === 0}
        onSelect={openConversation}
        onRefresh={() => void refreshLists()}
      />

      {popupTarget && (
        <div
          className={`fixed z-50 flex flex-col bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden transition-all ${
            popupMinimized
              ? "h-14"
              : "h-[min(520px,calc(100vh-5rem))] w-[min(400px,calc(100vw-2rem))]"
          }`}
          style={{
            right: popupRight,
            bottom: "1rem",
          }}
        >
          <ChatPopupHeader
            target={popupTarget}
            users={users}
            channels={channels}
            channelMembers={popupHeader.channelMembers}
            onlineUserIds={onlineUserIds}
            connected={connected}
            typingLabel={popupHeader.typingLabel}
            minimized={popupMinimized}
            searchOpen={searchOpen}
            userId={user.sub}
            userRole={user.role}
            onToggleMinimize={() => setPopupMinimized((m) => !m)}
            onClose={() => {
              setPopupTarget(null);
              setPopupMinimized(false);
              setSearchOpen(false);
              setPopupHeader({ typingLabel: null, channelMembers: [] });
            }}
            onToggleSearch={() => setSearchOpen((o) => !o)}
            onChannelUpdated={() => void refreshLists()}
            onChannelDeleted={() => {
              setPopupTarget(null);
              void refreshLists();
            }}
          />
          <div className={popupMinimized ? "hidden" : "flex flex-col flex-1 min-h-0"}>
            {loading && users.length === 0 ? (
              <PanelLoader variant="chat" />
            ) : (
              <ChatConversation
                target={popupTarget}
                users={users}
                channels={channels}
                showHeader={false}
                className="flex-1 min-h-0"
                onHeaderStateChange={setPopupHeader}
                searchOpen={searchOpen}
                onSearchOpenChange={setSearchOpen}
                onMessageDeleted={() => void refreshLists()}
                onChannelUpdated={() => void refreshLists()}
                onChannelDeleted={() => {
                  setPopupTarget(null);
                  void refreshLists();
                }}
              />
            )}
          </div>
        </div>
      )}

      {!hideFab && !sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
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
