import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { findUserById, updateUser, deleteUser } from "@/lib/repo";
import { requireAdmin, handleError, HttpError } from "@/lib/api-guard";
import { hashPassword } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  role: z.enum(["admin", "member"]).optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
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

    const user = findUserById(id);
    if (!user) throw new HttpError(404, "Member not found");

    // Prevent an admin from demoting themselves (avoid lockout).
    if (user._id === admin.sub && parsed.data.role === "member") {
      throw new HttpError(400, "You cannot remove your own admin role");
    }

    const updated = updateUser(id, {
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash: parsed.data.password ? await hashPassword(parsed.data.password) : undefined,
    });

    return NextResponse.json({
      member: {
        _id: updated!._id,
        name: updated!.name,
        email: updated!.email,
        username: updated!.username ?? null,
        role: updated!.role,
      },
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

    const user = findUserById(id);
    if (!user) throw new HttpError(404, "Member not found");

    deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
