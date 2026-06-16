import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { dmKeyFor } from "@/lib/repo";
import {
  createExtendedMessage,
  getChannelById,
  getChannelPeerReadAt,
  getGeneralChannelMeta,
  getPeerReadAt,
  listChannelMembers,
  listChannelMessages,
  listChannelMessagesSince,
  listDmMessagesExtended,
  listDmMessagesSinceExtended,
  listGeneralMessagesExtended,
  listGeneralMessagesSinceExtended,
  userCanAccessChannel,
} from "@/lib/chat-repo";
import { toChatMessage } from "@/lib/chat-message";
import { dmConversationKey, parseChatTarget } from "@/lib/chat-target";
import { listUsers } from "@/lib/repo";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

const attachmentSchema = z.object({
  fileName: z.string(),
  fileUrl: z.string().min(1),
  mimeType: z.string(),
  fileSize: z.number().int().nonnegative(),
});

const postSchema = z.object({
  channel: z.enum(["general", "dm", "channel"]),
  to: z.string().optional(),
  channelId: z.string().optional(),
  content: z.string().max(4000).optional().default(""),
  parentId: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
});

// GET /api/messages?target=general|userId|channel:uuid&since=<iso>
// Legacy: ?channel=general&with=<userId>
export async function GET(req: Request) {
  try {
    const me = await requireUser();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const targetRaw =
      searchParams.get("target") ||
      (searchParams.get("channel") === "dm"
        ? searchParams.get("with") || ""
        : searchParams.get("channel") || "general");
    const since = searchParams.get("since");
    const parsed = parseChatTarget(targetRaw || "general");

    if (parsed.kind === "dm") {
      const key = dmKeyFor(me.sub, parsed.userId);
      const convKey = dmConversationKey(me.sub, parsed.userId);
      const rows = since
        ? await listDmMessagesSinceExtended(key, since)
        : await listDmMessagesExtended(key);
      const peerReadAt = await getPeerReadAt(parsed.userId, convKey);
      return NextResponse.json({
        messages: rows.map((m) => toChatMessage(m, parsed.userId)),
        peerReadAt,
      });
    }

    if (parsed.kind === "channel") {
      const ok = await userCanAccessChannel(me.sub, parsed.channelId);
      if (!ok) throw new HttpError(403, "Not a member of this channel");
      const convKey = `channel:${parsed.channelId}`;
      const rows = since
        ? await listChannelMessagesSince(parsed.channelId, since)
        : await listChannelMessages(parsed.channelId);
      const [peerReadAt, channel, members] = await Promise.all([
        getChannelPeerReadAt(me.sub, convKey),
        getChannelById(parsed.channelId),
        listChannelMembers(parsed.channelId),
      ]);
      const users = await listUsers();
      const creator = channel ? users.find((u) => u._id === channel.createdBy) : null;
      return NextResponse.json({
        messages: rows.map((m) => toChatMessage(m)),
        peerReadAt,
        channelMeta: channel
          ? {
              visibility: channel.visibility,
              createdByName: creator?.name || "Unknown",
              createdAt: channel.createdAt,
              isGeneral: false,
            }
          : null,
        channelMembers: members,
      });
    }

    const convKey = "general";
    const rows = since
      ? await listGeneralMessagesSinceExtended(since)
      : await listGeneralMessagesExtended();
    const [peerReadAt, generalMeta, allUsers] = await Promise.all([
      getChannelPeerReadAt(me.sub, convKey),
      getGeneralChannelMeta(),
      listUsers(),
    ]);
    return NextResponse.json({
      messages: rows.map((m) => toChatMessage(m)),
      peerReadAt,
      channelMeta: {
        visibility: "public" as const,
        createdByName: generalMeta.createdByName,
        createdAt: generalMeta.createdAt,
        isGeneral: true,
      },
      channelMembers: allUsers.map((u) => ({
        userId: u._id,
        name: u.name,
        username: u.username ?? null,
        avatarUrl: u.avatarUrl ?? null,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    await connectDB();

    const { channel, to, channelId, content, parentId, attachments } = parsed.data;
    const trimmed = (content || "").trim();
    if (!trimmed && !attachments?.length) {
      throw new HttpError(400, "Message cannot be empty");
    }

    if (channel === "general") {
      const created = await createExtendedMessage({
        senderId: me.sub,
        channelType: "general",
        content: trimmed,
        parentId,
        attachments,
      });
      return NextResponse.json({ message: toChatMessage(created) }, { status: 201 });
    }

    if (channel === "dm") {
      if (!to) throw new HttpError(400, "DM recipient is required");
      const created = await createExtendedMessage({
        senderId: me.sub,
        channelType: "dm",
        recipient: to,
        content: trimmed,
        parentId,
        attachments,
      });
      return NextResponse.json({ message: toChatMessage(created, to) }, { status: 201 });
    }

    if (!channelId) throw new HttpError(400, "Channel id is required");
    const ok = await userCanAccessChannel(me.sub, channelId);
    if (!ok) throw new HttpError(403, "Not a member of this channel");
    const created = await createExtendedMessage({
      senderId: me.sub,
      channelType: "channel",
      channelId,
      content: trimmed,
      parentId,
      attachments,
    });
    return NextResponse.json({ message: toChatMessage(created) }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
