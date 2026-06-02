import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { findUserByEmailOrUsername } from "@/lib/repo";
import { comparePassword, signSession, type SessionPayload } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session-cookie";

const schema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const { identifier, password } = parsed.data;
  await connectDB();

  const user = await findUserByEmailOrUsername(identifier);
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

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
}
