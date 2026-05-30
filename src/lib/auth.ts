import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export const COOKIE_NAME = "session";

// Read the secret lazily so it is resolved at call time, after environment
// variables have been loaded. The custom server and Next bundle evaluate this
// module at different moments, so capturing the secret at import time could pick
// up a stale/fallback value and cause token mismatches (e.g. socket auth fails).
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  sub: string; // user id
  name: string;
  email: string;
  role: "admin" | "member";
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Read + verify the session from the request cookies (server side). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}
