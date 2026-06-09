import { generateSecret, generateURI, verify } from "otplib";

const ISSUER = "Blunicorn";

export function createTotpSecret(): string {
  return generateSecret();
}

export function buildTotpUri(email: string, secret: string): string {
  return generateURI({
    issuer: ISSUER,
    label: email,
    secret,
  });
}

export async function verifyTotpCode(secret: string, token: string): Promise<boolean> {
  const normalized = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const result = await verify({ secret, token: normalized });
  return result.valid === true;
}

export function isTotpEnabled(totpEnabledAt: string | null | undefined): boolean {
  return !!totpEnabledAt;
}
