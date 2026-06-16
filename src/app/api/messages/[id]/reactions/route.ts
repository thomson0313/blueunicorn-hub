import { NextResponse } from "next/server";
import type { Server as SocketIOServer } from "socket.io";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getMessageById, toggleMessageReaction } from "@/lib/chat-repo";
import { broadcastMessageUpdate } from "@/lib/chat-socket";
import { toChatMessage } from "@/lib/chat-message";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

const schema = z.object({
  emoji: z.string().min(1).max(16),
});

function getIo() {
  return (globalThis as unknown as { _io?: SocketIOServer })._io;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    await connectDB();
    const action = await toggleMessageReaction(id, me.sub, parsed.data.emoji);
    const msg = await getMessageById(id);
    if (!msg) throw new HttpError(404, "Message not found");
    const io = getIo();
    if (io) await broadcastMessageUpdate(io, id);
    return NextResponse.json({ action, message: toChatMessage(msg) });
  } catch (err) {
    return handleError(err);
  }
}
