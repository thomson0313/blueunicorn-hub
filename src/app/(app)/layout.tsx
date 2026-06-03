import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppProvider } from "@/components/AppProvider";
import { AppChrome } from "@/components/AppChrome";
import { AlertToaster } from "@/components/AlertToaster";
import { FloatingChat } from "@/components/FloatingChat";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppProvider user={session}>
      <AppChrome>{children}</AppChrome>
      <AlertToaster />
      <FloatingChat />
    </AppProvider>
  );
}
