"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { anchoredPosition } from "@/lib/anchored-position";
import { parseChatTarget } from "@/lib/chat-target";
import type { PublicUser } from "@/lib/types";

function HeaderMenu({
  profileHref,
  searchOpen,
  onToggleSearch,
}: {
  profileHref?: string | null;
  searchOpen?: boolean;
  onToggleSearch?: () => void;
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

  if (!onToggleSearch && !profileHref) return null;

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

export function ChatConversationHeader({
  target,
  users,
  channels,
  onlineUserIds,
  connected,
  typingName,
  searchOpen,
  onToggleSearch,
}: {
  target: string;
  users: PublicUser[];
  channels: { _id: string; name: string }[];
  onlineUserIds: string[];
  connected: boolean;
  typingName?: string | null;
  searchOpen?: boolean;
  onToggleSearch?: () => void;
}) {
  const parsed = parseChatTarget(target);

  let title = "Chat";
  let subtitle: string | null = null;
  let avatarName: string | undefined;
  let avatarUrl: string | null | undefined;
  let profileHref: string | null = null;
  let online = false;

  if (parsed.kind === "general") {
    title = "General";
    subtitle = "Public channel";
  } else if (parsed.kind === "channel") {
    const ch = channels.find((c) => c._id === parsed.channelId);
    title = ch?.name || "Channel";
    subtitle = "Channel";
  } else {
    const u = users.find((x) => x._id === parsed.userId);
    title = u?.name || "Direct Message";
    avatarName = u?.name;
    avatarUrl = u?.avatarUrl;
    profileHref = `/u/${parsed.userId}`;
    online = onlineUserIds.includes(parsed.userId);
    subtitle = online ? "Online" : "Offline";
  }

  if (typingName) subtitle = `${typingName} is typing…`;

  return (
    <div className="shrink-0 border-b border-slate-200">
      <div className="px-4 py-3 flex items-center gap-3">
        {parsed.kind === "dm" && avatarName && (
          <Avatar name={avatarName} src={avatarUrl} size={36} />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 truncate">{title}</div>
          <div className={`text-xs truncate ${typingName ? "text-brand-600" : "text-slate-500"}`}>
            {subtitle}
          </div>
        </div>
        <HeaderMenu
          profileHref={profileHref}
          searchOpen={searchOpen}
          onToggleSearch={onToggleSearch}
        />
      </div>
      {!connected && (
        <div className="px-4 py-1.5 bg-amber-50 text-amber-800 text-xs border-t border-amber-100">
          Connection lost — reconnecting…
        </div>
      )}
    </div>
  );
}

/** Popup chrome header with menu, minimize, close. */
export function ChatPopupHeader({
  target,
  users,
  channels,
  onlineUserIds,
  connected,
  typingName,
  minimized,
  searchOpen,
  onToggleMinimize,
  onClose,
  onToggleSearch,
}: {
  target: string;
  users: PublicUser[];
  channels: { _id: string; name: string }[];
  onlineUserIds: string[];
  connected: boolean;
  typingName?: string | null;
  minimized: boolean;
  searchOpen?: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
  onToggleSearch?: () => void;
}) {
  const parsed = parseChatTarget(target);

  let title = "Chat";
  let subtitle: string | null = null;
  let avatarName: string | undefined;
  let avatarUrl: string | null | undefined;
  let profileHref: string | null = null;
  let online = false;

  if (parsed.kind === "general") {
    title = "General";
    subtitle = "Public channel";
  } else if (parsed.kind === "channel") {
    title = channels.find((c) => c._id === parsed.channelId)?.name || "Channel";
    subtitle = "Channel";
  } else {
    const u = users.find((x) => x._id === parsed.userId);
    title = u?.name || "Direct Message";
    avatarName = u?.name;
    avatarUrl = u?.avatarUrl;
    profileHref = `/u/${parsed.userId}`;
    online = onlineUserIds.includes(parsed.userId);
    subtitle = online ? "Online" : "Offline";
  }
  if (typingName) subtitle = `${typingName} is typing…`;

  return (
    <div className="shrink-0 border-b border-slate-200 bg-slate-50">
      <div className="px-3 py-2 flex items-center gap-2">
        {parsed.kind === "dm" && avatarName && (
          <span className="relative shrink-0">
            <Avatar name={avatarName} src={avatarUrl} size={32} />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-50 ${
                online ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-slate-900 truncate">{title}</div>
          <div className={`text-[11px] truncate ${typingName ? "text-brand-600" : "text-slate-500"}`}>
            {subtitle}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <HeaderMenu
            profileHref={profileHref}
            searchOpen={searchOpen}
            onToggleSearch={onToggleSearch}
          />
          <button
            type="button"
            onClick={onToggleMinimize}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
            aria-label={minimized ? "Expand chat" : "Collapse chat"}
          >
            {minimized ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>
      </div>
      {!connected && (
        <div className="px-3 py-1 bg-amber-50 text-amber-800 text-[11px] border-t border-amber-100">
          Connection lost — reconnecting…
        </div>
      )}
    </div>
  );
}
