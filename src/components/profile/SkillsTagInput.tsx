"use client";

import { useState, type KeyboardEvent } from "react";

export function parseSkillsString(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function skillsToString(tags: string[]): string {
  return tags.join(", ");
}

export function SkillsTagInput({
  tags,
  onChange,
  placeholder = "Type a skill and press Enter",
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const value = raw.trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (tags.some((t) => t.toLowerCase() === key)) {
      setDraft("");
      return;
    }
    onChange([...tags, value]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 min-h-[42px] w-full rounded-lg border border-slate-300 px-2 py-2 focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-500 bg-white cursor-text"
      onClick={(e) => {
        if (e.target === e.currentTarget) (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus();
      }}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-brand-50 text-brand-800 text-sm font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="w-5 h-5 rounded-full flex items-center justify-center text-brand-600 hover:bg-brand-100 cursor-pointer text-xs leading-none"
            aria-label={`Remove ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(draft)}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] border-0 outline-none text-sm py-0.5 px-1 bg-transparent"
      />
    </div>
  );
}
