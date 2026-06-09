"use client";

import Link from "next/link";

type TwoFactorPromptBarProps = {
  dismissed: boolean;
  onDismiss: () => void;
};

export function TwoFactorPromptBar({ dismissed, onDismiss }: TwoFactorPromptBarProps) {
  if (dismissed) return null;

  return (
    <div className="sticky top-0 z-50 bg-slate-800 text-white shadow-md border-b border-slate-700">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <p className="text-sm font-medium flex-1">
          Secure your account with two-factor authentication (Google Authenticator).
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/profile#two-factor"
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-4 py-1.5 transition"
          >
            Enable 2FA
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center cursor-pointer"
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
