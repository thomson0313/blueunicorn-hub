import type { Server as SocketIOServer } from "socket.io";
import {
  createExtendedMessage,
  extendedToChatMessage,
  getMessageById,
  userCanAccessChannel,
} from "./chat-repo";
import type { Role } from "./repo";

export type ChatUser = { sub: string; name: string; role: Role };

export async function broadcastChatMessage(
  io: SocketIOServer,
  msg: Awaited<ReturnType<typeof createExtendedMessage>>,
  opts: { recipient?: string; channelId?: string; channelType: "general" | "dm" | "channel" }
) {
  const payload = extendedToChatMessage(msg, opts.recipient);
  if (opts.channelType === "general") {
    io.to("general").emit("general:message", payload);
    return;
  }
  if (opts.channelType === "dm" && opts.recipient) {
    io.to(`user:${opts.recipient}`).emit("dm:message", payload);
    io.to(`user:${msg.sender._id}`).emit("dm:message", payload);
    return;
  }
  if (opts.channelType === "channel" && opts.channelId) {
    io.to(`channel:${opts.channelId}`).emit("channel:message", payload);
  }
}

export async function handleGeneralSend(
  io: SocketIOServer,
  user: ChatUser,
  payload: { content?: string; parentId?: string; attachments?: unknown[] }
) {
  const content = (payload?.content || "").trim();
  const attachments = normalizeAttachments(payload.attachments);
  if (!content && !attachments.length) return;
  const doc = await createExtendedMessage({
    senderId: user.sub,
    channelType: "general",
    content,
    parentId: payload.parentId,
    attachments,
  });
  await broadcastChatMessage(io, doc, { channelType: "general" });
}

export async function handleDmSend(
  io: SocketIOServer,
  user: ChatUser,
  payload: { to?: string; content?: string; parentId?: string; attachments?: unknown[] }
) {
  const content = (payload?.content || "").trim();
  const to = payload?.to;
  const attachments = normalizeAttachments(payload.attachments);
  if ((!content && !attachments.length) || !to) return;
  const doc = await createExtendedMessage({
    senderId: user.sub,
    channelType: "dm",
    recipient: to,
    content,
    parentId: payload.parentId,
    attachments,
  });
  await broadcastChatMessage(io, doc, { channelType: "dm", recipient: to });
}

export async function handleChannelSend(
  io: SocketIOServer,
  user: ChatUser,
  payload: {
    channelId?: string;
    content?: string;
    parentId?: string;
    attachments?: unknown[];
  }
) {
  const channelId = payload?.channelId;
  const content = (payload?.content || "").trim();
  const attachments = normalizeAttachments(payload.attachments);
  if ((!content && !attachments.length) || !channelId) return;
  const ok = await userCanAccessChannel(user.sub, channelId);
  if (!ok) return;
  const doc = await createExtendedMessage({
    senderId: user.sub,
    channelType: "channel",
    channelId,
    content,
    parentId: payload.parentId,
    attachments,
  });
  await broadcastChatMessage(io, doc, { channelType: "channel", channelId });
}

export async function broadcastMessageUpdate(io: SocketIOServer, messageId: string) {
  const msg = await getMessageById(messageId);
  if (!msg || msg.deletedAt) return;
  const payload = extendedToChatMessage(msg, msg.recipient || undefined);
  io.emit("chat:message-updated", payload);
}

export function broadcastMessageDeleted(
  io: SocketIOServer,
  payload: { messageId: string; channelType: string; channelId?: string; recipient?: string; senderId: string }
) {
  io.emit("chat:message-deleted", payload);
}

function normalizeAttachments(raw: unknown[] | undefined) {
  if (!raw?.length) return [];
  return raw
    .map((a) => a as Record<string, unknown>)
    .filter((a) => a.fileUrl && a.fileName && a.mimeType)
    .map((a) => ({
      fileName: String(a.fileName),
      fileUrl: String(a.fileUrl),
      mimeType: String(a.mimeType),
      fileSize: Number(a.fileSize) || 0,
    }));
}
