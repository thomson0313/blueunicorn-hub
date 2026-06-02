import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { listMemberFields, createMemberField, deleteMemberField } from "@/lib/repo";
import { requireAdmin, handleError } from "@/lib/api-guard";

export async function GET() {
  try {
    await requireAdmin();
    await connectDB();
    const fields = await listMemberFields();
    return NextResponse.json({
      fields: fields.map((f) => ({ _id: f._id, name: f.name })),
    });
  } catch (err) {
    return handleError(err);
  }
}

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    await connectDB();
    const field = await createMemberField(parsed.data.name);
    return NextResponse.json({ field: { _id: field._id, name: field.name } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not add field";
    if (message.includes("duplicate") || message.includes("unique")) {
      return NextResponse.json({ error: "A field with this name already exists" }, { status: 409 });
    }
    return handleError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing field id" }, { status: 400 });
    await connectDB();
    const result = await deleteMemberField(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Could not delete field" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
