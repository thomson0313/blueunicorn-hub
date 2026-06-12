import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";
import {
  acceptScreenShareJoin,
  endScreenShareSession,
  getScreenShareState,
  leaveScreenShareSession,
  rejectScreenShareJoin,
  requestScreenShareJoin,
  startScreenShareSession,
} from "@/lib/screen-share-repo";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("end") }),
  z.object({ action: z.literal("request-join") }),
  z.object({ action: z.literal("accept"), userId: z.string().min(1) }),
  z.object({ action: z.literal("reject"), userId: z.string().min(1) }),
  z.object({ action: z.literal("leave") }),
]);

// GET /api/screen-share — current session state (polling mode).
export async function GET() {
  try {
    await requireUser();
    await connectDB();
    const state = await getScreenShareState();
    return NextResponse.json({ state });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/screen-share — session actions (polling mode).
export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    await connectDB();

    const { action } = parsed.data;
    let state;

    switch (action) {
      case "start":
        if (me.role !== "admin") throw new HttpError(403, "Only admins can host screen sharing");
        try {
          state = await startScreenShareSession(me.sub, me.name);
        } catch (err) {
          if (err instanceof Error && err.message.includes("already active")) {
            throw new HttpError(409, err.message);
          }
          throw err;
        }
        break;
      case "end":
        state = await endScreenShareSession(me.sub);
        break;
      case "request-join":
        state = await requestScreenShareJoin(me.sub, me.name);
        break;
      case "accept":
        state = await acceptScreenShareJoin(me.sub, parsed.data.userId);
        break;
      case "reject":
        state = await rejectScreenShareJoin(me.sub, parsed.data.userId);
        break;
      case "leave":
        state = await leaveScreenShareSession(me.sub);
        break;
    }

    return NextResponse.json({ state });
  } catch (err) {
    return handleError(err);
  }
}
