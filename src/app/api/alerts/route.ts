import { NextResponse } from "next/server";
import { z } from "zod";
import type { Server as SocketIOServer } from "socket.io";
import { connectDB } from "@/lib/db";
import { createAlert, listAlerts, markAlertDelivered } from "@/lib/repo";
import { requireAdmin, handleError } from "@/lib/api-guard";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  content: z.string().min(1, "Content is required").max(2000),
  scheduledAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date/time"),
});

// GET /api/alerts -> admin lists all alerts.
export async function GET() {
  try {
    await requireAdmin();
    await connectDB();
    return NextResponse.json({ alerts: listAlerts() });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/alerts -> admin schedules an alert. If due now, deliver immediately.
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    await connectDB();

    const scheduledAt = new Date(parsed.data.scheduledAt);
    const alert = createAlert({
      title: parsed.data.title,
      content: parsed.data.content,
      scheduledAt: scheduledAt.toISOString(),
      createdBy: admin.sub,
    });

    // If the scheduled time is already due, push it right away.
    if (scheduledAt.getTime() <= Date.now()) {
      const io = (globalThis as unknown as { _io?: SocketIOServer })._io;
      if (io) {
        io.emit("alert:new", {
          _id: alert._id,
          title: alert.title,
          content: alert.content,
          scheduledAt: alert.scheduledAt,
        });
        markAlertDelivered(alert._id);
      }
    }

    return NextResponse.json({ alert }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
