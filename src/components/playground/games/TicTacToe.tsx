"use client";

import { useEffect, useState } from "react";
import type { GameMode } from "@/components/playground/GameFrame";
import {
  tttBestMove,
  tttCreate,
  tttWinner,
  type TTTBoard,
  type TTTMark,
} from "@/lib/games/ticTacToe";

const BOT: TTTMark = "O";

export function TicTacToe({ mode, fullscreen }: { mode: GameMode; fullscreen: boolean }) {
  const [board, setBoard] = useState<TTTBoard>(tttCreate);
  const [turn, setTurn] = useState<TTTMark>("X");
  const { winner, line } = tttWinner(board);

  useEffect(() => {
    if (mode !== "bot" || winner || turn !== BOT) return;
    const id = window.setTimeout(() => {
      const move = tttBestMove(board, BOT);
      if (move >= 0) {
        setBoard((b) => {
          const n = [...b];
          n[move] = BOT;
          return n;
        });
        setTurn("X");
      }
    }, 350);
    return () => window.clearTimeout(id);
  }, [mode, board, turn, winner]);

  function play(i: number) {
    if (board[i] || winner) return;
    if (mode === "bot" && turn !== "X") return;
    setBoard((b) => {
      const n = [...b];
      n[i] = turn;
      return n;
    });
    setTurn((t) => (t === "X" ? "O" : "X"));
  }

  const status =
    winner === "draw"
      ? "It's a draw"
      : winner
        ? `${winner} wins!`
        : mode === "bot"
          ? turn === "X"
            ? "Your move (X)"
            : "Bot is thinking…"
          : `Player ${turn}'s turn`;

  const size = fullscreen ? 110 : 88;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className={`text-sm font-medium ${fullscreen ? "text-white" : "text-slate-700"}`}>{status}</p>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => {
          const win = line?.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => play(i)}
              disabled={!!cell || !!winner}
              style={{ width: size, height: size }}
              className={`rounded-xl text-4xl font-bold flex items-center justify-center transition cursor-pointer disabled:cursor-default ${
                win
                  ? "bg-brand-500 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800"
              } ${cell === "X" ? "" : cell === "O" ? "" : ""}`}
            >
              <span className={cell === "X" ? "text-brand-600" : "text-rose-500"}>{cell}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
