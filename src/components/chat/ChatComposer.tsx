"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatEmojiAutocomplete, ChatEmojiPicker } from "@/components/chat/ChatEmojiPicker";
import { isImageMime } from "@/lib/chat-attachment-utils";
import { resolveChatAttachmentUrl } from "@/lib/chat-attachment-url";
import { EMOJI_SHORTCODES } from "@/lib/chat-emoji";

export type OutgoingAttachment = {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
};

export function ChatComposer({
  placeholder,
  canSend = true,
  replyTo,
  onCancelReply,
  onSend,
  onActivity,
}: {
  placeholder: string;
  canSend?: boolean;
  replyTo?: { senderName: string; content: string } | null;
  onCancelReply?: () => void;
  onSend: (payload: { content: string; attachments: OutgoingAttachment[] }) => Promise<void>;
  onActivity?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<OutgoingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const inputBusy = uploading || sending;
  const hasContent = draft.trim().length > 0 || attachments.length > 0;
  const colonMatch = draft.match(/:([a-z0-9_+-]{1,})$/i);
  const colonQuery = colonMatch?.[1] || "";

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/chat/attachments", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        setAttachments((prev) => [
          ...prev,
          {
            fileName: data.attachment.fileName,
            fileUrl: resolveChatAttachmentUrl(data.attachment.url),
            mimeType: data.attachment.mimeType,
            fileSize: data.attachment.fileSize,
          },
        ]);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  async function handleSend() {
    if (!hasContent || inputBusy || recording || !canSend) return;
    setSending(true);
    try {
      let content = draft.trim();
      for (const [code, emoji] of Object.entries(EMOJI_SHORTCODES)) {
        content = content.replaceAll(`:${code}:`, emoji);
      }
      await onSend({ content, attachments });
      setDraft("");
      setAttachments([]);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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
      void uploadFiles(files);
    }
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
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        await uploadFiles([file]);
      };
      rec.start();
      setRecording(true);
    } catch {
      setUploadError("Microphone access denied");
    }
  }

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [draft]);

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
      className={`border-t border-slate-200 bg-white shrink-0 ${dragOver ? "ring-2 ring-brand-400 ring-inset" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!inputBusy && !recording) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!inputBusy && !recording && e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files);
      }}
    >
      {replyTo && (
        <div className="px-3 pt-2 flex items-center justify-between gap-2 text-xs bg-slate-50 border-b border-slate-100">
          <div className="truncate">
            Replying to <span className="font-semibold">{replyTo.senderName}</span>
            {replyTo.content ? `: ${replyTo.content.slice(0, 60)}` : null}
          </div>
          <button type="button" onClick={onCancelReply} className="text-slate-500 hover:text-slate-700 cursor-pointer">
            ×
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="px-3 pt-2 flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div key={`${a.fileUrl}-${i}`} className="relative group">
              {isImageMime(a.mimeType) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={resolveChatAttachmentUrl(a.fileUrl)}
                  alt={a.fileName}
                  className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
              )}
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center cursor-pointer shadow-md hover:bg-slate-900 z-10"
                aria-label="Remove attachment"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {(uploading || recording) && (
        <div className="px-3 pt-2 flex items-center gap-2 text-xs text-brand-600">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
          {recording ? "Recording voice message…" : "Uploading…"}
        </div>
      )}

      {uploadError && (
        <p className="px-3 pt-2 text-xs text-red-600">{uploadError}</p>
      )}

      <div className="relative p-2">
        {colonQuery && !inputBusy && !recording && (
          <ChatEmojiAutocomplete
            query={colonQuery}
            onPick={(code) => {
              const emoji = EMOJI_SHORTCODES[code] || "";
              if (!emoji) return;
              setDraft((d) => d.replace(/:([a-z0-9_+-]{1,})$/i, emoji));
            }}
          />
        )}

        <div className={`flex items-end gap-1 rounded-xl border px-2 py-1.5 ${
          inputBusy || recording
            ? "border-slate-200 bg-slate-50"
            : "border-slate-300"
        } ${inputBusy && !recording ? "opacity-60" : ""}`}>
          <button
            type="button"
            disabled={inputBusy || recording}
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
              if (e.target.files?.length) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              onActivity?.();
            }}
            onKeyDown={onKeyDown}
            onPaste={handlePaste}
            placeholder={recording ? "Recording…" : inputBusy ? "Uploading…" : placeholder}
            disabled={inputBusy || recording}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm py-1.5 px-1 focus:outline-none disabled:opacity-50 max-h-[120px]"
          />

          <div className="relative shrink-0" ref={emojiRef}>
            <button
              type="button"
              disabled={inputBusy || recording}
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
            {emojiOpen && !inputBusy && !recording && (
              <ChatEmojiPicker
                onPick={(emoji) => setDraft((d) => d + emoji)}
                onClose={() => setEmojiOpen(false)}
              />
            )}
          </div>

          <button
            type="button"
            disabled={
              recording
                ? false
                : hasContent
                  ? !canSend || inputBusy
                  : inputBusy
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
        <p className="text-[10px] text-slate-400 mt-1 px-1">Shift+Enter for new line · Paste images to attach</p>
      </div>
    </div>
  );
}
