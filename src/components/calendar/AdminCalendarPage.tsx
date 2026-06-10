"use client";

import { useState } from "react";
import { AdminDayCalendar } from "@/components/calendar/AdminDayCalendar";
import { MemberWeekCalendar } from "@/components/calendar/MemberWeekCalendar";

type ViewMode = "admin" | "member";

export function AdminCalendarPage() {
  const [view, setView] = useState<ViewMode>("admin");

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {(
          [
            { id: "admin" as const, label: "As Admin" },
            { id: "member" as const, label: "As Member" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
              view === tab.id
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {view === "admin" ? <AdminDayCalendar /> : <MemberWeekCalendar />}
    </div>
  );
}
