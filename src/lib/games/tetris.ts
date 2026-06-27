export const TETRIS_COLS = 10;
export const TETRIS_ROWS = 20;

export type Cell = string | 0;
export type Grid = Cell[][];
export type Piece = { type: string; shape: number[][]; r: number; c: number };
export type TetrisState = {
  grid: Grid;
  piece: Piece | null;
  score: number;
  lines: number;
  over: boolean;
};

const SHAPES: Record<string, number[][]> = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

export const TETRIS_COLORS: Record<string, string> = {
  I: "#38bdf8",
  O: "#facc15",
  T: "#a855f7",
  S: "#22c55e",
  Z: "#ef4444",
  J: "#3b82f6",
  L: "#f97316",
};

const TYPES = Object.keys(SHAPES);

export function emptyGrid(): Grid {
  return Array.from({ length: TETRIS_ROWS }, () => Array<Cell>(TETRIS_COLS).fill(0));
}

function rotateMatrix(m: number[][]): number[][] {
  const rows = m.length;
  const cols = m[0].length;
  const res = Array.from({ length: cols }, () => Array<number>(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) res[c][rows - 1 - r] = m[r][c];
  }
  return res;
}

export function collides(grid: Grid, shape: number[][], r: number, c: number): boolean {
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (!shape[i][j]) continue;
      const rr = r + i;
      const cc = c + j;
      if (cc < 0 || cc >= TETRIS_COLS || rr >= TETRIS_ROWS) return true;
      if (rr >= 0 && grid[rr][cc] !== 0) return true;
    }
  }
  return false;
}

function spawn(grid: Grid): Piece | null {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  const shape = SHAPES[type];
  const c = Math.floor((TETRIS_COLS - shape[0].length) / 2);
  const piece: Piece = { type, shape, r: 0, c };
  if (collides(grid, shape, piece.r, piece.c)) return null;
  return piece;
}

export function createTetris(): TetrisState {
  const grid = emptyGrid();
  return { grid, piece: spawn(grid), score: 0, lines: 0, over: false };
}

function merge(grid: Grid, piece: Piece): Grid {
  const next = grid.map((row) => [...row]);
  for (let i = 0; i < piece.shape.length; i++) {
    for (let j = 0; j < piece.shape[i].length; j++) {
      if (!piece.shape[i][j]) continue;
      const rr = piece.r + i;
      const cc = piece.c + j;
      if (rr >= 0 && rr < TETRIS_ROWS && cc >= 0 && cc < TETRIS_COLS) next[rr][cc] = piece.type;
    }
  }
  return next;
}

function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const kept = grid.filter((row) => row.some((cell) => cell === 0));
  const cleared = TETRIS_ROWS - kept.length;
  const empty = Array.from({ length: cleared }, () => Array<Cell>(TETRIS_COLS).fill(0));
  return { grid: [...empty, ...kept], cleared };
}

const LINE_SCORE = [0, 100, 300, 500, 800];

function lockAndSpawn(grid: Grid, piece: Piece, score: number, lines: number): TetrisState {
  const merged = merge(grid, piece);
  const { grid: cleared, cleared: n } = clearLines(merged);
  const next = spawn(cleared);
  return {
    grid: cleared,
    piece: next,
    score: score + LINE_SCORE[n],
    lines: lines + n,
    over: next === null,
  };
}

export function stepDown(state: TetrisState): TetrisState {
  if (state.over || !state.piece) return state;
  const { grid, piece, score, lines } = state;
  if (!collides(grid, piece.shape, piece.r + 1, piece.c)) {
    return { ...state, piece: { ...piece, r: piece.r + 1 } };
  }
  return lockAndSpawn(grid, piece, score, lines);
}

export function moveHorizontal(state: TetrisState, dc: number): TetrisState {
  if (state.over || !state.piece) return state;
  const { grid, piece } = state;
  if (!collides(grid, piece.shape, piece.r, piece.c + dc)) {
    return { ...state, piece: { ...piece, c: piece.c + dc } };
  }
  return state;
}

export function rotatePiece(state: TetrisState): TetrisState {
  if (state.over || !state.piece) return state;
  const { grid, piece } = state;
  const shape = rotateMatrix(piece.shape);
  for (const kick of [0, -1, 1, -2, 2]) {
    if (!collides(grid, shape, piece.r, piece.c + kick)) {
      return { ...state, piece: { ...piece, shape, c: piece.c + kick } };
    }
  }
  return state;
}

export function hardDrop(state: TetrisState): TetrisState {
  if (state.over || !state.piece) return state;
  const { grid } = state;
  let r = state.piece.r;
  while (!collides(grid, state.piece.shape, r + 1, state.piece.c)) r++;
  return lockAndSpawn(grid, { ...state.piece, r }, state.score, state.lines);
}

export function renderGrid(state: TetrisState): Grid {
  const grid = state.grid.map((row) => [...row]);
  const piece = state.piece;
  if (piece) {
    for (let i = 0; i < piece.shape.length; i++) {
      for (let j = 0; j < piece.shape[i].length; j++) {
        if (!piece.shape[i][j]) continue;
        const rr = piece.r + i;
        const cc = piece.c + j;
        if (rr >= 0 && rr < TETRIS_ROWS && cc >= 0 && cc < TETRIS_COLS) grid[rr][cc] = piece.type;
      }
    }
  }
  return grid;
}

export function tetrisLevel(lines: number): number {
  return Math.floor(lines / 10);
}

export function tetrisDropMs(lines: number): number {
  return Math.max(120, 600 - tetrisLevel(lines) * 55);
}
