export const C4_ROWS = 6;
export const C4_COLS = 7;

export type C4Player = 1 | 2;
export type C4Cell = 0 | 1 | 2;
export type C4Board = C4Cell[][]; // [row][col], row 0 is the top

export function c4Create(): C4Board {
  return Array.from({ length: C4_ROWS }, () => Array<C4Cell>(C4_COLS).fill(0));
}

export function c4DropRow(board: C4Board, col: number): number {
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) return r;
  }
  return -1;
}

export function c4Place(
  board: C4Board,
  col: number,
  player: C4Player
): { board: C4Board; row: number } | null {
  const row = c4DropRow(board, col);
  if (row < 0) return null;
  const next = board.map((r) => [...r]);
  next[row][col] = player;
  return { board: next, row };
}

export function c4ValidCols(board: C4Board): number[] {
  const cols: number[] = [];
  for (let c = 0; c < C4_COLS; c++) if (board[0][c] === 0) cols.push(c);
  return cols;
}

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export function c4Winner(board: C4Board): {
  winner: C4Player | "draw" | null;
  cells: [number, number][] | null;
} {
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      const p = board[r][c];
      if (!p) continue;
      for (const [dr, dc] of DIRS) {
        const cells: [number, number][] = [[r, c]];
        let rr = r + dr;
        let cc = c + dc;
        while (rr >= 0 && rr < C4_ROWS && cc >= 0 && cc < C4_COLS && board[rr][cc] === p) {
          cells.push([rr, cc]);
          if (cells.length === 4) return { winner: p as C4Player, cells };
          rr += dr;
          cc += dc;
        }
      }
    }
  }
  if (board[0].every((cell) => cell !== 0)) return { winner: "draw", cells: null };
  return { winner: null, cells: null };
}

function windowScore(cells: C4Cell[], bot: C4Player, opp: C4Player): number {
  const b = cells.filter((c) => c === bot).length;
  const o = cells.filter((c) => c === opp).length;
  if (b > 0 && o > 0) return 0;
  if (b === 4) return 100000;
  if (b === 3) return 50;
  if (b === 2) return 8;
  if (o === 4) return -100000;
  if (o === 3) return -80;
  if (o === 2) return -8;
  return 0;
}

function evaluate(board: C4Board, bot: C4Player): number {
  const opp: C4Player = bot === 1 ? 2 : 1;
  let s = 0;
  for (let r = 0; r < C4_ROWS; r++) {
    if (board[r][3] === bot) s += 6;
    else if (board[r][3] === opp) s -= 6;
  }
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      for (const [dr, dc] of DIRS) {
        const er = r + 3 * dr;
        const ec = c + 3 * dc;
        if (er < 0 || er >= C4_ROWS || ec < 0 || ec >= C4_COLS) continue;
        const cells: C4Cell[] = [];
        for (let k = 0; k < 4; k++) cells.push(board[r + k * dr][c + k * dc]);
        s += windowScore(cells, bot, opp);
      }
    }
  }
  return s;
}

function minimax(
  board: C4Board,
  depth: number,
  alpha: number,
  beta: number,
  current: C4Player,
  bot: C4Player
): number {
  const { winner } = c4Winner(board);
  if (winner === bot) return 1_000_000 + depth;
  if (winner && winner !== "draw") return -1_000_000 - depth;
  if (winner === "draw") return 0;
  if (depth === 0) return evaluate(board, bot);

  const valid = c4ValidCols(board);
  // Center-first ordering improves alpha-beta pruning.
  valid.sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
  const opp: C4Player = bot === 1 ? 2 : 1;

  if (current === bot) {
    let best = -Infinity;
    for (const col of valid) {
      const res = c4Place(board, col, bot);
      if (!res) continue;
      best = Math.max(best, minimax(res.board, depth - 1, alpha, beta, opp, bot));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }

  let best = Infinity;
  for (const col of valid) {
    const res = c4Place(board, col, opp);
    if (!res) continue;
    best = Math.min(best, minimax(res.board, depth - 1, alpha, beta, bot, bot));
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

export function c4BotMove(board: C4Board, bot: C4Player, depth = 5): number {
  const opp: C4Player = bot === 1 ? 2 : 1;
  const valid = c4ValidCols(board);
  if (valid.length === 0) return -1;

  // Immediate win.
  for (const col of valid) {
    const res = c4Place(board, col, bot);
    if (res && c4Winner(res.board).winner === bot) return col;
  }
  // Block an immediate loss.
  for (const col of valid) {
    const res = c4Place(board, col, opp);
    if (res && c4Winner(res.board).winner === opp) return col;
  }

  const ordered = [...valid].sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
  let bestScore = -Infinity;
  let bestCol = ordered[0];
  for (const col of ordered) {
    const res = c4Place(board, col, bot);
    if (!res) continue;
    const score = minimax(res.board, depth - 1, -Infinity, Infinity, opp, bot);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }
  return bestCol;
}
