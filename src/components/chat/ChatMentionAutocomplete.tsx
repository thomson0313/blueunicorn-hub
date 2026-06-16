"use client";

import { useEffect, useRef } from "react";
import { Avatar } from "@/components/Avatar";
import {
  MENTION_EVERYONE,
  type MentionOption,
  mentionHandle,
  optionLabel,
} from "@/lib/chat-mentions";

export function ChatMentionAutocomplete({
  options,
  selectedIndex,
  onSelect,
  onHighlight,
}: {
  options: MentionOption[];
  selectedIndex: number;
  onSelect: (option: MentionOption) => void;
  onHighlight: (index: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!options.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl py-3 px-4 text-xs text-slate-500">
        No members found
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="bg-white border border-slate-200 rounded-xl shadow-xl py-1 max-h-56 overflow-y-auto"
      role="listbox"
    >
      {options.map((option, idx) => {
        const label = optionLabel(option);
        const active = idx === selectedIndex;
        return (
          <button
            key={option.kind === "everyone" ? "everyone" : option.member.userId}
            type="button"
            data-idx={idx}
            role="option"
            aria-selected={active}
            onMouseEnter={() => onHighlight(idx)}
            onClick={() => onSelect(option)}
            className={`w-full text-left px-3 py-2 flex items-center gap-2.5 cursor-pointer ${
              active ? "bg-brand-50" : "hover:bg-slate-50"
            }`}
          >
            {option.kind === "everyone" ? (
              <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                @
              </span>
            ) : (
              <Avatar
                name={option.member.name}
                src={option.member.avatarUrl}
                size={32}
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-900 truncate">
                {option.kind === "everyone" ? MENTION_EVERYONE : option.member.name}
              </span>
              <span className="block text-xs text-slate-500 truncate">
                @{label}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
