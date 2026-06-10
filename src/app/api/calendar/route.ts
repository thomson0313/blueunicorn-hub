import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  createCalendarSchedule,
  listCalendarSchedulesForUser,
  type CalendarScheduleType,
} from "@/lib/repo";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";
import { enforceEventEnd } from "@/lib/calendar-utils";

const typeEnum = z.enum(["interview", "event"]);

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  type: typeEnum,
  description: z.string().max(2000).optional().default(""),
  meetingLink: z.string().max(500).optional().default(""),
  startsAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid start time"),
  endsAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid end time"),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    await connectDB();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
      throw new HttpError(400, "from and to query params are required");
    }
    const typeParam = searchParams.get("type");
    let type: CalendarScheduleType | undefined;
    if (typeParam && typeParam !== "all") {
      const parsed = typeEnum.safeParse(typeParam);
      if (parsed.success) type = parsed.data;
    }
    const schedules = await listCalendarSchedulesForUser(user.sub, from, to, type);
    return NextResponse.json({ schedules });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    await connectDB();

    const startsAt = new Date(parsed.data.startsAt);
    let endsAt = new Date(parsed.data.endsAt);
    if (parsed.data.type === "event") {
      endsAt = new Date(enforceEventEnd(startsAt.toISOString()));
    }
    if (endsAt <= startsAt) {
      throw new HttpError(400, "End time must be after start time");
    }

    const schedule = await createCalendarSchedule({
      userId: user.sub,
      title: parsed.data.title,
      type: parsed.data.type,
      description: parsed.data.description,
      meetingLink: parsed.data.meetingLink,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
