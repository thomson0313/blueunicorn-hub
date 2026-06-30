"use client";

import { chessInitial, colorOf, pieceGlyph } from "@/lib/games/chess";
import { TETRIS_COLORS } from "@/lib/games/tetris";
import type { GameId } from "@/lib/games/registry";

/** Small, non-interactive snapshot of each game for the gallery cards. */
export function GamePreview({ id }: { id: GameId }) {
  if (id === "chess") return <ChessPreview />;
  if (id === "connect4") return <ConnectFourPreview />;
  if (id === "tictactoe") return <TicTacToePreview />;
  return <TetrisPreview />;
}

function ChessPreview() {
  const board = chessInitial().board;
  return (
    <div className="rounded-md overflow-hidden shadow-sm border-2 border-brand-700">
      {Array.from({ length: 8 }).map((_, r) => (
        <div key={r} className="flex">
          {Array.from({ length: 8 }).map((_, c) => {
            const piece = board[r * 8 + c];
            const dark = (r + c) % 2 === 1;
            const isWhite = piece ? colorOf(piece) === "w" : false;
            return (
              <span
                key={c}
                className={`w-[18px] h-[18px] flex items-center justify-center ${
                  dark ? "bg-brand-200" : "bg-brand-50"
                }`}
                style={{
                  fontSize: 14,
                  lineHeight: 1,
                  color: isWhite ? "#ffffff" : "#111827",
                  WebkitTextStroke: isWhite ? "0.8px #1e293b" : "0.4px #000",
                }}
              >
                {pieceGlyph(piece)}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ConnectFourPreview() {
  // 0 empty, 1 red, 2 yellow — a sample mid-game position.
  const discs: number[][] = [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 2, 2, 1, 0, 0],
    [0, 1, 1, 2, 2, 0, 0],
    [1, 2, 1, 1, 2, 2, 1],
  ];
  return (
    <div className="rounded-lg bg-brand-600 p-1.5 shadow-sm">
      <div className="flex gap-1">
        {Array.from({ length: 7 }).map((_, c) => (
          <div key={c} className="flex flex-col gap-1">
            {discs.map((row, r) => (
              <span
                key={r}
                className={`w-[12px] h-[12px] rounded-full block ${
                  row[c] === 1 ? "bg-rose-500" : row[c] === 2 ? "bg-yellow-400" : "bg-white/90"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TicTacToePreview() {
  const cells = ["X", "O", "X", "", "X", "O", "O", "", "X"];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {cells.map((cell, i) => (
        <span
          key={i}
          className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center text-xl font-bold"
        >
          <span className={cell === "X" ? "text-brand-600" : "text-rose-500"}>{cell}</span>
        </span>
      ))}
    </div>
  );
}

function TetrisPreview() {
  // Sample stack near the bottom + a falling T piece up top.
  const rows = 12;
  const cols = 8;
  const grid: (string | 0)[][] = Array.from({ length: rows }, () => Array<string | 0>(cols).fill(0));
  const stack: Record<number, (string | 0)[]> = {
    11: ["L", "L", "O", "O", "I", "J", "J", 0],
    10: [0, "L", "O", "O", "I", 0, "J", 0],
    9: [0, 0, 0, "S", "I", 0, 0, 0],
    8: [0, 0, "S", "S", "I", 0, 0, 0],
  };
  for (const [r, vals] of Object.entries(stack)) grid[Number(r)] = vals;
  // Falling T piece.
  grid[1][4] = "T";
  grid[2][3] = "T";
  grid[2][4] = "T";
  grid[2][5] = "T";

  return (
    <div className="grid bg-slate-900 rounded-md p-1 shadow-sm" style={{ gridTemplateColumns: `repeat(${cols}, 9px)` }}>
      {grid.flatMap((row, r) =>
        row.map((v, c) => (
          <span
            key={`${r}-${c}`}
            className="w-[9px] h-[9px] rounded-[2px] border border-slate-900/60"
            style={{ backgroundColor: v ? TETRIS_COLORS[v] : "rgba(255,255,255,0.05)" }}
          />
        ))
      )}
    </div>
  );
}
