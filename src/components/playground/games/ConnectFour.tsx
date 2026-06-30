"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameMode } from "@/components/playground/GameFrame";
import { OnlineLobby } from "@/components/playground/OnlineLobby";
import { OnlineBanner } from "@/components/playground/OnlineBanner";
import { useGameRoom } from "@/lib/games/useGameRoom";
import {
  C4_COLS,
  C4_ROWS,
  c4BotMove,
  c4Create,
  c4DropRow,
  c4Place,
  c4Winner,
  type C4Board,
  type C4Player,
} from "@/lib/games/connectFour";

const BOT: C4Player = 2;

export function ConnectFour({ mode, fullscreen }: { mode: GameMode; fullscreen: boolean }) {
  const online = mode === "two";
  const [board, setBoard] = useState<C4Board>(c4Create);
  const [turn, setTurn] = useState<C4Player>(1);
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const [thinking, setThinking] = useState(false);
  const { winner, cells } = useMemo(() => c4Winner(board), [board]);
  const winning = useMemo(() => new Set((cells ?? []).map(([r, c]) => r * C4_COLS + c)), [cells]);

  const place = useCallback((col: number) => {
    setBoard((prev) => {
      if (c4Winner(prev).winner) return prev;
      const res = c4Place(prev, col, turnRef.current);
      return res ? res.board : prev;
    });
    setTurn((t) => (t === 1 ? 2 : 1));
  }, []);

  const reset = useCallback(() => {
    setBoard(c4Create());
    setTurn(1);
  }, []);

  const replay = useCallback((moves: number[]) => {
    let b = c4Create();
    let t: C4Player = 1;
    for (const col of moves) {
      const res = c4Place(b, col, t);
      if (res) {
        b = res.board;
        t = t === 1 ? 2 : 1;
      }
    }
    setBoard(b);
    setTurn(t);
  }, []);

  const room = useGameRoom<number>("connect4", {
    onOpponentMove: (col) => place(col),
    onReset: reset,
    onSync: replay,
  });

  const isSpectator = room.role === "spectator";
  const mySide: C4Player | null = room.seat === 0 ? 1 : room.seat === 1 ? 2 : null;
  const opponentName = room.seat === 0 ? room.players[1] : room.players[0];
  const showBoard = !online || room.phase === "playing" || room.phase === "watching";

  useEffect(() => {
    if (online || mode !== "bot" || winner || turn !== BOT) return;
    setThinking(true);
    const id = window.setTimeout(() => {
      const col = c4BotMove(board, BOT);
      if (col >= 0) place(col);
      setThinking(false);
    }, 250);
    return () => window.clearTimeout(id);
  }, [online, mode, board, turn, winner, place]);

  function drop(col: number) {
    if (winner || thinking || c4DropRow(board, col) < 0) return;
    if (online) {
      if (isSpectator || room.phase !== "playing" || turn !== mySide) return;
      place(col);
      room.sendMove(col);
      return;
    }
    if (mode === "bot" && turn !== 1) return;
    place(col);
  }

  if (online && !showBoard) {
    return <OnlineLobby room={room} fullscreen={fullscreen} />;
  }

  const sideName = (p: C4Player) => (p === 1 ? "Red" : "Yellow");
  const status = (() => {
    if (winner === "draw") return "It's a draw";
    if (online) {
      if (isSpectator) return winner ? `${sideName(winner)} wins` : `${sideName(turn)}'s turn`;
      if (winner) return winner === mySide ? "You win!" : "You lose";
      return turn === mySide ? "Your turn" : `${opponentName ?? "Opponent"}'s turn`;
    }
    if (winner) return `${sideName(winner)} wins!`;
    if (mode === "bot") return turn === 1 ? "Your move (Red)" : "Bot is thinking…";
    return `${sideName(turn)}'s turn`;
  })();

  const cellSize = fullscreen ? 64 : 44;
  const locked =
    winner !== null || thinking || isSpectator || (online && (room.phase !== "playing" || turn !== mySide));

  return (
    <div className="flex flex-col items-center gap-4">
      {online && (
        <OnlineBanner
          you={`You are ${mySide ? sideName(mySide) : "?"}`}
          opponentName={opponentName ?? null}
          spectatorCount={room.spectatorCount}
          isSpectator={isSpectator}
          fullscreen={fullscreen}
          showRematch={winner !== null}
          onRematch={() => {
            reset();
            room.sendReset();
          }}
        />
      )}
      <p className={`text-sm font-medium ${fullscreen ? "text-white" : "text-slate-700"}`}>{status}</p>
      <div className="inline-block rounded-2xl bg-brand-600 p-2 sm:p-3 shadow-inner">
        <div className="flex gap-1.5">
          {Array.from({ length: C4_COLS }).map((_, c) => (
            <button
              key={c}
              type="button"
              onClick={() => drop(c)}
              disabled={locked || board[0][c] !== 0}
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
                      v === 1 ? "bg-rose-500" : v === 2 ? "bg-yellow-400" : "bg-white/90"
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
