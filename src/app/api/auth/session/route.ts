import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { findUserById } from "@/lib/repo";
import { getSession } from "@/lib/auth";
import { canMemberAccessPlatform, loginBlockMessage } from "@/lib/user-approval";

/** GET /api/auth/session — verify the current session is still valid and approved. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await findUserById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "member" && !canMemberAccessPlatform(user.approvalStatus)) {
    return NextResponse.json(
      { error: loginBlockMessage(user.approvalStatus), approvalStatus: user.approvalStatus },
      { status: 403 }
    );
  }

  return NextResponse.json({ user: session });
}
