export type GameId = "chess" | "connect4" | "tictactoe" | "tetris";

export type GameMeta = {
  id: GameId;
  title: string;
  tagline: string;
  emoji: string;
  accent: string;
  supportsBot: boolean;
  supportsSolo: boolean;
  supportsTwoPlayer: boolean;
};

export const GAME_REGISTRY: GameMeta[] = [
  {
    id: "chess",
    title: "Chess",
    tagline: "Full rules · castling, en passant, promotion",
    emoji: "♞",
    accent: "from-slate-700 to-slate-900",
    supportsBot: true,
    supportsSolo: false,
    supportsTwoPlayer: true,
  },
  {
    id: "connect4",
    title: "Connect Four",
    tagline: "Drop discs, line up four to win",
    emoji: "🔴",
    accent: "from-brand-500 to-brand-700",
    supportsBot: true,
    supportsSolo: false,
    supportsTwoPlayer: true,
  },
  {
    id: "tictactoe",
    title: "Tic-Tac-Toe",
    tagline: "Classic 3×3 · unbeatable bot",
    emoji: "⭕",
    accent: "from-rose-400 to-rose-600",
    supportsBot: true,
    supportsSolo: false,
    supportsTwoPlayer: true,
  },
  {
    id: "tetris",
    title: "Tetris",
    tagline: "Stack and clear lines · solo or versus",
    emoji: "🧱",
    accent: "from-emerald-400 to-emerald-600",
    supportsBot: false,
    supportsSolo: true,
    supportsTwoPlayer: true,
  },
];

export function isGameId(value: string): value is GameId {
  return GAME_REGISTRY.some((g) => g.id === value);
}
