"use client";

import { useEffect, useMemo, useRef } from "react";
import { useApp } from "@/components/AppProvider";
import type { ScreenShareInit, ScreenShareState } from "@/lib/screen-share-types";

export type ScreenShareHandlers = {
  onState: (state: ScreenShareState) => void;
  onAccepted: () => void;
  onRejected: () => void;
  onEnded: () => void;
  onViewerLeft: (payload: { userId: string }) => void;
  onInit: (payload: ScreenShareInit) => void;
  onChunk: (data: ArrayBuffer) => void;
};

/**
 * Socket.IO transport for the meeting-style screen share: the host streams
 * MediaRecorder chunks through `screenshare:init` / `screenshare:chunk`, and
 * the server fans them out to every accepted viewer in real time.
 */
export function useScreenShareTransport(handlers: ScreenShareHandlers) {
  const { socket } = useApp();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!socket) return;
    const h = () => handlersRef.current;

    const onState = (state: ScreenShareState) => h().onState(state);
    const onAccepted = () => h().onAccepted();
    const onRejected = () => h().onRejected();
    const onEnded = () => h().onEnded();
    const onViewerLeft = (payload: { userId: string }) => h().onViewerLeft(payload);
    const onInit = (payload: { mimeType: string; data: ArrayBuffer }) => h().onInit(payload);
    const onChunk = (data: ArrayBuffer) => h().onChunk(data);

    socket.on("screenshare:state", onState);
    socket.on("screenshare:accepted", onAccepted);
    socket.on("screenshare:rejected", onRejected);
    socket.on("screenshare:ended", onEnded);
    socket.on("screenshare:viewer-left", onViewerLeft);
    socket.on("screenshare:init", onInit);
    socket.on("screenshare:chunk", onChunk);

    return () => {
      socket.off("screenshare:state", onState);
      socket.off("screenshare:accepted", onAccepted);
      socket.off("screenshare:rejected", onRejected);
      socket.off("screenshare:ended", onEnded);
      socket.off("screenshare:viewer-left", onViewerLeft);
      socket.off("screenshare:init", onInit);
      socket.off("screenshare:chunk", onChunk);
    };
  }, [socket]);

  const actions = useMemo(
    () => ({
      start: () => socket?.emit("screenshare:start"),
      end: () => socket?.emit("screenshare:end"),
      requestJoin: () => socket?.emit("screenshare:request-join"),
      accept: (userId: string) => socket?.emit("screenshare:accept", { userId }),
      reject: (userId: string) => socket?.emit("screenshare:reject", { userId }),
      leave: () => socket?.emit("screenshare:leave"),
      sendInit: (mimeType: string, data: ArrayBuffer) =>
        socket?.emit("screenshare:init", { mimeType, data }),
      sendChunk: (data: ArrayBuffer) => socket?.emit("screenshare:chunk", data),
    }),
    [socket]
  );

  return { ready: !!socket, actions };
}
