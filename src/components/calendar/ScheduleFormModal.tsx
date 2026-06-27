"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ActionButton";
import type { CalendarSchedule, CalendarScheduleType } from "@/lib/types";
import {
  datetimeLocalInTimezoneToUtc,
  defaultEndIso,
  isValidDate,
  toDatetimeLocalValue,
} from "@/lib/calendar-utils";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500";

type Props = {
  open: boolean;
  timeZone: string;
  initialStartIso: string;
  schedule?: CalendarSchedule | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ScheduleFormModal({
  open,
  timeZone,
  initialStartIso,
  schedule,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!schedule;
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CalendarScheduleType>("interview");
  const [description, setDescription] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function isLocalTimeValid(value: string): boolean {
    if (!value) return false;
    try {
      return isValidDate(new Date(datetimeLocalInTimezoneToUtc(value, timeZone)));
    } catch {
      return false;
    }
  }

  const timesValid = isLocalTimeValid(startLocal) && isLocalTimeValid(endLocal);

  // Reset fields when opening a new cell (not when only type changes).
  useEffect(() => {
    if (!open || schedule || !initialStartIso) return;
    setTitle("");
    setType("interview");
    setDescription("");
    setMeetingLink("");
    setError("");
  }, [open, initialStartIso, schedule]);

  // Sync times from schedule or clicked cell; recalculate end when type changes.
  useEffect(() => {
    if (!open) return;
    if (schedule) {
      setTitle(schedule.title);
      setType(schedule.type);
      setDescription(schedule.description);
      setMeetingLink(schedule.meetingLink);
      setStartLocal(toDatetimeLocalValue(schedule.startsAt, timeZone));
      setEndLocal(toDatetimeLocalValue(schedule.endsAt, timeZone));
      return;
    }
    if (!initialStartIso || !isValidDate(new Date(initialStartIso))) return;
    setStartLocal(toDatetimeLocalValue(initialStartIso, timeZone));
    setEndLocal(toDatetimeLocalValue(defaultEndIso(initialStartIso, type), timeZone));
  }, [open, schedule, initialStartIso, timeZone, type]);

  if (!open || (!schedule && !initialStartIso)) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving || !timesValid) return;
    setSaving(true);
    setError("");
    try {
      let startsAt: string;
      let endsAt: string;
      try {
        startsAt = datetimeLocalInTimezoneToUtc(startLocal, timeZone);
        endsAt = datetimeLocalInTimezoneToUtc(endLocal, timeZone);
      } catch {
        setError("Invalid start or end time");
        return;
      }
      if (new Date(endsAt) <= new Date(startsAt)) {
        setError("End time must be after start time");
        return;
      }
      const body = {
        title: title.trim(),
        type,
        description,
        meetingLink: type === "interview" ? meetingLink : "",
        startsAt,
        endsAt,
      };
      const url = isEdit ? `/api/calendar/${schedule!._id}` : "/api/calendar";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit schedule" : "Add schedule"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT_CLASS}
              placeholder="Schedule title"
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">Type</span>
            <div className="flex gap-4">
              {(["interview", "event"] as const).map((t) => (
                <label key={t} className="inline-flex items-center gap-2 text-sm cursor-pointer capitalize">
                  <input
                    type="radio"
                    name="scheduleType"
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="accent-brand-600"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Time range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-500">Start</span>
                <input
                  type="datetime-local"
                  required
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                  className={`${INPUT_CLASS} mt-0.5`}
                />
              </div>
              <div>
                <span className="text-xs text-slate-500">End</span>
                <input
                  type="datetime-local"
                  required
                  value={endLocal}
                  onChange={(e) => setEndLocal(e.target.value)}
                  className={`${INPUT_CLASS} mt-0.5`}
                />
              </div>
            </div>
          </div>
          {type === "interview" && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meeting link</label>
                <input
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={INPUT_CLASS}
                  placeholder="Interview notes"
                />
              </div>
            </>
          )}
          {type === "event" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={INPUT_CLASS}
                placeholder="Event details"
              />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end pt-2">
            <ActionButton type="submit" loading={saving} loadingText="Saving..." disabled={!timesValid}>
              Save
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  );
}
