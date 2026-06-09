import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { findUserById } from "@/lib/repo";
import { verifyPending2fa } from "@/lib/pending-2fa";
import { verifyTotpCode } from "@/lib/totp";
import { resolveDeviceInfo } from "@/lib/device-info";
import { completeLogin } from "@/lib/complete-login";

const schema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().min(6).max(8),
  trustDevice: z.boolean().optional().default(false),
  userAgent: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const pending = await verifyPending2fa(parsed.data.pendingToken);
    if (!pending) {
      return NextResponse.json({ error: "Verification session expired. Please sign in again." }, { status: 401 });
    }

    await connectDB();
    const user = await findUserById(pending.sub);
    if (!user?.totpSecret || !user.totpEnabledAt) {
      return NextResponse.json({ error: "Two-factor authentication is not enabled." }, { status: 400 });
    }

    const valid = await verifyTotpCode(user.totpSecret, parsed.data.code);
    if (!valid) {
      return NextResponse.json({ error: "Invalid authentication code." }, { status: 400 });
    }

    const device = await resolveDeviceInfo(req, parsed.data.userAgent);
    return completeLogin(req, user, device, { trustDevice: parsed.data.trustDevice });
  } catch (err) {
    console.error("[login/2fa]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
