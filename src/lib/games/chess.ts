// Minimal but rules-complete chess engine: legal move generation (including
// castling, en passant, promotion), check / checkmate / stalemate detection,
// and a small alpha-beta bot. Board is a flat array of 64 squares, index =
// row * 8 + col, row 0 = top (black back rank), row 7 = bottom (white back rank).

export type Color = "w" | "b";
export type Square = number; // 0..63
export type Piece = string | null; // "P","n", etc. Uppercase = white.

export type CastlingRights = { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };

export type ChessState = {
  board: Piece[];
  turn: Color;
  castling: CastlingRights;
  enPassant: Square | null;
};

export type ChessMove = {
  from: Square;
  to: Square;
  promotion?: "Q" | "R" | "B" | "N";
  flag?: "normal" | "double" | "enpassant" | "castleK" | "castleQ";
};

export type ChessStatus = "playing" | "check" | "checkmate" | "stalemate";

export const row = (s: Square) => Math.floor(s / 8);
export const col = (s: Square) => s % 8;
export const sq = (r: number, c: number): Square => r * 8 + c;
const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

export function colorOf(piece: Piece): Color | null {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? "w" : "b";
}

export function chessInitial(): ChessState {
  const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
  const board: Piece[] = Array<Piece>(64).fill(null);
  for (let c = 0; c < 8; c++) {
    board[sq(0, c)] = back[c];
    board[sq(1, c)] = "p";
    board[sq(6, c)] = "P";
    board[sq(7, c)] = back[c].toUpperCase();
  }
  return {
    board,
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
  };
}

const SLIDERS: Record<string, [number, number][]> = {
  b: [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ],
  r: [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ],
  q: [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ],
};

const KNIGHT: [number, number][] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

const KING: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

