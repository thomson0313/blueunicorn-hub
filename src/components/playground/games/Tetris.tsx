"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameMode } from "@/components/playground/GameFrame";
import { OnlineLobby } from "@/components/playground/OnlineLobby";
import { useGameRoom } from "@/lib/games/useGameRoom";
import {
  TETRIS_COLORS,
  createTetris,
  hardDrop,
  moveHorizontal,
  renderGrid,
  rotatePiece,
  stepDown,
  tetrisDropMs,
  tetrisLevel,
  type Grid,
  type TetrisState,
} from "@/lib/games/tetris";

type Snapshot = { seat: number; grid: Grid; score: number; lines: number; over: boolean };

function useTetrisGame(active: boolean) {
  const [state, setState] = useState<TetrisState>(createTetris);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!active || state.over) return;
    const id = window.setInterval(() => {
      if (!pausedRef.current) setState((s) => stepDown(s));
    }, tetrisDropMs(state.lines));
    return () => window.clearInterval(id);
  }, [active, state.over, state.lines]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (state.over) return;
      const keys = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "];
      if (keys.includes(e.key)) e.preventDefault();
      if (e.key === "p" || e.key === "P") {
        setPaused((p) => !p);
        return;
      }
      if (pausedRef.current) return;
      if (e.key === "ArrowLeft") setState((s) => moveHorizontal(s, -1));
      else if (e.key === "ArrowRight") setState((s) => moveHorizontal(s, 1));
      else if (e.key === "ArrowDown") setState((s) => stepDown(s));
      else if (e.key === "ArrowUp") setState((s) => rotatePiece(s));
      else if (e.key === " ") setState((s) => hardDrop(s));
    },
    [state.over]
  );

  useEffect(() => {
    if (!active) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, handleKey]);

  const actions = {
    left: () => setState((s) => moveHorizontal(s, -1)),
    right: () => setState((s) => moveHorizontal(s, 1)),
    soft: () => setState((s) => stepDown(s)),
    rotate: () => setState((s) => rotatePiece(s)),
    hard: () => setState((s) => hardDrop(s)),
  };
  const restart = useCallback(() => {
    setState(createTetris());
    setPaused(false);
  }, []);

  return { state, paused, setPaused, actions, restart };
}

