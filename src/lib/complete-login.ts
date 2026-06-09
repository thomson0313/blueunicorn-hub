import { NextResponse } from "next/server";
import type { UserRec } from "@/lib/repo";
import {
  recordKnownDevice,
  upsertTrusted2faDevice,
  isTrusted2faDevice,
} from "@/lib/repo";
import { signSession, type SessionPayload } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session-cookie";
import { sendEmail } from "@/lib/send-email";
import { brandLogoUrl, appOriginFromRequest } from "@/lib/email-templates/email-layout";
import { buildNewLoginEmail } from "@/lib/email-templates/new-login-email";
import type { DeviceInfo } from "@/lib/device-info";
import { isTotpEnabled } from "@/lib/totp";

const TRUSTED_DEVICE_DAYS = 90;

export async function isDeviceTrustedFor2fa(userId: string, deviceHash: string): Promise<boolean> {
  return isTrusted2faDevice(userId, deviceHash);
}

export async function completeLogin(
  req: Request,
  user: UserRec,
  device: DeviceInfo,
  options?: { trustDevice?: boolean }
): Promise<NextResponse> {
  const { isNew } = await recordKnownDevice(user._id, device);

  if (isNew) {
    const origin = appOriginFromRequest(req);
    const loginTime = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    const emailContent = buildNewLoginEmail({
      name: user.name,
      deviceLabel: device.deviceLabel,
      browser: device.browser,
      os: device.os,
      ip: device.ip,
      country: device.country,
      logoUrl: brandLogoUrl(origin),
      loginTime,
    });
    try {
      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
    } catch (err) {
      console.error("[complete-login] new login email failed:", err);
    }
  }

  if (options?.trustDevice && isTotpEnabled(user.totpEnabledAt)) {
    const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await upsertTrusted2faDevice(user._id, device, expiresAt);
  }

  const payload: SessionPayload = {
    sub: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    approvalStatus: user.role === "member" ? user.approvalStatus : undefined,
  };

  const res = NextResponse.json({
    user: payload,
    totpEnabled: isTotpEnabled(user.totpEnabledAt),
  });
  setSessionCookie(res, await signSession(payload));
  return res;
}
