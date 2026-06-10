"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { PanelLoader } from "@/components/PanelLoader";
import type { CalendarScheduleWithUser } from "@/lib/types";
import {
  HOUR_HEIGHT,
  HOURS,
  buildAdminDaySegments,
  formatDayHeader,
  formatTimeRange,
  getCurrentTimeLine,
  getYmdInTimezone,
  listTimezoneOptions,
  parseYmd,
  ymdToDateInput,
  zonedDateTimeToUtc,
} from "@/lib/calendar-utils";
import { useCalendarTimezone } from "@/components/calendar/useCalendarTimezone";

type MemberRow = { id: string; name: string; avatarUrl: string | null };

export function AdminDayCalendar() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const { timeZone, setTimeZone, ready: timezoneReady } = useCalendarTimezone();
  const [schedules, setSchedules] = useState<CalendarScheduleWithUser[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const dayYmd = useMemo(() => getYmdInTimezone(anchorDate, timeZone), [anchorDate, timeZone]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const date = ymdToDateInput(dayYmd);
      const res = await fetch(`/api/calendar/admin?date=${date}&timezone=${encodeURIComponent(timeZone)}`);
      const data = await res.json();
      setSchedules(data.schedules || []);
      setMembers(data.members || []);
    } finally {
      setLoading(false);
    }
  }, [dayYmd, timeZone]);

  useEffect(() => {
    if (!timezoneReady) return;
    void load();
  }, [load, timezoneReady]);

  const segments = useMemo(
    () =>
      buildAdminDaySegments(
        schedules.map((s) => ({ ...s, userId: s.userId, userName: s.userName })),
        members,
        dayYmd,
        timeZone
      ),
    [schedules, members, dayYmd, timeZone]
  );

  const nowLineTop = useMemo(() => {
    const today = getYmdInTimezone(new Date(), timeZone);
    if (today.year !== dayYmd.year || today.month !== dayYmd.month || today.day !== dayYmd.day) {
      return null;
    }
    return getCurrentTimeLine([dayYmd], timeZone)?.topPx ?? null;
  }, [dayYmd, timeZone]);

  const tzOptions = useMemo(() => listTimezoneOptions(), []);
  const memberColWidth = members.length > 0 ? `${100 / members.length}%` : "100%";

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team interviews</h1>
          <p className="text-slate-500">{formatDayHeader(dayYmd, timeZone)} · read-only</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={ymdToDateInput(dayYmd)}
            onChange={(e) => {
              const ymd = parseYmd(e.target.value);
              if (!ymd) return;
              setAnchorDate(zonedDateTimeToUtc(ymd, 12, 0, timeZone));
            }}
            className="text-sm rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            type="button"
            onClick={() => setAnchorDate(new Date())}
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
        </div>
      </div>

      {!timezoneReady || loading ? (
        <PanelLoader variant="grid" />
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          No team members found.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(members.length * 120, 600) }}>
              <div
                className="grid border-b border-slate-200 bg-slate-50"
                style={{ gridTemplateColumns: `4rem repeat(${members.length}, 1fr)` }}
              >
                <div className="p-2" />
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="p-2 border-l border-slate-200 text-center text-xs font-medium text-slate-700"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Avatar name={m.name} src={m.avatarUrl} size={28} />
                      <span className="truncate max-w-full">{m.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="relative grid"
                style={{ gridTemplateColumns: `4rem repeat(${members.length}, 1fr)` }}
              >
                {HOURS.map((hour) => (
                  <div key={hour} className="contents">
                    <div
                      className="text-xs text-slate-400 text-right pr-2 border-b border-slate-100"
                      style={{ height: HOUR_HEIGHT }}
                    >
                      {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                    </div>
                    {members.map((m) => (
                      <div
                        key={`${m.id}-${hour}`}
                        className="border-l border-b border-slate-100 bg-slate-50/30"
                        style={{ height: HOUR_HEIGHT }}
                      />
                    ))}
                  </div>
                ))}

                {segments.map((seg, idx) => (
                  <div
                    key={`${seg.schedule._id}-${idx}`}
                    className={`absolute z-10 mx-0.5 rounded-md px-1.5 py-0.5 text-white text-left overflow-hidden shadow-sm ${seg.colorClass}`}
                    style={{
                      top: seg.topPx,
                      left: `calc(4rem + (100% - 4rem) * ${seg.memberIndex / members.length})`,
                      width: `calc((100% - 4rem) / ${members.length} - 4px)`,
                      height: seg.heightPx,
                    }}
                    title={`${seg.schedule.userName}: ${seg.schedule.title}`}
                  >
                    <p className="text-xs font-semibold truncate">{seg.schedule.title}</p>
                    <p className="text-[10px] opacity-90 truncate">
                      {formatTimeRange(seg.schedule.startsAt, seg.schedule.endsAt, timeZone)}
                    </p>
                  </div>
                ))}

                {nowLineTop !== null && (
                  <div
                    className="absolute z-20 pointer-events-none left-[4rem] right-0"
                    style={{ top: nowLineTop }}
                  >
                    <div className="relative h-0.5 bg-red-500">
                      <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
