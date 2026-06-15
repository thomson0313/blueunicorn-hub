"use client";

import type { ChatMessage } from "@/lib/types";

/** Single check — sent. */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 6.5L5.5 11L15 1" />
    </svg>
  );
}

/** Double check — read (check-check). */
function DoubleCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 6.5L5.5 11L15 1" />
      <path d="M5 6.5L9.5 11L19 1" />
    </svg>
  );
}

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
    return <DoubleCheckIcon className="w-4 h-3 opacity-95" />;
  }
  return <CheckIcon className="w-3.5 h-3 opacity-80" />;
}
