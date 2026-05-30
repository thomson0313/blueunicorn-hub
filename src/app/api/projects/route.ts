import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { listAllProjects, listProjectsByOwner, createProject } from "@/lib/repo";
import { requireUser, handleError } from "@/lib/api-guard";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().max(2000).optional().default(""),
  completionRate: z.number().min(0).max(100).optional().default(0),
  status: z.enum(["not_started", "in_progress", "completed", "on_hold"]).optional(),
});

// GET /api/projects -> members get their own; admins get all (with owner populated).
export async function GET() {
  try {
    const user = await requireUser();
    await connectDB();

    const projects =
      user.role === "admin" ? listAllProjects(true) : listProjectsByOwner(user.sub, true);

    return NextResponse.json({ projects });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/projects -> create a project owned by the current user.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    await connectDB();

    const project = createProject({ ...parsed.data, owner: user.sub });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
