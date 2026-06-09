export function TwoFactorAvatarBadge({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <span
        className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center shadow-sm"
        title="2FA enabled"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
    );
  }

  return (
    <span
      className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center shadow-sm"
      title="2FA not enabled"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        <path d="M9 15h6" />
      </svg>
    </span>
  );
}
