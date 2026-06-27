"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameMode } from "@/components/playground/GameFrame";
import {
  applyMove,
  chessBotMove,
  chessInitial,
  colorOf,
  getStatus,
  movesFrom,
  pieceGlyph,
  type ChessMove,
  type ChessState,
  type Square,
} from "@/lib/games/chess";

const HUMAN = "w" as const;
const BOT_DEPTH = 2;

export function Chess({ mode, fullscreen }: { mode: GameMode; fullscreen: boolean }) {
  const [state, setState] = useState<ChessState>(chessInitial);
  const [selected, setSelected] = useState<Square | null>(null);
  const [thinking, setThinking] = useState(false);

  const status = useMemo(() => getStatus(state), [state]);
  const gameOver = status === "checkmate" || status === "stalemate";
  const targets = useMemo(
    () => (selected === null ? [] : movesFrom(state, selected)),
    [state, selected]
  );
  const targetSet = useMemo(() => new Set(targets.map((m) => m.to)), [targets]);

  useEffect(() => {
    if (mode !== "bot" || gameOver || state.turn === HUMAN) return;
    setThinking(true);
    const id = window.setTimeout(() => {
      const move = chessBotMove(state, BOT_DEPTH);
      if (move) setState((s) => applyMove(s, move));
      setThinking(false);
    }, 200);
    return () => window.clearTimeout(id);
  }, [mode, state, gameOver]);

  function onSquare(s: Square) {
    if (gameOver || thinking) return;
    if (mode === "bot" && state.turn !== HUMAN) return;

    if (selected !== null && targetSet.has(s)) {
      // Among promotion options, default to a queen.
      const move =
        targets.find((m) => m.to === s && m.promotion === "Q") ??
        (targets.find((m) => m.to === s) as ChessMove);
      setState((prev) => applyMove(prev, move));
      setSelected(null);
      return;
    }

    const piece = state.board[s];
    if (piece && colorOf(piece) === state.turn) {
      setSelected(s);
    } else {
      setSelected(null);
    }
  }

  const turnLabel = state.turn === "w" ? "White" : "Black";
  const statusText = gameOver
    ? status === "checkmate"
      ? `Checkmate — ${state.turn === "w" ? "Black" : "White"} wins!`
      : "Stalemate — it's a draw"
    : status === "check"
      ? `${turnLabel} is in check`
      : mode === "bot"
        ? state.turn === HUMAN
          ? "Your move (White)"
          : "Bot is thinking…"
        : `${turnLabel} to move`;

  const cell = fullscreen ? 64 : 48;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className={`text-sm font-medium ${fullscreen ? "text-white" : "text-slate-700"}`}>{statusText}</p>
      <div className="rounded-xl overflow-hidden shadow-md border-4 border-brand-700">
        {Array.from({ length: 8 }).map((_, r) => (
          <div key={r} className="flex">
            {Array.from({ length: 8 }).map((_, c) => {
              const s = r * 8 + c;
              const piece = state.board[s];
              const dark = (r + c) % 2 === 1;
              const isSelected = selected === s;
              const isTarget = targetSet.has(s);
              const isCapture = isTarget && piece;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onSquare(s)}
                  style={{ width: cell, height: cell }}
                  className={`relative flex items-center justify-center cursor-pointer ${
                    isSelected ? "bg-brand-300" : dark ? "bg-brand-200" : "bg-brand-50"
                  }`}
                >
                  {piece && (
                    <span
                      style={{ fontSize: cell * 0.72, lineHeight: 1 }}
                      className={colorOf(piece) === "w" ? "text-white" : "text-slate-900"}
                    >
                      {pieceGlyph(piece)}
                    </span>
                  )}
                  {isTarget && !isCapture && (
                    <span className="absolute w-1/4 h-1/4 rounded-full bg-brand-600/50" />
                  )}
                  {isCapture && (
                    <span className="absolute inset-1 rounded-md ring-4 ring-brand-600/60" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className={`text-xs ${fullscreen ? "text-brand-100" : "text-slate-400"}`}>
        Tap a piece, then a highlighted square. Pawns promote to a queen.
      </p>
    </div>
  );
}
