import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  listHubNotifications,
  countUnreadHubNotifications,
  markHubNotificationRead,
  markAllHubNotificationsRead,
} from "@/lib/hub-notifications";
import { requireUser, handleError } from "@/lib/api-guard";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    await connectDB();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const [notifications, unreadCount] = await Promise.all([
      listHubNotifications(user.sub, unreadOnly),
      countUnreadHubNotifications(user.sub),
    ]);
    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    await connectDB();

    if (body.markAllRead) {
      await markAllHubNotificationsRead(user.sub);
      return NextResponse.json({ ok: true });
    }

    if (typeof body.id === "string") {
      await markHubNotificationRead(body.id, user.sub);
      const unreadCount = await countUnreadHubNotifications(user.sub);
      return NextResponse.json({ ok: true, unreadCount });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (err) {
    return handleError(err);
  }
}
