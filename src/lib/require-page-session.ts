import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./auth";

/** Use in Server Component pages under (app) — redirects to login when session is missing. */
export async function requirePageSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
