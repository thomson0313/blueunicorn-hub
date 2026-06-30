"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";

export type RoomRole = "host" | "guest";
export type RoomPhase = "idle" | "hosting" | "joining" | "connected" | "closed";

type StartInfo = { code: string; gameId: string; hostName: string; guestName: string };

export type GameRoomHandlers<M> = {
  onStart?: () => void;
  onOpponentMove?: (move: M) => void;
  onReset?: () => void;
  onOpponentLeft?: () => void;
};

export type GameRoom<M> = {
  phase: RoomPhase;
  code: string | null;
  role: RoomRole | null;
  opponentName: string | null;
  error: string | null;
  connected: boolean;
  socketReady: boolean;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  sendMove: (move: M) => void;
  sendReset: () => void;
};

/** Pairs two players over socket.io and relays moves for a turn-based game. */
export function useGameRoom<M = unknown>(
  gameId: string,
  handlers: GameRoomHandlers<M>
): GameRoom<M> {
  const { socket, socketConnected } = useApp();
  const [phase, setPhase] = useState<RoomPhase>("idle");
  const [code, setCode] = useState<string | null>(null);
  const [role, setRole] = useState<RoomRole | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const codeRef = useRef<string | null>(null);
  const roleRef = useRef<RoomRole | null>(null);

  useEffect(() => {
    if (!socket) return;

    const onStart = (info: StartInfo) => {
      setOpponentName(roleRef.current === "host" ? info.guestName : info.hostName);
      setPhase("connected");
      setError(null);
      handlersRef.current.onStart?.();
    };
    const onMove = (payload: { move: M }) => handlersRef.current.onOpponentMove?.(payload.move);
    const onReset = () => handlersRef.current.onReset?.();
    const onLeft = () => {
      setPhase("closed");
      setOpponentName(null);
      handlersRef.current.onOpponentLeft?.();
    };

    socket.on("game:start", onStart);
    socket.on("game:opponent-move", onMove);
    socket.on("game:reset", onReset);
    socket.on("game:opponent-left", onLeft);
    return () => {
      socket.off("game:start", onStart);
      socket.off("game:opponent-move", onMove);
      socket.off("game:reset", onReset);
      socket.off("game:opponent-left", onLeft);
    };
  }, [socket]);

  // Leave the room when the component using the hook unmounts.
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
    setPhase("hosting");
    setRole("host");
    roleRef.current = "host";
    socket.emit("game:create", { gameId }, (res: { code?: string; error?: string }) => {
      if (res?.code) {
        setCode(res.code);
        codeRef.current = res.code;
      } else {
        setError(res?.error || "Could not create a room");
        setPhase("idle");
        setRole(null);
        roleRef.current = null;
      }
    });
  }, [socket, gameId]);

  const joinRoom = useCallback(
    (raw: string) => {
      const target = raw.toUpperCase().trim();
      if (!target) return;
      if (!socket) {
        setError("Not connected to the server");
        return;
      }
      setError(null);
      setPhase("joining");
      // Set role up front so a fast game:start broadcast resolves correctly.
      setRole("guest");
      roleRef.current = "guest";
      socket.emit(
        "game:join",
        { code: target, gameId },
        (res: { ok?: boolean; error?: string }) => {
          if (res?.ok) {
            setCode(target);
            codeRef.current = target;
          } else {
            setError(res?.error || "Could not join the room");
            setPhase("idle");
            setRole(null);
            roleRef.current = null;
          }
        }
      );
    },
    [socket, gameId]
  );

  const leaveRoom = useCallback(() => {
    if (socket && codeRef.current) socket.emit("game:leave", { code: codeRef.current });
    codeRef.current = null;
    roleRef.current = null;
    setCode(null);
    setRole(null);
    setOpponentName(null);
    setError(null);
    setPhase("idle");
  }, [socket]);

  const sendMove = useCallback(
    (move: M) => {
      if (socket && codeRef.current) socket.emit("game:move", { code: codeRef.current, move });
    },
    [socket]
  );

  const sendReset = useCallback(() => {
    if (socket && codeRef.current) socket.emit("game:reset", { code: codeRef.current });
  }, [socket]);

  return {
    phase,
    code,
    role,
    opponentName,
    error,
    connected: phase === "connected",
    socketReady: socketConnected,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMove,
    sendReset,
  };
}
