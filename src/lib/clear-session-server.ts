import { cookies } from "next/headers";
import { COOKIE_NAME } from "./auth";

/** Clear the session cookie from a Server Component or Route Handler. */
export async function clearSessionServer(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
