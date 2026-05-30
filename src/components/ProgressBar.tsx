export function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 100 ? "bg-emerald-500" : v >= 50 ? "bg-brand-500" : "bg-brand-300";
  return (
    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${v}%` }} />
    </div>
  );
}
