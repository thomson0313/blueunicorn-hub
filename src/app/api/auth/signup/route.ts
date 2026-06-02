import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  countUsers,
  createUser,
  emailOrUsernameTaken,
  findMemberFieldById,
} from "@/lib/repo";
import { hashPassword, signSession, type SessionPayload } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session-cookie";

const schema = z
  .object({
    name: z.string().min(1, "Name is required").max(80),
    email: z.string().email("Invalid email"),
    username: z.string().min(3, "Username must be at least 3 characters").max(40),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    fieldId: z.string().uuid("Please select a field"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { name, email, username, password, fieldId } = parsed.data;
    await connectDB();

    const field = await findMemberFieldById(fieldId);
    if (!field) {
      return NextResponse.json({ error: "Please select a valid field" }, { status: 400 });
    }

    if (await emailOrUsernameTaken(email, username)) {
      return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
    }

    const role: "admin" | "member" = (await countUsers()) === 0 ? "admin" : "member";

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      name,
      email,
      username,
      passwordHash,
      role,
      fieldId,
    });

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
