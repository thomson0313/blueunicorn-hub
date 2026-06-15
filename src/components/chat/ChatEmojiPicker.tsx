"use client";

import { useEffect, useRef, useState } from "react";
import {
  EMOJI_CATEGORIES,
  filterEmojis,
  filterShortcodes,
  getRecentEmojis,
  pushRecentEmoji,
} from "@/lib/chat-emoji";

export function ChatEmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("recent");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      onClose?.();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  const recent = getRecentEmojis();
  const emojis =
    tab === "recent"
      ? (query ? filterEmojis(query) : recent.length ? recent : EMOJI_CATEGORIES[0].emojis)
      : filterEmojis(query, tab === "search" ? undefined : tab);

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 mb-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex flex-col max-h-80"
    >
      <div className="p-2 border-b border-slate-100">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value) setTab("search");
          }}
          placeholder="Search emojis"
          className="w-full text-sm px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div className="flex gap-1 px-2 py-1.5 border-b border-slate-100 overflow-x-auto shrink-0">
        <TabBtn active={tab === "recent"} onClick={() => setTab("recent")} label="Recent" />
        {EMOJI_CATEGORIES.map((c) => (
          <TabBtn key={c.id} active={tab === c.id} onClick={() => setTab(c.id)} label={c.label} />
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-8 gap-0.5">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              pushRecentEmoji(emoji);
              onPick(emoji);
            }}
            className="w-8 h-8 rounded hover:bg-slate-100 text-lg cursor-pointer"
          >
            {emoji}
          </button>
        ))}
        {!emojis.length && (
          <p className="col-span-8 text-xs text-slate-400 text-center py-4">No emojis found</p>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded-md text-[11px] whitespace-nowrap cursor-pointer ${
        active ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-500 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

export function ChatEmojiAutocomplete({
  query,
  onPick,
}: {
  query: string;
  onPick: (replacement: string) => void;
}) {
  const matches = filterShortcodes(query);
  if (!matches.length) return null;
  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-40 py-1 max-h-40 overflow-y-auto">
      {matches.map(({ code, emoji }) => (
        <button
          key={code}
          type="button"
          onClick={() => onPick(`:${code}:`)}
          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-sm cursor-pointer"
        >
          <span>{emoji}</span>
          <span className="text-slate-500">:{code}:</span>
        </button>
      ))}
    </div>
  );
}
