import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  findPasswordResetByToken,
  deletePasswordResetByToken,
  updateUser,
} from "@/lib/repo";
import { hashPassword } from "@/lib/auth";

const schema = z.object({
  token: z.string().min(1, "Invalid reset link"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    await connectDB();
    const reset = await findPasswordResetByToken(parsed.data.token);
    if (!reset) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    if (new Date(reset.expiresAt).getTime() < Date.now()) {
      await deletePasswordResetByToken(parsed.data.token);
      return NextResponse.json({ error: "This reset link has expired" }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await updateUser(reset.userId, { passwordHash });
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await deletePasswordResetByToken(parsed.data.token);

    return NextResponse.json({ message: "Password updated. You can sign in now." });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Could not reset password" }, { status: 500 });
  }
}
