import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const secretKey = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "session";

const PROTECTED = ["/dashboard", "/projects", "/chat", "/admin"];
const AUTH_PAGES = ["/login", "/signup"];

type Session = { sub: string; role: "admin" | "member" };

async function readSession(req: NextRequest): Promise<Session | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await readSession(req);

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && session?.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (isAuthPage && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/projects/:path*", "/chat/:path*", "/admin/:path*", "/login", "/signup"],
};