/** Is square (r,c) attacked by any piece of `by`? */
export function isAttacked(board: Piece[], r: number, c: number, by: Color): boolean {
  // Pawns: white pawns attack upward (row-1), black downward (row+1).
  const pawnRow = by === "w" ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    if (inside(pawnRow, c + dc)) {
      const p = board[sq(pawnRow, c + dc)];
      if (p && colorOf(p) === by && p.toLowerCase() === "p") return true;
    }
  }
  // Knights.
  for (const [dr, dc] of KNIGHT) {
    if (!inside(r + dr, c + dc)) continue;
    const p = board[sq(r + dr, c + dc)];
    if (p && colorOf(p) === by && p.toLowerCase() === "n") return true;
  }
  // King.
  for (const [dr, dc] of KING) {
    if (!inside(r + dr, c + dc)) continue;
    const p = board[sq(r + dr, c + dc)];
    if (p && colorOf(p) === by && p.toLowerCase() === "k") return true;
  }
  // Sliders (bishop/rook/queen).
  for (const [dr, dc] of SLIDERS.q) {
    const diagonal = dr !== 0 && dc !== 0;
    let rr = r + dr;
    let cc = c + dc;
    while (inside(rr, cc)) {
      const p = board[sq(rr, cc)];
      if (p) {
        if (colorOf(p) === by) {
          const t = p.toLowerCase();
          if (t === "q" || (diagonal && t === "b") || (!diagonal && t === "r")) return true;
        }
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  return false;
}

export function kingSquare(board: Piece[], color: Color): Square {
  const target = color === "w" ? "K" : "k";
  for (let i = 0; i < 64; i++) if (board[i] === target) return i;
  return -1;
}

export function isInCheck(state: ChessState, color: Color): boolean {
  const k = kingSquare(state.board, color);
  if (k < 0) return false;
  return isAttacked(state.board, row(k), col(k), color === "w" ? "b" : "w");
}

function pushPawnMoves(moves: ChessMove[], from: Square, to: Square, color: Color) {
  const promoteRow = color === "w" ? 0 : 7;
  if (row(to) === promoteRow) {
    (["Q", "R", "B", "N"] as const).forEach((promotion) =>
      moves.push({ from, to, promotion })
    );
  } else {
    moves.push({ from, to });
  }
}

function pseudoMoves(state: ChessState, color: Color): ChessMove[] {
  const { board } = state;
  const moves: ChessMove[] = [];

  for (let i = 0; i < 64; i++) {
    const piece = board[i];
    if (!piece || colorOf(piece) !== color) continue;
    const r = row(i);
    const c = col(i);
    const type = piece.toLowerCase();

    if (type === "p") {
      const dir = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      // Forward one.
      if (inside(r + dir, c) && !board[sq(r + dir, c)]) {
        pushPawnMoves(moves, i, sq(r + dir, c), color);
        // Forward two.
        if (r === startRow && !board[sq(r + 2 * dir, c)]) {
          moves.push({ from: i, to: sq(r + 2 * dir, c), flag: "double" });
        }
      }
      // Captures + en passant.
      for (const dc of [-1, 1]) {
        if (!inside(r + dir, c + dc)) continue;
        const to = sq(r + dir, c + dc);
        const target = board[to];
        if (target && colorOf(target) !== color) {
          pushPawnMoves(moves, i, to, color);
        } else if (to === state.enPassant) {
          moves.push({ from: i, to, flag: "enpassant" });
        }
      }
    } else if (type === "n") {
      for (const [dr, dc] of KNIGHT) {
        if (!inside(r + dr, c + dc)) continue;
        const to = sq(r + dr, c + dc);
        if (colorOf(board[to]) !== color) moves.push({ from: i, to });
      }
    } else if (type === "k") {
      for (const [dr, dc] of KING) {
        if (!inside(r + dr, c + dc)) continue;
        const to = sq(r + dr, c + dc);
        if (colorOf(board[to]) !== color) moves.push({ from: i, to });
      }
      // Castling.
      const enemy: Color = color === "w" ? "b" : "w";
      const homeRow = color === "w" ? 7 : 0;
      if (r === homeRow && c === 4 && !isAttacked(board, r, 4, enemy)) {
        const kRight = color === "w" ? state.castling.wK : state.castling.bK;
        const qRight = color === "w" ? state.castling.wQ : state.castling.bQ;
        if (
          kRight &&
          !board[sq(homeRow, 5)] &&
          !board[sq(homeRow, 6)] &&
          !isAttacked(board, homeRow, 5, enemy) &&
          !isAttacked(board, homeRow, 6, enemy) &&
          board[sq(homeRow, 7)]?.toLowerCase() === "r"
        ) {
          moves.push({ from: i, to: sq(homeRow, 6), flag: "castleK" });
        }
        if (
          qRight &&
          !board[sq(homeRow, 3)] &&
          !board[sq(homeRow, 2)] &&
          !board[sq(homeRow, 1)] &&
          !isAttacked(board, homeRow, 3, enemy) &&
          !isAttacked(board, homeRow, 2, enemy) &&
          board[sq(homeRow, 0)]?.toLowerCase() === "r"
        ) {
          moves.push({ from: i, to: sq(homeRow, 2), flag: "castleQ" });
        }
      }
    } else {
      // Sliding pieces.
      for (const [dr, dc] of SLIDERS[type]) {
        let rr = r + dr;
        let cc = c + dc;
        while (inside(rr, cc)) {
          const to = sq(rr, cc);
          const occ = board[to];
          if (!occ) {
            moves.push({ from: i, to });
          } else {
            if (colorOf(occ) !== color) moves.push({ from: i, to });
            break;
          }
          rr += dr;
          cc += dc;
        }
      }
    }
  }
  return moves;
}

export function applyMove(state: ChessState, move: ChessMove): ChessState {
  const board = [...state.board];
  const piece = board[move.from]!;
  const color = colorOf(piece)!;
  const castling = { ...state.castling };
  let enPassant: Square | null = null;

  board[move.from] = null;

  if (move.flag === "enpassant") {
    board[move.to] = piece;
    // Captured pawn sits beside the destination, on the moving side's rank.
    const capRow = color === "w" ? row(move.to) + 1 : row(move.to) - 1;
    board[sq(capRow, col(move.to))] = null;
  } else if (move.flag === "castleK") {
    board[move.to] = piece;
    const hr = row(move.to);
    board[sq(hr, 5)] = board[sq(hr, 7)];
    board[sq(hr, 7)] = null;
  } else if (move.flag === "castleQ") {
    board[move.to] = piece;
    const hr = row(move.to);
    board[sq(hr, 3)] = board[sq(hr, 0)];
    board[sq(hr, 0)] = null;
  } else {
    board[move.to] = move.promotion
      ? (color === "w" ? move.promotion : move.promotion.toLowerCase())
      : piece;
    if (move.flag === "double") {
      enPassant = sq((row(move.from) + row(move.to)) / 2, col(move.from));
    }
  }

  // Update castling rights.
  if (piece === "K") {
    castling.wK = false;
    castling.wQ = false;
  } else if (piece === "k") {
    castling.bK = false;
    castling.bQ = false;
  }
  const touch = (s: Square) => {
    if (s === sq(7, 0)) castling.wQ = false;
    if (s === sq(7, 7)) castling.wK = false;
    if (s === sq(0, 0)) castling.bQ = false;
    if (s === sq(0, 7)) castling.bK = false;
  };
  touch(move.from);
  touch(move.to);

  return {
    board,
    turn: color === "w" ? "b" : "w",
    castling,
    enPassant,
  };
}

export function legalMoves(state: ChessState): ChessMove[] {
  const color = state.turn;
  return pseudoMoves(state, color).filter((move) => {
    const next = applyMove(state, move);
    return !isInCheck({ ...next, turn: color }, color);
  });
}

export function movesFrom(state: ChessState, from: Square): ChessMove[] {
  return legalMoves(state).filter((m) => m.from === from);
}

export function getStatus(state: ChessState): ChessStatus {
  const moves = legalMoves(state);
  const check = isInCheck(state, state.turn);
  if (moves.length === 0) return check ? "checkmate" : "stalemate";
  return check ? "check" : "playing";
}

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function evaluate(state: ChessState): number {
  // Material from the perspective of the side to move.
  let score = 0;
  for (const piece of state.board) {
    if (!piece) continue;
    const v = VALUE[piece.toLowerCase()];
    score += colorOf(piece) === "w" ? v : -v;
  }
  return state.turn === "w" ? score : -score;
}

function orderMoves(state: ChessState, moves: ChessMove[]): ChessMove[] {
  return [...moves].sort((a, b) => captureValue(state, b) - captureValue(state, a));
}

function captureValue(state: ChessState, move: ChessMove): number {
  const target = state.board[move.to];
  return target ? VALUE[target.toLowerCase()] : 0;
}

function negamax(state: ChessState, depth: number, alpha: number, beta: number): number {
  const moves = legalMoves(state);
  if (moves.length === 0) {
    return isInCheck(state, state.turn) ? -1_000_000 - depth : 0;
  }
  if (depth === 0) return evaluate(state);

  let best = -Infinity;
  for (const move of orderMoves(state, moves)) {
    const score = -negamax(applyMove(state, move), depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function chessBotMove(state: ChessState, depth = 3): ChessMove | null {
  const moves = legalMoves(state);
  if (moves.length === 0) return null;

  let bestScore = -Infinity;
  const best: ChessMove[] = [];
  for (const move of orderMoves(state, moves)) {
    const score = -negamax(applyMove(state, move), depth - 1, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      best.length = 0;
      best.push(move);
    } else if (score === bestScore) {
      best.push(move);
    }
  }
  // Slight randomness among equally-good moves keeps games varied.
  return best[Math.floor(Math.random() * best.length)];
}

const GLYPHS: Record<string, string> = {
  K: "\u2654",
  Q: "\u2655",
  R: "\u2656",
  B: "\u2657",
  N: "\u2658",
  P: "\u2659",
  k: "\u265A",
  q: "\u265B",
  r: "\u265C",
  b: "\u265D",
  n: "\u265E",
  p: "\u265F",
};

export function pieceGlyph(piece: Piece): string {
  return piece ? GLYPHS[piece] ?? "" : "";
}
