import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { deliverDueAlerts } from "@/lib/repo";

// Vercel Cron: deliver scheduled alerts when no custom server is running.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await connectDB();
  const delivered = await deliverDueAlerts();
  return NextResponse.json({ delivered: delivered.length });
}
