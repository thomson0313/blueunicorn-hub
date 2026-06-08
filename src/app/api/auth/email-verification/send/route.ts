import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  createEmailVerificationCode,
  findLatestEmailVerificationCode,
  findUserById,
} from "@/lib/repo";
import { requireSession, handleError, HttpError } from "@/lib/api-guard";
import {
  canResendVerificationCode,
  generateVerificationCode,
  hashVerificationCode,
  isEmailVerified,
  resendCooldownSeconds,
  verificationCodeExpiresAt,
} from "@/lib/email-verification";
import { sendEmail } from "@/lib/send-email";

export async function POST() {
  try {
    const session = await requireSession();
    await connectDB();
    const user = await findUserById(session.sub);
    if (!user) throw new HttpError(401, "Unauthorized");

    if (isEmailVerified(user.emailVerifiedAt)) {
      return NextResponse.json({ verified: true, message: "Email is already verified." });
    }

    const latest = await findLatestEmailVerificationCode(user._id);
    if (!canResendVerificationCode(latest?.createdAt ?? null)) {
      throw new HttpError(
        429,
        `Please wait ${resendCooldownSeconds(latest?.createdAt ?? null)} seconds before requesting a new code.`
      );
    }

    const code = generateVerificationCode();
    const codeHash = hashVerificationCode(code);
    const expiresAt = verificationCodeExpiresAt();
    await createEmailVerificationCode(user._id, codeHash, expiresAt);

    const text = [
      `Hi ${user.name},`,
      "",
      `Your Blunicorn email verification code is: ${code}`,
      "",
      "This code expires in 15 minutes.",
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n");

    await sendEmail({
      to: user.email,
      subject: "Your Blunicorn verification code",
      text,
    });

    const payload: Record<string, unknown> = {
      message: `A 6-digit code was sent to ${user.email}.`,
      email: user.email,
    };

    if (process.env.NODE_ENV !== "production") {
      payload.devCode = code;
    }

    return NextResponse.json(payload);
  } catch (err) {
    return handleError(err);
  }
}
