/** Flip a fixed-position menu so it stays within the viewport. */
export function anchoredPosition(
  x: number,
  y: number,
  menuWidth: number,
  menuHeight: number,
  padding = 8
): { left: number; top: number } {
  if (typeof window === "undefined") return { left: x, top: y };

  let left = x;
  let top = y;

  if (left + menuWidth + padding > window.innerWidth) {
    left = Math.max(padding, window.innerWidth - menuWidth - padding);
  }
  if (left < padding) left = padding;
  if (top + menuHeight + padding > window.innerHeight) {
    top = Math.max(padding, y - menuHeight - padding);
  }
  if (top < padding) top = padding;

  return { left, top };
}
