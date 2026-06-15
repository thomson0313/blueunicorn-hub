import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { dmKeyFor, listUsers, listUsersExcept, newId, nowISO, type Role } from "./repo";
import { dmConversationKey } from "./chat-target";

function dbError(error: PostgrestError | null): void {
  if (error) throw new Error(error.message);
}

export type ChannelVisibility = "public" | "private";

export type ChatChannelRec = {
  _id: string;
  name: string;
  visibility: ChannelVisibility;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageAttachmentRec = {
  _id: string;
  messageId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export type MessageReactionRec = {
  messageId: string;
  userId: string;
  userName: string;
  emoji: string;
  createdAt: string;
};

export type ExtendedMessageRec = {
  _id: string;
  sender: { _id: string; name: string; role: Role };
  channelType: "general" | "dm" | "channel";
  channelId?: string | null;
  recipient?: string | null;
  parentId?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  attachments: MessageAttachmentRec[];
  reactions: MessageReactionRec[];
  replyTo?: {
    _id: string;
    content: string;
    senderName: string;
    deleted: boolean;
  } | null;
};

export type ConversationPreview = {
  key: string;
  target: string;
  kind: "general" | "dm" | "channel";
  title: string;
  subtitle?: string;
  lastMessage?: string;
  lastSenderName?: string;
  lastAt?: string;
  unread?: number;
  avatarName?: string;
  avatarUrl?: string | null;
  online?: boolean;
  visibility?: ChannelVisibility;
};

type ChannelRow = {
  id: string;
  name: string;
  visibility: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  sender: string;
  channel_type: string;
  channel_id: string | null;
  recipient: string | null;
  dm_key: string | null;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

type AttachmentRow = {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

type ReactionRow = {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

function toChannelRec(row: ChannelRow): ChatChannelRec {
  return {
    _id: row.id,
    name: row.name,
    visibility: row.visibility as ChannelVisibility,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function attachMessageMeta(
  rows: MessageRow[],
  users: { _id: string; name: string; role: Role }[]
): Promise<ExtendedMessageRec[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const parentIds = [...new Set(rows.map((r) => r.parent_id).filter(Boolean))] as string[];

  const sb = getSupabase();
  const [attRes, reactRes, parentRes] = await Promise.all([
    sb.from("message_attachments").select("*").in("message_id", ids),
    sb.from("message_reactions").select("*").in("message_id", ids),
    parentIds.length
      ? sb.from("messages").select("id, content, sender, deleted_at").in("id", parentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  dbError(attRes.error);
  dbError(reactRes.error);
  dbError(parentRes.error);

  const userMap = new Map(users.map((u) => [u._id, u]));
  const attachmentsByMsg = new Map<string, MessageAttachmentRec[]>();
  for (const a of (attRes.data || []) as AttachmentRow[]) {
    const list = attachmentsByMsg.get(a.message_id) || [];
    list.push({
      _id: a.id,
      messageId: a.message_id,
      fileName: a.file_name,
      fileUrl: a.file_url,
      mimeType: a.mime_type,
      fileSize: a.file_size,
      createdAt: a.created_at,
    });
    attachmentsByMsg.set(a.message_id, list);
  }

  const reactionsByMsg = new Map<string, MessageReactionRec[]>();
  for (const r of (reactRes.data || []) as ReactionRow[]) {
    const list = reactionsByMsg.get(r.message_id) || [];
    list.push({
      messageId: r.message_id,
      userId: r.user_id,
      userName: userMap.get(r.user_id)?.name || "Unknown",
      emoji: r.emoji,
      createdAt: r.created_at,
    });
    reactionsByMsg.set(r.message_id, list);
  }

  const parentMap = new Map<
    string,
    { id: string; content: string; sender: string; deleted_at: string | null }
  >();
  for (const p of (parentRes.data || []) as {
    id: string;
    content: string;
    sender: string;
    deleted_at: string | null;
  }[]) {
    parentMap.set(p.id, p);
  }

  return rows.map((row) => {
    const sender = userMap.get(row.sender) || {
      _id: row.sender,
      name: "Unknown",
      role: "member" as Role,
    };
    const parent = row.parent_id ? parentMap.get(row.parent_id) : undefined;
    return {
      _id: row.id,
      sender,
      channelType: row.channel_type as "general" | "dm" | "channel",
      channelId: row.channel_id,
      recipient: row.recipient,
      parentId: row.parent_id,
      content: row.deleted_at ? "" : row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      editedAt: row.edited_at,
      deletedAt: row.deleted_at,
      attachments: attachmentsByMsg.get(row.id) || [],
      reactions: reactionsByMsg.get(row.id) || [],
      replyTo: parent
        ? {
            _id: parent.id,
            content: parent.deleted_at ? "" : parent.content,
            senderName: userMap.get(parent.sender)?.name || "Unknown",
            deleted: !!parent.deleted_at,
          }
        : null,
    };
  });
}

export async function listAccessibleChannels(userId: string): Promise<ChatChannelRec[]> {
  const sb = getSupabase();
  const { data: publicRows, error: pubErr } = await sb
    .from("chat_channels")
    .select("*")
    .eq("visibility", "public")
    .order("name", { ascending: true });
  dbError(pubErr);

  const { data: memberRows, error: memErr } = await sb
    .from("chat_channel_members")
    .select("channel_id")
    .eq("user_id", userId);
  dbError(memErr);

  const memberIds = (memberRows || []).map((r: { channel_id: string }) => r.channel_id);
  let privateRows: ChannelRow[] = [];
  if (memberIds.length) {
    const { data, error } = await sb
      .from("chat_channels")
      .select("*")
      .eq("visibility", "private")
      .in("id", memberIds);
    dbError(error);
    privateRows = (data || []) as ChannelRow[];
  }

  const merged = new Map<string, ChannelRow>();
  for (const r of [...((publicRows || []) as ChannelRow[]), ...privateRows]) {
    merged.set(r.id, r);
  }
  return [...merged.values()].map(toChannelRec);
}

export async function createChatChannel(
  userId: string,
  name: string,
  visibility: ChannelVisibility,
  memberIds: string[] = []
): Promise<ChatChannelRec> {
  const ts = nowISO();
  const id = newId();
  const sb = getSupabase();
  const { data, error } = await sb
    .from("chat_channels")
    .insert({
      id,
      name: name.trim(),
      visibility,
      created_by: userId,
      created_at: ts,
      updated_at: ts,
    })
    .select()
    .single();
  dbError(error);

  const members = new Set([userId, ...memberIds]);
  if (visibility === "private" || members.size > 1) {
    const rows = [...members].map((uid) => ({
      channel_id: id,
      user_id: uid,
      joined_at: ts,
    }));
    const { error: memErr } = await sb.from("chat_channel_members").insert(rows);
    dbError(memErr);
  } else {
    await sb.from("chat_channel_members").insert({
      channel_id: id,
      user_id: userId,
      joined_at: ts,
    });
  }

  return toChannelRec(data as ChannelRow);
}

export async function userCanAccessChannel(userId: string, channelId: string): Promise<boolean> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("chat_channels")
    .select("visibility")
    .eq("id", channelId)
    .maybeSingle();
  dbError(error);
  if (!data) return false;
  if (data.visibility === "public") return true;
  const { data: mem, error: memErr } = await sb
    .from("chat_channel_members")
    .select("user_id")
    .eq("channel_id", channelId)
    .eq("user_id", userId)
    .maybeSingle();
  dbError(memErr);
  return !!mem;
}

export async function listChannelMessages(
  channelId: string,
  limit = 200
): Promise<ExtendedMessageRec[]> {
  const users = await listUsers();
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("channel_type", "channel")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true })
    .limit(limit);
  dbError(error);
  return attachMessageMeta((data || []) as MessageRow[], users);
}

export async function listChannelMessagesSince(
  channelId: string,
  since: string,
  limit = 100
): Promise<ExtendedMessageRec[]> {
  const users = await listUsers();
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("channel_type", "channel")
    .eq("channel_id", channelId)
    .gt("created_at", since)
    .order("created_at", { ascending: true })
    .limit(limit);
  dbError(error);
  return attachMessageMeta((data || []) as MessageRow[], users);
}

export async function listGeneralMessagesExtended(limit = 200): Promise<ExtendedMessageRec[]> {
  const users = await listUsers();
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("channel_type", "general")
    .order("created_at", { ascending: true })
    .limit(limit);
  dbError(error);
  return attachMessageMeta((data || []) as MessageRow[], users);
}

export async function listGeneralMessagesSinceExtended(
  since: string,
  limit = 100
): Promise<ExtendedMessageRec[]> {
  const users = await listUsers();
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("channel_type", "general")
    .gt("created_at", since)
    .order("created_at", { ascending: true })
    .limit(limit);
  dbError(error);
  return attachMessageMeta((data || []) as MessageRow[], users);
}

export async function listDmMessagesExtended(
  dmKey: string,
  limit = 200
): Promise<ExtendedMessageRec[]> {
  const users = await listUsers();
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("channel_type", "dm")
    .eq("dm_key", dmKey)
    .order("created_at", { ascending: true })
    .limit(limit);
  dbError(error);
  return attachMessageMeta((data || []) as MessageRow[], users);
}

export async function listDmMessagesSinceExtended(
  dmKey: string,
  since: string,
  limit = 100
): Promise<ExtendedMessageRec[]> {
  const users = await listUsers();
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("channel_type", "dm")
    .eq("dm_key", dmKey)
    .gt("created_at", since)
    .order("created_at", { ascending: true })
    .limit(limit);
  dbError(error);
  return attachMessageMeta((data || []) as MessageRow[], users);
}

export type CreateExtendedMessageInput = {
  senderId: string;
  channelType: "general" | "dm" | "channel";
  content: string;
  recipient?: string;
  channelId?: string;
  parentId?: string | null;
  attachments?: {
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
  }[];
};

export async function createExtendedMessage(
  input: CreateExtendedMessageInput
): Promise<ExtendedMessageRec> {
  const ts = nowISO();
  const id = newId();
  const row = {
    id,
    sender: input.senderId,
    channel_type: input.channelType,
    channel_id: input.channelId ?? null,
    recipient: input.recipient ?? null,
    dm_key:
      input.channelType === "dm" && input.recipient
        ? dmKeyFor(input.senderId, input.recipient)
        : null,
    parent_id: input.parentId ?? null,
    content: input.content.trim() || (input.attachments?.length ? "📎 Attachment" : ""),
    created_at: ts,
    updated_at: ts,
    edited_at: null,
    deleted_at: null,
  };
  const { error } = await getSupabase().from("messages").insert(row);
  dbError(error);

  if (input.attachments?.length) {
    const attRows = input.attachments.map((a) => ({
      id: newId(),
      message_id: id,
      file_name: a.fileName,
      file_url: a.fileUrl,
      mime_type: a.mimeType,
      file_size: a.fileSize,
      created_at: ts,
    }));
    const { error: attErr } = await getSupabase().from("message_attachments").insert(attRows);
    dbError(attErr);
  }

  const users = await listUsers();
  const [msg] = await attachMessageMeta([row as unknown as MessageRow], users);
  return msg;
}

export async function editMessage(
  messageId: string,
  userId: string,
  content: string
): Promise<ExtendedMessageRec | null> {
  const ts = nowISO();
  const { data, error } = await getSupabase()
    .from("messages")
    .update({ content: content.trim(), edited_at: ts, updated_at: ts })
    .eq("id", messageId)
    .eq("sender", userId)
    .is("deleted_at", null)
    .select()
    .maybeSingle();
  dbError(error);
  if (!data) return null;
  const users = await listUsers();
  const [msg] = await attachMessageMeta([data as MessageRow], users);
  return msg;
}

export async function deleteMessage(messageId: string, userId: string): Promise<boolean> {
  const ts = nowISO();
  const { data, error } = await getSupabase()
    .from("messages")
    .update({ deleted_at: ts, updated_at: ts, content: "" })
    .eq("id", messageId)
    .eq("sender", userId)
    .select("id")
    .maybeSingle();
  dbError(error);
  return !!data;
}

export async function toggleMessageReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<"added" | "removed"> {
  const sb = getSupabase();
  const { data: existing, error: findErr } = await sb
    .from("message_reactions")
    .select("*")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();
  dbError(findErr);

  if (existing) {
    const { error } = await sb
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId)
      .eq("emoji", emoji);
    dbError(error);
    return "removed";
  }

  const { error } = await sb.from("message_reactions").insert({
    message_id: messageId,
    user_id: userId,
    emoji,
    created_at: nowISO(),
  });
  dbError(error);
  return "added";
}

export async function setReadCursor(
  userId: string,
  conversationKey: string,
  at?: string
): Promise<void> {
  const { error } = await getSupabase()
    .from("conversation_read_cursors")
    .upsert({
      user_id: userId,
      conversation_key: conversationKey,
      last_read_at: at || nowISO(),
    });
  dbError(error);
}

export async function getPeerReadAt(
  peerUserId: string,
  conversationKey: string
): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("conversation_read_cursors")
    .select("last_read_at")
    .eq("user_id", peerUserId)
    .eq("conversation_key", conversationKey)
    .maybeSingle();
  dbError(error);
  return data?.last_read_at ?? null;
}

export async function getMessageById(messageId: string): Promise<ExtendedMessageRec | null> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();
  dbError(error);
  if (!data) return null;
  const users = await listUsers();
  const [msg] = await attachMessageMeta([data as MessageRow], users);
  return msg;
}

/** Latest message per conversation for sidebar previews. */
export async function listConversationPreviews(userId: string): Promise<ConversationPreview[]> {
  const sb = getSupabase();
  const allUsers = await listUsers();
  const users = await listUsersExcept(userId);
  const channels = await listAccessibleChannels(userId);

  const previews: ConversationPreview[] = [];

  // General
  const { data: generalLast } = await sb
    .from("messages")
    .select("content, created_at, sender")
    .eq("channel_type", "general")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  previews.push({
    key: "general",
    target: "general",
    kind: "general",
    title: "General",
    lastMessage: generalLast?.content,
    lastSenderName: generalLast?.sender
      ? allUsers.find((u) => u._id === generalLast.sender)?.name
      : undefined,
    lastAt: generalLast?.created_at,
  });

  // DMs — one query for all messages involving user, group client-side
  const { data: dmRows } = await sb
    .from("messages")
    .select("content, created_at, sender, recipient, dm_key")
    .eq("channel_type", "dm")
    .or(`sender.eq.${userId},recipient.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(500);
  const dmByPeer = new Map<string, { content: string; created_at: string; sender: string }>();
  for (const row of dmRows || []) {
    const peer =
      row.sender === userId ? row.recipient : row.sender;
    if (!peer || dmByPeer.has(peer)) continue;
    dmByPeer.set(peer, row);
  }
  for (const u of users) {
    const last = dmByPeer.get(u._id);
    previews.push({
      key: dmConversationKey(userId, u._id),
      target: u._id,
      kind: "dm",
      title: u.name,
      subtitle: u.email,
      lastMessage: last?.content,
      lastSenderName: last ? allUsers.find((x) => x._id === last.sender)?.name : undefined,
      lastAt: last?.created_at,
      avatarName: u.name,
      avatarUrl: u.avatarUrl,
    });
  }

  // Custom channels
  for (const ch of channels) {
    const { data: last } = await sb
      .from("messages")
      .select("content, created_at, sender")
      .eq("channel_type", "channel")
      .eq("channel_id", ch._id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    previews.push({
      key: `channel:${ch._id}`,
      target: `channel:${ch._id}`,
      kind: "channel",
      title: ch.name,
      lastMessage: last?.content,
      lastSenderName: last ? allUsers.find((u) => u._id === last.sender)?.name : undefined,
      lastAt: last?.created_at,
      visibility: ch.visibility,
    });
  }

  return previews;
}

export function extendedToChatMessage(
  m: ExtendedMessageRec,
  recipient?: string
): import("./types").ChatMessage {
  return {
    _id: m._id,
    sender: m.sender,
    recipient,
    channelId: m.channelId,
    parentId: m.parentId,
    content: m.deletedAt ? "" : m.content,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    editedAt: m.editedAt,
    deletedAt: m.deletedAt,
    attachments: m.attachments.map((a) => ({
      _id: a._id,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
    })),
    reactions: m.reactions.map((r) => ({
      emoji: r.emoji,
      userId: r.userId,
      userName: r.userName,
    })),
    replyTo: m.replyTo,
  };
}
