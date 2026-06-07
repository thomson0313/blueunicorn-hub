import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { findUserById } from "@/lib/repo";
import { clearSessionServer } from "@/lib/clear-session-server";
import { canMemberAccessPlatform } from "@/lib/user-approval";
import { AppProvider } from "@/components/AppProvider";
import { AppChrome } from "@/components/AppChrome";
import { AlertToaster } from "@/components/AlertToaster";
import { FloatingChat } from "@/components/FloatingChat";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();
  const user = await findUserById(session.sub);
  if (!user) {
    await clearSessionServer();
    redirect("/login?reason=deleted");
  }
  if (user.role === "member" && !canMemberAccessPlatform(user.approvalStatus)) {
    await clearSessionServer();
    redirect(`/login?reason=${user.approvalStatus}`);
  }

  return (
    <AppProvider user={session}>
      <AppChrome>{children}</AppChrome>
      <AlertToaster />
      <FloatingChat />
    </AppProvider>
  );
}
