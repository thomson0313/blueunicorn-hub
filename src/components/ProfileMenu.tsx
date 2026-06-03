"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { useApp } from "@/components/AppProvider";
import type { Profile } from "@/lib/types";

type Props = {
  /** light = white sidebar; dark = gradient header */
  theme?: "light" | "dark";
  showName?: boolean;
};

function RoleBadge({ role }: { role: "admin" | "member" }) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-medium shrink-0 ${
        role === "admin" ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-600"
      }`}
    >
      {role}
    </span>
  );
}

export function ProfileMenu({ theme = "dark", showName = false }: Props) {
  const { user, avatarUrl } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const archivedHref = user.role === "admin" ? "/admin/projects/archived" : "/projects/archived";
  const isLight = theme === "light";

  useEffect(() => {
    if (!open) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile ?? null))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const popupPosition = isLight
    ? "right-0 bottom-full mb-2"
    : "right-0 top-full mt-2";

  return (
    <div ref={rootRef} className={`relative ${isLight ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-lg cursor-pointer transition w-full ${
          isLight ? "hover:bg-white/10 p-1.5 justify-start" : "group"
        }`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Avatar name={user.name} src={avatarUrl} size={showName ? 32 : 30} />
        {showName && (
          <div className="min-w-0 flex-1 text-left hidden md:block">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate text-white">{user.name}</p>
              <RoleBadge role={user.role} />
            </div>
          </div>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-[60] w-64 rounded-xl border shadow-xl py-2 text-sm bg-white border-slate-200 ${popupPosition}`}
        >
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-900 truncate">{user.name}</p>
              <RoleBadge role={user.role} />
            </div>
            <p className="text-xs text-slate-500 truncate mt-1">{profile?.email ?? user.email}</p>
            {profile?.username && <p className="text-xs text-slate-500 mt-0.5">@{profile.username}</p>}
            {profile?.fieldName && (
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
                {profile.fieldName}
              </span>
            )}
          </div>
          <nav className="py-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Profile
            </Link>
            <Link
              href={archivedHref}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Archived projects
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 cursor-pointer"
            >
              Log out
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
