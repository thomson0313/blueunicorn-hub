"use client";

import { useEffect, useRef, useState } from "react";

export const COMMENT_REACTIONS = ["👍", "👎", "❤️", "😄", "🎉", "🔥"] as const;

export function CommentReactionPicker({
  grouped,
  onPick,
}: {
  grouped: Record<string, { count: number; mine: boolean; users: string[] }>;
  onPick: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const active = Object.entries(grouped).filter(([, g]) => g.count > 0);

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1 flex-wrap">
      {active.map(([emoji, g]) => (
        <button
          key={emoji}
          type="button"
          title={g.users.join(", ")}
          onClick={() => onPick(emoji)}
          className={`text-xs px-2 py-0.5 rounded-full border cursor-pointer transition ${
            g.mine ? "bg-brand-50 border-brand-300" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
          }`}
        >
          {emoji} {g.count}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-slate-300 cursor-pointer text-sm"
        aria-label="Add reaction"
        aria-expanded={open}
      >
        <span aria-hidden>😊</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 flex items-center gap-1 px-2 py-1.5 bg-white border border-slate-200 rounded-full shadow-lg">
          {COMMENT_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onPick(emoji);
                setOpen(false);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-base hover:bg-slate-100 cursor-pointer transition ${
                grouped[emoji]?.mine ? "bg-brand-50 ring-1 ring-brand-300" : ""
              }`}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
