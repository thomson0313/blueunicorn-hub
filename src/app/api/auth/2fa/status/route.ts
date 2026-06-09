import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { findUserById } from "@/lib/repo";
import { requireSession, handleError } from "@/lib/api-guard";
import { isTotpEnabled } from "@/lib/totp";

export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();
    const user = await findUserById(session.sub);
    if (!user) {
      return NextResponse.json({ enabled: false, pendingSetup: false });
    }

    return NextResponse.json({
      enabled: isTotpEnabled(user.totpEnabledAt),
      pendingSetup: !!user.totpSecret && !user.totpEnabledAt,
    });
  } catch (err) {
    return handleError(err);
  }
}
