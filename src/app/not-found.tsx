import { getSession } from "@/lib/auth";
import { NotFoundView } from "@/components/NotFoundView";

export default async function NotFound() {
  const session = await getSession();

  return (
    <NotFoundView
      homeHref={session ? "/dashboard" : "/login"}
      homeLabel={session ? "Go to dashboard" : "Sign in"}
      showSignIn={!session}
    />
  );
}
