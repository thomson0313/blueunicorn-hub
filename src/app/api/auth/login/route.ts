import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { findUserByEmailOrUsername } from "@/lib/repo";
import { comparePassword } from "@/lib/auth";
import { canMemberAccessPlatform, loginBlockMessage } from "@/lib/user-approval";
import { resolveDeviceInfo } from "@/lib/device-info";
import { completeLogin, isDeviceTrustedFor2fa } from "@/lib/complete-login";
import { signPending2fa } from "@/lib/pending-2fa";
import { isTotpEnabled } from "@/lib/totp";

const schema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
  userAgent: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const { identifier, password, userAgent } = parsed.data;
  await connectDB();

  const user = await findUserByEmailOrUsername(identifier);
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.role === "member" && !canMemberAccessPlatform(user.approvalStatus)) {
    return NextResponse.json({ error: loginBlockMessage(user.approvalStatus) }, { status: 403 });
  }

  const device = await resolveDeviceInfo(req, userAgent);

  if (isTotpEnabled(user.totpEnabledAt)) {
    const trusted = await isDeviceTrustedFor2fa(user._id, device.deviceHash);
    if (!trusted) {
      const pendingToken = await signPending2fa({
        sub: user._id,
        deviceHash: device.deviceHash,
        browser: device.browser,
        os: device.os,
        ip: device.ip,
        country: device.country,
        userAgent: device.userAgent,
      });
      return NextResponse.json({
        requires2fa: true,
        pendingToken,
        message: "Enter the code from your authenticator app.",
      });
    }
  }

  return completeLogin(req, user, device);
}
