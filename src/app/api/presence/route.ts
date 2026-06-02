import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { touchPresence, listOnlineUserIds } from "@/lib/repo";
import { requireUser, handleError } from "@/lib/api-guard";

// GET /api/presence — user ids seen recently.
export async function GET() {
  try {
    await requireUser();
    await connectDB();
    const onlineUserIds = await listOnlineUserIds();
    return NextResponse.json({ onlineUserIds });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/presence — heartbeat while the app is open.
export async function POST() {
  try {
    const me = await requireUser();
    await connectDB();
    await touchPresence(me.sub);
    const onlineUserIds = await listOnlineUserIds();
    return NextResponse.json({ onlineUserIds });
  } catch (err) {
    return handleError(err);
  }
}
