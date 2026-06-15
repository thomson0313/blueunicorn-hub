import fs from "node:fs/promises";
import path from "node:path";
import { getSupabase } from "./supabase";

async function storeLocal(
  userId: string,
  file: File,
  buffer: Buffer,
  safeName: string,
  ext: string
): Promise<{ url: string; mimeType: string; fileName: string; fileSize: number }> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "chat");
  await fs.mkdir(uploadsDir, { recursive: true });
  const filename = `${userId}-${Date.now()}-${safeName || `file.${ext}`}`;
  await fs.writeFile(path.join(uploadsDir, filename), buffer);
  return {
    url: `/api/chat/files/${encodeURIComponent(filename)}`,
    mimeType: file.type || "application/octet-stream",
    fileName: file.name,
    fileSize: file.size,
  };
}

/** Persist a chat attachment and return its public URL. */
export async function storeChatAttachment(
  userId: string,
  file: File
): Promise<{ url: string; mimeType: string; fileName: string; fileSize: number }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const objectPath = `${userId}/${Date.now()}-${safeName || `file.${ext}`}`;

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.storage.from("chat-attachments").upload(objectPath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (!error) {
        const { data } = supabase.storage.from("chat-attachments").getPublicUrl(objectPath);
        return {
          url: data.publicUrl,
          mimeType: file.type || "application/octet-stream",
          fileName: file.name,
          fileSize: file.size,
        };
      }
    } catch {
      /* fall through to local storage */
    }
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`chat/${userId}-${Date.now()}-${safeName}`, buffer, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });
    return {
      url: blob.url,
      mimeType: file.type || "application/octet-stream",
      fileName: file.name,
      fileSize: file.size,
    };
  }

  return storeLocal(userId, file, buffer, safeName, ext);
}
