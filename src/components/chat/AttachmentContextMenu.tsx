"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { anchoredPosition } from "@/lib/anchored-position";
import { isPreviewableMime } from "@/lib/chat-attachment-utils";
import type { AttachmentLike } from "@/lib/chat-attachment-actions";

export function AttachmentContextMenu({
  x,
  y,
  attachment,
  onClose,
  onPreview,
  onDownload,
}: {
  x: number;
  y: number;
  attachment: AttachmentLike;
  onClose: () => void;
  onPreview?: () => void;
  onDownload: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const canPreview = isPreviewableMime(attachment.mimeType);

  useLayoutEffect(() => {
    const el = ref.current;
    const w = el?.offsetWidth || 140;
    const h = el?.offsetHeight || 80;
    setPos(anchoredPosition(x, y, w, h));
  }, [x, y]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[200] cursor-default"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        ref={ref}
        className="fixed z-[201] min-w-[140px] bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-sm"
        style={{ left: pos.left, top: pos.top }}
      >
        {canPreview && onPreview && (
          <button
            type="button"
            onClick={() => {
              onPreview();
              onClose();
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
          >
            Preview
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onDownload();
            onClose();
          }}
          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
        >
          Download
        </button>
      </div>
    </>,
    document.body
  );
}
