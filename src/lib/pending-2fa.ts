import { SignJWT, jwtVerify } from "jose";

const PURPOSE = "2fa_pending";
const TTL = "5m";

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export type Pending2faPayload = {
  sub: string;
  deviceHash: string;
  browser: string;
  os: string;
  ip: string;
  country: string;
  userAgent: string;
};

export async function signPending2fa(payload: Pending2faPayload): Promise<string> {
  return new SignJWT({ ...payload, purpose: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(getSecretKey());
}

export async function verifyPending2fa(token: string): Promise<Pending2faPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.purpose !== PURPOSE) return null;
    return {
      sub: String(payload.sub),
      deviceHash: String(payload.deviceHash),
      browser: String(payload.browser),
      os: String(payload.os),
      ip: String(payload.ip),
      country: String(payload.country),
      userAgent: String(payload.userAgent),
    };
  } catch {
    return null;
  }
}
