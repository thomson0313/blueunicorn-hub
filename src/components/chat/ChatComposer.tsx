"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ChatAttachmentPreviewModal } from "@/components/chat/ChatAttachmentPreviewModal";
import { AnchoredPortal } from "@/components/chat/AnchoredPortal";
import { ChatEmojiAutocomplete, ChatEmojiPicker } from "@/components/chat/ChatEmojiPicker";
import { ChatMentionAutocomplete } from "@/components/chat/ChatMentionAutocomplete";
import {
  ChatMentionTextarea,
  type ChatMentionTextareaHandle,
} from "@/components/chat/ChatMentionTextarea";
import { isImageMime } from "@/lib/chat-attachment-utils";
import type { AttachmentLike } from "@/lib/chat-attachment-actions";
import { EMOJI_SHORTCODES } from "@/lib/chat-emoji";
import {
  buildMentionOptions,
  detectMentionQuery,
  type MentionMember,
  type MentionOption,
  optionLabel,
} from "@/lib/chat-mentions";

/** Local draft attachment — uploaded only when the message is sent. */
export type DraftAttachment = {
  id: string;
  file: File;
  fileName: string;
  mimeType: string;
  fileSize: number;
  previewUrl: string;
};

export type ChatComposerHandle = {
  addFiles: (files: FileList | File[]) => void;
};

export const ChatComposer = forwardRef<
  ChatComposerHandle,
  {
    placeholder: string;
    canSend?: boolean;
    draft: string;
    onDraftChange: (text: string) => void;
    replyTo?: { senderName: string; content: string } | null;
    onCancelReply?: () => void;
    onSend: (payload: { content: string; attachments: DraftAttachment[] }) => Promise<void>;
    onActivity?: () => void;
    typingLabel?: string | null;
    mentionMembers?: MentionMember[];
  }
