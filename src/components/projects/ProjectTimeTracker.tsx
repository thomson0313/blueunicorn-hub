"use client";

import { useCallback, useEffect, useState } from "react";
import { ActionButton } from "@/components/ActionButton";
import { ProjectTimeHeatmap } from "@/components/projects/ProjectTimeHeatmap";
import { sanitizeHoursInput, todayDateInputValue } from "@/lib/project-time-heatmap";

export function ProjectTimeTracker({
  projectId,
  onUpdated,
}: {
  projectId: string;
  onUpdated?: () => void;
}) {
  const [hoursByDate, setHoursByDate] = useState<Record<string, number>>({});
  const [totalHours, setTotalHours] = useState(0);
  const [workDate, setWorkDate] = useState(todayDateInputValue);
  const [hours, setHours] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

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

  async function addTime() {
    const value = parseFloat(sanitizeHoursInput(hours));
    if (!value || value <= 0) {
      setError("Enter hours greater than 0");
      return;
    }
    setAdding(true);
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
      setHours("");
      setWorkDate(todayDateInputValue());
      onUpdated?.();
    } finally {
      setAdding(false);
    }
  }

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
            onChange={(e) => setWorkDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Spent time</label>
          <div className="flex rounded-lg border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
            <input
              type="text"
              inputMode="decimal"
              value={hours}
              onChange={(e) => setHours(sanitizeHoursInput(e.target.value))}
              placeholder="0"
              className="flex-1 min-w-0 border-0 px-3 py-2 text-sm focus:outline-none"
            />
            <span className="shrink-0 flex items-center px-3 text-sm text-slate-500 bg-slate-50 border-l border-slate-200">
              hr
            </span>
          </div>
        </div>
        <ActionButton
          type="button"
          loading={adding}
          loadingText="Adding..."
          disabled={!hours}
          onClick={() => void addTime()}
        >
          Add
        </ActionButton>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="h-24 flex items-center justify-center text-sm text-slate-400">Loading activity...</div>
      ) : (
        <ProjectTimeHeatmap hoursByDate={hoursByDate} />
      )}
    </div>
  );
}
