"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useApp, useRealtimeMode } from "@/components/AppProvider";
import type { ScreenShareState } from "@/lib/screen-share-types";

export type ScreenShareHandlers = {
  onState: (state: ScreenShareState) => void;
  onAccepted: () => void;
  onRejected: () => void;
  onEnded: () => void;
  onOffer: (payload: { from: string; sdp: RTCSessionDescriptionInit }) => void;
  onAnswer: (payload: { from: string; sdp: RTCSessionDescriptionInit }) => void;
  onIce: (payload: { from: string; candidate: RTCIceCandidateInit }) => void;
  onViewerLeft: (payload: { userId: string }) => void;
};

type PolledSignal = {
  id: string;
  type: string;
  fromUserId: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

function dispatchPolledSignal(signal: PolledSignal, handlers: ScreenShareHandlers) {
  switch (signal.type) {
    case "accepted":
      handlers.onAccepted();
      break;
    case "rejected":
      handlers.onRejected();
      break;
    case "ended":
      handlers.onEnded();
      break;
    case "viewer-left":
      handlers.onViewerLeft({
        userId: (signal.payload.userId as string) || signal.fromUserId,
      });
      break;
    case "offer":
      handlers.onOffer({
        from: signal.fromUserId,
        sdp: signal.payload.sdp as RTCSessionDescriptionInit,
      });
      break;
    case "answer":
      handlers.onAnswer({
        from: signal.fromUserId,
        sdp: signal.payload.sdp as RTCSessionDescriptionInit,
      });
      break;
    case "ice-candidate":
      handlers.onIce({
        from: signal.fromUserId,
        candidate: signal.payload.candidate as RTCIceCandidateInit,
      });
      break;
  }
}

async function postAction(action: string, extra?: Record<string, string>) {
  const res = await fetch("/api/screen-share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data.state as ScreenShareState;
}

async function postSignal(body: Record<string, unknown>) {
  await fetch("/api/screen-share/signals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const STATE_POLL_MS = 3_000;
const SIGNAL_POLL_MS = 1_500;

export function useScreenShareTransport(handlers: ScreenShareHandlers) {
  const { socket } = useApp();
  const realtimeMode = useRealtimeMode();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const lastSignalAtRef = useRef(new Date(0).toISOString());

  useEffect(() => {
    if (realtimeMode !== "socket" || !socket) return;

    const h = () => handlersRef.current;

    const onState = (state: ScreenShareState) => h().onState(state);
    const onAccepted = () => h().onAccepted();
    const onRejected = () => h().onRejected();
    const onEnded = () => h().onEnded();
    const onOffer = (payload: { from: string; sdp: RTCSessionDescriptionInit }) => h().onOffer(payload);
    const onAnswer = (payload: { from: string; sdp: RTCSessionDescriptionInit }) =>
      h().onAnswer(payload);
    const onIce = (payload: { from: string; candidate: RTCIceCandidateInit }) => h().onIce(payload);
    const onViewerLeft = (payload: { userId: string }) => h().onViewerLeft(payload);

    socket.on("screenshare:state", onState);
    socket.on("screenshare:accepted", onAccepted);
    socket.on("screenshare:rejected", onRejected);
    socket.on("screenshare:ended", onEnded);
    socket.on("screenshare:offer", onOffer);
    socket.on("screenshare:answer", onAnswer);
    socket.on("screenshare:ice-candidate", onIce);
    socket.on("screenshare:viewer-left", onViewerLeft);

    return () => {
      socket.off("screenshare:state", onState);
      socket.off("screenshare:accepted", onAccepted);
      socket.off("screenshare:rejected", onRejected);
      socket.off("screenshare:ended", onEnded);
      socket.off("screenshare:offer", onOffer);
      socket.off("screenshare:answer", onAnswer);
      socket.off("screenshare:ice-candidate", onIce);
      socket.off("screenshare:viewer-left", onViewerLeft);
    };
  }, [realtimeMode, socket]);

  useEffect(() => {
    if (realtimeMode !== "polling") return;

    let cancelled = false;

    const pollState = async () => {
      try {
        const res = await fetch("/api/screen-share");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        handlersRef.current.onState(data.state);
      } catch {
        /* ignore */
      }
    };

    const pollSignals = async () => {
      try {
        const since = lastSignalAtRef.current;
        const res = await fetch(
          `/api/screen-share/signals?since=${encodeURIComponent(since)}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const signals = (data.signals || []) as PolledSignal[];
        for (const signal of signals) {
          lastSignalAtRef.current = signal.createdAt;
          dispatchPolledSignal(signal, handlersRef.current);
        }
      } catch {
        /* ignore */
      }
    };

    void pollState();
    void pollSignals();

    const stateTimer = window.setInterval(pollState, STATE_POLL_MS);
    const signalTimer = window.setInterval(pollSignals, SIGNAL_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(stateTimer);
      window.clearInterval(signalTimer);
    };
  }, [realtimeMode]);

  const actions = useMemo(
    () => ({
      start: async () => {
        if (realtimeMode === "socket" && socket) {
          socket.emit("screenshare:start");
          return;
        }
        const state = await postAction("start");
        handlersRef.current.onState(state);
      },
      end: async () => {
        if (realtimeMode === "socket" && socket) {
          socket.emit("screenshare:end");
          return;
        }
        const state = await postAction("end");
        handlersRef.current.onState(state);
      },
      requestJoin: async () => {
        if (realtimeMode === "socket" && socket) {
          socket.emit("screenshare:request-join");
          return;
        }
        const state = await postAction("request-join");
        handlersRef.current.onState(state);
      },
      accept: async (userId: string) => {
        if (realtimeMode === "socket" && socket) {
          socket.emit("screenshare:accept", { userId });
          return;
        }
        const state = await postAction("accept", { userId });
        handlersRef.current.onState(state);
      },
      reject: async (userId: string) => {
        if (realtimeMode === "socket" && socket) {
          socket.emit("screenshare:reject", { userId });
          return;
        }
        const state = await postAction("reject", { userId });
        handlersRef.current.onState(state);
      },
      leave: async () => {
        if (realtimeMode === "socket" && socket) {
          socket.emit("screenshare:leave");
          return;
        }
        const state = await postAction("leave");
        handlersRef.current.onState(state);
      },
      sendOffer: async (to: string, sdp: RTCSessionDescriptionInit) => {
        if (realtimeMode === "socket" && socket) {
          socket.emit("screenshare:offer", { to, sdp });
          return;
        }
        await postSignal({ type: "offer", to, sdp });
      },
      sendAnswer: async (to: string, sdp: RTCSessionDescriptionInit) => {
        if (realtimeMode === "socket" && socket) {
          socket.emit("screenshare:answer", { to, sdp });
          return;
        }
        await postSignal({ type: "answer", to, sdp });
      },
      sendIce: async (to: string, candidate: RTCIceCandidateInit) => {
        if (realtimeMode === "socket" && socket) {
          socket.emit("screenshare:ice-candidate", { to, candidate });
          return;
        }
        await postSignal({ type: "ice-candidate", to, candidate });
      },
    }),
    [realtimeMode, socket]
  );

  const ready = realtimeMode === "polling" || !!socket;

  return { ready, actions, realtimeMode };
}
