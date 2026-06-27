export type TTTMark = "X" | "O";
export type TTTCell = TTTMark | null;
export type TTTBoard = TTTCell[];

export const TTT_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function tttCreate(): TTTBoard {
  return Array<TTTCell>(9).fill(null);
}

export function tttWinner(board: TTTBoard): {
  winner: TTTMark | "draw" | null;
  line: number[] | null;
} {
  for (const line of TTT_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every((cell) => cell !== null)) return { winner: "draw", line: null };
  return { winner: null, line: null };
}

/** Unbeatable minimax move for the given mark. */
export function tttBestMove(board: TTTBoard, bot: TTTMark): number {
  const human: TTTMark = bot === "X" ? "O" : "X";

  function score(b: TTTBoard, depth: number): number {
    const { winner } = tttWinner(b);
    if (winner === bot) return 10 - depth;
    if (winner === human) return depth - 10;
    return 0;
  }

  function minimax(b: TTTBoard, turn: TTTMark, depth: number): { score: number; move: number } {
    const { winner } = tttWinner(b);
    if (winner) return { score: score(b, depth), move: -1 };

    let best = { score: turn === bot ? -Infinity : Infinity, move: -1 };
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = turn;
      const res = minimax(b, turn === "X" ? "O" : "X", depth + 1);
      b[i] = null;
      if (turn === bot ? res.score > best.score : res.score < best.score) {
        best = { score: res.score, move: i };
      }
    }
    return best;
  }

  return minimax([...board], bot, 0).move;
}
