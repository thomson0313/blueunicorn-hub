"use client";

import { useApp } from "./AppProvider";

export function AlertToaster() {
  const { alerts, dismissAlert } = useApp();

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 w-80 max-w-[calc(100vw-2rem)]">
      {alerts.map((alert) => (
        <div key={alert._id} className="toast-in bg-white border-l-4 border-amber-500 shadow-xl rounded-xl p-4">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-slate-900">{alert.title}</h4>
            <button
              onClick={() => dismissAlert(alert._id)}
              className="text-slate-400 hover:text-slate-700 text-sm leading-none"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
          <p className="text-sm text-slate-600 mt-1.5 whitespace-pre-wrap">{alert.content}</p>
          <p className="text-xs text-amber-600 mt-2 font-medium">Alert</p>
        </div>
      ))}
    </div>
  );
}
