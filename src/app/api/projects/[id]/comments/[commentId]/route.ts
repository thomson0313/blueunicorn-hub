import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  findProjectById,
  findProjectCommentById,
  updateProjectComment,
  deleteProjectComment,
  canAccessProjectComments,
} from "@/lib/repo";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

type Ctx = { params: Promise<{ id: string; commentId: string }> };

const updateSchema = z.object({
  body: z.string().min(1).max(4000),
});

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id, commentId } = await params;
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    await connectDB();

    const project = await findProjectById(id);
    if (!project) throw new HttpError(404, "Project not found");
    if (!canAccessProjectComments(user.sub, user.role, project.owner)) {
      throw new HttpError(403, "Forbidden");
    }

    const comment = await findProjectCommentById(commentId);
    if (!comment || comment.projectId !== id) throw new HttpError(404, "Comment not found");
    if (comment.authorId !== user.sub && user.role !== "admin") {
      throw new HttpError(403, "You can only edit your own comments");
    }

    const updated = await updateProjectComment(commentId, parsed.data.body);
    return NextResponse.json({ comment: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id, commentId } = await params;
    await connectDB();

    const project = await findProjectById(id);
    if (!project) throw new HttpError(404, "Project not found");
    if (!canAccessProjectComments(user.sub, user.role, project.owner)) {
      throw new HttpError(403, "Forbidden");
    }

    const comment = await findProjectCommentById(commentId);
    if (!comment || comment.projectId !== id) throw new HttpError(404, "Comment not found");
    if (comment.authorId !== user.sub && user.role !== "admin") {
      throw new HttpError(403, "You can only delete your own comments");
    }

    await deleteProjectComment(commentId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
