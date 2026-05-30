import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Returns the session or throws an HttpError(401). */
export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Unauthorized");
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