>(function ChatComposer(
  {
    placeholder,
    canSend = true,
    draft,
    onDraftChange,
    replyTo,
    onCancelReply,
    onSend,
    onActivity,
    typingLabel = null,
    mentionMembers = [],
  },
  ref
) {
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentLike | null>(null);
  const composerRootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<ChatMentionTextareaHandle>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelRecordingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const attachmentsRef = useRef(attachments);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const hasContent = draft.trim().length > 0 || attachments.length > 0;
  const colonMatch = draft.match(/:([a-z0-9_+-]{1,})$/i);
  const colonQuery = colonMatch?.[1] || "";
  const mentionCtx = detectMentionQuery(draft, cursorPos);
  const mentionOptions = mentionCtx && mentionMembers.length > 0
    ? buildMentionOptions(mentionMembers, mentionCtx.query)
    : [];
  const mentionOpen = !!mentionCtx && mentionMembers.length > 0;
  const enableMentions = mentionMembers.length > 0;

  const revokeAttachment = useCallback((att: DraftAttachment) => {
    URL.revokeObjectURL(att.previewUrl);
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    setSendError(null);
    const added: DraftAttachment[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      previewUrl: URL.createObjectURL(file),
    }));
    setAttachments((prev) => [...prev, ...added]);
    requestAnimationFrame(() => composerRootRef.current?.focus());
  }, []);

  useImperativeHandle(ref, () => ({ addFiles }), [addFiles]);

  useEffect(() => {
    return () => {
      for (const att of attachmentsRef.current) revokeAttachment(att);
    };
  }, [revokeAttachment]);

  useEffect(() => {
    if (mentionOpen) setMentionIndex(0);
  }, [mentionOpen, mentionCtx?.query]);

  function handleDraftChange(text: string, cursor: number) {
    onDraftChange(text);
    setCursorPos(cursor);
    onActivity?.();
  }

  function insertMention(option: MentionOption) {
    if (!mentionCtx) return;
    const handle = optionLabel(option);
    const before = draft.slice(0, mentionCtx.start);
    const after = draft.slice(cursorPos);
    const next = `${before}@${handle} ${after}`;
    const nextCursor = before.length + handle.length + 2;
    onDraftChange(next);
    setCursorPos(nextCursor);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  async function handleSend() {
    if (!hasContent || sending || recording || !canSend) return;
    setSending(true);
    setSendError(null);

    let content = draft.trim();
    for (const [code, emoji] of Object.entries(EMOJI_SHORTCODES)) {
      content = content.replaceAll(`:${code}:`, emoji);
    }

    const attachmentsSnapshot = [...attachments];
    setAttachments([]);
    onDraftChange("");

    try {
      await onSend({ content, attachments: attachmentsSnapshot });
      for (const att of attachmentsSnapshot) revokeAttachment(att);
    } catch (err) {
      setAttachments(attachmentsSnapshot);
      setSendError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(e: React.KeyboardEvent) {
    if (mentionOpen) return;
    if (e.key !== "Enter" || e.shiftKey || recording || sending || !canSend || !hasContent) return;
    if (!composerRootRef.current?.contains(e.target as Node)) return;
    e.preventDefault();
    void handleSend();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen && mentionOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionOptions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionOptions.length) % mentionOptions.length);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        insertMention(mentionOptions[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function cancelRecording() {
    cancelRecordingRef.current = true;
    recorderRef.current?.stop();
    stopStream();
    setRecording(false);
  }

  function addVoiceDraft(file: File) {
    addFiles([file]);
  }

  async function toggleVoice() {
    if (hasContent) {
      await handleSend();
      return;
    }
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      cancelRecordingRef.current = false;
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        stopStream();
        setRecording(false);
        if (cancelRecordingRef.current) {
          cancelRecordingRef.current = false;
          chunksRef.current = [];
          return;
        }
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        addVoiceDraft(file);
      };
      rec.start();
      setRecording(true);
    } catch {
      setSendError("Microphone access denied");
    }
  }

  useEffect(() => {
    if (!emojiOpen) return;
    function onDoc(e: MouseEvent) {
      if (emojiRef.current?.contains(e.target as Node)) return;
      setEmojiOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [emojiOpen]);

  return (
    <div
      ref={composerRootRef}
      tabIndex={-1}
      onKeyDownCapture={handleComposerKeyDown}
      className={`border-t border-slate-200 bg-white shrink-0 min-w-0 overflow-x-hidden outline-none ${dragOver ? "ring-2 ring-brand-400 ring-inset" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!recording) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!recording && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
      }}
    >
      {replyTo && (
        <div className="px-3 pt-2 flex items-start justify-between gap-2 text-xs bg-slate-50 border-b border-slate-100 min-w-0">
          <div className="min-w-0 break-words">
            Replying to <span className="font-semibold">{replyTo.senderName}</span>
            {replyTo.content ? (
              <span className="text-slate-500">: {replyTo.content}</span>
            ) : null}
          </div>
          <button type="button" onClick={onCancelReply} className="text-slate-500 hover:text-slate-700 cursor-pointer shrink-0">
            ×
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="px-3 pt-2 flex flex-wrap gap-2 min-w-0">
          {attachments.map((a) => (
            <div key={a.id} className="relative group max-w-[140px]">
              {isImageMime(a.mimeType) ? (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewAttachment({
                      fileName: a.fileName,
                      fileUrl: a.previewUrl,
                      mimeType: a.mimeType,
                    })
                  }
                  className="block cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.previewUrl}
                    alt={a.fileName}
                    className="h-16 w-full rounded-lg object-cover border border-slate-200"
                  />
                </button>
              ) : (
                <div className="h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center px-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 shrink-0" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
              )}
              <p className="text-[10px] text-slate-500 truncate mt-1 px-0.5" title={a.fileName}>
                {a.fileName}
              </p>
              <button
                type="button"
                onClick={() => {
                  revokeAttachment(a);
                  setAttachments((prev) => prev.filter((x) => x.id !== a.id));
                }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center cursor-pointer shadow-md hover:bg-slate-900 z-10"
                aria-label="Remove attachment"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {recording && (
        <div className="px-3 pt-2 flex items-center gap-2 text-xs text-brand-600">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin shrink-0" />
          <span className="flex-1 min-w-0">Recording voice message…</span>
          <button
            type="button"
            onClick={cancelRecording}
            className="shrink-0 w-6 h-6 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center cursor-pointer"
            aria-label="Cancel recording"
          >
            ×
          </button>
        </div>
      )}

      {sendError && <p className="px-3 pt-2 text-xs text-red-600">{sendError}</p>}

      <div className="relative p-2 min-w-0" ref={inputAreaRef}>
        {colonQuery && !recording && !mentionOpen && (
          <ChatEmojiAutocomplete
            query={colonQuery}
            onPick={(code) => {
              const emoji = EMOJI_SHORTCODES[code] || "";
              if (!emoji) return;
              onDraftChange(draft.replace(/:([a-z0-9_+-]{1,})$/i, emoji));
            }}
          />
        )}

        {mentionOpen && (
          <AnchoredPortal open anchorRef={inputAreaRef} placement="above" zIndex={100}>
            <ChatMentionAutocomplete
              options={mentionOptions}
              selectedIndex={mentionIndex}
              onHighlight={setMentionIndex}
              onSelect={insertMention}
            />
          </AnchoredPortal>
        )}

        <div
          className={`flex items-end gap-1 rounded-xl border px-2 py-1.5 min-w-0 ${
            recording ? "border-slate-200 bg-slate-50" : "border-slate-300"
          } ${sending ? "opacity-60" : ""}`}
        >
          <button
            type="button"
            disabled={recording || sending}
            onClick={() => fileRef.current?.click()}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-brand-600 cursor-pointer disabled:opacity-40"
            aria-label="Attach file"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {enableMentions ? (
            <ChatMentionTextarea
              ref={textareaRef}
              value={draft}
              onChange={handleDraftChange}
              onKeyDown={onKeyDown}
              onPaste={handlePaste}
              mentionMembers={mentionMembers}
              placeholder={recording ? "Recording…" : sending ? "Sending…" : placeholder}
              disabled={recording || sending}
            />
          ) : (
            <textarea
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value, e.target.selectionStart)}
              onKeyDown={onKeyDown}
              onPaste={handlePaste}
              placeholder={recording ? "Recording…" : sending ? "Sending…" : placeholder}
              disabled={recording || sending}
              rows={1}
              className="flex-1 min-w-0 resize-none bg-transparent text-sm py-1.5 px-1 focus:outline-none disabled:opacity-50 max-h-[120px]"
            />
          )}

          <div className="relative shrink-0" ref={emojiRef}>
            <button
              type="button"
              disabled={recording || sending}
              onClick={() => setEmojiOpen((o) => !o)}
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-brand-600 cursor-pointer disabled:opacity-40"
              aria-label="Emoji"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>
            {emojiOpen && !recording && !sending && (
              <ChatEmojiPicker
                anchorRef={emojiRef}
                onPick={(emoji) => onDraftChange(draft + emoji)}
                onClose={() => setEmojiOpen(false)}
              />
            )}
          </div>

          <button
            type="button"
            disabled={
              recording ? false : hasContent ? !canSend || sending : sending
            }
            onClick={() => void toggleVoice()}
            className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer disabled:opacity-40 ${
              hasContent
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : recording
                  ? "bg-red-500 text-white animate-pulse"
                  : "text-slate-500 hover:text-brand-600"
            }`}
            aria-label={hasContent ? "Send message" : recording ? "Stop recording" : "Voice message"}
          >
            {hasContent ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            ) : recording ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1 px-1 min-h-[14px]">
          <p className={`text-[10px] truncate min-w-0 flex-1 ${typingLabel ? "text-brand-600" : "text-transparent"}`}>
            {typingLabel || "."}
          </p>
          <p className="text-[10px] text-slate-400 shrink-0 text-right">
            Shift+Enter for new line · Paste images to attach
          </p>
        </div>
      </div>

      {previewAttachment && (
        <ChatAttachmentPreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
});
