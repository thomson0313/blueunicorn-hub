"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "./AppProvider";
import { Avatar } from "./Avatar";

export function NavBar() {
  const { user, avatarUrl, totalUnread } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/projects", label: "My Projects", memberOnly: true },
    { href: "/chat", label: "Chat" },
    { href: "/admin/projects", label: "Projects", adminOnly: true },
    { href: "/admin/members", label: "Members", adminOnly: true },
    { href: "/admin/fields", label: "Fields", adminOnly: true },
    { href: "/admin/alerts", label: "Alerts", adminOnly: true },
    { href: "/profile", label: "Profile" },
  ].filter((l) => {
    if (l.adminOnly) return user.role === "admin";
    if (l.memberOnly) return user.role === "member";
    return true;
  });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const linkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
      active ? "bg-white/20 text-white" : "text-brand-50 hover:bg-white/10"
    }`;

  return (
    <nav className="bg-gradient-to-r from-brand-700 to-brand-500 sticky top-0 z-40 shadow-md">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="">
              <Image src="/blunicorn-logo.png" alt="Blunicorn" width={30} height={30} style={{ height: "auto" }} priority />
            </span>
            <span className="font-bold text-white text-lg tracking-tight">Blunicorn</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link key={l.href} href={l.href} className={`${linkClass(active)} relative`}>
                  {l.label}
                  {l.href === "/chat" && totalUnread > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center text-[10px] min-w-4 h-4 px-1 rounded-full bg-white text-brand-700 font-bold align-middle">
                      {totalUnread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/profile" className="flex items-center gap-2 group">
            <Avatar name={user.name} src={avatarUrl} size={30} />
            <span className="text-sm text-white hidden sm:flex items-center gap-2">
              {user.name}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wide">
                {user.role}
              </span>
            </span>
          </Link>
          <button onClick={logout} className="text-sm font-medium text-brand-50 hover:text-white transition">
            Log out
          </button>
        </div>
      </div>
      <div className="md:hidden bg-brand-700/40 px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link key={l.href} href={l.href} className={`${linkClass(active)} relative`}>
              {l.label}
              {l.href === "/chat" && totalUnread > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center text-[10px] min-w-4 h-4 px-1 rounded-full bg-white text-brand-700 font-bold align-middle">
                  {totalUnread}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
