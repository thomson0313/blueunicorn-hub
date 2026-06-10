type Props = {
  onPrevious: () => void;
  onNext: () => void;
  previousLabel: string;
  nextLabel: string;
};

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

const BTN_CLASS =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition";

export function CalendarNavChevrons({ onPrevious, onNext, previousLabel, nextLabel }: Props) {
  return (
    <div className="inline-flex items-center gap-1">
      <button type="button" onClick={onPrevious} className={BTN_CLASS} aria-label={previousLabel} title={previousLabel}>
        <ChevronLeftIcon />
      </button>
      <button type="button" onClick={onNext} className={BTN_CLASS} aria-label={nextLabel} title={nextLabel}>
        <ChevronRightIcon />
      </button>
    </div>
  );
}
