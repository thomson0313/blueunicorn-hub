import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { listMemberFields } from "@/lib/repo";

// GET /api/fields — signup field options (public).
export async function GET() {
  try {
    await connectDB();
    const fields = await listMemberFields();
    return NextResponse.json({
      fields: fields.map((f) => ({ _id: f._id, name: f.name })),
    });
  } catch (err) {
    console.error("[fields]", err);
    return NextResponse.json({ error: "Could not load fields" }, { status: 500 });
  }
}
