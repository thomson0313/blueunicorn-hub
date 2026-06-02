import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { updateUser, publicUser } from "@/lib/repo";
import { storeAvatarFile } from "@/lib/avatar-storage";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

// POST /api/profile/avatar -> upload a profile photo (multipart/form-data, field "file").
export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file uploaded");

    const ext = EXT_BY_TYPE[file.type];
    if (!ext) throw new HttpError(400, "Unsupported image type (use PNG, JPG, WEBP, or GIF)");
    if (file.size > MAX_BYTES) throw new HttpError(400, "Image too large (max 4 MB)");

    await connectDB();

    const avatarUrl = await storeAvatarFile(me.sub, file, ext);
    const user = await updateUser(me.sub, { avatarUrl });
    if (!user) throw new HttpError(404, "User not found");

    return NextResponse.json({ profile: await publicUser(user) });
  } catch (err) {
    return handleError(err);
  }
}
