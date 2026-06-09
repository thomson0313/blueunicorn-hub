export function EmailVerifiedBadge({ verified, compact = false }: { verified: boolean; compact?: boolean }) {
  if (verified) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium shrink-0 ${
          compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
        }`}
        title="Email verified"
      >
        <svg width={compact ? 10 : 12} height={compact ? 10 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 13l4 4L19 7" />
        </svg>
        Verified
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium shrink-0 ${
        compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
      }`}
      title="Email not verified"
    >
      <svg width={compact ? 10 : 12} height={compact ? 10 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      Pending
    </span>
  );
}
