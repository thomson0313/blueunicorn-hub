import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import {
  findUserById,
  findMemberFieldById,
  updateUser,
  publicUser,
  isEmailOrUsernameTakenByOther,
} from "@/lib/repo";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";
import { signSession, comparePassword, hashPassword, type SessionPayload } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session-cookie";

export async function GET() {
  try {
    const me = await requireUser();
    await connectDB();
    const user = await findUserById(me.sub);
    if (!user) throw new HttpError(404, "User not found");
    return NextResponse.json({ profile: await publicUser(user) });
  } catch (err) {
    return handleError(err);
  }
}

const updateSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(80).optional(),
    email: z.string().email("Invalid email").optional(),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(40)
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
      .optional()
      .nullable(),
    fieldId: z.string().uuid("Please select a field").optional(),
    skills: z.string().max(500).optional(),
    bio: z.string().max(2000).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, "New password must be at least 6 characters").optional(),
  })
  .refine((d) => !d.newPassword || d.currentPassword, {
    message: "Current password is required to set a new password",
    path: ["currentPassword"],
  });

export async function PATCH(req: Request) {
  try {
    const me = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    await connectDB();

    const existing = await findUserById(me.sub);
    if (!existing) throw new HttpError(404, "User not found");

    const patch: Parameters<typeof updateUser>[1] = {};

    if (parsed.data.name !== undefined) patch.name = parsed.data.name;

    if (parsed.data.email !== undefined) {
      const email = parsed.data.email.toLowerCase();
      if (await isEmailOrUsernameTakenByOther(email, null, me.sub)) {
        throw new HttpError(409, "Email is already in use");
      }
      patch.email = email;
    }

    if (parsed.data.username !== undefined) {
      const username = parsed.data.username?.trim() || null;
      const emailForCheck = patch.email ?? existing.email;
      if (username && (await isEmailOrUsernameTakenByOther(emailForCheck, username, me.sub))) {
        throw new HttpError(409, "Username is already in use");
      }
      patch.username = username;
    }

    if (parsed.data.fieldId !== undefined) {
      const field = await findMemberFieldById(parsed.data.fieldId);
      if (!field) throw new HttpError(400, "Invalid field");
      patch.fieldId = parsed.data.fieldId;
    }

    if (parsed.data.skills !== undefined) patch.skills = parsed.data.skills;
    if (parsed.data.bio !== undefined) patch.bio = parsed.data.bio;

    if (parsed.data.newPassword) {
      const ok = await comparePassword(parsed.data.currentPassword!, existing.passwordHash);
      if (!ok) throw new HttpError(400, "Current password is incorrect");
      patch.passwordHash = await hashPassword(parsed.data.newPassword);
    }

    const user = await updateUser(me.sub, patch);
    if (!user) throw new HttpError(404, "User not found");

    const res = NextResponse.json({ profile: await publicUser(user) });

    if (
      (parsed.data.name && parsed.data.name !== me.name) ||
      (parsed.data.email && parsed.data.email !== me.email)
    ) {
      const payload: SessionPayload = {
        sub: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
      setSessionCookie(res, await signSession(payload));
    }

    return res;
  } catch (err) {
    return handleError(err);
  }
}
