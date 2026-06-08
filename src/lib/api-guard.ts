import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";
import { connectDB } from "./db";
import { findUserById } from "./repo";
import { canMemberAccessPlatform, loginBlockMessage } from "./user-approval";
import { EMAIL_NOT_VERIFIED_MESSAGE, isEmailVerified } from "./email-verification";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Session + member approval; does not require verified email. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Unauthorized");

  if (session.role === "member") {
    await connectDB();
    const user = await findUserById(session.sub);
    if (!user) throw new HttpError(401, "Unauthorized");
    if (!canMemberAccessPlatform(user.approvalStatus)) {
      throw new HttpError(403, loginBlockMessage(user.approvalStatus));
    }
  }

  return session;
}

/** Full access — session, approval, and verified email. */
export async function requireUser(): Promise<SessionPayload> {
  const session = await requireSession();
  await connectDB();
  const user = await findUserById(session.sub);
  if (!user) throw new HttpError(401, "Unauthorized");
  if (!isEmailVerified(user.emailVerifiedAt)) {
    throw new HttpError(403, EMAIL_NOT_VERIFIED_MESSAGE);
  }
  return session;
}

/** Returns the session if admin, otherwise throws. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireUser();
  if (session.role !== "admin") throw new HttpError(403, "Forbidden");
  return session;
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[api] unexpected error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
