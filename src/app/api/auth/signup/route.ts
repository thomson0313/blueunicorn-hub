import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { countUsers, createUser, emailOrUsernameTaken } from "@/lib/repo";
import { hashPassword, signSession, type SessionPayload } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session-cookie";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  email: z.string().email("Invalid email"),
  username: z.string().min(3, "Username must be at least 3 characters").max(40).optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { name, email, username, password } = parsed.data;
    await connectDB();

    if (await emailOrUsernameTaken(email, username || null)) {
      return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
    }

    // The very first registered user becomes the admin.
    const role: "admin" | "member" = (await countUsers()) === 0 ? "admin" : "member";

    const passwordHash = await hashPassword(password);
    const user = await createUser({ name, email, username: username || null, passwordHash, role });

    const payload: SessionPayload = {
      sub: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    const token = await signSession(payload);

    const res = NextResponse.json({ user: payload });
    setSessionCookie(res, token);
    return res;
  } catch (err) {
    console.error("[signup]", err);
    const message = err instanceof Error ? err.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
