import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { findUserById } from "@/lib/repo";
import { requireSession, handleError } from "@/lib/api-guard";
import { isEmailVerified } from "@/lib/email-verification";

export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();
    const user = await findUserById(session.sub);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      verified: isEmailVerified(user.emailVerifiedAt),
      email: user.email,
    });
  } catch (err) {
    return handleError(err);
  }
}
