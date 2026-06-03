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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-lg cursor-pointer transition ${
          isLight ? "hover:bg-white/10 p-1" : "group"
        }`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Avatar name={user.name} src={avatarUrl} size={showName ? 32 : 30} />
        {showName && !isLight && (
          <span className="text-sm text-white hidden sm:flex flex-col items-start">
            {user.name}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wide">
              {user.role}
            </span>
          </span>
        )}
        {showName && isLight && !open && (
          <div className="min-w-0 hidden md:block text-left">
            <p className="text-sm font-medium truncate text-white">{user.name}</p>
          </div>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 w-64 rounded-xl border shadow-xl py-2 text-sm ${
            isLight ? "right-0 bottom-full mb-2 bg-white border-slate-200" : "right-0 top-full mt-2 bg-white border-slate-200"
          }`}
        >
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{profile?.email ?? user.email}</p>
            {profile?.username && (
              <p className="text-xs text-slate-500 mt-0.5">@{profile.username}</p>
            )}
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
