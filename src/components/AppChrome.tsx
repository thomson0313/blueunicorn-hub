"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useApp } from "@/components/AppProvider";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useApp();
  const isAdminPanel = pathname.startsWith("/admin") && user.role === "admin";

  if (isAdminPanel) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar />
        <main className="ml-56 min-h-screen px-6 py-8 max-w-6xl">{children}</main>
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </>
  );
}
