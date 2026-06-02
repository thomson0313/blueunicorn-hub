import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { findProjectById, updateProject, deleteProject } from "@/lib/repo";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  completionRate: z.number().min(0).max(100).optional(),
  status: z.enum(["not_started", "in_progress", "completed", "on_hold"]).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/projects/:id -> only the owner may update.
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
    if (project.owner !== user.sub) throw new HttpError(403, "You can only edit your own projects");

    const updated = await updateProject(id, parsed.data);
    return NextResponse.json({ project: updated });
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/projects/:id -> only the owner may delete.
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await connectDB();

    const project = await findProjectById(id);
    if (!project) throw new HttpError(404, "Project not found");
    if (project.owner !== user.sub) throw new HttpError(403, "You can only delete your own projects");

    await deleteProject(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
