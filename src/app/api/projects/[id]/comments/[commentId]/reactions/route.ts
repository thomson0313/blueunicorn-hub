import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  findProjectById,
  findProjectCommentById,
  toggleProjectCommentReaction,
  canAccessProjectComments,
} from "@/lib/repo";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

type Ctx = { params: Promise<{ id: string; commentId: string }> };

const ALLOWED = ["👍", "❤️", "😄", "🎉", "🔥"] as const;

const reactionSchema = z.object({
  emoji: z.enum(ALLOWED),
});

export async function POST(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id, commentId } = await params;
    const body = await req.json().catch(() => null);
    const parsed = reactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
    }
    await connectDB();

    const project = await findProjectById(id);
    if (!project) throw new HttpError(404, "Project not found");
    if (!canAccessProjectComments(user.sub, user.role, project.owner)) {
      throw new HttpError(403, "Forbidden");
    }

    const comment = await findProjectCommentById(commentId);
    if (!comment || comment.projectId !== id) throw new HttpError(404, "Comment not found");

    const result = await toggleProjectCommentReaction(commentId, user.sub, parsed.data.emoji);
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}
