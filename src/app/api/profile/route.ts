import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { findUserById, updateUser, publicUser } from "@/lib/repo";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";
import { signSession, type SessionPayload } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session-cookie";

// GET /api/profile -> the current user's full profile.
export async function GET() {
  try {
    const me = await requireUser();
    await connectDB();
    const user = await findUserById(me.sub);
    if (!user) throw new HttpError(404, "User not found");
    return NextResponse.json({ profile: publicUser(user) });
  } catch (err) {
    return handleError(err);
  }
}

const updateSchema = z.object({
  name: z.string().min(1, "Name is required").max(80).optional(),
  skills: z.string().max(500).optional(),
  plan: z.string().max(2000).optional(),
});

// PATCH /api/profile -> update the current user's name, skills, and plan.
export async function PATCH(req: Request) {
  try {
    const me = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    await connectDB();

    const user = await updateUser(me.sub, parsed.data);
    if (!user) throw new HttpError(404, "User not found");

    const res = NextResponse.json({ profile: publicUser(user) });

    // Keep the session cookie in sync if the display name changed.
    if (parsed.data.name && parsed.data.name !== me.name) {
      const payload: SessionPayload = { sub: user._id, name: user.name, email: user.email, role: user.role };
      setSessionCookie(res, await signSession(payload));
    }

    return res;
  } catch (err) {
    return handleError(err);
  }
}
