import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { hideUserDmConversation } from "@/lib/chat-repo";
import { parseChatTarget } from "@/lib/chat-target";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

/** DELETE /api/chat/conversations?target=<peerUserId> — hide DM for current user only. */
export async function DELETE(req: Request) {
  try {
    const me = await requireUser();
    await connectDB();

    const targetRaw = new URL(req.url).searchParams.get("target");
    if (!targetRaw) throw new HttpError(400, "target is required");

    const parsed = parseChatTarget(targetRaw);
    if (parsed.kind !== "dm") {
      throw new HttpError(400, "Only direct message conversations can be deleted");
    }
    if (parsed.userId === me.sub) {
      throw new HttpError(400, "Invalid conversation target");
    }

    await hideUserDmConversation(me.sub, parsed.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
