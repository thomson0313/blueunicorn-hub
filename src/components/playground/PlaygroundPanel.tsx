"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandClock } from "@/components/playground/BrandClock";
import { GameFrame } from "@/components/playground/GameFrame";
import { GamePreview } from "@/components/playground/GamePreview";
import { Chess } from "@/components/playground/games/Chess";
import { ConnectFour } from "@/components/playground/games/ConnectFour";
import { TicTacToe } from "@/components/playground/games/TicTacToe";
import { Tetris } from "@/components/playground/games/Tetris";
import { GAME_REGISTRY, type GameId } from "@/lib/games/registry";

export function PlaygroundPanel() {
  const [active, setActive] = useState<GameId | null>(null);
  const [enabled, setEnabled] = useState<GameId[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/playground/games")
      .then((r) => (r.ok ? r.json() : { games: GAME_REGISTRY.map((g) => g.id) }))
      .then((d) => {
        if (!cancelled) setEnabled((d.games as GameId[]) ?? []);
      })
      .catch(() => {
        if (!cancelled) setEnabled(GAME_REGISTRY.map((g) => g.id));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const games = useMemo(() => {
    if (!enabled) return [];
    const set = new Set(enabled);
    return GAME_REGISTRY.filter((g) => set.has(g.id));
  }, [enabled]);

  const game = games.find((g) => g.id === active) ?? null;

  return (
    <div className="space-y-6">
      <BrandClock />

      {!game ? (
        <section>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Playground</h1>
          <p className="text-slate-500 text-sm mb-4">
            Take a break with a quick game. Play against the bot or a friend on another computer, in a window or
            fullscreen.
          </p>

          {enabled && games.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-slate-600 font-medium">No games available right now.</p>
              <p className="text-slate-400 text-sm mt-1">An admin can enable games from the Add-ons page.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {games.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActive(g.id)}
                  className="group text-left rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden cursor-pointer"
                >
                  <div className={`relative aspect-[4/3] flex items-center justify-center bg-gradient-to-br ${g.accent}`}>
                    <div className="scale-90">
                      <GamePreview id={g.id} />
                    </div>
                    <div className="absolute inset-0 bg-slate-900/55 group-hover:bg-slate-900/35 transition flex items-center justify-center">
                      <span className="flex items-center justify-center w-14 h-14 rounded-full bg-white/95 text-brand-600 shadow-lg group-hover:scale-110 transition">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    </div>
                    <span className="absolute bottom-2 left-3 text-white font-semibold drop-shadow">{g.title}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-slate-500">{g.tagline}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {g.supportsBot && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                          vs Bot
                        </span>
                      )}
                      {g.supportsSolo && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          Solo
                        </span>
                      )}
                      {g.supportsTwoPlayer && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          2 Players online
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <GameFrame
          title={game.title}
          subtitle={game.tagline}
          supportsBot={game.supportsBot}
          supportsSolo={game.supportsSolo}
          supportsTwoPlayer={game.supportsTwoPlayer}
          onBack={() => setActive(null)}
        >
          {({ mode, fullscreen, restartKey }) => {
            if (game.id === "chess") return <Chess key={restartKey} mode={mode} fullscreen={fullscreen} />;
            if (game.id === "connect4") return <ConnectFour key={restartKey} mode={mode} fullscreen={fullscreen} />;
            if (game.id === "tictactoe") return <TicTacToe key={restartKey} mode={mode} fullscreen={fullscreen} />;
            return <Tetris key={restartKey} mode={mode} fullscreen={fullscreen} />;
          }}
        </GameFrame>
      )}
    </div>
  );
}
