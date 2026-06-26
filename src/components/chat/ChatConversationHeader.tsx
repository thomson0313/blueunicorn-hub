"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ChannelHeaderAvatar } from "@/components/chat/ChannelHeaderAvatar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditChannelModal } from "@/components/chat/EditChannelModal";
import { anchoredPosition } from "@/lib/anchored-position";
import { getChannelManagePermission } from "@/lib/chat-channel-permissions";
import { parseChatTarget } from "@/lib/chat-target";
import type { ChatChannel, PublicUser } from "@/lib/types";
import type { Role } from "@/lib/repo";

type ChannelMember = {
  userId: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
};

function channelMemberSubtitle(
  members: ChannelMember[],
  onlineUserIds: string[]
): string {
  const memberCount = members.length;
  const onlineCount = members.filter((m) => onlineUserIds.includes(m.userId)).length;
  const memberLabel = memberCount === 1 ? "member" : "members";
  return `${memberCount} ${memberLabel}, ${onlineCount} online`;
}

function HeaderMenu({
  profileHref,
  searchOpen,
  onToggleSearch,
  canEditChannel,
  canDeleteChannel,
  onEditChannel,
  onDeleteChannel,
  canDeleteDm,
  onDeleteDm,
}: {
  profileHref?: string | null;
  searchOpen?: boolean;
  onToggleSearch?: () => void;
  canEditChannel?: boolean;
  canDeleteChannel?: boolean;
  onEditChannel?: () => void;
  onDeleteChannel?: () => void;
  canDeleteDm?: boolean;
  onDeleteDm?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  useLayoutEffect(() => {
    if (!menuOpen || !menuPanelRef.current || !menuRef.current) {
      setMenuPos(null);
      return;
    }
    const btn = menuRef.current.querySelector("button");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const w = menuPanelRef.current.offsetWidth || 160;
    const h = menuPanelRef.current.offsetHeight || 120;
    setMenuPos(anchoredPosition(rect.right - w, rect.bottom + 4, w, h));
  }, [menuOpen]);

  const hasItems =
    onToggleSearch || profileHref || canEditChannel || canDeleteChannel || canDeleteDm;
  if (!hasItems) return null;

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
        aria-label="More options"
      >
        ⋮
      </button>
      {menuOpen && (
        <div
          ref={menuPanelRef}
          className="fixed w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-[200] text-sm"
          style={menuPos ? { left: menuPos.left, top: menuPos.top } : { visibility: "hidden" }}
        >
          {onToggleSearch && (
            <button
              type="button"
              onClick={() => {
                onToggleSearch();
                setMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer ${
                searchOpen ? "text-brand-600 font-medium" : "text-slate-700"
              }`}
            >
              {searchOpen ? "Close search" : "Search chat"}
            </button>
          )}
          {canEditChannel && onEditChannel && (
            <button
              type="button"
              onClick={() => {
                onEditChannel();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
            >
              Edit channel
            </button>
          )}
          {canDeleteChannel && onDeleteChannel && (
            <button
              type="button"
              onClick={() => {
                onDeleteChannel();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-red-600 cursor-pointer"
            >
              Delete channel
            </button>
          )}
          {canDeleteDm && onDeleteDm && (
            <button
              type="button"
              onClick={() => {
                onDeleteDm();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-red-600 cursor-pointer"
            >
              Delete chat
            </button>
          )}
          {profileHref && (
            <Link
              href={profileHref}
              className="block px-3 py-2 hover:bg-slate-50 text-slate-700"
              onClick={() => setMenuOpen(false)}
            >
              View profile
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

type HeaderCoreProps = {
  target: string;
  users: PublicUser[];
  channels: ChatChannel[];
  channelMembers?: ChannelMember[];
  onlineUserIds?: string[];
  searchOpen?: boolean;
  onToggleSearch?: () => void;
  userId: string;
  userRole: Role;
  onChannelUpdated?: () => void;
  onChannelDeleted?: () => void;
  onDmDeleted?: () => void;
  compact?: boolean;
};

function ChatHeaderCore({
  target,
  users,
  channels,
  channelMembers = [],
  onlineUserIds = [],
  searchOpen,
  onToggleSearch,
  userId,
  userRole,
  onChannelUpdated,
  onChannelDeleted,
  onDmDeleted,
  compact,
}: HeaderCoreProps) {
  const parsed = parseChatTarget(target);
  const channel =
    parsed.kind === "channel" ? channels.find((c) => c._id === parsed.channelId) : null;
  const perm = getChannelManagePermission(
    userId,
    userRole,
    target,
    channel || (parsed.kind === "general" ? { createdBy: "", visibility: "public" } : null)
  );
  const isChannel = parsed.kind === "general" || parsed.kind === "channel";
  const canEdit = isChannel && perm.canEdit;
  const canDelete = isChannel && perm.canDelete && parsed.kind === "channel";
  const canDeleteDm = parsed.kind === "dm";

  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteDmConfirm, setShowDeleteDmConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  let title = "Chat";
  let subtitle: string | null = null;
  let avatarName: string | undefined;
  let avatarUrl: string | null | undefined;
  let profileHref: string | null = null;
  let channelVisibility: "public" | "private" = "public";

  if (parsed.kind === "general") {
    title = "General";
    channelVisibility = "public";
    subtitle = channelMemberSubtitle(
      channelMembers.length
        ? channelMembers
        : users.map((u) => ({
            userId: u._id,
            name: u.name,
            username: u.username,
            avatarUrl: u.avatarUrl,
          })),
      onlineUserIds
    );
  } else if (parsed.kind === "channel") {
    title = channel?.name || "Channel";
    channelVisibility = channel?.visibility || "public";
    subtitle = channelMemberSubtitle(channelMembers, onlineUserIds);
  } else {
    const u = users.find((x) => x._id === parsed.userId);
    title = u?.name || "Direct Message";
    avatarName = u?.name;
    avatarUrl = u?.avatarUrl;
    profileHref = `/u/${parsed.userId}`;
    subtitle = onlineUserIds.includes(parsed.userId) ? "Online" : "Offline";
  }

  async function confirmDeleteChannel() {
    if (parsed.kind !== "channel") {
      setShowDeleteConfirm(false);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/chat/channels/${parsed.channelId}`, { method: "DELETE" });
      if (res.ok) onChannelDeleted?.();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function confirmDeleteDm() {
    if (parsed.kind !== "dm") {
      setShowDeleteDmConfirm(false);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/chat/conversations?target=${encodeURIComponent(parsed.userId)}`, {
        method: "DELETE",
      });
      if (res.ok) onDmDeleted?.();
    } finally {
      setDeleting(false);
      setShowDeleteDmConfirm(false);
    }
  }

  const avatarSize = compact ? 32 : 36;

  return (
    <>
      <div className={`flex items-center gap-2 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
        {parsed.kind === "dm" && avatarName && (
          <Avatar name={avatarName} src={avatarUrl} size={avatarSize} />
        )}
        {isChannel && (
          <ChannelHeaderAvatar
            channelName={title}
            visibility={channelVisibility}
            members={channelMembers.map((m) => ({ name: m.name, avatarUrl: m.avatarUrl }))}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-slate-900 truncate ${compact ? "text-sm" : ""}`}>
            {title}
          </div>
          <div
            className={`truncate ${compact ? "text-[11px]" : "text-xs"} text-slate-500`}
          >
            {subtitle}
          </div>
        </div>
        <HeaderMenu
          profileHref={profileHref}
          searchOpen={searchOpen}
          onToggleSearch={onToggleSearch}
          canEditChannel={canEdit}
          canDeleteChannel={canDelete}
          onEditChannel={() => setShowEdit(true)}
          onDeleteChannel={() => setShowDeleteConfirm(true)}
          canDeleteDm={canDeleteDm}
          onDeleteDm={() => setShowDeleteDmConfirm(true)}
        />
      </div>

      {showEdit && (
        <EditChannelModal
          channelId={parsed.kind === "channel" ? parsed.channelId : null}
          initialName={title}
          isGeneral={parsed.kind === "general"}
          onClose={() => setShowEdit(false)}
          onSaved={() => onChannelUpdated?.()}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete channel?"
        message={`Delete "${title}" and all its messages? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void confirmDeleteChannel()}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        open={showDeleteDmConfirm}
        title="Delete chat?"
        message={`Clear all messages on your side? ${title} will still see the chat unless they clear it too. The conversation stays in your list.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void confirmDeleteDm()}
        onCancel={() => setShowDeleteDmConfirm(false)}
      />
    </>
  );
}

export function ChatConversationHeader({
  target,
  users,
  channels,
  channelMembers,
  onlineUserIds,
  connected,
  searchOpen,
  onToggleSearch,
  userId,
  userRole,
  onChannelUpdated,
  onChannelDeleted,
  onDmDeleted,
}: {
  target: string;
  users: PublicUser[];
  channels: ChatChannel[];
  channelMembers?: ChannelMember[];
  onlineUserIds: string[];
  connected: boolean;
  searchOpen?: boolean;
  onToggleSearch?: () => void;
  userId: string;
  userRole: Role;
  onChannelUpdated?: () => void;
  onChannelDeleted?: () => void;
  onDmDeleted?: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-slate-200">
      <ChatHeaderCore
        target={target}
        users={users}
        channels={channels}
        channelMembers={channelMembers}
        onlineUserIds={onlineUserIds}
        searchOpen={searchOpen}
        onToggleSearch={onToggleSearch}
        userId={userId}
        userRole={userRole}
        onChannelUpdated={onChannelUpdated}
        onChannelDeleted={onChannelDeleted}
        onDmDeleted={onDmDeleted}
      />
      {!connected && (
        <div className="px-4 py-1.5 bg-amber-50 text-amber-800 text-xs border-t border-amber-100">
          Connection lost — reconnecting…
        </div>
      )}
    </div>
  );
}

export function ChatPopupHeader({
  target,
  users,
  channels,
  channelMembers,
  onlineUserIds,
  connected,
  minimized,
  searchOpen,
  onToggleMinimize,
  onClose,
  onToggleSearch,
  userId,
  userRole,
  onChannelUpdated,
  onChannelDeleted,
  onDmDeleted,
}: {
  target: string;
  users: PublicUser[];
  channels: ChatChannel[];
  channelMembers?: ChannelMember[];
  onlineUserIds: string[];
  connected: boolean;
  minimized: boolean;
  searchOpen?: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
  onToggleSearch?: () => void;
  userId: string;
  userRole: Role;
  onChannelUpdated?: () => void;
  onChannelDeleted?: () => void;
  onDmDeleted?: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-slate-200 bg-slate-50">
      <div className="flex items-center pr-1">
        <div className="flex-1 min-w-0">
          <ChatHeaderCore
            target={target}
            users={users}
            channels={channels}
            channelMembers={channelMembers}
            onlineUserIds={onlineUserIds}
            searchOpen={searchOpen}
            onToggleSearch={onToggleSearch}
            userId={userId}
            userRole={userRole}
            onChannelUpdated={onChannelUpdated}
            onChannelDeleted={() => {
              onChannelDeleted?.();
              onClose();
            }}
            onDmDeleted={() => {
              onDmDeleted?.();
            }}
            compact
          />
        </div>
        <button
          type="button"
          onClick={onToggleMinimize}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer shrink-0"
          aria-label={minimized ? "Expand chat" : "Collapse chat"}
        >
          {minimized ? "⤢" : "⤡"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer shrink-0 mr-1"
          aria-label="Close chat"
        >
          ×
        </button>
      </div>
      {!connected && (
        <div className="px-3 py-1 bg-amber-50 text-amber-800 text-[11px] border-t border-amber-100">
          Connection lost — reconnecting…
        </div>
      )}
    </div>
  );
}
