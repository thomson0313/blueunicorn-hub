"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameMode } from "@/components/playground/GameFrame";
import { OnlineLobby } from "@/components/playground/OnlineLobby";
import { OnlineBanner } from "@/components/playground/OnlineBanner";
import { useGameRoom } from "@/lib/games/useGameRoom";
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
  type Color,
  type Square,
} from "@/lib/games/chess";

const HUMAN: Color = "w";
const BOT_DEPTH = 2;

export function Chess({ mode, fullscreen }: { mode: GameMode; fullscreen: boolean }) {
  const online = mode === "two";
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

  const doMove = useCallback((move: ChessMove) => {
    setState((prev) => applyMove(prev, move));
    setSelected(null);
  }, []);

  const reset = useCallback(() => {
    setState(chessInitial());
    setSelected(null);
  }, []);

  const room = useGameRoom<ChessMove>("chess", {
    onOpponentMove: (move) => doMove(move),
    onReset: reset,
  });

  const mySide: Color | null = room.role === "host" ? "w" : room.role === "guest" ? "b" : null;

  useEffect(() => {
    if (online || mode !== "bot" || gameOver || state.turn === HUMAN) return;
    setThinking(true);
    const id = window.setTimeout(() => {
      const move = chessBotMove(state, BOT_DEPTH);
      if (move) doMove(move);
      setThinking(false);
    }, 200);
    return () => window.clearTimeout(id);
  }, [online, mode, state, gameOver, doMove]);

  function onSquare(s: Square) {
    if (gameOver || thinking) return;
    if (online ? !room.connected || state.turn !== mySide : mode === "bot" && state.turn !== HUMAN) {
      return;
    }

    if (selected !== null && targetSet.has(s)) {
      const move =
        targets.find((m) => m.to === s && m.promotion === "Q") ??
        (targets.find((m) => m.to === s) as ChessMove);
      doMove(move);
      if (online) room.sendMove(move);
      return;
    }

    const piece = state.board[s];
    if (piece && colorOf(piece) === state.turn) setSelected(s);
    else setSelected(null);
  }

  if (online && !room.connected) {
    return <OnlineLobby room={room} fullscreen={fullscreen} />;
  }

  const turnLabel = state.turn === "w" ? "White" : "Black";
  const statusText = (() => {
    if (gameOver) {
      if (status === "checkmate") {
        const winner: Color = state.turn === "w" ? "b" : "w";
        if (online) return winner === mySide ? "Checkmate — you win!" : "Checkmate — you lose";
        return `Checkmate — ${winner === "w" ? "White" : "Black"} wins!`;
      }
      return "Stalemate — it's a draw";
    }
    if (online) {
      const mine = state.turn === mySide;
      const base = mine ? "Your move" : `${room.opponentName ?? "Opponent"}'s move`;
      return status === "check" ? `${base} · check` : base;
    }
    if (status === "check") return `${turnLabel} is in check`;
    if (mode === "bot") return state.turn === HUMAN ? "Your move (White)" : "Bot is thinking…";
    return `${turnLabel} to move`;
  })();

  const cell = fullscreen ? 64 : 48;

  return (
    <div className="flex flex-col items-center gap-4">
      {online && (
        <OnlineBanner
          code={room.code}
          you={`You are ${mySide === "w" ? "White" : "Black"}`}
          opponentName={room.opponentName}
          fullscreen={fullscreen}
          showRematch={gameOver}
          onRematch={() => {
            reset();
            room.sendReset();
          }}
        />
      )}
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
              const isWhite = piece ? colorOf(piece) === "w" : false;
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
                      style={{
                        fontSize: cell * 0.72,
                        lineHeight: 1,
                        color: isWhite ? "#ffffff" : "#111827",
                        WebkitTextStroke: isWhite ? "1.4px #1e293b" : "0.6px #000000",
                        textShadow: isWhite
                          ? "0 1px 2px rgba(15,23,42,0.55)"
                          : "0 1px 1px rgba(255,255,255,0.25)",
                      }}
                    >
                      {pieceGlyph(piece)}
                    </span>
                  )}
                  {isTarget && !isCapture && (
                    <span className="absolute w-1/4 h-1/4 rounded-full bg-brand-600/50" />
                  )}
                  {isCapture && <span className="absolute inset-1 rounded-md ring-4 ring-brand-600/60" />}
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