export function Tetris({ mode, fullscreen }: { mode: GameMode; fullscreen: boolean }) {
  const online = mode === "two";
  const [boards, setBoards] = useState<Record<number, Snapshot>>({});
  const restartRef = useRef<() => void>(() => {});

  const room = useGameRoom<unknown>("tetris", {
    onSignal: (data) => {
      const snap = data as Snapshot;
      if (snap && typeof snap.seat === "number") {
        setBoards((prev) => ({ ...prev, [snap.seat]: snap }));
      }
    },
    onReset: () => {
      restartRef.current();
      setBoards({});
    },
  });

  const isSpectator = room.role === "spectator";
  const active = !online || (room.isPlayer && room.phase === "playing");
  const game = useTetrisGame(active);
  restartRef.current = game.restart;

  const showBoard = !online || room.phase === "playing" || room.phase === "watching";

  // Broadcast our board to the room while playing.
  useEffect(() => {
    if (!online || !room.isPlayer || room.phase !== "playing" || room.seat == null) return;
    room.sendSignal({
      seat: room.seat,
      grid: renderGrid(game.state),
      score: game.state.score,
      lines: game.state.lines,
      over: game.state.over,
    });
  }, [online, room.isPlayer, room.phase, room.seat, game.state, room.sendSignal]);

  if (online && !showBoard) {
    return <OnlineLobby room={room} fullscreen={fullscreen} />;
  }

  // ── Solo ──
  if (!online) {
    return (
      <SoloTetris game={game} fullscreen={fullscreen} />
    );
  }

  // ── Online versus ──
  const cell = fullscreen ? 20 : 15;
  const mySeat = room.seat ?? 0;
  const oppSeat = mySeat === 0 ? 1 : 0;
  const oppSnap = boards[oppSeat];

  if (isSpectator) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className={`text-sm font-medium ${fullscreen ? "text-white" : "text-slate-700"}`}>
          👁 Watching · {room.spectatorCount} watching
        </p>
        <div className="flex items-start gap-6">
          <BoardView
            grid={boards[0]?.grid}
            cell={cell}
            label={room.players[0] ?? "Player 1"}
            score={boards[0]?.score ?? 0}
            lines={boards[0]?.lines ?? 0}
            over={boards[0]?.over}
            fullscreen={fullscreen}
          />
          <BoardView
            grid={boards[1]?.grid}
            cell={cell}
            label={room.players[1] ?? "Player 2"}
            score={boards[1]?.score ?? 0}
            lines={boards[1]?.lines ?? 0}
            over={boards[1]?.over}
            fullscreen={fullscreen}
          />
        </div>
      </div>
    );
  }

  const meOver = game.state.over;
  const oppOver = oppSnap?.over;
  const versusStatus = meOver && !oppOver
    ? "You topped out — you lose"
    : oppOver && !meOver
      ? "Opponent topped out — you win!"
      : meOver && oppOver
        ? game.state.lines >= (oppSnap?.lines ?? 0)
          ? "Both out — you win on lines!"
          : "Both out — you lose on lines"
        : "Race in progress";

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs rounded-lg px-3 py-2 ${
          fullscreen ? "bg-white/10 text-brand-50" : "bg-brand-50 text-brand-700"
        }`}
      >
        <span className="font-medium">{versusStatus}</span>
        {room.spectatorCount > 0 && <span className="opacity-70">· {room.spectatorCount} watching</span>}
        {meOver && (
          <button
            type="button"
            onClick={() => {
              game.restart();
              setBoards({});
              room.sendReset();
            }}
            className="rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium px-2.5 py-1 cursor-pointer"
          >
            Rematch
          </button>
        )}
      </div>
      <div className="flex items-start gap-6">
        <BoardView
          grid={renderGrid(game.state)}
          cell={cell}
          label="You"
          score={game.state.score}
          lines={game.state.lines}
          over={game.state.over}
          fullscreen={fullscreen}
          highlight
        />
        <BoardView
          grid={oppSnap?.grid}
          cell={cell}
          label={room.players[oppSeat] ?? "Opponent"}
          score={oppSnap?.score ?? 0}
          lines={oppSnap?.lines ?? 0}
          over={oppSnap?.over}
          fullscreen={fullscreen}
        />
      </div>
      <Controls actions={game.actions} paused={game.paused} onPause={() => game.setPaused((p) => !p)} />
    </div>
  );
}

function SoloTetris({
  game,
  fullscreen,
}: {
  game: ReturnType<typeof useTetrisGame>;
  fullscreen: boolean;
}) {
  const cell = fullscreen ? 26 : 20;
  const { state, paused, setPaused, actions, restart } = game;
  const grid = renderGrid(state);

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <div className="relative">
        <BoardGrid grid={grid} cell={cell} />
        {(state.over || paused) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/80 rounded-lg text-white">
            <p className="text-xl font-bold">{state.over ? "Game over" : "Paused"}</p>
            <button
              type="button"
              onClick={() => (state.over ? restart() : setPaused(false))}
              className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-sm font-medium cursor-pointer"
            >
              {state.over ? "Play again" : "Resume"}
            </button>
          </div>
        )}
      </div>

      <div className={`text-sm space-y-3 ${fullscreen ? "text-white" : "text-slate-700"}`}>
        <div className="flex gap-4 sm:block sm:space-y-2">
          <Stat label="Score" value={state.score} fullscreen={fullscreen} />
          <Stat label="Lines" value={state.lines} fullscreen={fullscreen} />
          <Stat label="Level" value={tetrisLevel(state.lines)} fullscreen={fullscreen} />
        </div>
        <div className={`text-xs leading-relaxed ${fullscreen ? "text-brand-100" : "text-slate-500"}`}>
          <p>← → move</p>
          <p>↑ rotate · ↓ soft drop</p>
          <p>Space hard drop · P pause</p>
        </div>
        <Controls actions={actions} paused={paused} onPause={() => setPaused((p) => !p)} />
      </div>
    </div>
  );
}

function BoardGrid({ grid, cell }: { grid: Grid; cell: number }) {
  return (
    <div className="grid bg-slate-900 rounded-lg p-1 shadow-inner" style={{ gridTemplateColumns: `repeat(10, ${cell}px)` }}>
      {grid.flatMap((rowCells, r) =>
        rowCells.map((value, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              width: cell,
              height: cell,
              backgroundColor: value ? TETRIS_COLORS[value] : "rgba(255,255,255,0.04)",
            }}
            className="border border-slate-900/60 rounded-[3px]"
          />
        ))
      )}
    </div>
  );
}

function BoardView({
  grid,
  cell,
  label,
  score,
  lines,
  over,
  fullscreen,
  highlight,
}: {
  grid?: Grid;
  cell: number;
  label: string;
  score: number;
  lines: number;
  over?: boolean;
  fullscreen: boolean;
  highlight?: boolean;
}) {
  const empty: Grid = Array.from({ length: 20 }, () => Array(10).fill(0));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <p
        className={`text-xs font-semibold truncate max-w-[140px] ${
          highlight ? "text-brand-500" : fullscreen ? "text-brand-100" : "text-slate-600"
        }`}
      >
        {label}
      </p>
      <div className="relative">
        <BoardGrid grid={grid ?? empty} cell={cell} />
        {over && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/75 rounded-lg">
            <span className="text-white text-sm font-bold">Topped out</span>
          </div>
        )}
        {!grid && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/50 text-xs">Waiting…</span>
          </div>
        )}
      </div>
      <p className={`text-[11px] ${fullscreen ? "text-brand-100" : "text-slate-500"}`}>
        Score {score} · Lines {lines}
      </p>
    </div>
  );
}

function Controls({
  actions,
  paused,
  onPause,
}: {
  actions: ReturnType<typeof useTetrisGame>["actions"];
  paused: boolean;
  onPause: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 justify-center sm:max-w-[170px]">
      <Pad label="←" onClick={actions.left} />
      <Pad label="↻" onClick={actions.rotate} />
      <Pad label="→" onClick={actions.right} />
      <Pad label="↓" onClick={actions.soft} />
      <Pad label="⤓" onClick={actions.hard} />
      <Pad label={paused ? "▶" : "⏸"} onClick={onPause} />
    </div>
  );
}

function Stat({ label, value, fullscreen }: { label: string; value: number; fullscreen: boolean }) {
  return (
    <div>
      <p className={`text-[11px] uppercase tracking-wide ${fullscreen ? "text-brand-100" : "text-slate-400"}`}>
        {label}
      </p>
      <p className={`text-lg font-bold ${fullscreen ? "text-white" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function Pad({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-11 h-11 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-lg flex items-center justify-center cursor-pointer"
    >
      {label}
    </button>
  );
}
