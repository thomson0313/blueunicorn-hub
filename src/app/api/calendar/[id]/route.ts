import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  deleteCalendarSchedule,
  findCalendarScheduleById,
  updateCalendarSchedule,
} from "@/lib/repo";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";
const typeEnum = z.enum(["interview", "event"]);

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  type: typeEnum.optional(),
  description: z.string().max(2000).optional(),
  meetingLink: z.string().max(500).optional(),
  startsAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid start time").optional(),
  endsAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid end time").optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await connectDB();

    const schedule = await findCalendarScheduleById(id);
    if (!schedule) throw new HttpError(404, "Schedule not found");
    if (user.role !== "admin" && schedule.userId !== user.sub) {
      throw new HttpError(403, "You cannot view this schedule");
    }

    return NextResponse.json({ schedule });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    await connectDB();

    const existing = await findCalendarScheduleById(id);
    if (!existing) throw new HttpError(404, "Schedule not found");
    if (existing.userId !== user.sub) throw new HttpError(403, "You cannot edit this schedule");

    const startsAt = parsed.data.startsAt ?? existing.startsAt;
    const endsAt = parsed.data.endsAt ?? existing.endsAt;
    if (new Date(endsAt) <= new Date(startsAt)) {
      throw new HttpError(400, "End time must be after start time");
    }

    const schedule = await updateCalendarSchedule(id, {
      ...parsed.data,
      startsAt,
      endsAt,
    });
    return NextResponse.json({ schedule });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await connectDB();

    const existing = await findCalendarScheduleById(id);
    if (!existing) throw new HttpError(404, "Schedule not found");
    if (existing.userId !== user.sub) throw new HttpError(403, "You cannot delete this schedule");

    await deleteCalendarSchedule(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
