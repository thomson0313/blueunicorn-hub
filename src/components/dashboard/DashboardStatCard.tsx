import type { ReactNode } from "react";

export function DashboardStatCard({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "default" | "brand" | "emerald" | "amber" | "red";
  icon?: ReactNode;
}) {
  const accents = {
    default: "border-slate-200",
    brand: "border-brand-200 bg-brand-50/40",
    emerald: "border-emerald-200 bg-emerald-50/40",
    amber: "border-amber-200 bg-amber-50/40",
    red: "border-red-200 bg-red-50/40",
  };
  return (
    <div className={`bg-white rounded-xl border p-4 ${accents[accent ?? "default"]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="text-sm text-slate-600 font-medium">{label}</div>
          {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
        </div>
        {icon && <div className="shrink-0 opacity-90">{icon}</div>}
      </div>
    </div>
  );
}
