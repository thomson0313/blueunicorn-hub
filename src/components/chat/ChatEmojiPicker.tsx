"use client";

import { useEffect, useRef, useState } from "react";
import {
  EMOJI_CATEGORIES,
  filterEmojis,
  filterShortcodes,
  getRecentEmojis,
  pushRecentEmoji,
} from "@/lib/chat-emoji";

function CategoryIcon({ id, active }: { id: string; active: boolean }) {
  const cls = `w-4 h-4 ${active ? "text-slate-700" : "text-slate-400"}`;
  if (id === "smileys") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    );
  }
  if (id === "gestures") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M7 11V7a2 2 0 0 1 4 0v4" />
        <path d="M11 11V5a2 2 0 0 1 4 0v6" />
        <path d="M15 11V7a2 2 0 0 1 4 0v8a6 6 0 0 1-6 6H9a4 4 0 0 1-4-4v-4a2 2 0 0 1 4 0v4" />
      </svg>
    );
  }
  if (id === "objects") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

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
            className="w-full text-sm px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none"
        />
      </div>
      {!searching && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 overflow-x-auto shrink-0">
          {recent.slice(0, 8).map((emoji) => (
            <button
              key={`recent-tab-${emoji}`}
              type="button"
              onClick={() => pick(emoji)}
              className="w-8 h-8 shrink-0 rounded-md hover:bg-slate-100 text-lg cursor-pointer"
            >
              {emoji}
            </button>
          ))}
          {recent.length > 0 && <span className="w-px h-5 bg-slate-200 shrink-0 mx-0.5" />}
          {EMOJI_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.label}
              onClick={() => setTab(c.id)}
              className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center cursor-pointer ${
                tab === c.id ? "bg-slate-100 ring-1 ring-slate-300" : "hover:bg-slate-50"
              }`}
            >
              <CategoryIcon id={c.id} active={tab === c.id} />
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-2">
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
