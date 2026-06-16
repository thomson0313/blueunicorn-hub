"use client";

/** Close any open chat message context menus before opening a new one. */
export const CHAT_CONTEXT_MENU_CLOSE = "chat:context-menu-close";

export function closeAllChatContextMenus() {
  window.dispatchEvent(new CustomEvent(CHAT_CONTEXT_MENU_CLOSE));
}
