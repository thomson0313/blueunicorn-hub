import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";
import { createScreenShareSignal, listScreenShareSignalsSince } from "@/lib/screen-share-repo";

const signalSchema = z.object({
  type: z.enum(["offer", "answer", "ice-candidate"]),
  to: z.string().min(1),
  sdp: z.unknown().optional(),
  candidate: z.unknown().optional(),
});

// GET /api/screen-share/signals?since=<iso> — poll WebRTC + event signals.
export async function GET(req: Request) {
  try {
    const me = await requireUser();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since") || new Date(0).toISOString();

    const signals = await listScreenShareSignalsSince(me.sub, since);
    return NextResponse.json({
      signals: signals.map((s) => ({
        id: s.id,
        type: s.signalType,
        fromUserId: s.fromUserId,
        payload: s.payload,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/screen-share/signals — send WebRTC signaling message.
export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = signalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    await connectDB();

    const { type, to, sdp, candidate } = parsed.data;

    if (type !== "ice-candidate" && !sdp) {
      throw new HttpError(400, "SDP is required");
    }
    if (type === "ice-candidate" && !candidate) {
      throw new HttpError(400, "ICE candidate is required");
    }

    const payload =
      type === "ice-candidate"
        ? { candidate }
        : { sdp };

    await createScreenShareSignal(me.sub, to, type, payload as Record<string, unknown>);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
