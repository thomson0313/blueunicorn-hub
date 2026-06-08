import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session-cookie";
import { appOriginFromRequest } from "@/lib/email-templates/email-layout";

/** Clears the session cookie and redirects (avoids cookie mutation in Server Components). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to") || "/login";
  const path = to.startsWith("/") ? to : `/${to}`;
  const origin = appOriginFromRequest(req);
  const res = NextResponse.redirect(`${origin}${path}`);
  clearSessionCookie(res);
  return res;
}
