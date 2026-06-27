"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TETRIS_COLORS,
  createTetris,
  hardDrop,
  moveHorizontal,
  renderGrid,
  rotatePiece,
  stepDown,
  tetrisDropMs,
  tetrisLevel,
  type TetrisState,
} from "@/lib/games/tetris";

export function Tetris({ fullscreen }: { fullscreen: boolean }) {
  const [state, setState] = useState<TetrisState>(createTetris);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Gravity loop — interval speeds up with level.
  useEffect(() => {
    if (state.over) return;
    const id = window.setInterval(() => {
      if (!pausedRef.current) setState((s) => stepDown(s));
    }, tetrisDropMs(state.lines));
    return () => window.clearInterval(id);
  }, [state.over, state.lines]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (state.over) return;
      const keys = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "];
      if (keys.includes(e.key)) e.preventDefault();
      if (e.key === "p" || e.key === "P") {
        setPaused((p) => !p);
        return;
      }
      if (paused) return;
      if (e.key === "ArrowLeft") setState((s) => moveHorizontal(s, -1));
      else if (e.key === "ArrowRight") setState((s) => moveHorizontal(s, 1));
      else if (e.key === "ArrowDown") setState((s) => stepDown(s));
      else if (e.key === "ArrowUp") setState((s) => rotatePiece(s));
      else if (e.key === " ") setState((s) => hardDrop(s));
    },
    [state.over, paused]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const grid = renderGrid(state);
  const cell = fullscreen ? 26 : 20;

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <div className="relative">
        <div
          className="grid bg-slate-900 rounded-lg p-1 shadow-inner"
          style={{ gridTemplateColumns: `repeat(10, ${cell}px)` }}
        >
          {grid.flatMap((rowCells, r) =>
            rowCells.map((value, c) => (
              <div
                key={`${r}-${c}`}
                style={{
                  width: cell,
                  height: cell,
                  backgroundColor: value ? TETRIS_COLORS[value] : "rgba(255,255,255,0.04)",
                }}
                className="border border-slate-900/60 rounded-[3px]"
              />
            ))
          )}
        </div>
        {(state.over || paused) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/80 rounded-lg text-white">
            <p className="text-xl font-bold">{state.over ? "Game over" : "Paused"}</p>
            {state.over ? (
              <button
                type="button"
                onClick={() => {
                  setState(createTetris());
                  setPaused(false);
                }}
                className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-sm font-medium cursor-pointer"
              >
                Play again
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-sm font-medium cursor-pointer"
              >
                Resume
              </button>
            )}
          </div>
        )}
      </div>

      <div className={`text-sm space-y-3 ${fullscreen ? "text-white" : "text-slate-700"}`}>
        <div className="flex gap-4 sm:block sm:space-y-2">
          <Stat label="Score" value={state.score} fullscreen={fullscreen} />
          <Stat label="Lines" value={state.lines} fullscreen={fullscreen} />
          <Stat label="Level" value={tetrisLevel(state.lines)} fullscreen={fullscreen} />
        </div>
        <div className={`text-xs leading-relaxed ${fullscreen ? "text-brand-100" : "text-slate-500"}`}>
          <p>← → move</p>
          <p>↑ rotate · ↓ soft drop</p>
          <p>Space hard drop · P pause</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:max-w-[150px]">
          <Pad label="←" onClick={() => setState((s) => moveHorizontal(s, -1))} />
          <Pad label="↻" onClick={() => setState((s) => rotatePiece(s))} />
          <Pad label="→" onClick={() => setState((s) => moveHorizontal(s, 1))} />
          <Pad label="↓" onClick={() => setState((s) => stepDown(s))} />
          <Pad label="⤓" onClick={() => setState((s) => hardDrop(s))} />
          <Pad label={paused ? "▶" : "⏸"} onClick={() => setPaused((p) => !p)} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, fullscreen }: { label: string; value: number; fullscreen: boolean }) {
  return (
    <div>
      <p className={`text-[11px] uppercase tracking-wide ${fullscreen ? "text-brand-100" : "text-slate-400"}`}>
        {label}
      </p>
      <p className={`text-lg font-bold ${fullscreen ? "text-white" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function Pad({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-11 h-11 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-lg flex items-center justify-center cursor-pointer"
    >
      {label}
    </button>
  );
}
