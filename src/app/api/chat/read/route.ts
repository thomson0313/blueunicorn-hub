import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { setReadCursor } from "@/lib/chat-repo";
import { requireUser, handleError } from "@/lib/api-guard";

const schema = z.object({
  conversationKey: z.string().min(1),
  lastReadAt: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    await connectDB();
    await setReadCursor(me.sub, parsed.data.conversationKey, parsed.data.lastReadAt);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
