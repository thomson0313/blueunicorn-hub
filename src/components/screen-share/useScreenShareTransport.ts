"use client";

import { useEffect, useMemo, useRef } from "react";
import { useApp } from "@/components/AppProvider";
import type { ScreenShareState } from "@/lib/screen-share-types";

export type ScreenShareHandlers = {
  onState: (state: ScreenShareState) => void;
  onAccepted: () => void;
  onRejected: () => void;
  onEnded: () => void;
  onViewerLeft: (payload: { userId: string }) => void;
  onOffer: (payload: { from: string; sdp: RTCSessionDescriptionInit }) => void;
  onAnswer: (payload: { from: string; sdp: RTCSessionDescriptionInit }) => void;
  onIce: (payload: { from: string; candidate: RTCIceCandidateInit }) => void;
};

/**
 * Socket.IO transport for WebRTC-based screen sharing. The server is only used
 * for *signaling*: viewer/host presence, accept/reject, and SDP/ICE relay.
 * Actual media flows peer-to-peer (or via TURN), never through the server.
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

    const onOffer = (payload: { from: string; sdp: RTCSessionDescriptionInit }) =>
      h().onOffer(payload);
    const onAnswer = (payload: { from: string; sdp: RTCSessionDescriptionInit }) =>
      h().onAnswer(payload);
    const onIce = (payload: { from: string; candidate: RTCIceCandidateInit }) =>
      h().onIce(payload);

    socket.on("screenshare:state", onState);
    socket.on("screenshare:accepted", onAccepted);
    socket.on("screenshare:rejected", onRejected);
    socket.on("screenshare:ended", onEnded);
    socket.on("screenshare:viewer-left", onViewerLeft);
    socket.on("screenshare:offer", onOffer);
    socket.on("screenshare:answer", onAnswer);
    socket.on("screenshare:ice-candidate", onIce);

    return () => {
      socket.off("screenshare:state", onState);
      socket.off("screenshare:accepted", onAccepted);
      socket.off("screenshare:rejected", onRejected);
      socket.off("screenshare:ended", onEnded);
      socket.off("screenshare:viewer-left", onViewerLeft);
      socket.off("screenshare:offer", onOffer);
      socket.off("screenshare:answer", onAnswer);
      socket.off("screenshare:ice-candidate", onIce);
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
      sendOffer: (to: string, sdp: RTCSessionDescriptionInit) =>
        socket?.emit("screenshare:offer", { to, sdp }),
      sendAnswer: (to: string, sdp: RTCSessionDescriptionInit) =>
        socket?.emit("screenshare:answer", { to, sdp }),
      sendIce: (to: string, candidate: RTCIceCandidateInit) =>
        socket?.emit("screenshare:ice-candidate", { to, candidate }),
    }),
    [socket]
  );

  return { ready: !!socket, actions };
}
