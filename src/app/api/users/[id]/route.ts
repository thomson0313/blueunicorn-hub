import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { findUserById, publicUser } from "@/lib/repo";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

// GET /api/users/:id -> public profile of any user (requires being logged in).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    await connectDB();
    const user = findUserById(id);
    if (!user) throw new HttpError(404, "User not found");
    return NextResponse.json({ profile: publicUser(user) });
  } catch (err) {
    return handleError(err);
  }
}
