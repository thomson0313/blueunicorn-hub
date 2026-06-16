import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { listChannelMembers, userCanAccessChannel } from "@/lib/chat-repo";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await ctx.params;
    await connectDB();
    const ok = await userCanAccessChannel(me.sub, id);
    if (!ok) throw new HttpError(403, "Not a member of this channel");
    const members = await listChannelMembers(id);
    return NextResponse.json({ members });
  } catch (err) {
    return handleError(err);
  }
}
