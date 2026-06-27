"use client";

import { useState } from "react";
import { BrandClock } from "@/components/playground/BrandClock";
import { GameFrame } from "@/components/playground/GameFrame";
import { Chess } from "@/components/playground/games/Chess";
import { ConnectFour } from "@/components/playground/games/ConnectFour";
import { TicTacToe } from "@/components/playground/games/TicTacToe";
import { Tetris } from "@/components/playground/games/Tetris";

type GameId = "tictactoe" | "connect4" | "chess" | "tetris";

type GameDef = {
  id: GameId;
  title: string;
  tagline: string;
  emoji: string;
  accent: string;
  supportsBot: boolean;
  supportsTwoPlayer: boolean;
};

const GAMES: GameDef[] = [
  {
    id: "chess",
    title: "Chess",
    tagline: "Full rules · castling, en passant, promotion",
    emoji: "♞",
    accent: "from-slate-700 to-slate-900",
    supportsBot: true,
    supportsTwoPlayer: true,
  },
  {
    id: "connect4",
    title: "Connect Four",
    tagline: "Drop discs, line up four to win",
    emoji: "🔴",
    accent: "from-brand-500 to-brand-700",
    supportsBot: true,
    supportsTwoPlayer: true,
  },
  {
    id: "tictactoe",
    title: "Tic-Tac-Toe",
    tagline: "Classic 3×3 · unbeatable bot",
    emoji: "⭕",
    accent: "from-rose-400 to-rose-600",
    supportsBot: true,
    supportsTwoPlayer: true,
  },
  {
    id: "tetris",
    title: "Tetris",
    tagline: "Stack, clear lines, chase a high score",
    emoji: "🧱",
    accent: "from-emerald-400 to-emerald-600",
    supportsBot: false,
    supportsTwoPlayer: false,
  },
];

export function PlaygroundPanel() {
  const [active, setActive] = useState<GameId | null>(null);
  const game = GAMES.find((g) => g.id === active) ?? null;

  return (
    <div className="space-y-6">
      <BrandClock />

      {!game ? (
        <section>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Playground</h1>
          <p className="text-slate-500 text-sm mb-4">
            Take a break with a quick game. Play against the bot or a friend, in a window or fullscreen.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GAMES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActive(g.id)}
                className="group text-left rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${g.accent} flex items-center justify-center text-2xl mb-3`}
                >
                  <span>{g.emoji}</span>
                </div>
                <h2 className="font-semibold text-slate-900">{g.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{g.tagline}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.supportsBot && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                      vs Bot
                    </span>
                  )}
                  {g.supportsTwoPlayer && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      2 Players
                    </span>
                  )}
                  {!g.supportsBot && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      Solo
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <GameFrame
          title={game.title}
          subtitle={game.tagline}
          supportsBot={game.supportsBot}
          supportsTwoPlayer={game.supportsTwoPlayer}
          onBack={() => setActive(null)}
        >
          {({ mode, fullscreen, restartKey }) => {
            if (game.id === "chess") return <Chess key={restartKey} mode={mode} fullscreen={fullscreen} />;
            if (game.id === "connect4") return <ConnectFour key={restartKey} mode={mode} fullscreen={fullscreen} />;
            if (game.id === "tictactoe") return <TicTacToe key={restartKey} mode={mode} fullscreen={fullscreen} />;
            return <Tetris key={restartKey} fullscreen={fullscreen} />;
          }}
        </GameFrame>
      )}
    </div>
  );
}
