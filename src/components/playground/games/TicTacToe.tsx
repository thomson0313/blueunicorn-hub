"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameMode } from "@/components/playground/GameFrame";
import { OnlineLobby } from "@/components/playground/OnlineLobby";
import { OnlineBanner } from "@/components/playground/OnlineBanner";
import { useGameRoom } from "@/lib/games/useGameRoom";
import {
  tttBestMove,
  tttCreate,
  tttWinner,
  type TTTBoard,
  type TTTMark,
} from "@/lib/games/ticTacToe";

const BOT: TTTMark = "O";

export function TicTacToe({ mode, fullscreen }: { mode: GameMode; fullscreen: boolean }) {
  const online = mode === "two";
  const [board, setBoard] = useState<TTTBoard>(tttCreate);
  const [turn, setTurn] = useState<TTTMark>("X");
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const { winner, line } = tttWinner(board);

  const place = useCallback((i: number) => {
    setBoard((b) => {
      if (b[i] || tttWinner(b).winner) return b;
      const n = [...b];
      n[i] = turnRef.current;
      return n;
    });
    setTurn((t) => (t === "X" ? "O" : "X"));
  }, []);

  const reset = useCallback(() => {
    setBoard(tttCreate());
    setTurn("X");
  }, []);

  const room = useGameRoom<number>("tictactoe", {
    onOpponentMove: (i) => place(i),
    onReset: reset,
  });

  const mySide: TTTMark | null = room.role === "host" ? "X" : room.role === "guest" ? "O" : null;

  useEffect(() => {
    if (online || mode !== "bot" || winner || turn !== BOT) return;
    const id = window.setTimeout(() => {
      const move = tttBestMove(board, BOT);
      if (move >= 0) place(move);
    }, 350);
    return () => window.clearTimeout(id);
  }, [online, mode, board, turn, winner, place]);

  function clickCell(i: number) {
    if (board[i] || winner) return;
    if (online) {
      if (!room.connected || turn !== mySide) return;
      place(i);
      room.sendMove(i);
      return;
    }
    if (mode === "bot" && turn !== "X") return;
    place(i);
  }

  if (online && !room.connected) {
    return <OnlineLobby room={room} fullscreen={fullscreen} />;
  }

  const status = (() => {
    if (winner === "draw") return "It's a draw";
    if (online) {
      if (winner) return winner === mySide ? "You win!" : "You lose";
      return turn === mySide ? "Your turn" : `${room.opponentName ?? "Opponent"}'s turn`;
    }
    if (winner) return `${winner} wins!`;
    if (mode === "bot") return turn === "X" ? "Your move (X)" : "Bot is thinking…";
    return `Player ${turn}'s turn`;
  })();

  const size = fullscreen ? 110 : 88;
  const locked = online && (!room.connected || turn !== mySide);

  return (
    <div className="flex flex-col items-center gap-4">
      {online && (
        <OnlineBanner
          code={room.code}
          you={`You are ${mySide}`}
          opponentName={room.opponentName}
          fullscreen={fullscreen}
          showRematch={!!winner}
          onRematch={() => {
            reset();
            room.sendReset();
          }}
        />
      )}
      <p className={`text-sm font-medium ${fullscreen ? "text-white" : "text-slate-700"}`}>{status}</p>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => {
          const win = line?.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => clickCell(i)}
              disabled={!!cell || !!winner || locked}
              style={{ width: size, height: size }}
              className={`rounded-xl text-4xl font-bold flex items-center justify-center transition cursor-pointer disabled:cursor-default ${
                win ? "bg-brand-500 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-800"
              }`}
            >
              <span className={cell === "X" ? "text-brand-600" : "text-rose-500"}>{cell}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
