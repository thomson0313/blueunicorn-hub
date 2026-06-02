export function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {children}
      <span className="text-brand-500 ml-0.5" aria-hidden="true">
        *
      </span>
    </label>
  );
}
