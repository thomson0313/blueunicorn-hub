"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { anchoredPosition } from "@/lib/anchored-position";

type Placement = "above" | "below";

export function AnchoredPortal({
  open,
  anchorRef,
  placement = "above",
  align = "left",
  children,
  className = "",
  zIndex = 100,
  width = 320,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  placement?: Placement;
  align?: "left" | "right";
  children: React.ReactNode;
  className?: string;
  zIndex?: number;
  width?: number;
}) {
  const [pos, setPos] = useState<{ left: number; top: number; width?: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null);
      return;
    }

    function update() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const menuW = Math.min(width, window.innerWidth - 16);
      const menuH = 240;
      const x = align === "right" ? rect.right - menuW : rect.left;
      const y =
        placement === "above"
          ? rect.top - menuH - 8
          : rect.bottom + 8;
      const { left, top } = anchoredPosition(x, y, menuW, menuH);
      setPos({ left, top, width: menuW });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, placement, align, width]);

  if (!open || !mounted || !pos) return null;

  return createPortal(
    <div
      className={className}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: pos.width,
        zIndex,
      }}
    >
      {children}
    </div>,
    document.body
  );
}
