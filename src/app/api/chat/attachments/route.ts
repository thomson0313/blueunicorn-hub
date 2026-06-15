import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { storeChatAttachment } from "@/lib/chat-storage";
import { requireUser, handleError, HttpError } from "@/lib/api-guard";

export async function POST(req: Request) {
  try {
    const me = await requireUser();
    await connectDB();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file uploaded");
    const stored = await storeChatAttachment(me.sub, file);
    return NextResponse.json({ attachment: stored }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
