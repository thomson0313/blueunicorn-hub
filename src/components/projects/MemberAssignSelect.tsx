"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";

export type MemberOption = { _id: string; name: string; avatarUrl?: string | null };

export function MemberAssignSelect({
  value,
  members,
  onChange,
}: {
  value: string;
  members: MemberOption[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = members.find((m) => m._id === value);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-left bg-white hover:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {selected ? (
          <>
            <Avatar name={selected.name} src={selected.avatarUrl} size={28} />
            <span className="flex-1 text-sm font-medium text-slate-800">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-sm text-slate-400">Select a member</span>
        )}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-slate-400 shrink-0 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg divide-y divide-slate-50"
        >
          {members.map((m) => (
            <li key={m._id} role="option" aria-selected={value === m._id}>
              <button
                type="button"
                onClick={() => {
                  onChange(m._id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 cursor-pointer ${
                  value === m._id ? "bg-brand-50" : ""
                }`}
              >
                <Avatar name={m.name} src={m.avatarUrl} size={28} />
                <span className="font-medium text-slate-800">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
