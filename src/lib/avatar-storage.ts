import fs from "node:fs/promises";
import path from "node:path";
import { getSupabase } from "./supabase";

/** Persist an avatar image and return a URL usable in <img src>. */
export async function storeAvatarFile(
  userId: string,
  file: File,
  ext: string
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const objectPath = `${userId}/${Date.now()}.${ext}`;

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = getSupabase();
    const { error } = await supabase.storage.from("avatars").upload(objectPath, buffer, {
      contentType: file.type,
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(objectPath);
    return data.publicUrl;
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`avatars/${userId}-${Date.now()}.${ext}`, buffer, {
      access: "public",
      contentType: file.type,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    return `data:${file.type};base64,${buffer.toString("base64")}`;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const filename = `${userId}-${Date.now()}.${ext}`;
  await fs.writeFile(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}
