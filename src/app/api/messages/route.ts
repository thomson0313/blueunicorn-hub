import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  listGeneralMessages,
  listDmMessages,
  listGeneralMessagesSince,
  listDmMessagesSince,
  createGeneralMessage,
  createDmMessage,
  dmKeyFor,
} from "@/lib/repo";
import { toChatMessage } from "@/lib/chat-message";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

const postSchema = z.object({
  channel: z.enum(["general", "dm"]),
  to: z.string().optional(),
  content: z.string().min(1).max(4000),
});

// GET /api/messages?channel=general&since=<iso>
// GET /api/messages?channel=dm&with=<userId>&since=<iso>
export async function GET(req: Request) {
  try {
    const me = await requireUser();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const channel = searchParams.get("channel") || "general";
    const since = searchParams.get("since");

    if (channel === "dm") {
      const withUser = searchParams.get("with");
      if (!withUser) return NextResponse.json({ messages: [] });
      const key = dmKeyFor(me.sub, withUser);
      const messages = since
        ? await listDmMessagesSince(key, since)
        : await listDmMessages(key);
      return NextResponse.json({ messages });
    }

    const messages = since ? await listGeneralMessagesSince(since) : await listGeneralMessages();
    return NextResponse.json({ messages });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/messages — send via HTTP (used on Vercel where Socket.IO is unavailable).
export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    await connectDB();

    const { channel, to, content } = parsed.data;
    const trimmed = content.trim();
    if (!trimmed) throw new HttpError(400, "Message cannot be empty");

    if (channel === "general") {
      const created = await createGeneralMessage(me.sub, trimmed);
      return NextResponse.json({ message: toChatMessage(created) }, { status: 201 });
    }

    if (!to) throw new HttpError(400, "DM recipient is required");
    const created = await createDmMessage(me.sub, to, trimmed);
    return NextResponse.json({ message: toChatMessage(created, to) }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
