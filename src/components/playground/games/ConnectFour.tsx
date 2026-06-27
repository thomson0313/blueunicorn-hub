"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameMode } from "@/components/playground/GameFrame";
import {
  C4_COLS,
  C4_ROWS,
  c4BotMove,
  c4Create,
  c4Place,
  c4Winner,
  type C4Board,
  type C4Player,
} from "@/lib/games/connectFour";

const BOT: C4Player = 2;

export function ConnectFour({ mode, fullscreen }: { mode: GameMode; fullscreen: boolean }) {
  const [board, setBoard] = useState<C4Board>(c4Create);
  const [turn, setTurn] = useState<C4Player>(1);
  const [thinking, setThinking] = useState(false);
  const { winner, cells } = useMemo(() => c4Winner(board), [board]);

  const winning = useMemo(() => new Set((cells ?? []).map(([r, c]) => r * C4_COLS + c)), [cells]);

  useEffect(() => {
    if (mode !== "bot" || winner || turn !== BOT) return;
    setThinking(true);
    const id = window.setTimeout(() => {
      const col = c4BotMove(board, BOT);
      const res = col >= 0 ? c4Place(board, col, BOT) : null;
      if (res) {
        setBoard(res.board);
        setTurn(1);
      }
      setThinking(false);
    }, 250);
    return () => window.clearTimeout(id);
  }, [mode, board, turn, winner]);

  function drop(col: number) {
    if (winner || thinking) return;
    if (mode === "bot" && turn !== 1) return;
    const res = c4Place(board, col, turn);
    if (!res) return;
    setBoard(res.board);
    setTurn((t) => (t === 1 ? 2 : 1));
  }

  const status =
    winner === "draw"
      ? "It's a draw"
      : winner
        ? `${winner === 1 ? "Red" : "Yellow"} wins!`
        : mode === "bot"
          ? turn === 1
            ? "Your move (Red)"
            : "Bot is thinking…"
          : `${turn === 1 ? "Red" : "Yellow"}'s turn`;

  const cellSize = fullscreen ? 64 : 44;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className={`text-sm font-medium ${fullscreen ? "text-white" : "text-slate-700"}`}>{status}</p>
      <div className="inline-block rounded-2xl bg-brand-600 p-2 sm:p-3 shadow-inner">
        <div className="flex gap-1.5">
          {Array.from({ length: C4_COLS }).map((_, c) => (
            <button
              key={c}
              type="button"
              onClick={() => drop(c)}
              disabled={!!winner || board[0][c] !== 0}
              className="flex flex-col gap-1.5 rounded-lg p-0.5 hover:bg-white/10 cursor-pointer disabled:cursor-default disabled:hover:bg-transparent"
              aria-label={`Drop in column ${c + 1}`}
            >
              {Array.from({ length: C4_ROWS }).map((_, r) => {
                const v = board[r][c];
                const isWin = winning.has(r * C4_COLS + c);
                return (
                  <span
                    key={r}
                    style={{ width: cellSize, height: cellSize }}
                    className={`rounded-full block transition ${
                      v === 1
                        ? "bg-rose-500"
                        : v === 2
                          ? "bg-yellow-400"
                          : "bg-white/90"
                    } ${isWin ? "ring-4 ring-emerald-400" : ""}`}
                  />
                );
              })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
