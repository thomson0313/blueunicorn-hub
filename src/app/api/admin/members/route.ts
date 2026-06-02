import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { listUsers, createUser, emailOrUsernameTaken, projectCountsByOwner } from "@/lib/repo";
import { requireAdmin, handleError } from "@/lib/api-guard";
import { hashPassword } from "@/lib/auth";

// GET /api/admin/members -> all users with their project counts.
export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const counts = await projectCountsByOwner();
    const members = (await listUsers()).map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      username: u.username ?? null,
      role: u.role,
      createdAt: u.createdAt,
      projectCount: counts.get(u._id) || 0,
    }));

    return NextResponse.json({ members });
  } catch (err) {
    return handleError(err);
  }
}

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  email: z.string().email("Invalid email"),
  username: z.string().min(3, "Username must be at least 3 characters").max(40).optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "member"]).default("member"),
});

// POST /api/admin/members -> admin creates a new member or admin account.
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    await connectDB();

    const { name, email, username, password, role } = parsed.data;

    if (await emailOrUsernameTaken(email, username || null)) {
      return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ name, email, username: username || null, passwordHash, role });

    return NextResponse.json(
      {
        member: {
          _id: user._id,
          name: user.name,
          email: user.email,
          username: user.username ?? null,
          role: user.role,
          projectCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return handleError(err);
  }
}
