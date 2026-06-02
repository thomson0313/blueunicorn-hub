import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { deliverDueAlerts, listDeliveredAlertsSince } from "@/lib/repo";
import { requireUser, handleError } from "@/lib/api-guard";

// GET /api/alerts/feed?since=<iso> — poll for delivered alerts (replaces socket push on Vercel).
export async function GET(req: Request) {
  try {
    await requireUser();
    await connectDB();

    const since = new URL(req.url).searchParams.get("since") || "1970-01-01T00:00:00.000Z";
    await deliverDueAlerts();
    const alerts = await listDeliveredAlertsSince(since);
    return NextResponse.json({
      alerts: alerts.map((a) => ({
        _id: a._id,
        title: a.title,
        content: a.content,
        scheduledAt: a.scheduledAt,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
