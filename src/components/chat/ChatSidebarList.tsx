"use client";

import { Avatar } from "@/components/Avatar";
import type { PublicUser } from "@/lib/types";

export function ChatSidebarList({
  users,
  target,
  onlineUserIds,
  unread,
  onSelect,
}: {
  users: PublicUser[];
  target: string;
  onlineUserIds: string[];
  unread: Record<string, number>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <button
        type="button"
        onClick={() => onSelect("general")}
        className={`w-full text-left px-3 py-2 rounded-lg font-medium mb-2 flex items-center justify-between cursor-pointer ${
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
      <div className="text-xs uppercase tracking-wide text-slate-400 px-3 mt-2 mb-1">Direct Messages</div>
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {users.map((u) => {
          const online = onlineUserIds.includes(u._id);
          return (
            <button
              key={u._id}
              type="button"
              onClick={() => onSelect(u._id)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 cursor-pointer ${
                target === u._id ? "bg-brand-50 text-brand-700" : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              <span className="relative shrink-0">
                <Avatar name={u.name} src={u.avatarUrl} size={32} />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                    online ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
              </span>
              <span className="flex-1 truncate">{u.name}</span>
              {unread[u._id] > 0 && (
                <span className="text-[11px] min-w-5 h-5 px-1.5 rounded-full bg-brand-500 text-white flex items-center justify-center">
                  {unread[u._id]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
