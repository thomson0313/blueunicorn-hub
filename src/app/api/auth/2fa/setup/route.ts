import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { findUserById, updateUser } from "@/lib/repo";
import { requireSession, handleError, HttpError } from "@/lib/api-guard";
import { isEmailVerified } from "@/lib/email-verification";
import { buildTotpUri, createTotpSecret, isTotpEnabled } from "@/lib/totp";

export async function POST() {
  try {
    const session = await requireSession();
    await connectDB();
    const user = await findUserById(session.sub);
    if (!user) throw new HttpError(401, "Unauthorized");
    if (!isEmailVerified(user.emailVerifiedAt)) {
      throw new HttpError(403, "Verify your email before enabling two-factor authentication.");
    }
    if (isTotpEnabled(user.totpEnabledAt)) {
      throw new HttpError(400, "Two-factor authentication is already enabled.");
    }

    const secret = createTotpSecret();
    await updateUser(user._id, { totpSecret: secret, totpEnabledAt: null });

    const otpauthUri = buildTotpUri(user.email, secret);

    return NextResponse.json({
      secret,
      otpauthUri,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`,
    });
  } catch (err) {
    return handleError(err);
  }
}
