"use client";

import { useEffect, useRef, useState } from "react";
import { AnchoredPortal } from "@/components/chat/AnchoredPortal";
import {
  EMOJI_CATEGORIES,
  filterEmojis,
  filterShortcodes,
  getRecentEmojis,
  pushRecentEmoji,
} from "@/lib/chat-emoji";

function CategoryIcon({ id, active }: { id: string; active: boolean }) {
  const category = EMOJI_CATEGORIES.find((c) => c.id === id);
  const icon = category?.icon ?? "😀";
  return <span className={`text-base leading-none ${active ? "" : "opacity-60"}`}>{icon}</span>;
}

export function ChatEmojiPicker({
  anchorRef,
  onPick,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  onPick: (emoji: string) => void;
  onClose?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(EMOJI_CATEGORIES[0].id);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose?.();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose, anchorRef]);

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
    <AnchoredPortal open anchorRef={anchorRef} placement="above" align="right" zIndex={150} width={288} gap={4}>
      <div
        ref={ref}
        className="w-72 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col max-h-80"
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
              onMouseDown={(e) => e.preventDefault()}
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
              onMouseDown={(e) => e.preventDefault()}
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
    </AnchoredPortal>
  );
}

export function ChatEmojiAutocomplete({
  anchorRef,
  query,
  onPick,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  query: string;
  onPick: (code: string) => void;
}) {
  const matches = filterShortcodes(query);
  if (!matches.length) return null;
  return (
    <AnchoredPortal open anchorRef={anchorRef} placement="above" zIndex={150} width={260} gap={4}>
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-40 overflow-y-auto">
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
    </AnchoredPortal>
  );
}
