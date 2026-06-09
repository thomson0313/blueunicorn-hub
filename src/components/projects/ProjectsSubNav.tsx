"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProjectsSubNav({ mode }: { mode: "member" | "admin" }) {
  const pathname = usePathname();
  const base = mode === "admin" ? "/admin/projects" : "/projects";

  const tabs = [
    { href: base, label: "Active Projects" },
    { href: `${base}/archived`, label: "Archived Projects" },
  ];

  return (
    <nav className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl w-fit">
      {tabs.map((tab) => {
        const active =
          tab.href === base
            ? pathname === base
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              active
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
