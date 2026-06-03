"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActionButton } from "@/components/ActionButton";

type Props = {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
};

const OUTPUT_SIZE = 512;

export function AvatarCropModal({ open, file, onClose, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete) return;

    const size = canvas.width;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, size, size);

    const scale = zoom * Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (size - w) / 2 + offset.x;
    const y = (size - h) / 2 + offset.y;
    ctx.drawImage(img, x, y, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  }, [zoom, offset]);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = src;
  }, [src, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  function onPointerDown(e: React.PointerEvent) {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  }

  function onPointerUp() {
    setDragging(false);
  }

  async function handleConfirm() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const out = document.createElement("canvas");
      out.width = OUTPUT_SIZE;
      out.height = OUTPUT_SIZE;
      const ctx = out.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      const blob = await new Promise<Blob | null>((resolve) =>
        out.toBlob((b) => resolve(b), "image/jpeg", 0.92)
      );
      if (blob) onConfirm(blob);
    } finally {
      setBusy(false);
    }
  }

  if (!open || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50 cursor-pointer" aria-label="Close" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Crop photo</h2>
        <p className="text-sm text-slate-500">Drag to reposition. Use the slider to zoom.</p>
        <div
          className="relative mx-auto w-full max-w-[280px] aspect-square rounded-xl overflow-hidden bg-slate-900 touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <canvas ref={canvasRef} width={280} height={280} className="w-full h-full" />
        </div>
        <div>
          <label className="text-xs text-slate-600 mb-1 block">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.02}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-brand-600 cursor-pointer"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <ActionButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton type="button" loading={busy} loadingText="Saving..." onClick={() => void handleConfirm()}>
            Apply photo
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
