import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { findUserById, updateUser, deleteUser, findMemberFieldById, publicUser } from "@/lib/repo";
import { requireAdmin, handleError, HttpError } from "@/lib/api-guard";
import { hashPassword } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  role: z.enum(["admin", "member"]).optional(),
  fieldId: z.string().uuid().nullable().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  approvalStatus: z.enum(["accepted", "rejected"]).optional(),
});

// PATCH /api/admin/members/:id -> change role, rename, or reset password.
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    await connectDB();

    const user = await findUserById(id);
    if (!user) throw new HttpError(404, "Member not found");

    // Prevent an admin from demoting themselves (avoid lockout).
    if (user._id === admin.sub && parsed.data.role === "member") {
      throw new HttpError(400, "You cannot remove your own admin role");
    }

    if (parsed.data.fieldId) {
      const field = await findMemberFieldById(parsed.data.fieldId);
      if (!field) throw new HttpError(400, "Invalid field");
    }

    const patch: Parameters<typeof updateUser>[1] = {
      name: parsed.data.name,
      role: parsed.data.role,
      fieldId: parsed.data.fieldId,
      passwordHash: parsed.data.password ? await hashPassword(parsed.data.password) : undefined,
      approvalStatus: parsed.data.approvalStatus,
    };
    if (parsed.data.role === "admin") {
      patch.approvalStatus = "accepted";
    }

    const updated = await updateUser(id, patch);

    const pub = updated ? await publicUser(updated) : null;

    return NextResponse.json({
      member: pub
        ? {
            _id: pub._id,
            name: pub.name,
            email: pub.email,
            username: pub.username ?? null,
            role: pub.role,
            fieldId: pub.fieldId,
            fieldName: pub.fieldName,
            approvalStatus: updated?.approvalStatus,
          }
        : null,
    });
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/admin/members/:id -> remove a member and their data.
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    await connectDB();

    if (id === admin.sub) throw new HttpError(400, "You cannot delete your own account");

    const user = await findUserById(id);
    if (!user) throw new HttpError(404, "Member not found");

    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
