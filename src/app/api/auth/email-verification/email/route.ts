import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  deleteEmailVerificationCodes,
  findUserById,
  isEmailOrUsernameTakenByOther,
  updateUser,
} from "@/lib/repo";
import { requireSession, handleError, HttpError } from "@/lib/api-guard";
import { isEmailVerified } from "@/lib/email-verification";
import { signSession, type SessionPayload } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session-cookie";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

/** PATCH /api/auth/email-verification/email — update email before verification completes. */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid email" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await findUserById(session.sub);
    if (!user) throw new HttpError(401, "Unauthorized");

    if (isEmailVerified(user.emailVerifiedAt)) {
      throw new HttpError(400, "Email is already verified. Update it from your profile instead.");
    }

    const email = parsed.data.email.toLowerCase();
    if (email === user.email) {
      return NextResponse.json({ email, message: "This is already your email address." });
    }

    if (await isEmailOrUsernameTakenByOther(email, user.username ?? null, user._id)) {
      throw new HttpError(409, "Email is already in use");
    }

    await deleteEmailVerificationCodes(user._id);
    const updated = await updateUser(user._id, {
      email,
      emailVerifiedAt: null,
    });
    if (!updated) throw new HttpError(404, "User not found");

    const payload: SessionPayload = {
      sub: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      approvalStatus: updated.role === "member" ? updated.approvalStatus : undefined,
    };

    const res = NextResponse.json({
      email: updated.email,
      message: `Email updated to ${updated.email}. A new verification code will be sent.`,
    });
    setSessionCookie(res, await signSession(payload));
    return res;
  } catch (err) {
    return handleError(err);
  }
}
