import { parseChatTarget } from "./chat-target";
import type { Role } from "./repo";

export type ChannelManagePermission = { canEdit: boolean; canDelete: boolean };

export function getChannelManagePermission(
  userId: string,
  userRole: Role,
  target: string,
  channel?: { createdBy: string; visibility: "public" | "private" } | null
): ChannelManagePermission {
  const parsed = parseChatTarget(target);
  if (parsed.kind === "dm") return { canEdit: false, canDelete: false };

  if (parsed.kind === "general") {
    const admin = userRole === "admin";
    return { canEdit: admin, canDelete: admin };
  }

  if (parsed.kind === "channel" && channel) {
    if (channel.visibility === "private") {
      const owner = channel.createdBy === userId;
      return { canEdit: owner, canDelete: owner };
    }
    if (userRole === "admin") return { canEdit: true, canDelete: true };
    const creator = channel.createdBy === userId;
    return { canEdit: creator, canDelete: creator };
  }

  return { canEdit: false, canDelete: false };
}
