"use client";

import { Avatar } from "@/components/Avatar";

export function ChannelHeaderAvatar({
  channelName,
  visibility,
  members = [],
}: {
  channelName: string;
  visibility: "public" | "private";
  members?: { name: string; avatarUrl?: string | null }[];
}) {
  if (visibility === "private" && members.length > 0) {
    const shown = members.slice(0, 4);
    return (
      <div className="flex items-center shrink-0 pl-1">
        {shown.map((m, i) => (
          <span
            key={`${m.name}-${i}`}
            className="relative"
            style={{ marginLeft: i === 0 ? 0 : -10, zIndex: shown.length - i }}
          >
            <Avatar name={m.name} src={m.avatarUrl} size={32} />
          </span>
        ))}
      </div>
    );
  }

  return (
    <span className="shrink-0">
      <Avatar name={channelName} size={36} />
    </span>
  );
}
