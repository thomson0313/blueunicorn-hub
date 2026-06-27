"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function BrandClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const seconds = now?.getSeconds() ?? 0;
  const minutes = now?.getMinutes() ?? 0;
  const hours = now?.getHours() ?? 0;

  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const hourAngle = (hours % 12) * 30 + minutes * 0.5;

  const dateLabel = now
    ? now.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";
  const timeLabel = now ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : "--:--:--";

  return (
    <div className="bg-gradient-to-r from-brand-700 to-brand-500 rounded-2xl shadow-md text-white px-6 py-5 flex flex-col sm:flex-row items-center gap-6">
      <AnalogClock
        hourAngle={hourAngle}
        minuteAngle={minuteAngle}
        secondAngle={secondAngle}
      />
      <div className="flex-1 min-w-0 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <Image src="/blunicorn-logo.png" alt="Blunicorn" width={26} height={26} style={{ height: "auto" }} />
          <span className="font-bold text-lg tracking-tight">Blunicorn Playground</span>
        </div>
        <p
          className="mt-2 font-mono font-bold tracking-widest tabular-nums"
          style={{ fontSize: "clamp(2rem, 6vw, 3.25rem)" }}
        >
          {timeLabel}
        </p>
        <p className="text-brand-50/90 text-sm sm:text-base">{dateLabel}</p>
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
    <svg viewBox="0 0 200 200" className="w-28 h-28 sm:w-32 sm:h-32 shrink-0" aria-hidden>
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
        <line x1="100" y1="100" x2="100" y2="52" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      </g>
      <g transform={`rotate(${minuteAngle} 100 100)`}>
        <line x1="100" y1="100" x2="100" y2="34" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g transform={`rotate(${secondAngle} 100 100)`}>
        <line x1="100" y1="110" x2="100" y2="28" stroke="#d2ecff" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx="100" cy="100" r="9" fill="#fff" />
      <circle cx="100" cy="100" r="4" fill="#1c6bb0" />
    </svg>
  );
}
