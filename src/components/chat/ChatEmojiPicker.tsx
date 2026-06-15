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
  const [tab, setTab] = useState(EMOJI_CATEGORIES[0].id);
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
  const searching = !!query.trim();
  const categoryEmojis = searching
    ? filterEmojis(query)
    : EMOJI_CATEGORIES.find((c) => c.id === tab)?.emojis ?? [];

  function pick(emoji: string) {
    pushRecentEmoji(emoji);
    onPick(emoji);
    onClose?.();
  }

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 mb-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex flex-col max-h-80"
    >
      <div className="p-2 border-b border-slate-100">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emojis"
          className="w-full text-sm px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      {!searching && (
        <div className="flex gap-0.5 px-2 py-1.5 border-b border-slate-100 overflow-x-auto shrink-0">
          {EMOJI_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.label}
              onClick={() => setTab(c.id)}
              className={`w-8 h-8 shrink-0 rounded-md text-lg cursor-pointer ${
                tab === c.id ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-slate-50"
              }`}
            >
              {c.icon}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-2">
        {!searching && recent.length > 0 && (
          <>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide px-1 mb-1">
              Recent
            </p>
            <div className="grid grid-cols-8 gap-0.5 mb-2">
              {recent.slice(0, 16).map((emoji) => (
                <button
                  key={`recent-${emoji}`}
                  type="button"
                  onClick={() => pick(emoji)}
                  className="w-8 h-8 rounded hover:bg-slate-100 text-lg cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="grid grid-cols-8 gap-0.5">
          {categoryEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => pick(emoji)}
              className="w-8 h-8 rounded hover:bg-slate-100 text-lg cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
        {!categoryEmojis.length && (
          <p className="text-xs text-slate-400 text-center py-4">No emojis found</p>
        )}
      </div>
    </div>
  );
}

export function ChatEmojiAutocomplete({
  query,
  onPick,
}: {
  query: string;
  onPick: (code: string) => void;
}) {
  const matches = filterShortcodes(query);
  if (!matches.length) return null;
  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-40 py-1 max-h-40 overflow-y-auto">
      {matches.map(({ code, emoji }) => (
        <button
          key={code}
          type="button"
          onClick={() => onPick(code)}
          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-sm cursor-pointer"
        >
          <span>{emoji}</span>
          <span className="text-slate-500">:{code}:</span>
        </button>
      ))}
    </div>
  );
}
