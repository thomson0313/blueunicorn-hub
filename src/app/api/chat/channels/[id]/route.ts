import { NextResponse } from "next/server";
import type { Server as SocketIOServer } from "socket.io";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  deleteChatChannel,
  getChannelById,
  updateChatChannel,
} from "@/lib/chat-repo";
import { broadcastChannelDeleted, broadcastChannelUpdated } from "@/lib/chat-socket";
import { getChannelManagePermission } from "@/lib/chat-channel-permissions";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

const patchSchema = z.object({
  name: z.string().min(1).max(80),
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
    await connectDB();
    const channel = await getChannelById(id);
    if (!channel) throw new HttpError(404, "Channel not found");
    const perm = getChannelManagePermission(me.sub, me.role, `channel:${id}`, channel);
    if (!perm.canEdit) throw new HttpError(403, "Not allowed to edit this channel");

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const updated = await updateChatChannel(id, parsed.data.name);
    if (!updated) throw new HttpError(404, "Channel not found");
    const io = getIo();
    if (io) {
      broadcastChannelUpdated(io, {
        channelId: id,
        name: updated.name,
        visibility: updated.visibility,
      });
    }
    return NextResponse.json({ channel: updated });
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
    const channel = await getChannelById(id);
    if (!channel) throw new HttpError(404, "Channel not found");
    const perm = getChannelManagePermission(me.sub, me.role, `channel:${id}`, channel);
    if (!perm.canDelete) throw new HttpError(403, "Not allowed to delete this channel");

    await deleteChatChannel(id);
    const io = getIo();
    if (io) broadcastChannelDeleted(io, { channelId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
