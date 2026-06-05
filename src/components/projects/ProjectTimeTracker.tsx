"use client";

import { useCallback, useEffect, useState } from "react";
import { ActionButton } from "@/components/ActionButton";
import { ProjectTimeHeatmap } from "@/components/projects/ProjectTimeHeatmap";
import {
  formatHours,
  projectCreatedDateInputValue,
  sanitizeHoursInput,
  todayDateInputValue,
} from "@/lib/project-time-heatmap";

export function ProjectTimeTracker({
  projectId,
  projectCreatedAt,
  onUpdated,
}: {
  projectId: string;
  projectCreatedAt: string;
  onUpdated?: () => void;
}) {
  const minDate = projectCreatedDateInputValue(projectCreatedAt);
  const maxDate = todayDateInputValue();

  const [hoursByDate, setHoursByDate] = useState<Record<string, number>>({});
  const [totalHours, setTotalHours] = useState(0);
  const [workDate, setWorkDate] = useState(maxDate);
  const [hours, setHours] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loggedHours = hoursByDate[workDate] ?? 0;
  const hasEntry = loggedHours > 0;

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/time-logs`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load time logs");
      return;
    }
    setHoursByDate(data.hoursByDate ?? {});
    setTotalHours(data.totalHours ?? 0);
    setError("");
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setEditMode(false);
    if (hasEntry) {
      setHours(formatHours(loggedHours));
    } else {
      setHours("");
    }
  }, [workDate, hasEntry, loggedHours]);

  function clampDate(value: string): string {
    if (value < minDate) return minDate;
    if (value > maxDate) return maxDate;
    return value;
  }

  async function addTime() {
    const value = parseFloat(sanitizeHoursInput(hours));
    if (!value || value <= 0) {
      setError("Enter hours greater than 0");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/time-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workDate, hours: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not add time");
        return;
      }
      setHoursByDate(data.hoursByDate ?? {});
      setTotalHours(data.totalHours ?? 0);
      setHours(formatHours(value));
      onUpdated?.();
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    const value = parseFloat(sanitizeHoursInput(hours));
    if (!value || value <= 0) {
      setError("Enter hours greater than 0");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/time-logs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workDate, hours: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update time");
        return;
      }
      setHoursByDate(data.hoursByDate ?? {});
      setTotalHours(data.totalHours ?? 0);
      setEditMode(false);
      onUpdated?.();
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntry() {
    if (!confirm(`Remove ${formatHours(loggedHours)} hr logged on this date?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/time-logs`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not delete time");
        return;
      }
      setHoursByDate(data.hoursByDate ?? {});
      setTotalHours(data.totalHours ?? 0);
      setHours("");
      setEditMode(false);
      onUpdated?.();
    } finally {
      setBusy(false);
    }
  }

  const inputDisabled = hasEntry && !editMode;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-600 font-medium">Time tracked</span>
        <span className="font-semibold text-brand-700">{totalHours.toLocaleString()} hr total</span>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="shrink-0">
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input
            type="date"
            value={workDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => setWorkDate(clampDate(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Spent time</label>
          <div
            className={`flex rounded-lg border border-slate-300 bg-white overflow-hidden ${
              inputDisabled ? "opacity-80" : "focus-within:ring-2 focus-within:ring-brand-500"
            }`}
          >
            <input
              type="text"
              inputMode="decimal"
              value={hours}
              disabled={inputDisabled}
              onChange={(e) => setHours(sanitizeHoursInput(e.target.value))}
              placeholder="0"
              className="flex-1 min-w-0 border-0 px-3 py-2 text-sm focus:outline-none disabled:bg-slate-50 disabled:text-slate-600"
            />
            <span className="shrink-0 flex items-center px-3 text-sm text-slate-500 bg-slate-50 border-l border-slate-200">
              hr
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasEntry && !editMode ? (
            <>
              <ActionButton type="button" variant="secondary" disabled={busy} onClick={() => setEditMode(true)}>
                Edit
              </ActionButton>
              <ActionButton type="button" variant="danger" disabled={busy} onClick={() => void deleteEntry()}>
                Delete
              </ActionButton>
            </>
          ) : hasEntry && editMode ? (
            <>
              <ActionButton
                type="button"
                loading={busy}
                loadingText="Saving..."
                disabled={!hours}
                onClick={() => void saveEdit()}
              >
                Save
              </ActionButton>
              <ActionButton
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setEditMode(false);
                  setHours(formatHours(loggedHours));
                  setError("");
                }}
              >
                Cancel
              </ActionButton>
            </>
          ) : (
            <ActionButton
              type="button"
              loading={busy}
              loadingText="Adding..."
              disabled={!hours}
              onClick={() => void addTime()}
            >
              Add
            </ActionButton>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="h-24 flex items-center justify-center text-sm text-slate-400">Loading activity...</div>
      ) : (
        <ProjectTimeHeatmap hoursByDate={hoursByDate} projectCreatedAt={projectCreatedAt} />
      )}
    </div>
  );
}
