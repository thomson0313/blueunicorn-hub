import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { listTeamSchedulesForDay, listUsers } from "@/lib/repo";
import { requireAdmin, handleError, HttpError } from "@/lib/api-guard";
import { getDayRangeUtc, normalizeTimeZone, parseYmd } from "@/lib/calendar-utils";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    await connectDB();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const timeZone = normalizeTimeZone(searchParams.get("timezone"));
    if (!date) throw new HttpError(400, "date query param is required");
    const ymd = parseYmd(date);
    if (!ymd) throw new HttpError(400, "Invalid date");

    const { start, end } = getDayRangeUtc(ymd, timeZone);
    const schedules = await listTeamSchedulesForDay(start, end);
    const members = (await listUsers())
      .filter((u) => u.role === "member" || u.role === "admin")
      .map((u) => ({
        id: u._id,
        name: u.name,
        avatarUrl: u.avatarUrl ?? null,
        role: u.role,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ schedules, members, date, timeZone });
  } catch (err) {
    return handleError(err);
  }
}
