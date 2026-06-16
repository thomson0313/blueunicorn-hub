import { NextResponse } from "next/server";
import type { Server as SocketIOServer } from "socket.io";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  createChatChannel,
  listAccessibleChannels,
  listConversationPreviews,
} from "@/lib/chat-repo";
import { broadcastChannelCreated } from "@/lib/chat-socket";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

function getIo() {
  return (globalThis as unknown as { _io?: SocketIOServer })._io;
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  visibility: z.enum(["public", "private"]),
  memberIds: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const me = await requireUser();
    await connectDB();
    const [channels, previews] = await Promise.all([
      listAccessibleChannels(me.sub),
      listConversationPreviews(me.sub),
    ]);
    return NextResponse.json({ channels, previews });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    await connectDB();
    const { name, visibility, memberIds } = parsed.data;
    if (visibility === "private" && (!memberIds || memberIds.length === 0)) {
      throw new HttpError(400, "Private channels require at least one member");
    }
    const channel = await createChatChannel(me.sub, name, visibility, memberIds || []);
    const io = getIo();
    if (io) {
      broadcastChannelCreated(io, {
        channel: {
          _id: channel._id,
          name: channel.name,
          visibility: channel.visibility,
          createdBy: channel.createdBy,
          createdAt: channel.createdAt,
        },
        memberIds: visibility === "private" ? [me.sub, ...(memberIds || [])] : undefined,
      });
    }
    return NextResponse.json({ channel }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
