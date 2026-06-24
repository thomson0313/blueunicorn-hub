"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { CreateChannelModal } from "@/components/chat/CreateChannelModal";
import { PanelSkeleton } from "@/components/skeleton/PanelSkeleton";
import { formatPreviewTime, truncatePreview } from "@/lib/chat-format";
import { parseChatTarget } from "@/lib/chat-target";
import type { ChatChannel, ChatConversationPreview, PublicUser } from "@/lib/types";

type Tab = "dm" | "channel";

export function ChatRightSidebar({
  open,
  onClose,
  embedded = false,
  side = "right",
  users,
  channels,
  previews,
  onlineUserIds,
  unread,
  chatDrafts = {},
  activeTarget,
  onSelect,
  onRefresh,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  users: PublicUser[];
  channels: ChatChannel[];
  previews: ChatConversationPreview[];
  onlineUserIds: string[];
  unread: Record<string, number>;
  chatDrafts?: Record<string, string>;
  activeTarget: string | null;
  onSelect: (target: string) => void;
  onRefresh: () => void;
  loading?: boolean;
  embedded?: boolean;
  /** Sidebar edge when open. Chat page uses left; floating chat keeps right. */
  side?: "left" | "right";
}) {
  const [tab, setTab] = useState<Tab>("dm");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const previewMap = useMemo(
    () => new Map(previews.map((p) => [p.target, p])),
    [previews]
  );

  const q = query.trim().toLowerCase();

  const { dmUnread, channelUnread } = useMemo(() => {
    let dm = 0;
    let channel = 0;
    for (const [key, count] of Object.entries(unread)) {
      if (!count) continue;
      if (key === "general" || key.startsWith("channel:")) channel += count;
      else dm += count;
    }
    return { dmUnread: dm, channelUnread: channel };
  }, [unread]);

  const dmItems = useMemo(() => {
    return users
      .map((u) => {
        const preview = previewMap.get(u._id);
        return {
          target: u._id,
          title: u.name,
          preview,
          online: onlineUserIds.includes(u._id),
          avatarName: u.name,
          avatarUrl: u.avatarUrl,
        };
      })
      .filter((item) => !q || item.title.toLowerCase().includes(q) || item.preview?.lastMessage?.toLowerCase().includes(q))
      .sort((a, b) => {
        const ta = a.preview?.lastAt || "";
        const tb = b.preview?.lastAt || "";
        return tb.localeCompare(ta);
      });
  }, [users, previewMap, q, onlineUserIds]);

  const channelItems = useMemo(() => {
    const generalPreview = previewMap.get("general");
    const general = {
      target: "general",
      title: "General",
      visibility: "public" as const,
      preview: generalPreview,
    };
    const custom = channels.map((c) => ({
      target: `channel:${c._id}`,
      title: c.name,
      visibility: c.visibility,
      preview: previewMap.get(`channel:${c._id}`),
    }));
    return [general, ...custom]
      .filter(
        (item) =>
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.preview?.lastMessage?.toLowerCase().includes(q)
      )
      .sort((a, b) => (b.preview?.lastAt || "").localeCompare(a.preview?.lastAt || ""));
  }, [channels, previewMap, q]);

  if (!open) return null;

  return (
    <>
      <aside
        className={`${
          embedded ? "absolute top-0 h-full" : "fixed top-0 h-full"
        } ${side === "left" ? "left-0 border-r" : "right-0 border-l"} z-50 w-80 max-w-[90vw] bg-white border-slate-200 shadow-xl flex flex-col`}
      >
        <div className="px-4 py-3 border-b border-slate-200 shrink-0 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Chat</h2>
          {!embedded && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
              aria-label="Close chat list"
            >
              ×
            </button>
          )}
        </div>

        <div className="p-3 border-b border-slate-100 shrink-0 space-y-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            <TabButton
              active={tab === "dm"}
              onClick={() => setTab("dm")}
              label="Direct message"
              unread={dmUnread}
            />
            <TabButton
              active={tab === "channel"}
              onClick={() => setTab("channel")}
              label="Channel"
              unread={channelUnread}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <PanelSkeleton variant="list" rows={8} />
          ) : tab === "dm" ? (
            dmItems.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No conversations</p>
            ) : (
              dmItems.map((item) => {
                const draft = chatDrafts[item.target];
                const subtitle = draft?.trim()
                  ? `Draft: ${truncatePreview(draft, 38)}`
                  : item.preview?.lastMessage;
                return (
                <ConversationRow
                  key={item.target}
                  active={activeTarget === item.target}
                  title={item.title}
                  subtitle={subtitle}
                  subtitleIsDraft={!!draft?.trim()}
                  time={item.preview?.lastAt}
                  unread={unread[item.target]}
                  onClick={() => onSelect(item.target)}
                  avatarName={item.avatarName}
                  avatarUrl={item.avatarUrl}
                  online={item.online}
                />
              );})
            )
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full mb-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-sm text-brand-600 hover:bg-brand-50 cursor-pointer"
              >
                + Create channel
              </button>
              {channelItems.map((item) => {
                const draft = chatDrafts[item.target];
                const previewSubtitle =
                  item.preview?.lastSenderName && item.preview.lastMessage
                    ? `${item.preview.lastSenderName}: ${truncatePreview(item.preview.lastMessage)}`
                    : item.preview?.lastMessage;
                const subtitle = draft?.trim()
                  ? `Draft: ${truncatePreview(draft, 38)}`
                  : previewSubtitle;
                return (
                <ConversationRow
                  key={item.target}
                  active={activeTarget === item.target}
                  title={item.visibility === "private" ? `🔒 ${item.title}` : `# ${item.title}`}
                  subtitle={subtitle}
                  subtitleIsDraft={!!draft?.trim()}
                  time={item.preview?.lastAt}
                  unread={unread[item.target]}
                  onClick={() => onSelect(item.target)}
                />
              );})}
            </>
          )}
        </div>
      </aside>

      {showCreate && (
        <CreateChannelModal
          users={users}
          onClose={() => setShowCreate(false)}
          onCreated={onRefresh}
        />
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  label,
  unread = 0,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  unread?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 py-1.5 text-xs font-medium rounded-md cursor-pointer transition ${
        active ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
      {unread > 0 && (
        <span className="absolute -top-1 -right-0.5 text-[10px] min-w-4 h-4 px-1 rounded-full bg-brand-500 text-white flex items-center justify-center leading-none">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

function ConversationRow({
  active,
  title,
  subtitle,
  subtitleIsDraft,
  time,
  unread,
  onClick,
  avatarName,
  avatarUrl,
  online,
}: {
  active: boolean;
  title: string;
  subtitle?: string;
  subtitleIsDraft?: boolean;
  time?: string;
  unread?: number;
  onClick: () => void;
  avatarName?: string;
  avatarUrl?: string | null;
  online?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 flex items-start gap-2 cursor-pointer ${
        active ? "bg-brand-50" : "hover:bg-slate-50"
      }`}
    >
      {avatarName && (
        <span className="relative shrink-0 mt-0.5">
          <Avatar name={avatarName} src={avatarUrl} size={36} />
          {online !== undefined && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                online ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
          )}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-medium text-sm truncate ${active ? "text-brand-700" : "text-slate-800"}`}>
            {title}
          </span>
          {time && (
            <span className="text-[10px] text-slate-400 shrink-0">{formatPreviewTime(time)}</span>
          )}
        </div>
        {subtitle && (
          <p className={`text-xs truncate mt-0.5 ${subtitleIsDraft ? "text-brand-600 italic" : "text-slate-500"}`}>
            {truncatePreview(subtitle, 42)}
          </p>
        )}
      </div>
      {(unread || 0) > 0 && (
        <span className="text-[10px] min-w-5 h-5 px-1 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0">
          {unread! > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
