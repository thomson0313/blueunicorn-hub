"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Avatar } from "@/components/Avatar";
import { useApp } from "@/components/AppProvider";
import { useAdminLayout } from "@/components/admin/AdminLayoutContext";

const ADMIN_LINKS = [
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/fields", label: "Add-ons" },
  { href: "/admin/alerts", label: "Alerts" },
];

const APP_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chat", label: "Chat" },
  { href: "/profile", label: "Profile" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, avatarUrl, totalUnread } = useApp();
  const { collapsed, mobileOpen, toggleCollapsed, setMobileOpen } = useAdminLayout();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const linkClass = (href: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
      active ? "bg-white/20 text-white" : "text-brand-100 hover:bg-white/10 hover:text-white"
    } ${collapsed ? "justify-center px-2" : ""}`;
  };

  const asideClass = `
    fixed left-0 top-0 z-50 h-full bg-gradient-to-b from-brand-800 to-brand-600 text-white flex flex-col shadow-lg transition-all duration-200
    ${collapsed ? "w-[4.5rem]" : "w-56"}
    ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
    md:translate-x-0
  `;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden cursor-pointer"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={asideClass}>
        <div className={`relative border-b border-white/10 shrink-0 ${collapsed ? "px-2 py-4" : "px-4 py-5"}`}>
          <Link href="/admin/projects" className={`flex ${collapsed ? "flex-col items-center" : "items-start gap-2"}`}>
            <div className={`flex items-center gap-2 ${collapsed ? "flex-col" : ""}`}>
              <Image
                src="/blunicorn-logo.png"
                alt="Blunicorn"
                width={28}
                height={28}
                style={{ height: "auto" }}
                priority
              />
              {!collapsed && (
                <span className="font-bold text-lg tracking-tight text-white">Blunicorn</span>
              )}
            </div>
            {!collapsed && <p className="text-xs text-brand-200 mt-1 pl-[36px]">Admin Panel</p>}
            {collapsed && <p className="text-[9px] text-brand-200 mt-1 text-center leading-tight">Admin</p>}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden md:flex absolute top-3 right-2 w-7 h-7 rounded-full items-center justify-center text-brand-100 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {collapsed ? (
                <path d="M9 18l6-6-6-6" />
              ) : (
                <path d="M15 18l-6-6 6-6" />
              )}
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
          <div>
            {!collapsed && (
              <p className="px-3 text-[10px] uppercase tracking-wider text-brand-200 mb-2">Management</p>
            )}
            {ADMIN_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)} title={collapsed ? l.label : undefined}>
                {!collapsed && l.label}
                {collapsed && <span className="text-xs font-bold">{l.label.charAt(0)}</span>}
              </Link>
            ))}
          </div>
          <div>
            {!collapsed && (
              <p className="px-3 text-[10px] uppercase tracking-wider text-brand-200 mb-2">App</p>
            )}
            {APP_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)} title={collapsed ? l.label : undefined}>
                {!collapsed && (
                  <>
                    {l.label}
                    {l.href === "/chat" && totalUnread > 0 && (
                      <span className="ml-auto inline-flex min-w-4 h-4 px-1 rounded-full bg-white text-brand-700 text-[10px] font-bold items-center justify-center">
                        {totalUnread}
                      </span>
                    )}
                  </>
                )}
                {collapsed && <span className="text-xs font-bold">{l.label.charAt(0)}</span>}
              </Link>
            ))}
          </div>
        </nav>

        <div className={`px-2 py-4 border-t border-white/10 space-y-2 shrink-0 ${collapsed ? "flex flex-col items-center" : ""}`}>
          {!collapsed ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/10">
                <Avatar name={user.name} src={avatarUrl} size={32} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-[10px] text-brand-200 uppercase">{user.role}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="w-full text-left px-3 py-2 text-sm text-brand-100 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/profile" title="Profile" className="p-2 rounded-lg hover:bg-white/10">
                <Avatar name={user.name} src={avatarUrl} size={28} />
              </Link>
              <button
                type="button"
                onClick={logout}
                title="Log out"
                className="p-2 text-brand-100 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer text-xs"
              >
                ⎋
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

export function AdminMobileBar() {
  const { setMobileOpen } = useAdminLayout();

  return (
    <header className="md:hidden sticky top-0 z-30 h-14 bg-gradient-to-r from-brand-700 to-brand-500 flex items-center justify-between px-4 shadow-md">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white hover:bg-white/10 cursor-pointer"
        aria-label="Open menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>
      <span className="font-bold text-white text-lg">Blunicorn</span>
      <span className="w-10" aria-hidden />
    </header>
  );
}
