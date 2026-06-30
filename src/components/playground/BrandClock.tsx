"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const TZ = "Asia/Tokyo";

const timeParts = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function jstClock(date: Date): { h: number; m: number; s: number } {
  const parts = timeParts.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return { h: get("hour") % 24, m: get("minute"), s: get("second") };
}

export function BrandClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { h, m, s } = now ? jstClock(now) : { h: 0, m: 0, s: 0 };

  const secondAngle = s * 6;
  const minuteAngle = m * 6 + s * 0.1;
  const hourAngle = (h % 12) * 30 + m * 0.5;

  const dateLabel = now
    ? now.toLocaleDateString(undefined, {
        timeZone: TZ,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";
  const timeLabel = now ? `${pad(h)}:${pad(m)}:${pad(s)}` : "--:--:--";

  return (
    <div className="bg-gradient-to-r from-brand-700 to-brand-500 rounded-2xl shadow-md text-white px-6 py-5 flex flex-col sm:flex-row items-center gap-6">
      <AnalogClock hourAngle={hourAngle} minuteAngle={minuteAngle} secondAngle={secondAngle} />
      <div className="flex-1 min-w-0 text-center sm:text-left">
        <p
          className="font-mono font-bold tracking-widest tabular-nums leading-none"
          style={{ fontSize: "clamp(2.25rem, 7vw, 3.5rem)" }}
        >
          {timeLabel}
        </p>
        <p className="text-brand-50/90 text-sm sm:text-base mt-2">{dateLabel}</p>
        <p className="text-brand-100/80 text-xs mt-1 tracking-wide uppercase">Japan Standard Time · Tokyo</p>
      </div>
    </div>
  );
}

function AnalogClock({
  hourAngle,
  minuteAngle,
  secondAngle,
}: {
  hourAngle: number;
  minuteAngle: number;
  secondAngle: number;
}) {
  return (
    <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
      <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden>
        <circle cx="100" cy="100" r="94" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const inner = i % 3 === 0 ? 76 : 82;
          const outer = 90;
          return (
            <line
              key={i}
              x1={100 + inner * Math.sin(angle)}
              y1={100 - inner * Math.cos(angle)}
              x2={100 + outer * Math.sin(angle)}
              y2={100 - outer * Math.cos(angle)}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={i % 3 === 0 ? 4 : 2}
              strokeLinecap="round"
            />
          );
        })}
        <g transform={`rotate(${hourAngle} 100 100)`}>
          <line x1="100" y1="100" x2="100" y2="58" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        </g>
        <g transform={`rotate(${minuteAngle} 100 100)`}>
          <line x1="100" y1="100" x2="100" y2="40" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g transform={`rotate(${secondAngle} 100 100)`}>
          <line x1="100" y1="112" x2="100" y2="34" stroke="#d2ecff" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
      {/* Brand hub: logo + B.U at the clock center. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-md">
          <Image src="/blunicorn-logo.png" alt="Blunicorn" width={22} height={22} style={{ height: "auto" }} />
        </span>
        <span className="mt-0.5 text-[10px] font-bold tracking-widest text-white drop-shadow">B.U</span>
      </div>
    </div>
  );
}
