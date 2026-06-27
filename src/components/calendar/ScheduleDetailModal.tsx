"use client";

import { useState } from "react";
import type { CalendarSchedule } from "@/lib/types";
import { formatTimeRange } from "@/lib/calendar-utils";

type Props = {
  open: boolean;
  schedule: CalendarSchedule | null;
  timeZone: string;
  onClose: () => void;
  onEdit?: () => void;
  onDeleted?: () => void;
  readOnly?: boolean;
  userName?: string;
};

export function ScheduleDetailModal({
  open,
  schedule,
  timeZone,
  onClose,
  onEdit,
  onDeleted,
  readOnly = false,
  userName,
}: Props) {
  const [copyOk, setCopyOk] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!open || !schedule) return null;

  async function copyLink() {
    if (!schedule?.meetingLink) return;
    try {
      await navigator.clipboard.writeText(schedule.meetingLink);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function handleDelete() {
    if (!schedule || deleting) return;
    if (!window.confirm("Delete this schedule?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calendar/${schedule._id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted?.();
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 truncate">{schedule.title}</h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full capitalize shrink-0 ${
                schedule.type === "interview"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-sky-100 text-sky-700"
              }`}
            >
              {schedule.type}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!readOnly && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                title="Edit"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-600 cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            {!readOnly && onDeleted && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                title="Delete"
                className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4 text-sm overflow-y-auto min-h-0">
          {userName && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Team member</p>
              <p className="text-slate-800 mt-1">{userName}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Time</p>
            <p className="text-slate-800 mt-1">
              {formatTimeRange(schedule.startsAt, schedule.endsAt, timeZone)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Description</p>
            <p className="text-slate-700 mt-1 whitespace-pre-wrap">
              {schedule.description?.trim() ? (
                schedule.description
              ) : (
                <span className="text-slate-400 italic">No description</span>
              )}
            </p>
          </div>
          {schedule.type === "interview" && schedule.meetingLink && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Meeting link</p>
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={schedule.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline break-all flex-1"
                >
                  {schedule.meetingLink}
                </a>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  title="Copy link"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer shrink-0"
                >
                  {copyOk ? (
                    <span className="text-xs text-emerald-600 px-1">Copied</span>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
