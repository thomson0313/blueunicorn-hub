"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { SessionUser, AlertItem, ChatMessage } from "@/lib/types";
import type { HubNotification } from "@/lib/hub-notifications";
import { playAlertChime, playMessageChime, unlockAudio } from "@/lib/sound";

type RealtimeMode = "socket" | "polling";

type AppContextValue = {
  user: SessionUser;
  realtimeMode: RealtimeMode;
  socket: Socket | null;
  onlineUserIds: string[];
  alerts: AlertItem[];
  dismissAlert: (id: string) => void;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  unread: Record<string, number>;
  totalUnread: number;
  setActiveConversation: (id: string | null) => void;
  clearUnread: (id: string) => void;
  hubUnreadCount: number;
  refreshHubNotifications: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

const REALTIME_MODE: RealtimeMode =
  process.env.NEXT_PUBLIC_REALTIME_MODE === "polling" ? "polling" : "socket";

const ALERT_POLL_MS = 15_000;
const HUB_NOTIF_POLL_MS = 5_000;

export function AppProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const activeConvRef = useRef<string | null>(null);
  const alertsSinceRef = useRef(new Date().toISOString());
  const hubSinceRef = useRef(new Date().toISOString());
  const [hubUnreadCount, setHubUnreadCount] = useState(0);
  const hubPollReadyRef = useRef(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setAvatarUrl(d.profile?.avatarUrl ?? null))
      .catch(() => {});
  }, []);

  // Log out if an admin rejects the account or deletes it while the user is online.
  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (cancelled || res.ok) return;
        await fetch("/api/auth/logout", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        let reason = "pending";
        if (res.status === 401) reason = "deleted";
        else if (data.approvalStatus === "rejected") reason = "rejected";
        window.location.href = `/login?reason=${reason}`;
      } catch {
        /* ignore */
      }
    };

    verifySession();
    const timer = setInterval(verifySession, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const bumpUnread = useCallback((convId: string, fromSelf: boolean) => {
    if (fromSelf) return;
    if (activeConvRef.current === convId) return;
    setUnread((prev) => ({ ...prev, [convId]: (prev[convId] || 0) + 1 }));
    playMessageChime();
  }, []);

  const pushAlert = useCallback((alert: AlertItem) => {
    setAlerts((prev) => {
      if (prev.some((a) => a._id === alert._id)) return prev;
      playAlertChime();
      return [...prev, alert];
    });
  }, []);

  // Deliver due scheduled alerts and show new ones (no cron — runs while the app is open).
  useEffect(() => {
    let cancelled = false;

    const pollAlerts = async () => {
      try {
        const since = alertsSinceRef.current;
        const res = await fetch(`/api/alerts/feed?since=${encodeURIComponent(since)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const incoming = (data.alerts || []) as AlertItem[];
        if (incoming.length > 0) {
          alertsSinceRef.current = new Date().toISOString();
          for (const alert of incoming) pushAlert(alert);
        }
      } catch {
        /* ignore */
      }
    };

    pollAlerts();
    const timer = setInterval(pollAlerts, ALERT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pushAlert]);

  // Socket.IO — local custom server only.
  useEffect(() => {
    if (REALTIME_MODE !== "socket") return;

    const s = io({ path: "/socket.io", withCredentials: true });
    socketRef.current = s;
    setSocket(s);

    s.on("connect_error", () => {
      s.disconnect();
    });

    s.on("presence:update", (ids: string[]) => setOnlineUserIds(ids));
    // Instant toast when admin schedules an alert for "now" (feed poll handles future times).
    s.on("alert:new", pushAlert);
    s.on("general:message", (m: ChatMessage) => bumpUnread("general", m.sender._id === user.sub));
    s.on("dm:message", (m: ChatMessage) => {
      const fromSelf = m.sender._id === user.sub;
      const other = fromSelf ? m.recipient || "" : m.sender._id;
      bumpUnread(other, fromSelf);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user.sub, bumpUnread, pushAlert]);

  // HTTP polling — Vercel serverless (chat + presence).
  useEffect(() => {
    if (REALTIME_MODE !== "polling") return;

    let cancelled = false;

    const pollPresence = async () => {
      try {
        const res = await fetch("/api/presence", { method: "POST" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setOnlineUserIds(data.onlineUserIds || []);
      } catch {
        /* ignore */
      }
    };

    const inboxSinceRef = { current: new Date().toISOString() };
    const pollInbox = async () => {
      try {
        const since = inboxSinceRef.current;
        const res = await fetch(`/api/messages/inbox?since=${encodeURIComponent(since)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const incoming = (data.messages || []) as ChatMessage[];
        if (incoming.length > 0) {
          inboxSinceRef.current = new Date().toISOString();
          for (const m of incoming) {
            if (m.sender._id === user.sub) continue;
            const convId = !m.recipient
              ? "general"
              : m.sender._id === user.sub
                ? m.recipient
                : m.sender._id;
            bumpUnread(convId, false);
          }
        }
      } catch {
        /* ignore */
      }
    };

    pollPresence();
    pollInbox();
    const presenceTimer = setInterval(pollPresence, 30_000);
    const inboxTimer = setInterval(pollInbox, 5_000);

    return () => {
      cancelled = true;
      clearInterval(presenceTimer);
      clearInterval(inboxTimer);
    };
  }, [bumpUnread, user.sub]);

  const refreshHubNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setHubUnreadCount(data.unreadCount ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  // Hub notifications — poll like chat inbox for near-instant badge + chime.
  useEffect(() => {
    let cancelled = false;

    const pollHub = async () => {
      try {
        const since = hubSinceRef.current;
        const res = await fetch(`/api/notifications?since=${encodeURIComponent(since)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const incoming = (data.newNotifications || []) as HubNotification[];
        const count = data.unreadCount ?? 0;
        if (incoming.length > 0) {
          hubSinceRef.current = new Date().toISOString();
          if (hubPollReadyRef.current && incoming.some((n) => !n.read)) {
            playMessageChime();
          }
        }
        hubPollReadyRef.current = true;
        setHubUnreadCount(count);
      } catch {
        /* ignore */
      }
    };

    void refreshHubNotifications();
    pollHub();
    const timer = setInterval(pollHub, HUB_NOTIF_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refreshHubNotifications]);

  const setActiveConversation = useCallback((id: string | null) => {
    activeConvRef.current = id;
    if (id) setUnread((prev) => (prev[id] ? { ...prev, [id]: 0 } : prev));
  }, []);

  const clearUnread = useCallback((id: string) => {
    setUnread((prev) => (prev[id] ? { ...prev, [id]: 0 } : prev));
  }, []);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const dismissAlert = (id: string) => setAlerts((prev) => prev.filter((a) => a._id !== id));

  const totalUnread = useMemo(() => Object.values(unread).reduce((a, b) => a + b, 0), [unread]);

  const value = useMemo(
    () => ({
      user,
      realtimeMode: REALTIME_MODE,
      socket,
      onlineUserIds,
      alerts,
      dismissAlert,
      avatarUrl,
      setAvatarUrl,
      unread,
      totalUnread,
      setActiveConversation,
      clearUnread,
      hubUnreadCount,
      refreshHubNotifications,
    }),
    [
      user,
      socket,
      onlineUserIds,
      alerts,
      avatarUrl,
      unread,
      totalUnread,
      setActiveConversation,
      clearUnread,
      hubUnreadCount,
      refreshHubNotifications,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useRealtimeMode(): RealtimeMode {
  return REALTIME_MODE;
}
