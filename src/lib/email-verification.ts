import crypto from "node:crypto";

export const EMAIL_NOT_VERIFIED_MESSAGE = "Please verify your email to continue.";

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export function generateVerificationCode(): string {
  return String(crypto.randomInt(100_000, 1_000_000));
}

export function hashVerificationCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function verificationCodeExpiresAt(): string {
  return new Date(Date.now() + CODE_TTL_MS).toISOString();
}

export function canResendVerificationCode(lastSentAt: string | null): boolean {
  if (!lastSentAt) return true;
  return Date.now() - new Date(lastSentAt).getTime() >= RESEND_COOLDOWN_MS;
}

export function resendCooldownSeconds(lastSentAt: string | null): number {
  if (!lastSentAt) return 0;
  const remaining = RESEND_COOLDOWN_MS - (Date.now() - new Date(lastSentAt).getTime());
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

export function isEmailVerified(emailVerifiedAt: string | null | undefined): boolean {
  return !!emailVerifiedAt;
}
