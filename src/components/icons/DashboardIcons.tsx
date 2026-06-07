type Props = { size?: number; className?: string };

export function IconStatProjects({ size = 22, className = "text-brand-500" }: Props) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function IconStatProgress({ size = 22, className = "text-blue-500" }: Props) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function IconStatCompleted({ size = 22, className = "text-emerald-500" }: Props) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4 12 14.01l-3-3" />
    </svg>
  );
}

export function IconStatMembers({ size = 22, className = "text-brand-500" }: Props) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconStatHourly({ size = 22, className = "text-indigo-500" }: Props) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l3 2" />
    </svg>
  );
}

export function IconStatFixed({ size = 22, className = "text-violet-500" }: Props) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function IconStatUrgent({ size = 22, className = "text-red-500" }: Props) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function IconStatCanceled({ size = 22, className = "text-amber-500" }: Props) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  );
}

export function IconStatScore({ size = 22, className = "text-brand-600" }: Props) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function IconStatHours({ size = 22, className = "text-cyan-600" }: Props) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20V10M18 20V4M6 20v-4" />
    </svg>
  );
}
