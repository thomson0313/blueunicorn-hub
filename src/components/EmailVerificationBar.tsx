"use client";

type EmailVerificationBarProps = {
  onVerifyClick: () => void;
};

export function EmailVerificationBar({ onVerifyClick }: EmailVerificationBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm font-medium">Verify your email to get started</p>
        <button
          type="button"
          onClick={onVerifyClick}
          className="inline-flex items-center justify-center rounded-lg bg-white hover:bg-amber-50 text-amber-950 font-semibold text-sm px-4 py-1.5 transition cursor-pointer shrink-0"
        >
          Verify Now
        </button>
      </div>
    </div>
  );
}
