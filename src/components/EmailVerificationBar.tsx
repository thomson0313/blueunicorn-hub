"use client";

type EmailVerificationBarProps = {
  onVerifyClick: () => void;
};

export function EmailVerificationBar({ onVerifyClick }: EmailVerificationBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-brand-700 to-brand-600 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm font-medium">Verify your email to get started</p>
        <button
          type="button"
          onClick={onVerifyClick}
          className="inline-flex items-center justify-center rounded-lg bg-white hover:bg-brand-50 text-brand-700 font-semibold text-sm px-4 py-1.5 transition cursor-pointer shrink-0"
        >
          Verify Now
        </button>
      </div>
    </div>
  );
}
