"use client";

import { useEffect, useState } from "react";
import { getBrowserTimezone, normalizeTimeZone } from "@/lib/calendar-utils";

/** Detects browser local timezone after mount; avoids SSR/hydration issues. */
export function useCalendarTimezone() {
  const [timeZone, setTimeZoneState] = useState("UTC");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTimeZoneState(getBrowserTimezone());
    setReady(true);
  }, []);

  function setTimeZone(tz: string) {
    setTimeZoneState(normalizeTimeZone(tz));
  }

  return {
    timeZone: normalizeTimeZone(timeZone),
    setTimeZone,
    ready,
  };
}
