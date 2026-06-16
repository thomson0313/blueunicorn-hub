"use client";

import { Avatar } from "@/components/Avatar";
import {
  MENTION_EVERYONE,
  type MentionOption,
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
  if (!options.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg py-2 px-3 text-[11px] text-slate-500">
        No members found
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg shadow-lg py-0.5 max-h-36 overflow-y-auto"
      role="listbox"
    >
      {options.map((option, idx) => {
        const label = optionLabel(option);
        const active = idx === selectedIndex;
        return (
          <button
            key={option.kind === "everyone" ? "everyone" : option.member.userId}
            type="button"
            role="option"
            aria-selected={active}
            onMouseEnter={() => onHighlight(idx)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(option)}
            className={`w-full text-left px-2 py-1.5 flex items-center gap-2 cursor-pointer ${
              active ? "bg-brand-50" : "hover:bg-slate-50"
            }`}
          >
            {option.kind === "everyone" ? (
              <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                @
              </span>
            ) : (
              <Avatar name={option.member.name} src={option.member.avatarUrl} size={24} />
            )}
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-xs font-medium text-slate-900 truncate">
                {option.kind === "everyone" ? MENTION_EVERYONE : option.member.name}
              </span>
              <span className="block text-[10px] text-slate-500 truncate">@{label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
