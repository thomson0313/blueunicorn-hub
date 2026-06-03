export function PanelLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 min-h-[320px] w-full">
      <div
        className="w-10 h-10 rounded-full border-[3px] border-brand-100 border-t-brand-500 animate-spin"
        aria-hidden
      />
      <p className="text-sm text-slate-500 mt-4">{label}</p>
    </div>
  );
}
