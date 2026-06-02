import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { connectDB } from "@/lib/db";
import { findUserByEmail, createPasswordReset } from "@/lib/repo";

const schema = z.object({
  email: z.string().email("Invalid email"),
});

const GENERIC_MESSAGE =
  "If an account exists for that email, you will receive password reset instructions shortly.";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    await connectDB();
    const user = await findUserByEmail(parsed.data.email);

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await createPasswordReset(user._id, token, expiresAt);

      const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
      const resetLink = `${origin}/reset-password?token=${token}`;

      if (process.env.NODE_ENV !== "production") {
        console.log("[forgot-password] Reset link:", resetLink);
        return NextResponse.json({
          message: GENERIC_MESSAGE,
          resetLink,
        });
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
