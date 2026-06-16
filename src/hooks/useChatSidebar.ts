"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp, useRealtimeMode } from "@/components/AppProvider";
import {
  clearPreviewOnDelete,
  renameChannelInList,
  updatePreviewIfLastMessage,
  upsertPreviewFromMessage,
} from "@/lib/chat-preview-sync";
import type { ChatChannel, ChatConversationPreview, ChatMessage, PublicUser } from "@/lib/types";

export function useChatSidebar() {
  const { socket, user } = useApp();
  const realtimeMode = useRealtimeMode();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [previews, setPreviews] = useState<ChatConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [usersRes, channelsRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/chat/channels"),
    ]);
    const usersData = await usersRes.json();
    const channelsData = await channelsRes.json();
    setUsers(usersData.users || []);
    setChannels(channelsData.channels || []);
    setPreviews(channelsData.previews || []);
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (realtimeMode !== "socket" || !socket) return;

    const onMessage = (msg: ChatMessage) => {
      setPreviews((prev) => upsertPreviewFromMessage(prev, msg, user.sub));
    };

    const onUpdated = (msg: ChatMessage) => {
      setPreviews((prev) => updatePreviewIfLastMessage(prev, msg, user.sub));
    };

    const onDeleted = (payload: {
      messageId: string;
      channelType: string;
      channelId?: string;
      recipient?: string;
      senderId: string;
    }) => {
      setPreviews((prev) => clearPreviewOnDelete(prev, payload, user.sub));
    };

    const onChannelUpdated = (payload: { channelId: string; name: string }) => {
      setChannels((prev) => renameChannelInList(prev, payload.channelId, payload.name));
    };

    const onChannelDeleted = (payload: { channelId: string }) => {
      const target = `channel:${payload.channelId}`;
      setChannels((prev) => prev.filter((c) => c._id !== payload.channelId));
      setPreviews((prev) => prev.filter((p) => p.target !== target));
    };

    const onChannelCreated = (payload: {
      channel: { _id: string; name: string; visibility: "public" | "private"; createdBy: string; createdAt: string };
      memberIds?: string[];
    }) => {
      const ch = payload.channel;
      const canSee =
        ch.visibility === "public" ||
        ch.createdBy === user.sub ||
        payload.memberIds?.includes(user.sub);
      if (!canSee) return;
      setChannels((prev) => {
        if (prev.some((c) => c._id === ch._id)) return prev;
        return [...prev, ch];
      });
      const target = `channel:${ch._id}`;
      setPreviews((prev) => {
        if (prev.some((p) => p.target === target)) return prev;
        return [
          ...prev,
          {
            key: target,
            target,
            kind: "channel" as const,
            title: ch.name,
            visibility: ch.visibility,
          },
        ];
      });
    };

    socket.on("general:message", onMessage);
    socket.on("dm:message", onMessage);
    socket.on("channel:message", onMessage);
    socket.on("chat:message-updated", onUpdated);
    socket.on("chat:message-deleted", onDeleted);
    socket.on("chat:channel-updated", onChannelUpdated);
    socket.on("chat:channel-deleted", onChannelDeleted);
    socket.on("chat:channel-created", onChannelCreated);

    return () => {
      socket.off("general:message", onMessage);
      socket.off("dm:message", onMessage);
      socket.off("channel:message", onMessage);
      socket.off("chat:message-updated", onUpdated);
      socket.off("chat:message-deleted", onDeleted);
      socket.off("chat:channel-updated", onChannelUpdated);
      socket.off("chat:channel-deleted", onChannelDeleted);
      socket.off("chat:channel-created", onChannelCreated);
    };
  }, [socket, realtimeMode, user.sub]);

  return { users, channels, previews, loading, refresh };
}
