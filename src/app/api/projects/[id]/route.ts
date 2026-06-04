import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { findProjectById, updateProject, deleteProject, findMemberFieldById } from "@/lib/repo";
import { applyProgressStatus } from "@/lib/project-rules";
import { notifyProjectActivity } from "@/lib/hub-notifications";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";
import { budgetFieldsSchema, applyBudgetToPatch } from "@/lib/project-budget-api";

const statusEnum = z.enum(["in_progress", "completed", "canceled", "archived"]);

const updateSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional(),
    fieldId: z.string().uuid().optional(),
    timeline: z.string().max(200).optional(),
    previewLink: z.string().max(500).optional(),
    githubLink: z.string().max(500).optional(),
    completionRate: z.number().min(0).max(100).optional(),
    status: statusEnum.optional(),
    assignTo: z.string().uuid().optional(),
  })
  .merge(budgetFieldsSchema);

type Ctx = { params: Promise<{ id: string }> };

function canManage(userId: string, role: string, ownerId: string): boolean {
  return role === "admin" || ownerId === userId;
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
    if (!canManage(user.sub, user.role, project.owner)) {
      throw new HttpError(403, "You cannot edit this project");
    }

    const patch: Parameters<typeof updateProject>[1] = {};
    if (parsed.data.title !== undefined) patch.title = parsed.data.title;
    if (parsed.data.description !== undefined) patch.description = parsed.data.description;
    applyBudgetToPatch(patch, parsed.data);
    if (parsed.data.timeline !== undefined) patch.timeline = parsed.data.timeline;
    if (parsed.data.previewLink !== undefined) patch.previewLink = parsed.data.previewLink;
    if (parsed.data.githubLink !== undefined) patch.githubLink = parsed.data.githubLink;

    if (parsed.data.fieldId !== undefined) {
      const field = await findMemberFieldById(parsed.data.fieldId);
      if (!field) throw new HttpError(400, "Invalid field");
      patch.fieldId = parsed.data.fieldId;
    }

    if (user.role === "admin" && parsed.data.assignTo) {
      patch.owner = parsed.data.assignTo;
    }

    if (parsed.data.status !== undefined) {
      patch.status = parsed.data.status;
    }

    if (parsed.data.completionRate !== undefined) {
      if (user.role !== "admin") {
        patch.completionRate = parsed.data.completionRate;
        patch.status = applyProgressStatus(parsed.data.completionRate, project.status);
      }
    }

    const updated = await updateProject(id, patch);
    if (updated) {
      const detail =
        patch.status !== undefined
          ? `Status changed to ${patch.status.replace("_", " ")}`
          : "Project details were updated";
      void notifyProjectActivity(id, user.sub, "project_update", detail);
    }
    return NextResponse.json({ project: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await connectDB();

    const project = await findProjectById(id);
    if (!project) throw new HttpError(404, "Project not found");
    if (!canManage(user.sub, user.role, project.owner)) {
      throw new HttpError(403, "You cannot delete this project");
    }

    await deleteProject(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
