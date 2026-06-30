"use client";

import { useState } from "react";
import type { GameRoom } from "@/lib/games/useGameRoom";

export function OnlineLobby({
  room,
  fullscreen,
}: {
  room: GameRoom<unknown>;
  fullscreen: boolean;
}) {
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  const textMuted = fullscreen ? "text-brand-100" : "text-slate-500";
  const heading = fullscreen ? "text-white" : "text-slate-900";

  function copyCode() {
    if (!room.code) return;
    navigator.clipboard?.writeText(room.code).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => {}
    );
  }

  if (!room.socketReady) {
    return (
      <Wrapper fullscreen={fullscreen}>
        <p className={textMuted}>Connecting to the server…</p>
      </Wrapper>
    );
  }

  if (room.phase === "hosting") {
    return (
      <Wrapper fullscreen={fullscreen}>
        <h3 className={`text-lg font-semibold ${heading}`}>Room created</h3>
        <p className={`text-sm ${textMuted}`}>Share this code with your opponent:</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-4xl font-bold tracking-[0.3em] text-brand-600 bg-white rounded-xl border border-brand-200 px-5 py-3">
            {room.code}
          </span>
          <button
            type="button"
            onClick={copyCode}
            className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-2 cursor-pointer"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className={`text-sm ${textMuted}`}>Waiting for your opponent to join…</p>
        <button type="button" onClick={room.leaveRoom} className={cancelClass(fullscreen)}>
          Cancel
        </button>
      </Wrapper>
    );
  }

  if (room.phase === "joining") {
    return (
      <Wrapper fullscreen={fullscreen}>
        <p className={textMuted}>Joining room…</p>
      </Wrapper>
    );
  }

  if (room.phase === "closed") {
    return (
      <Wrapper fullscreen={fullscreen}>
        <h3 className={`text-lg font-semibold ${heading}`}>Opponent left</h3>
        <p className={`text-sm ${textMuted}`}>The game has ended. Start a new room to play again.</p>
        <button
          type="button"
          onClick={room.leaveRoom}
          className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 cursor-pointer"
        >
          Back to lobby
        </button>
      </Wrapper>
    );
  }

  // idle
  return (
    <Wrapper fullscreen={fullscreen}>
      <h3 className={`text-lg font-semibold ${heading}`}>Play with a friend</h3>
      <p className={`text-sm ${textMuted} max-w-xs text-center`}>
        Create a room and share the code, or join a friend&apos;s room from another computer.
      </p>
      <button
        type="button"
        onClick={room.createRoom}
        className="w-56 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2.5 cursor-pointer"
      >
        Create room
      </button>
      <div className={`flex items-center gap-3 w-56 ${textMuted}`}>
        <span className="flex-1 h-px bg-current opacity-30" />
        <span className="text-xs">or</span>
        <span className="flex-1 h-px bg-current opacity-30" />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          room.joinRoom(joinCode);
        }}
        className="flex flex-col items-center gap-2 w-56"
      >
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          maxLength={6}
          className="w-full text-center font-mono text-lg tracking-[0.2em] rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={!joinCode.trim()}
          className="w-full rounded-lg bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-default text-white font-semibold px-4 py-2.5 cursor-pointer"
        >
          Join room
        </button>
      </form>
      {room.error && <p className="text-sm text-red-500">{room.error}</p>}
    </Wrapper>
  );
}

function Wrapper({ children, fullscreen }: { children: React.ReactNode; fullscreen: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-xl px-6 py-10 ${
        fullscreen ? "bg-white/5" : "bg-slate-50 border border-slate-200"
      }`}
    >
      {children}
    </div>
  );
}

function cancelClass(fullscreen: boolean): string {
  return `text-sm font-medium rounded-lg px-4 py-2 cursor-pointer ${
    fullscreen ? "text-brand-100 hover:bg-white/10" : "text-slate-500 hover:bg-slate-200"
  }`;
}
