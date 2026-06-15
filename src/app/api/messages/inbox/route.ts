import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { listInboxMessagesSince } from "@/lib/repo";
import { toChatMessageLegacy } from "@/lib/chat-message";
import { requireUser, handleError } from "@/lib/api-guard";

// GET /api/messages/inbox?since=<iso> — recent messages for unread badges (polling mode).
export async function GET(req: Request) {
  try {
    const me = await requireUser();
    await connectDB();
    const since = new URL(req.url).searchParams.get("since") || "1970-01-01T00:00:00.000Z";
    const rows = await listInboxMessagesSince(me.sub, since);
    const messages = rows.map((m) =>
      toChatMessageLegacy(m, m.channelType === "dm" ? m.recipient || undefined : undefined)
    );
    return NextResponse.json({ messages });
  } catch (err) {
    return handleError(err);
  }
}
