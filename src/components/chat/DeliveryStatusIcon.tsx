"use client";

import type { ChatMessage } from "@/lib/types";

export function DeliveryStatusIcon({
  message,
  peerReadAt,
  connected,
}: {
  message: ChatMessage;
  peerReadAt?: string | null;
  connected: boolean;
}) {
  if (message.pending || !connected) {
    return (
      <svg className="w-3.5 h-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  const seen = peerReadAt && new Date(peerReadAt) >= new Date(message.createdAt);
  if (seen) {
    return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M20 6L9 17l-5-5" />
        <path d="M15 6l5 5" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
