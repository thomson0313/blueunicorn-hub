"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";

export type RoomRole = "host" | "guest" | "spectator";
export type RoomPhase = "lobby" | "hosting" | "playing" | "watching" | "closed";

export type RoomSummary = {
  code: string;
  gameId: string;
  hostName: string;
  playerCount: number;
  spectatorCount: number;
  full: boolean;
  started: boolean;
};

export type GameRoomHandlers<M> = {
  onStart?: () => void;
  onSync?: (moves: M[]) => void;
  onOpponentMove?: (move: M) => void;
  onSignal?: (data: unknown) => void;
  onReset?: () => void;
  onClosed?: () => void;
};

export type GameRoom<M> = {
  phase: RoomPhase;
  rooms: RoomSummary[];
  code: string | null;
  role: RoomRole | null;
  seat: number | null;
  players: string[];
  spectatorCount: number;
  started: boolean;
  error: string | null;
  socketReady: boolean;
  isPlayer: boolean;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  sendMove: (move: M) => void;
  sendSignal: (data: unknown) => void;
  sendReset: () => void;
};

type JoinAck = {
  ok?: boolean;
  role?: "guest" | "spectator";
  seat?: number | null;
  players?: string[];
  started?: boolean;
  moves?: unknown[];
  error?: string;
};

/** Open-room multiplayer: browse rooms, join to play or spectate, relay moves. */
export function useGameRoom<M = unknown>(
  gameId: string,
  handlers: GameRoomHandlers<M>
): GameRoom<M> {
  const { socket, socketConnected, user } = useApp();
  const [phase, setPhase] = useState<RoomPhase>("lobby");
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [role, setRole] = useState<RoomRole | null>(null);
  const [seat, setSeat] = useState<number | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const codeRef = useRef<string | null>(null);

  // Subscribe to the lobby room list for this game.
  useEffect(() => {
    if (!socket) return;
    const refreshList = () =>
      socket.emit("game:list", { gameId }, (list: RoomSummary[]) => setRooms(list || []));
    refreshList();

    const onRooms = (payload: { gameId: string; rooms: RoomSummary[] }) => {
      if (payload.gameId === gameId) setRooms(payload.rooms || []);
    };
    const onStart = (payload: { players: string[] }) => {
      setPlayers(payload.players || []);
      setStarted(true);
      setPhase((p) => (p === "watching" ? p : "playing"));
      handlersRef.current.onStart?.();
    };
    const onMove = (payload: { move: M }) => handlersRef.current.onOpponentMove?.(payload.move);
    const onSignal = (payload: { data: unknown }) => handlersRef.current.onSignal?.(payload.data);
    const onReset = () => handlersRef.current.onReset?.();
    const onPeers = (payload: { players: string[]; spectatorCount: number; started: boolean }) => {
      setPlayers(payload.players || []);
      setSpectatorCount(payload.spectatorCount || 0);
      setStarted(payload.started);
    };
    const onClosed = () => {
      setPhase("closed");
      setStarted(false);
      handlersRef.current.onClosed?.();
    };

    socket.on("connect", refreshList);
    socket.on("game:rooms", onRooms);
    socket.on("game:start", onStart);
    socket.on("game:opponent-move", onMove);
    socket.on("game:signal", onSignal);
    socket.on("game:reset", onReset);
    socket.on("game:peers", onPeers);
    socket.on("game:closed", onClosed);

    return () => {
      socket.off("connect", refreshList);
      socket.off("game:rooms", onRooms);
      socket.off("game:start", onStart);
      socket.off("game:opponent-move", onMove);
      socket.off("game:signal", onSignal);
      socket.off("game:reset", onReset);
      socket.off("game:peers", onPeers);
      socket.off("game:closed", onClosed);
      socket.emit("game:unlist", { gameId });
    };
  }, [socket, gameId]);

  // Leave the active room when the hook unmounts.
  useEffect(() => {
    return () => {
      if (socket && codeRef.current) socket.emit("game:leave", { code: codeRef.current });
    };
  }, [socket]);

  const createRoom = useCallback(() => {
    if (!socket) {
      setError("Not connected to the server");
      return;
    }
    setError(null);
    socket.emit("game:create", { gameId }, (res: { code?: string; error?: string }) => {
      if (res?.code) {
        codeRef.current = res.code;
        setCode(res.code);
        setRole("host");
        setSeat(0);
        setPlayers([user.name]);
        setSpectatorCount(0);
        setStarted(false);
        setPhase("hosting");
      } else {
        setError(res?.error || "Could not create a room");
      }
    });
  }, [socket, gameId, user.name]);

  const joinRoom = useCallback(
    (target: string) => {
      const c = target.toUpperCase().trim();
      if (!c || !socket) return;
      setError(null);
      socket.emit("game:join", { code: c }, (res: JoinAck) => {
        if (!res?.ok) {
          setError(res?.error || "Could not join the room");
          return;
        }
        codeRef.current = c;
        setCode(c);
        setRole(res.role === "spectator" ? "spectator" : "guest");
        setSeat(res.seat ?? null);
        setPlayers(res.players || []);
        setStarted(!!res.started);
        if (res.role === "spectator") {
          setPhase("watching");
          handlersRef.current.onSync?.((res.moves || []) as M[]);
        } else {
          setPhase("playing");
          handlersRef.current.onSync?.((res.moves || []) as M[]);
          handlersRef.current.onStart?.();
        }
      });
    },
    [socket]
  );

  const leaveRoom = useCallback(() => {
    if (socket && codeRef.current) socket.emit("game:leave", { code: codeRef.current });
    codeRef.current = null;
    setCode(null);
    setRole(null);
    setSeat(null);
    setPlayers([]);
    setSpectatorCount(0);
    setStarted(false);
    setError(null);
    setPhase("lobby");
  }, [socket]);

  const sendMove = useCallback(
    (move: M) => {
      if (socket && codeRef.current) socket.emit("game:move", { code: codeRef.current, move });
    },
    [socket]
  );

  const sendSignal = useCallback(
    (data: unknown) => {
      if (socket && codeRef.current) socket.emit("game:signal", { code: codeRef.current, data });
    },
    [socket]
  );

  const sendReset = useCallback(() => {
    if (socket && codeRef.current) socket.emit("game:reset", { code: codeRef.current });
  }, [socket]);

  return {
    phase,
    rooms,
    code,
    role,
    seat,
    players,
    spectatorCount,
    started,
    error,
    socketReady: socketConnected,
    isPlayer: role === "host" || role === "guest",
    createRoom,
    joinRoom,
    leaveRoom,
    sendMove,
    sendSignal,
    sendReset,
  };
}
