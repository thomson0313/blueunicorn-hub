import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { listGeneralMessages, listDmMessages, dmKeyFor } from "@/lib/repo";
import { requireUser, handleError } from "@/lib/api-guard";

// GET /api/messages?channel=general
// GET /api/messages?channel=dm&with=<userId>
export async function GET(req: Request) {
  try {
    const me = await requireUser();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const channel = searchParams.get("channel") || "general";

    if (channel === "dm") {
      const withUser = searchParams.get("with");
      if (!withUser) return NextResponse.json({ messages: [] });
      return NextResponse.json({ messages: await listDmMessages(dmKeyFor(me.sub, withUser)) });
    }

    return NextResponse.json({ messages: await listGeneralMessages() });
  } catch (err) {
    return handleError(err);
  }
}
