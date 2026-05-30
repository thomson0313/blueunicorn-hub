"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { SessionUser, AlertItem, ChatMessage } from "@/lib/types";
import { playAlertChime, playMessageChime, unlockAudio } from "@/lib/sound";

type AppContextValue = {
  user: SessionUser;
  socket: Socket | null;
  onlineUserIds: string[];
  alerts: AlertItem[];
  dismissAlert: (id: string) => void;
  avatarUrl: string | null;
  // Chat message notifications
  unread: Record<string, number>;
  totalUnread: number;
  setActiveConversation: (id: string | null) => void;
  clearUnread: (id: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unread, setUnread] = useState<Record<string, number>>({});
  // Which conversation the user is actively viewing ("general" or a userId), if any.
  const activeConvRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setAvatarUrl(d.profile?.avatarUrl ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const s = io({ path: "/socket.io", withCredentials: true });
    socketRef.current = s;
    setSocket(s);

    s.on("presence:update", (ids: string[]) => setOnlineUserIds(ids));
    s.on("alert:new", (alert: AlertItem) => {
      setAlerts((prev) => {
        if (prev.some((a) => a._id === alert._id)) return prev;
        playAlertChime();
        return [...prev, alert];
      });
    });

    // Global chat notifications: bump unread + play a sound for messages that
    // are not from me and not in the conversation I'm currently viewing.
    const notify = (convId: string, fromSelf: boolean) => {
      if (fromSelf) return;
      if (activeConvRef.current === convId) return;
      setUnread((prev) => ({ ...prev, [convId]: (prev[convId] || 0) + 1 }));
      playMessageChime();
    };
    s.on("general:message", (m: ChatMessage) => notify("general", m.sender._id === user.sub));
    s.on("dm:message", (m: ChatMessage) => {
      const fromSelf = m.sender._id === user.sub;
      const other = fromSelf ? m.recipient || "" : m.sender._id;
      notify(other, fromSelf);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [user.sub]);

  const setActiveConversation = useCallback((id: string | null) => {
    activeConvRef.current = id;
    if (id) setUnread((prev) => (prev[id] ? { ...prev, [id]: 0 } : prev));
  }, []);

  const clearUnread = useCallback((id: string) => {
    setUnread((prev) => (prev[id] ? { ...prev, [id]: 0 } : prev));
  }, []);

  // Unlock the Web Audio context on the first user interaction so alert sounds can play.
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
      socket,
      onlineUserIds,
      alerts,
      dismissAlert,
      avatarUrl,
      unread,
      totalUnread,
      setActiveConversation,
      clearUnread,
    }),
    [user, socket, onlineUserIds, alerts, avatarUrl, unread, totalUnread, setActiveConversation, clearUnread]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
