"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { buildMentionHandleSet, splitMentionContent, type MentionMember } from "@/lib/chat-mentions";

export type ChatMentionTextareaHandle = {
  focus: () => void;
  getSelectionStart: () => number;
};

export const ChatMentionTextarea = forwardRef<
  ChatMentionTextareaHandle,
  {
    value: string;
    onChange: (value: string, cursor: number) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    mentionMembers?: MentionMember[];
  }
>(function ChatMentionTextarea(
  { value, onChange, onKeyDown, onPaste, placeholder, disabled, mentionMembers = [] },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handles = buildMentionHandleSet(mentionMembers);
  const parts = splitMentionContent(value, handles);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    getSelectionStart: () => textareaRef.current?.selectionStart ?? value.length,
  }));

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  return (
    <div className="relative flex-1 min-w-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-sm py-1.5 px-1 leading-relaxed"
      >
        {parts.map((part, i) =>
          part.type === "mention" ? (
            <span
              key={i}
              className="rounded px-0.5 bg-sky-100 text-sky-700"
            >
              {part.value}
            </span>
          ) : (
            <span key={i} className="text-transparent">
              {part.value}
            </span>
          )
        )}
      </div>
      <textarea
        ref={textareaRef}
        data-mention-textarea
        value={value}
        onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onClick={(e) => onChange(e.currentTarget.value, e.currentTarget.selectionStart)}
        onKeyUp={(e) => onChange(e.currentTarget.value, e.currentTarget.selectionStart)}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="relative w-full min-w-0 resize-none bg-transparent text-sm py-1.5 px-1 focus:outline-none disabled:opacity-50 max-h-[120px] text-slate-900 caret-slate-900 leading-relaxed"
      />
    </div>
  );
});
