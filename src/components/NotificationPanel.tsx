"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useApp } from "@/components/AppProvider";
import { IconBell } from "@/components/icons/NavIcons";
import { anchoredPosition } from "@/lib/anchored-position";
import { timeAgo } from "@/lib/time-ago";
import type { HubNotification } from "@/lib/hub-notifications";

type Props = {
  theme?: "light" | "dark";
  placement?: "bottom" | "top";
};

export function NotificationPanel({ theme = "dark", placement = "top" }: Props) {
  const pathname = usePathname();
  const { user, hubUnreadCount, refreshHubNotifications } = useApp();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState<HubNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const isLight = theme === "light";

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?unreadOnly=${unreadOnly}`);
      const data = await res.json();
      if (res.ok) setItems(data.notifications || []);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    if (open) void loadList();
  }, [open, loadList]);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPanelPos(null);
      return;
    }

    function update() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const w = Math.min(360, window.innerWidth - 16);
      const h = Math.min(420, window.innerHeight * 0.7);
      const x = isLight ? rect.right + 8 : rect.right - w;
      const y =
        placement === "bottom"
          ? rect.top - h - 8
          : rect.bottom + 8;
      setPanelPos(anchoredPosition(x, y, w, h));
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, isLight, placement]);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refreshHubNotifications();
    void loadList();
  }

  const popupEl =
    open && panelPos && mounted ? (
      <div
        className="fixed z-[100] w-[min(360px,calc(100vw-2rem))] max-h-[min(420px,70vh)] flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl"
        style={{ left: panelPos.left, top: panelPos.top }}
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
    ) : null;

  const popupPortal = popupEl ? createPortal(popupEl, document.body) : null;

  if (isLight) {
    return (
      <div ref={rootRef} className="inline-flex">
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="relative w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/10 text-white"
            aria-label="Notifications"
            aria-expanded={open}
          >
            <IconBell size={20} />
            {hubUnreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {hubUnreadCount > 99 ? "99+" : hubUnreadCount}
              </span>
            )}
          </button>
          {popupPortal}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/10 text-brand-50 hover:text-white"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <IconBell size={20} />
        {hubUnreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {hubUnreadCount > 99 ? "99+" : hubUnreadCount}
          </span>
        )}
      </button>
      {popupPortal}
    </div>
  );
}
