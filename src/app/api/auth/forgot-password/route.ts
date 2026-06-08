import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { connectDB } from "@/lib/db";
import { findUserByEmail, createPasswordReset, findLatestPasswordResetForUser } from "@/lib/repo";
import { sendEmail } from "@/lib/send-email";
import {
  appOriginFromRequest,
  brandLogoUrl,
  buildPasswordResetEmail,
} from "@/lib/email-templates/password-reset-email";
import {
  canResendVerificationCode,
  resendCooldownSeconds,
} from "@/lib/email-verification";

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

    const payload: Record<string, unknown> = { message: GENERIC_MESSAGE };

    if (user) {
      const latest = await findLatestPasswordResetForUser(user._id);
      if (!canResendVerificationCode(latest?.createdAt ?? null)) {
        return NextResponse.json(
          {
            error: `Please wait ${resendCooldownSeconds(latest?.createdAt ?? null)} seconds before requesting another reset email.`,
          },
          { status: 429 }
        );
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await createPasswordReset(user._id, token, expiresAt);

      const origin = appOriginFromRequest(req);
      const resetLink = `${origin}/reset-password?token=${token}`;
      const emailContent = buildPasswordResetEmail({
        name: user.name,
        resetLink,
        logoUrl: brandLogoUrl(origin),
      });

      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      if (process.env.NODE_ENV !== "production") {
        payload.resetLink = resetLink;
      }
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
