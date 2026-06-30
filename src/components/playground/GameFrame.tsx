"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GameMode = "bot" | "solo" | "two";

type RenderArgs = { mode: GameMode; fullscreen: boolean; restartKey: number };

const MODE_LABELS: Record<GameMode, string> = {
  bot: "vs Bot",
  solo: "Solo",
  two: "Online 2P",
};

function useFullscreen() {
  const ref = useRef<HTMLDivElement>(null);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const handler = () => setIsFull(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  }, []);

  return { ref, isFull, toggle };
}

export function GameFrame({
  title,
  subtitle,
  supportsBot = true,
  supportsSolo = false,
  supportsTwoPlayer = true,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  supportsBot?: boolean;
  supportsSolo?: boolean;
  supportsTwoPlayer?: boolean;
  onBack: () => void;
  children: (args: RenderArgs) => React.ReactNode;
}) {
  const { ref, isFull, toggle } = useFullscreen();

  const availableModes: GameMode[] = [
    ...(supportsBot ? (["bot"] as const) : []),
    ...(supportsSolo ? (["solo"] as const) : []),
    ...(supportsTwoPlayer ? (["two"] as const) : []),
  ];
  const [mode, setMode] = useState<GameMode>(availableModes[0] ?? "solo");
  const [restartKey, setRestartKey] = useState(0);

  const showModes = availableModes.length > 1;

  function changeMode(next: GameMode) {
    setMode(next);
    setRestartKey((k) => k + 1);
  }

  return (
    <div
      ref={ref}
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col ${
        isFull ? "fixed inset-0 z-[120] rounded-none bg-slate-900 overflow-auto" : ""
      }`}
    >
      <div
        className={`flex flex-wrap items-center gap-2 px-4 py-3 border-b ${
          isFull ? "border-white/10 text-white" : "border-slate-200"
        }`}
      >
        <button
          type="button"
          onClick={onBack}
          className={`text-sm font-medium rounded-lg px-2.5 py-1.5 cursor-pointer ${
            isFull ? "text-brand-100 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          ← Games
        </button>
        <div className="min-w-0">
          <h2 className={`font-semibold truncate ${isFull ? "text-white" : "text-slate-900"}`}>{title}</h2>
          {subtitle && (
            <p className={`text-xs truncate ${isFull ? "text-brand-100" : "text-slate-500"}`}>{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {showModes && (
            <div className={`flex rounded-lg p-0.5 ${isFull ? "bg-white/10" : "bg-slate-100"}`}>
              {availableModes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => changeMode(m)}
                  className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer transition ${
                    mode === m
                      ? isFull
                        ? "bg-white text-brand-700"
                        : "bg-white text-brand-700 shadow-sm"
                      : isFull
                        ? "text-brand-50 hover:text-white"
                        : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setRestartKey((k) => k + 1)}
            className={`text-sm font-medium rounded-lg px-3 py-1.5 cursor-pointer ${
              isFull ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            New game
          </button>
          <button
            type="button"
            onClick={toggle}
            title={isFull ? "Exit fullscreen" : "Fullscreen"}
            aria-label={isFull ? "Exit fullscreen" : "Fullscreen"}
            className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer ${
              isFull ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {isFull ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M9 9H5V5M15 9h4V5M9 15H5v4M15 15h4v4" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className={`flex-1 flex items-center justify-center p-4 ${isFull ? "min-h-0" : ""}`}>
        {children({ mode, fullscreen: isFull, restartKey })}
      </div>
    </div>
  );
}
