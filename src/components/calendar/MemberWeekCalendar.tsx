"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PanelLoader } from "@/components/PanelLoader";
import { ScheduleDetailModal } from "@/components/calendar/ScheduleDetailModal";
import { ScheduleFormModal } from "@/components/calendar/ScheduleFormModal";
import type { CalendarSchedule } from "@/lib/types";
import {
  HOUR_HEIGHT,
  HOURS,
  WEEKDAY_LABELS,
  buildWeekScheduleSegments,
  formatDayHeader,
  formatTimeRange,
  getCurrentTimeLine,
  getWeekDays,
  getWeekRangeUtc,
  getYmdInTimezone,
  isTodayYmd,
  listTimezoneOptions,
  safeToIso,
  ymdToDateInput,
  zonedDateTimeToUtc,
  type Ymd,
} from "@/lib/calendar-utils";
import { useCalendarTimezone } from "@/components/calendar/useCalendarTimezone";

type FilterType = "all" | "event" | "interview";

export function MemberWeekCalendar() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const { timeZone, setTimeZone, ready: timezoneReady } = useCalendarTimezone();
  const [filter, setFilter] = useState<FilterType>("all");
  const [schedules, setSchedules] = useState<CalendarSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formStartIso, setFormStartIso] = useState("");
  const [editingSchedule, setEditingSchedule] = useState<CalendarSchedule | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<CalendarSchedule | null>(null);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const weekDays = useMemo(() => getWeekDays(anchorDate, timeZone), [anchorDate, timeZone]);
  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${formatDayHeader(start, timeZone)} – ${formatDayHeader(end, timeZone)}`;
  }, [weekDays, timeZone]);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getWeekRangeUtc(anchorDate, timeZone);
      const params = new URLSearchParams({ from: start, to: end });
      if (filter !== "all") params.set("type", filter);
      const res = await fetch(`/api/calendar?${params.toString()}`);
      const data = await res.json();
      setSchedules(data.schedules || []);
    } finally {
      setLoading(false);
    }
  }, [anchorDate, timeZone, filter]);

  useEffect(() => {
    if (!timezoneReady) return;
    void loadSchedules();
  }, [loadSchedules, timezoneReady]);

  const segments = useMemo(
    () => buildWeekScheduleSegments(schedules, weekDays, timeZone),
    [schedules, weekDays, timeZone]
  );

  const nowLine = useMemo(
    () => getCurrentTimeLine(weekDays, timeZone),
    [weekDays, timeZone, nowTick]
  );

  function goToday() {
    setAnchorDate(new Date());
  }

  function openCreateCell(day: Ymd, hour: number) {
    if (!timezoneReady) return;
    try {
      const startIso = safeToIso(zonedDateTimeToUtc(day, hour, 0, timeZone));
      setEditingSchedule(null);
      setFormStartIso(startIso);
      setFormOpen(true);
    } catch {
      /* invalid cell time — ignore click */
    }
  }

  function openScheduleDetail(schedule: CalendarSchedule) {
    setSelectedSchedule(schedule);
    setDetailOpen(true);
  }

  function openEditFromDetail() {
    if (!selectedSchedule) return;
    setEditingSchedule(selectedSchedule);
    setFormStartIso(selectedSchedule.startsAt);
    setDetailOpen(false);
    setFormOpen(true);
  }

  const tzOptions = useMemo(
    () => (timezoneReady ? listTimezoneOptions(timeZone) : []),
    [timeZone, timezoneReady]
  );

  if (!timezoneReady) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
        <PanelLoader variant="grid" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-slate-500">{weekLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={ymdToDateInput(getYmdInTimezone(anchorDate, timeZone))}
            onChange={(e) => {
              if (!e.target.value) return;
              const [y, m, d] = e.target.value.split("-").map(Number);
              setAnchorDate(zonedDateTimeToUtc({ year: y, month: m, day: d }, 12, 0, timeZone));
            }}
            className="text-sm rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            type="button"
            onClick={goToday}
            className="text-sm font-medium rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50 cursor-pointer"
          >
            Today
          </button>
          <select
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            className="text-sm rounded-lg border border-slate-300 px-3 py-2 max-w-[12rem]"
          >
            {tzOptions.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="text-sm rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="all">All</option>
            <option value="event">Events</option>
            <option value="interview">Interviews</option>
          </select>
        </div>
      </div>

      {loading ? (
        <PanelLoader variant="grid" />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b border-slate-200 bg-slate-50">
                <div className="p-2" />
                {weekDays.map((day, i) => (
                  <div
                    key={i}
                    className={`p-2 text-center text-sm font-medium border-l border-slate-200 ${
                      isTodayYmd(day, timeZone) ? "text-brand-700 bg-brand-50/50" : "text-slate-700"
                    }`}
                  >
                    <div>{WEEKDAY_LABELS[i]}</div>
                    <div className="text-xs text-slate-500">{formatDayHeader(day, timeZone)}</div>
                  </div>
                ))}
              </div>

              <div className="relative grid grid-cols-[4rem_repeat(7,1fr)]">
                {HOURS.map((hour) => (
                  <div key={hour} className="contents">
                    <div
                      className="text-xs text-slate-400 text-right pr-2 border-b border-slate-100 flex items-start justify-end"
                      style={{ height: HOUR_HEIGHT }}
                    >
                      {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                    </div>
                    {weekDays.map((day, dayIndex) => (
                      <button
                        key={`${dayIndex}-${hour}`}
                        type="button"
                        onClick={() => openCreateCell(day, hour)}
                        className={`border-l border-b border-slate-100 hover:bg-brand-50/40 cursor-pointer transition ${
                          isTodayYmd(day, timeZone) ? "bg-brand-50/20" : ""
                        }`}
                        style={{ height: HOUR_HEIGHT }}
                        aria-label={`Add schedule ${formatDayHeader(day, timeZone)} hour ${hour}`}
                      />
                    ))}
                  </div>
                ))}

                {segments.map((seg, idx) => {
                  const left = `calc(4rem + ((100% - 4rem) / 7) * ${seg.dayIndex})`;
                  const width = `calc((100% - 4rem) / 7 - 4px)`;
                  const isInterview = seg.schedule.type === "interview";
                  return (
                    <button
                      key={`${seg.schedule._id}-${seg.dayIndex}-${idx}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openScheduleDetail(seg.schedule);
                      }}
                      className={`absolute z-10 mx-0.5 rounded-md px-1.5 py-0.5 text-left overflow-hidden shadow-sm border cursor-pointer ${
                        isInterview
                          ? "bg-blue-500 border-blue-600 text-white hover:bg-blue-600"
                          : "bg-sky-200 border-sky-300 text-sky-900 hover:bg-sky-300"
                      }`}
                      style={{
                        top: seg.topPx,
                        left,
                        width,
                        height: seg.heightPx,
                      }}
                    >
                      <p className="text-xs font-semibold truncate">{seg.schedule.title}</p>
                      <p className={`text-[10px] truncate ${isInterview ? "text-blue-100" : "text-sky-800"}`}>
                        {formatTimeRange(seg.schedule.startsAt, seg.schedule.endsAt, timeZone)}
                      </p>
                    </button>
                  );
                })}

                {nowLine && (
                  <div
                    className="absolute z-20 pointer-events-none"
                    style={{
                      top: nowLine.topPx,
                      left: `calc(4rem + ((100% - 4rem) / 7) * ${nowLine.dayIndex})`,
                      width: `calc((100% - 4rem) / 7)`,
                    }}
                  >
                    <div className="relative h-0.5 bg-red-500 shadow-sm">
                      <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ScheduleFormModal
        open={formOpen}
        timeZone={timeZone}
        initialStartIso={formStartIso}
        schedule={editingSchedule}
        onClose={() => {
          setFormOpen(false);
          setEditingSchedule(null);
          setFormStartIso("");
        }}
        onSaved={() => void loadSchedules()}
      />

      <ScheduleDetailModal
        open={detailOpen}
        schedule={selectedSchedule}
        timeZone={timeZone}
        onClose={() => {
          setDetailOpen(false);
          setSelectedSchedule(null);
        }}
        onEdit={openEditFromDetail}
        onDeleted={() => void loadSchedules()}
      />
    </div>
  );
}
