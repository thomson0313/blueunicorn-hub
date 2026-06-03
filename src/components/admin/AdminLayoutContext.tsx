"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type AdminLayoutContextValue = {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleCollapsed: () => void;
  setMobileOpen: (open: boolean) => void;
  sidebarWidth: string;
};

const AdminLayoutContext = createContext<AdminLayoutContextValue | null>(null);

const STORAGE_KEY = "admin-sidebar-collapsed";

export function AdminLayoutProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const sidebarWidth = collapsed ? "md:ml-[4.5rem]" : "md:ml-56";

  return (
    <AdminLayoutContext.Provider
      value={{ collapsed, mobileOpen, toggleCollapsed, setMobileOpen, sidebarWidth }}
    >
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout() {
  const ctx = useContext(AdminLayoutContext);
  if (!ctx) throw new Error("useAdminLayout must be used within AdminLayoutProvider");
  return ctx;
}
