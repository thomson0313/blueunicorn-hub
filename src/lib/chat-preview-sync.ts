import type { ChatChannel, ChatConversationPreview, ChatMessage } from "@/lib/types";

export function messageToPreviewTarget(msg: ChatMessage, myId: string): string {
  if (msg.channelId) return `channel:${msg.channelId}`;
  if (msg.recipient) return msg.sender._id === myId ? msg.recipient : msg.sender._id;
  return "general";
}

export function previewTextFromMessage(msg: ChatMessage): string {
  if (msg.deletedAt) return "Message deleted";
  if (msg.content?.trim()) return msg.content;
  if (msg.attachments?.length) return "📎 Attachment";
  return "";
}

export function upsertPreviewFromMessage(
  previews: ChatConversationPreview[],
  msg: ChatMessage,
  myId: string
): ChatConversationPreview[] {
  const target = messageToPreviewTarget(msg, myId);
  const text = previewTextFromMessage(msg);
  const idx = previews.findIndex((p) => p.target === target);
  const patch = {
    lastMessage: text,
    lastSenderName: msg.sender.name,
    lastAt: msg.createdAt,
  };
  if (idx >= 0) {
    const next = [...previews];
    next[idx] = { ...next[idx], ...patch };
    return next;
  }
  const kind = target === "general" ? "general" : target.startsWith("channel:") ? "channel" : "dm";
  return [
    ...previews,
    {
      key: target,
      target,
      kind,
      title: target,
      ...patch,
    },
  ];
}

export function updatePreviewIfLastMessage(
  previews: ChatConversationPreview[],
  msg: ChatMessage,
  myId: string
): ChatConversationPreview[] {
  const target = messageToPreviewTarget(msg, myId);
  const idx = previews.findIndex((p) => p.target === target);
  if (idx < 0) return previews;
  const prev = previews[idx];
  if (prev.lastAt && prev.lastAt > msg.createdAt) return previews;
  const next = [...previews];
  next[idx] = {
    ...prev,
    lastMessage: previewTextFromMessage(msg),
    lastSenderName: msg.sender.name,
    lastAt: msg.createdAt,
  };
  return next;
}

export function clearPreviewOnDelete(
  previews: ChatConversationPreview[],
  payload: {
    messageId: string;
    channelType: string;
    channelId?: string;
    recipient?: string;
    senderId: string;
  },
  myId: string
): ChatConversationPreview[] {
  let target = "general";
  if (payload.channelType === "channel" && payload.channelId) {
    target = `channel:${payload.channelId}`;
  } else if (payload.channelType === "dm") {
    target = payload.senderId === myId ? payload.recipient || "" : payload.senderId;
  }
  const idx = previews.findIndex((p) => p.target === target);
  if (idx < 0) return previews;
  const next = [...previews];
  next[idx] = { ...next[idx], lastMessage: "Message deleted" };
  return next;
}

export function renameChannelInList(
  channels: ChatChannel[],
  channelId: string,
  name: string
): ChatChannel[] {
  return channels.map((c) => (c._id === channelId ? { ...c, name } : c));
}

export function removeChannelFromList(
  channels: ChatChannel[],
  previews: ChatConversationPreview[],
  channelId: string
): { channels: ChatChannel[]; previews: ChatConversationPreview[] } {
  const target = `channel:${channelId}`;
  return {
    channels: channels.filter((c) => c._id !== channelId),
    previews: previews.filter((p) => p.target !== target),
  };
}
