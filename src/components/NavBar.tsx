"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useApp } from "./AppProvider";
import { IconChat } from "@/components/icons/NavIcons";
import { ProfileMenu } from "@/components/ProfileMenu";
import { NotificationPanel } from "@/components/NotificationPanel";

export function NavBar() {
  const { totalUnread } = useApp();
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/projects", label: "Projects" },
    { href: "/calendar", label: "Calendar" },
    { href: "/screen-share", label: "Screen Share" },
  ];

  const projectSubLinks = [
    { href: "/projects", label: "Active Projects", exact: true },
    { href: "/projects/upcoming", label: "Upcoming" },
    { href: "/projects/archived", label: "Archived" },
  ];

  const onProjectsSection = pathname === "/projects" || pathname.startsWith("/projects/");

  const linkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
      active ? "bg-white/20 text-white" : "text-brand-50 hover:bg-white/10"
    }`;

  return (
    <nav className="bg-gradient-to-r from-brand-700 to-brand-500 sticky top-0 z-40 shadow-md">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <Image src="/blunicorn-logo.png" alt="Blunicorn" width={30} height={30} style={{ height: "auto" }} priority />
            <span className="font-bold text-white text-lg tracking-tight">Blunicorn</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => {
              const active =
                l.href === "/projects"
                  ? onProjectsSection
                  : pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link key={l.href} href={l.href} className={linkClass(active)}>
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/chat"
            className="relative w-10 h-10 rounded-lg flex items-center justify-center text-brand-50 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Chat"
          >
            <IconChat size={20} />
            {totalUnread > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </Link>
          <NotificationPanel theme="dark" placement="top" />
          <ProfileMenu theme="dark" />
        </div>
      </div>
      <div className="md:hidden bg-brand-700/40 px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
        {navLinks.map((l) => {
          const active =
            l.href === "/projects"
              ? onProjectsSection
              : pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link key={l.href} href={l.href} className={linkClass(active)}>
              {l.label}
            </Link>
          );
        })}
        {onProjectsSection &&
          projectSubLinks.map((l) => {
            const active = l.exact
              ? pathname === l.href
              : pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link key={l.href} href={l.href} className={`${linkClass(active)} text-xs`}>
                {l.label}
              </Link>
            );
          })}
      </div>
      {onProjectsSection && (
        <div className="hidden md:flex bg-brand-700/30 px-4 py-1.5 gap-1 border-t border-white/10">
          <div className="max-w-6xl mx-auto w-full flex items-center gap-1">
            {projectSubLinks.map((l) => {
              const active = l.exact
                ? pathname === l.href
                : pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link key={l.href} href={l.href} className={`${linkClass(active)} text-xs`}>
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
