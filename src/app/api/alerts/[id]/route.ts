import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { deleteAlert } from "@/lib/repo";
import { requireAdmin, handleError, HttpError } from "@/lib/api-guard";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/alerts/:id -> admin removes an alert.
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    await connectDB();
    if (!(await deleteAlert(id))) throw new HttpError(404, "Alert not found");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
