import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppProvider } from "@/components/AppProvider";
import { NavBar } from "@/components/NavBar";
import { AlertToaster } from "@/components/AlertToaster";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppProvider user={session}>
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      <AlertToaster />
    </AppProvider>
  );
}
