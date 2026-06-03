import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { listProjects, createProject, findMemberFieldById } from "@/lib/repo";
import type { ProjectStatus } from "@/lib/repo";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

const statusEnum = z.enum(["in_progress", "completed", "canceled", "archived"]);

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().max(2000).optional().default(""),
  fieldId: z.string().uuid("Please select a field"),
  budget: z.string().max(120).optional().default(""),
  timeline: z.string().max(200).optional().default(""),
  assignTo: z.string().uuid().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const fieldId = searchParams.get("fieldId") || undefined;
    const statusParam = searchParams.get("status");
    const ownerIdParam = searchParams.get("ownerId");

    let status: ProjectStatus | undefined;
    if (statusParam && statusParam !== "all") {
      const parsed = statusEnum.safeParse(statusParam);
      if (parsed.success) status = parsed.data;
    }

    const filters = {
      fieldId: fieldId && fieldId !== "all" ? fieldId : undefined,
      status,
      ownerId:
        user.role === "admin"
          ? ownerIdParam && ownerIdParam !== "all"
            ? ownerIdParam
            : undefined
          : user.sub,
    };

    const projects = await listProjects(filters, true);
    return NextResponse.json({ projects });
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

    const field = await findMemberFieldById(parsed.data.fieldId);
    if (!field) throw new HttpError(400, "Invalid field");

    let ownerId = user.sub;
    if (user.role === "admin") {
      if (!parsed.data.assignTo) {
        throw new HttpError(400, "Please assign the project to a member");
      }
      ownerId = parsed.data.assignTo;
    }

    const project = await createProject({
      owner: ownerId,
      fieldId: parsed.data.fieldId,
      title: parsed.data.title,
      description: parsed.data.description,
      budget: parsed.data.budget,
      timeline: parsed.data.timeline,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
