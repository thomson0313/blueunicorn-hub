import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  findProjectById,
  listProjectTimeLogs,
  createProjectTimeLog,
  updateProjectTimeLogByDate,
  deleteProjectTimeLogByDate,
  aggregateHoursByDate,
  canTrackProjectTime,
} from "@/lib/repo";
import { assertValidWorkDate } from "@/lib/project-time-heatmap";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

type Ctx = { params: Promise<{ id: string }> };

const workDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const createSchema = z.object({
  workDate: workDateSchema,
  hours: z.number().positive("Hours must be greater than 0").max(24, "Max 24 hours per entry"),
});

const updateSchema = z.object({
  workDate: workDateSchema,
  hours: z.number().positive("Hours must be greater than 0").max(24, "Max 24 hours per entry"),
});

const deleteSchema = z.object({
  workDate: workDateSchema,
});

async function loadProjectTimePayload(projectId: string) {
  const logs = await listProjectTimeLogs(projectId);
  const hoursByDate = aggregateHoursByDate(logs);
  const totalHours = Object.values(hoursByDate).reduce((sum, h) => sum + h, 0);
  return { logs, hoursByDate, totalHours };
}

function requireTimeTracker(project: NonNullable<Awaited<ReturnType<typeof findProjectById>>>, userId: string) {
  if (project.budgetType !== "hourly") {
    throw new HttpError(400, "Time logs are only for hourly projects");
  }
  if (!canTrackProjectTime(userId, project.owner)) {
    throw new HttpError(403, "Only the assigned member can manage time logs");
  }
}

function validateWorkDate(workDate: string, projectCreatedAt: string) {
  try {
    assertValidWorkDate(workDate, projectCreatedAt);
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : "Invalid date");
  }
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await connectDB();

    const project = await findProjectById(id);
    if (!project) throw new HttpError(404, "Project not found");
    requireTimeTracker(project, user.sub);

    return NextResponse.json(await loadProjectTimePayload(id));
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
    requireTimeTracker(project, user.sub);
    validateWorkDate(parsed.data.workDate, project.createdAt);

    try {
      const log = await createProjectTimeLog({
        projectId: id,
        userId: user.sub,
        workDate: parsed.data.workDate,
        hours: parsed.data.hours,
      });
      const payload = await loadProjectTimePayload(id);
      return NextResponse.json({ log, ...payload }, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message.includes("already logged")) {
        throw new HttpError(409, err.message);
      }
      throw err;
    }
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

    const project = await findProjectById(id);
    if (!project) throw new HttpError(404, "Project not found");
    requireTimeTracker(project, user.sub);
    validateWorkDate(parsed.data.workDate, project.createdAt);

    const log = await updateProjectTimeLogByDate(id, parsed.data.workDate, parsed.data.hours);
    if (!log) throw new HttpError(404, "No time logged for this date");

    const payload = await loadProjectTimePayload(id);
    return NextResponse.json({ log, ...payload });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    await connectDB();

    const project = await findProjectById(id);
    if (!project) throw new HttpError(404, "Project not found");
    requireTimeTracker(project, user.sub);
    validateWorkDate(parsed.data.workDate, project.createdAt);

    const ok = await deleteProjectTimeLogByDate(id, parsed.data.workDate);
    if (!ok) throw new HttpError(404, "No time logged for this date");

    const payload = await loadProjectTimePayload(id);
    return NextResponse.json({ ok: true, ...payload });
  } catch (err) {
    return handleError(err);
  }
}
