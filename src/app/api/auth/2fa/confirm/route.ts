import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { findUserById, updateUser } from "@/lib/repo";
import { requireSession, handleError, HttpError } from "@/lib/api-guard";
import { verifyTotpCode, isTotpEnabled } from "@/lib/totp";

const schema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid code" }, { status: 400 });
    }

    await connectDB();
    const user = await findUserById(session.sub);
    if (!user) throw new HttpError(401, "Unauthorized");
    if (isTotpEnabled(user.totpEnabledAt)) {
      return NextResponse.json({ enabled: true, message: "Two-factor authentication is already enabled." });
    }
    if (!user.totpSecret) {
      throw new HttpError(400, "Start setup first to generate a QR code.");
    }

    const valid = await verifyTotpCode(user.totpSecret, parsed.data.code);
    if (!valid) {
      throw new HttpError(400, "Invalid code. Check your authenticator app and try again.");
    }

    await updateUser(user._id, { totpEnabledAt: new Date().toISOString() });

    return NextResponse.json({ enabled: true, message: "Two-factor authentication is now enabled." });
  } catch (err) {
    return handleError(err);
  }
}
