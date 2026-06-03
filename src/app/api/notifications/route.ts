import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  listHubNotifications,
  listHubNotificationsSince,
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
    const since = searchParams.get("since");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (since) {
      const [newNotifications, unreadCount] = await Promise.all([
        listHubNotificationsSince(user.sub, since),
        countUnreadHubNotifications(user.sub),
      ]);
      return NextResponse.json({ newNotifications, unreadCount });
    }

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
      const unreadCount = await countUnreadHubNotifications(user.sub);
      return NextResponse.json({ ok: true, unreadCount });
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
