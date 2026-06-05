"use client";

import { useMemo, useState } from "react";
import {
  buildHeatmapGrid,
  formatHours,
  formatWorkDateLabel,
  heatmapColorClass,
  type HeatmapGrid,
} from "@/lib/project-time-heatmap";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ProjectTimeHeatmap({
  hoursByDate,
  compact = false,
}: {
  hoursByDate: Record<string, number>;
  compact?: boolean;
}) {
  const grid = useMemo(() => buildHeatmapGrid(hoursByDate), [hoursByDate]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const cell = compact ? "w-2.5 h-2.5" : "w-3 h-3";
  const gap = compact ? "gap-[2px]" : "gap-[3px]";

  return (
    <div className="relative">
      <div className="flex items-start gap-2">
        {!compact && (
          <div className={`flex flex-col ${gap} pt-0.5 pr-1 shrink-0`}>
            {DAY_LABELS.map((label, i) => (
              <span
                key={label}
                className={`${cell} text-[10px] leading-none text-slate-400 flex items-center`}
                style={{ visibility: i % 2 === 0 ? "visible" : "hidden" }}
              >
                {label}
              </span>
            ))}
          </div>
        )}
        <div className={`flex ${gap}`}>
          {grid.weeks.map((week, wi) => (
            <div key={wi} className={`flex flex-col ${gap}`}>
              {week.map((day) => (
                <HeatmapCell
                  key={day.date}
                  day={day}
                  maxHours={grid.maxHours}
                  className={cell}
                  onHover={(text, el) => {
                    const rect = el.getBoundingClientRect();
                    setTooltip({ x: rect.left + rect.width / 2, y: rect.top, text });
                  }}
                  onLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {!compact && (
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>{formatHours(grid.totalHours)} hr logged (last 6 months)</span>
          <div className="flex items-center gap-1">
            <span>Less</span>
            <div className="flex gap-[2px]">
              {[0, 1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  className={`w-3 h-3 rounded-sm ${
                    level === 0
                      ? "bg-slate-100"
                      : level === 1
                        ? "bg-blue-200"
                        : level === 2
                          ? "bg-blue-400"
                          : level === 3
                            ? "bg-blue-600"
                            : "bg-blue-800"
                  }`}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      )}
      {tooltip && (
        <div
          className="fixed z-[100] -translate-x-1/2 -translate-y-full px-2 py-1 rounded-md bg-slate-900 text-white text-xs whitespace-nowrap pointer-events-none shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

function HeatmapCell({
  day,
  maxHours,
  className,
  onHover,
  onLeave,
}: {
  day: HeatmapGrid["weeks"][number][number];
  maxHours: number;
  className: string;
  onHover: (text: string, el: HTMLElement) => void;
  onLeave: () => void;
}) {
  const label =
    day.hours > 0
      ? `${formatWorkDateLabel(day.date)} — ${formatHours(day.hours)} hr`
      : `${formatWorkDateLabel(day.date)} — No time logged`;

  return (
    <span
      role="img"
      aria-label={label}
      className={`${className} rounded-sm ${heatmapColorClass(day.hours, maxHours, day.inRange)} ${
        day.inRange ? "cursor-default" : "opacity-40"
      }`}
      onMouseEnter={(e) => onHover(label, e.currentTarget)}
      onMouseLeave={onLeave}
    />
  );
}
