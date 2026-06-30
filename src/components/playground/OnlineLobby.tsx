"use client";

import type { GameRoom } from "@/lib/games/useGameRoom";

export function OnlineLobby({
  room,
  fullscreen,
}: {
  room: GameRoom<unknown>;
  fullscreen: boolean;
}) {
  const textMuted = fullscreen ? "text-brand-100" : "text-slate-500";
  const heading = fullscreen ? "text-white" : "text-slate-900";

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
        <p className={`text-sm ${textMuted} text-center max-w-xs`}>
          Your room is now listed in the lobby. Waiting for another player to join…
        </p>
        <div className="flex items-center gap-2 text-sm">
          <Spinner />
          <span className={textMuted}>Waiting for an opponent</span>
        </div>
        <button type="button" onClick={room.leaveRoom} className={cancelClass(fullscreen)}>
          Cancel room
        </button>
      </Wrapper>
    );
  }

  if (room.phase === "closed") {
    return (
      <Wrapper fullscreen={fullscreen}>
        <h3 className={`text-lg font-semibold ${heading}`}>Match ended</h3>
        <p className={`text-sm ${textMuted}`}>A player left the room. Pick another room or create your own.</p>
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

  // lobby — browse open rooms
  return (
    <Wrapper fullscreen={fullscreen} wide>
      <div className="flex items-center justify-between w-full">
        <h3 className={`text-lg font-semibold ${heading}`}>Open rooms</h3>
        <button
          type="button"
          onClick={room.createRoom}
          className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 cursor-pointer"
        >
          + Create room
        </button>
      </div>

      {room.rooms.length === 0 ? (
        <p className={`text-sm ${textMuted} py-6`}>
          No rooms yet. Create one and ask a friend to join from their computer.
        </p>
      ) : (
        <ul className="w-full space-y-2">
          {room.rooms.map((r) => (
            <li
              key={r.code}
              className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${
                fullscreen ? "bg-white/10" : "bg-white border border-slate-200"
              }`}
            >
              <div className="min-w-0">
                <p className={`font-medium truncate ${fullscreen ? "text-white" : "text-slate-800"}`}>
                  {r.hostName || "Player"}&apos;s room
                </p>
                <p className={`text-xs ${textMuted}`}>
                  {r.full ? "In match · 2/2" : "Waiting · 1/2"}
                  {r.spectatorCount > 0 && ` · ${r.spectatorCount} watching`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => room.joinRoom(r.code)}
                className={`shrink-0 rounded-lg text-sm font-semibold px-4 py-2 cursor-pointer ${
                  r.full
                    ? "bg-slate-700 hover:bg-slate-800 text-white"
                    : "bg-brand-500 hover:bg-brand-600 text-white"
                }`}
              >
                {r.full ? "Watch" : "Join"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {room.error && <p className="text-sm text-red-500">{room.error}</p>}
    </Wrapper>
  );
}

function Wrapper({
  children,
  fullscreen,
  wide,
}: {
  children: React.ReactNode;
  fullscreen: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-4 rounded-xl px-6 py-8 w-full ${
        wide ? "max-w-md" : "max-w-sm"
      } ${fullscreen ? "bg-white/5" : "bg-slate-50 border border-slate-200"}`}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
  );
}

function cancelClass(fullscreen: boolean): string {
  return `text-sm font-medium rounded-lg px-4 py-2 cursor-pointer ${
    fullscreen ? "text-brand-100 hover:bg-white/10" : "text-slate-500 hover:bg-slate-200"
  }`;
}
