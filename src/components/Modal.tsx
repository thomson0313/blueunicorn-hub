"use client";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  xl,
  splitScroll,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  xl?: boolean;
  splitScroll?: boolean;
}) {
  if (!open) return null;

  const panelScroll = xl && splitScroll;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div
        className={`relative bg-white rounded-2xl shadow-xl w-full flex flex-col ${
          panelScroll ? "max-h-[90vh] overflow-hidden" : "max-h-[90vh] overflow-y-auto"
        } ${xl ? "max-w-6xl" : wide ? "max-w-lg" : "max-w-md"}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div
          className={`px-6 py-5 ${panelScroll ? "flex-1 min-h-0 overflow-hidden" : ""}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
