"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { IconBell } from "@/components/icons/NavIcons";
import { timeAgo } from "@/lib/time-ago";
import type { HubNotification } from "@/lib/hub-notifications";

type Props = {
  theme?: "light" | "dark";
  placement?: "bottom" | "top";
};

export function NotificationPanel({ theme = "dark", placement = "top" }: Props) {
  const pathname = usePathname();
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState<HubNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isLight = theme === "light";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?unreadOnly=${unreadOnly}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.notifications || []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    void load();
  }

  const panelPos =
    placement === "bottom"
      ? "left-0 bottom-full mb-2"
      : isLight
        ? "left-0 bottom-full mb-2"
        : "right-0 top-full mt-2";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition ${
          isLight ? "hover:bg-white/10 text-white" : "hover:bg-white/10 text-brand-50 hover:text-white"
        }`}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <IconBell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 w-[min(360px,calc(100vw-2rem))] max-h-[min(420px,70vh)] flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl ${panelPos}`}
        >
          <div className="px-4 py-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded accent-brand-600"
                />
                Only unread
              </label>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && items.length === 0 ? (
              <p className="text-sm text-slate-500 p-4 text-center">Loading...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-500 p-6 text-center">No notifications</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {items.map((n) => (
                  <li key={n._id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.read) void markRead(n._id);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 cursor-pointer ${
                        !n.read ? "bg-brand-50/40" : ""
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                      {n.projectId && (
                        <Link
                          href={
                            user.role === "admin" || pathname.startsWith("/admin")
                              ? "/admin/projects"
                              : "/projects"
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-brand-600 hover:underline mt-1 inline-block"
                        >
                          View projects
                        </Link>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
