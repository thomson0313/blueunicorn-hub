import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  findProjectById,
  listProjectTimeLogs,
  createProjectTimeLog,
  aggregateHoursByDate,
  canManageProject,
} from "@/lib/repo";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

type Ctx = { params: Promise<{ id: string }> };

const createSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  hours: z.number().positive("Hours must be greater than 0").max(24, "Max 24 hours per entry"),
});

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await connectDB();

    const project = await findProjectById(id);
    if (!project) throw new HttpError(404, "Project not found");
    if (!canManageProject(user.sub, user.role, project.owner)) {
      throw new HttpError(403, "You cannot view time logs for this project");
    }
    if (project.budgetType !== "hourly") {
      throw new HttpError(400, "Time logs are only for hourly projects");
    }

    const logs = await listProjectTimeLogs(id);
    const hoursByDate = aggregateHoursByDate(logs);
    const totalHours = Object.values(hoursByDate).reduce((sum, h) => sum + h, 0);

    return NextResponse.json({ logs, hoursByDate, totalHours });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    await connectDB();

    const project = await findProjectById(id);
    if (!project) throw new HttpError(404, "Project not found");
    if (!canManageProject(user.sub, user.role, project.owner)) {
      throw new HttpError(403, "You cannot log time on this project");
    }
    if (project.budgetType !== "hourly") {
      throw new HttpError(400, "Time logs are only for hourly projects");
    }

    const workDate = new Date(`${parsed.data.workDate}T12:00:00`);
    if (Number.isNaN(workDate.getTime())) throw new HttpError(400, "Invalid date");

    const log = await createProjectTimeLog({
      projectId: id,
      userId: user.sub,
      workDate: parsed.data.workDate,
      hours: parsed.data.hours,
    });

    const logs = await listProjectTimeLogs(id);
    const hoursByDate = aggregateHoursByDate(logs);
    const totalHours = Object.values(hoursByDate).reduce((sum, h) => sum + h, 0);

    return NextResponse.json({ log, hoursByDate, totalHours }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
