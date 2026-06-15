import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { deleteMessage, editMessage, getMessageById } from "@/lib/chat-repo";
import { toChatMessage } from "@/lib/chat-message";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

const patchSchema = z.object({
  content: z.string().min(1).max(4000),
});

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
    const ok = await deleteMessage(id, me.sub);
    if (!ok) throw new HttpError(404, "Message not found");
    const msg = await getMessageById(id);
    return NextResponse.json({ message: msg ? toChatMessage(msg) : { _id: id, deleted: true } });
  } catch (err) {
    return handleError(err);
  }
}
