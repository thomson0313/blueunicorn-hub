import type { ChannelMeta } from "@/components/chat/ChannelCreatedBanner";
import type { ChatMessage } from "@/lib/types";

export type ConversationCacheEntry = {
  messages: ChatMessage[];
  peerReadAt: string | null;
  channelMeta: ChannelMeta | null;
  channelMembers: { name: string; avatarUrl?: string | null }[];
  lastMessageAt: string | null;
};

const cache = new Map<string, ConversationCacheEntry>();

export function getConversationCache(target: string): ConversationCacheEntry | undefined {
  return cache.get(target);
}

export function setConversationCache(target: string, entry: ConversationCacheEntry) {
  cache.set(target, { ...entry, messages: [...entry.messages] });
}

export function patchCachedMessage(target: string, msg: ChatMessage) {
  const entry = cache.get(target);
  if (!entry) return;
  const idx = entry.messages.findIndex((m) => m._id === msg._id);
  if (idx >= 0) {
    entry.messages[idx] = { ...entry.messages[idx], ...msg, pending: false };
  } else {
    entry.messages.push(msg);
  }
  entry.lastMessageAt = msg.createdAt;
}

export function removeCachedMessage(target: string, messageId: string) {
  const entry = cache.get(target);
  if (!entry) return;
  entry.messages = entry.messages.filter((m) => m._id !== messageId);
}
