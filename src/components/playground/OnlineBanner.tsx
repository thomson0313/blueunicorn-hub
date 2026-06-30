"use client";

export function OnlineBanner({
  you,
  opponentName,
  spectatorCount,
  isSpectator,
  fullscreen,
  showRematch,
  onRematch,
}: {
  you: string;
  opponentName: string | null;
  spectatorCount: number;
  isSpectator: boolean;
  fullscreen: boolean;
  showRematch: boolean;
  onRematch: () => void;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs rounded-lg px-3 py-2 ${
        fullscreen ? "bg-white/10 text-brand-50" : "bg-brand-50 text-brand-700"
      }`}
    >
      {isSpectator ? (
        <span className="font-semibold">👁 Watching</span>
      ) : (
        <span className="font-medium">{you}</span>
      )}
      {!isSpectator && <span className="opacity-80">vs {opponentName ?? "Opponent"}</span>}
      {spectatorCount > 0 && <span className="opacity-70">· {spectatorCount} watching</span>}
      {!isSpectator && showRematch && (
        <button
          type="button"
          onClick={onRematch}
          className="rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium px-2.5 py-1 cursor-pointer"
        >
          Rematch
        </button>
      )}
    </div>
  );
}
