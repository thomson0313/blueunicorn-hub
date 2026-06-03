"use client";

import { useApp } from "@/components/AppProvider";
import { AdminLayoutProvider } from "@/components/admin/AdminLayoutContext";
import { useAdminLayout } from "@/components/admin/AdminLayoutContext";
import { AdminSidebar, AdminMobileBar } from "@/components/admin/AdminSidebar";
import { NavBar } from "@/components/NavBar";

function AdminShell({ children }: { children: React.ReactNode }) {
  const { sidebarWidth } = useAdminLayout();

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <AdminMobileBar />
      <div className={`min-h-screen transition-[margin] duration-200 ml-0 ${sidebarWidth} pt-14 md:pt-0`}>
        <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  const isAdmin = user.role === "admin";

  if (isAdmin) {
    return (
      <AdminLayoutProvider>
        <AdminShell>{children}</AdminShell>
      </AdminLayoutProvider>
    );
  }

  return (
    <>
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </>
  );
}
