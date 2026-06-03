"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { useApp } from "@/components/AppProvider";

const ADMIN_LINKS = [
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/fields", label: "Fields" },
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const linkClass = (href: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return `block px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
      active ? "bg-white/20 text-white" : "text-brand-100 hover:bg-white/10 hover:text-white"
    }`;
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-full w-56 bg-gradient-to-b from-brand-800 to-brand-600 text-white flex flex-col shadow-lg">
      <div className="px-4 py-5 border-b border-white/10">
        <Link href="/admin/projects" className="flex items-center gap-2">
          <Image src="/blunicorn-logo.png" alt="Blunicorn" width={28} height={28} style={{ height: "auto" }} priority />
          <span className="font-bold text-lg tracking-tight">Admin</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 text-[10px] uppercase tracking-wider text-brand-200 mb-2">Management</p>
          {ADMIN_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
        </div>
        <div>
          <p className="px-3 text-[10px] uppercase tracking-wider text-brand-200 mb-2">App</p>
          {APP_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`${linkClass(l.href)} relative`}>
              {l.label}
              {l.href === "/chat" && totalUnread > 0 && (
                <span className="ml-2 inline-flex min-w-4 h-4 px-1 rounded-full bg-white text-brand-700 text-[10px] font-bold items-center justify-center align-middle">
                  {totalUnread}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-2">
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
      </div>
    </aside>
  );
}
