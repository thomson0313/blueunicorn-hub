import { NextResponse } from "next/server";
import type { Server as SocketIOServer } from "socket.io";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { deleteMessage, editMessage, getMessageById } from "@/lib/chat-repo";
import { broadcastMessageDeleted, broadcastMessageUpdate } from "@/lib/chat-socket";
import { toChatMessage } from "@/lib/chat-message";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

const patchSchema = z.object({
  content: z.string().min(1).max(4000),
});

function getIo() {
  return (globalThis as unknown as { _io?: SocketIOServer })._io;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    await connectDB();
    const updated = await editMessage(id, me.sub, parsed.data.content);
    if (!updated) throw new HttpError(404, "Message not found");
    const io = getIo();
    if (io) await broadcastMessageUpdate(io, id);
    return NextResponse.json({ message: toChatMessage(updated) });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await ctx.params;
    await connectDB();
    const existing = await getMessageById(id);
    if (!existing || existing.sender._id !== me.sub) {
      throw new HttpError(404, "Message not found");
    }
    const ok = await deleteMessage(id, me.sub);
    if (!ok) throw new HttpError(404, "Message not found");
    const io = getIo();
    if (io) {
      broadcastMessageDeleted(io, {
        messageId: id,
        channelType: existing.channelType,
        channelId: existing.channelId ?? undefined,
        recipient: existing.recipient ?? undefined,
        senderId: existing.sender._id,
      });
    }
    return NextResponse.json({ ok: true, messageId: id });
  } catch (err) {
    return handleError(err);
  }
}
