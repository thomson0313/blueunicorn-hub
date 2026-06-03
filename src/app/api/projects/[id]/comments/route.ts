import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  findProjectById,
  listProjectComments,
  createProjectComment,
  findProjectCommentById,
  canAccessProjectComments,
} from "@/lib/repo";
import { buildCommentTree } from "@/lib/project-comments-tree";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

type Ctx = { params: Promise<{ id: string }> };

const createSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(4000),
  parentId: z.string().uuid().optional().nullable(),
});

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await connectDB();

    const project = await findProjectById(id);
    if (!project) throw new HttpError(404, "Project not found");
    if (!canAccessProjectComments(user.sub, user.role, project.owner)) {
      throw new HttpError(403, "You cannot view comments on this project");
    }

    const flat = await listProjectComments(id);
    return NextResponse.json({ comments: buildCommentTree(flat) });
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
    if (!canAccessProjectComments(user.sub, user.role, project.owner)) {
      throw new HttpError(403, "You cannot comment on this project");
    }

    if (parsed.data.parentId) {
      const parent = await findProjectCommentById(parsed.data.parentId);
      if (!parent || parent.projectId !== id) {
        throw new HttpError(400, "Invalid reply target");
      }
    }

    const comment = await createProjectComment({
      projectId: id,
      authorId: user.sub,
      body: parsed.data.body,
      parentId: parsed.data.parentId ?? null,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
