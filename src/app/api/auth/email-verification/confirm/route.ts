import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  deleteEmailVerificationCodes,
  findLatestEmailVerificationCode,
  findUserById,
  markEmailVerified,
} from "@/lib/repo";
import { requireSession, handleError, HttpError } from "@/lib/api-guard";
import { hashVerificationCode, isEmailVerified } from "@/lib/email-verification";

const schema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid code" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await findUserById(session.sub);
    if (!user) throw new HttpError(401, "Unauthorized");

    if (isEmailVerified(user.emailVerifiedAt)) {
      return NextResponse.json({ verified: true, message: "Email is already verified." });
    }

    const record = await findLatestEmailVerificationCode(user._id);
    if (!record) {
      throw new HttpError(400, "No verification code found. Click Verify Now to send one.");
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      throw new HttpError(400, "This code has expired. Request a new one.");
    }

    const codeHash = hashVerificationCode(parsed.data.code);
    if (codeHash !== record.codeHash) {
      throw new HttpError(400, "Invalid verification code.");
    }

    await markEmailVerified(user._id);
    await deleteEmailVerificationCodes(user._id);

    return NextResponse.json({ verified: true, message: "Email verified successfully." });
  } catch (err) {
    return handleError(err);
  }
}
