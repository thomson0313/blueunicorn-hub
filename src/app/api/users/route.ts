import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { listUsersExcept, publicUser } from "@/lib/repo";
import { requireUser, handleError } from "@/lib/api-guard";

// GET /api/users -> list of all users (for the chat directory), excluding self.
export async function GET() {
  try {
    const me = await requireUser();
    await connectDB();
    const users = (await listUsersExcept(me.sub)).map(publicUser);
    return NextResponse.json({ users });
  } catch (err) {
    return handleError(err);
  }
}
