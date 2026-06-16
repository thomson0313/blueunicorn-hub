"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  MENTION_HIGHLIGHT_CLASS,
  buildMentionHandleSet,
  splitMentionContent,
  type MentionMember,
} from "@/lib/chat-mentions";

const INPUT_CLASS =
  "w-full min-w-0 resize-none bg-transparent text-sm py-1.5 px-1 leading-5 font-[inherit] focus:outline-none disabled:opacity-50 max-h-[120px]";

export const ChatMentionInput = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (value: string, cursor: number) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    mentionMembers: MentionMember[];
  }
>(function ChatMentionInput(
  { value, onChange, onKeyDown, onPaste, placeholder, disabled, mentionMembers },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const handles = buildMentionHandleSet(mentionMembers);
  const parts = splitMentionContent(value, handles);

  useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [value]);

  function syncMirrorScroll() {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return;
    mirror.scrollTop = ta.scrollTop;
  }

  return (
    <div className="relative flex-1 min-w-0">
      <div
        ref={mirrorRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words ${INPUT_CLASS} text-slate-900`}
      >
        {parts.map((part, i) =>
          part.type === "mention" ? (
            <span key={i} className={MENTION_HIGHLIGHT_CLASS}>
              {part.value}
            </span>
          ) : (
            <span key={i}>{part.value}</span>
          )
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onClick={(e) => onChange(e.currentTarget.value, e.currentTarget.selectionStart)}
        onKeyUp={(e) => onChange(e.currentTarget.value, e.currentTarget.selectionStart)}
        onScroll={syncMirrorScroll}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={`relative ${INPUT_CLASS} ${
          value ? "text-transparent caret-slate-900" : "text-slate-900 placeholder:text-slate-400"
        }`}
      />
    </div>
  );
});
