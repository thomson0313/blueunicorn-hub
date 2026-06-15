import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".zip": "application/zip",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ name: string }> }
) {
  try {
    await requireUser();
    const { name } = await ctx.params;
    const safe = path.basename(name);
    if (!safe || safe !== name) throw new HttpError(400, "Invalid file name");

    const filePath = path.join(process.cwd(), "public", "uploads", "chat", safe);
    if (!fs.existsSync(filePath)) throw new HttpError(404, "File not found");

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(safe).toLowerCase();
    const mimeType = MIME[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
