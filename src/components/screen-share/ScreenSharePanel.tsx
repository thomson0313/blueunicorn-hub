"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useApp, useRealtimeMode } from "@/components/AppProvider";
import {
  EMPTY_SCREEN_SHARE_STATE,
  ICE_SERVERS,
  type ScreenShareState,
} from "@/lib/screen-share-types";

type JoinStatus = "idle" | "pending" | "approved" | "rejected";

export function ScreenSharePanel() {
  const { user, socket } = useApp();
  const realtimeMode = useRealtimeMode();
  const isAdmin = user.role === "admin";

  const [state, setState] = useState<ScreenShareState>(EMPTY_SCREEN_SHARE_STATE);
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [sharing, setSharing] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const hostPeerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const viewerPeerConnection = useRef<RTCPeerConnection | null>(null);
  const hostIdRef = useRef<string | null>(null);

  useEffect(() => {
    hostIdRef.current = state.host?.id ?? null;
  }, [state.host?.id]);

  const isHost = state.active && state.host?.id === user.sub;
  const isViewer = state.viewers.some((v) => v.id === user.sub);
  const isPending = state.pendingRequests.some((p) => p.id === user.sub);

  const cleanupLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const cleanupHostPeers = useCallback(() => {
    hostPeerConnections.current.forEach((pc) => pc.close());
    hostPeerConnections.current.clear();
  }, []);

  const cleanupViewerPeer = useCallback(() => {
    viewerPeerConnection.current?.close();
    viewerPeerConnection.current = null;
    setStreamConnected(false);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const resetClient = useCallback(() => {
    cleanupLocalStream();
    cleanupHostPeers();
    cleanupViewerPeer();
    setSharing(false);
    setJoinStatus("idle");
    setError(null);
  }, [cleanupHostPeers, cleanupLocalStream, cleanupViewerPeer]);

  const endShare = useCallback(() => {
    socket?.emit("screenshare:end");
    resetClient();
  }, [resetClient, socket]);

  const createHostPeerForViewer = useCallback(
    async (viewerId: string) => {
      if (!socket || !localStreamRef.current || hostPeerConnections.current.has(viewerId)) return;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      hostPeerConnections.current.set(viewerId, pc);

      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("screenshare:ice-candidate", { to: viewerId, candidate: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          pc.close();
          hostPeerConnections.current.delete(viewerId);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("screenshare:offer", { to: viewerId, sdp: offer });
    },
    [socket]
  );

  const setupViewerPeer = useCallback(async () => {
    if (!socket || viewerPeerConnection.current) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    viewerPeerConnection.current = pc;

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        setStreamConnected(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && hostIdRef.current) {
        socket.emit("screenshare:ice-candidate", {
          to: hostIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        cleanupViewerPeer();
      }
    };
  }, [cleanupViewerPeer, socket]);

  const startSharing = useCallback(async () => {
    if (!socket || !isAdmin) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", () => endShare());
      socket.emit("screenshare:start");
      setSharing(true);
    } catch {
      setError("Could not start screen sharing. Please allow screen capture.");
    }
  }, [endShare, isAdmin, socket]);

  useEffect(() => {
    if (!socket) return;

    const onState = (next: ScreenShareState) => {
      setState(next);
      if (!next.active) resetClient();
      else if (
        !next.viewers.some((v) => v.id === user.sub) &&
        !next.pendingRequests.some((p) => p.id === user.sub)
      ) {
        setJoinStatus("idle");
      }
    };

    const onAccepted = () => {
      setJoinStatus("approved");
      void setupViewerPeer();
    };

    const onRejected = () => setJoinStatus("rejected");

    const onEnded = () => resetClient();

    const onOffer = async (payload: { from: string; sdp: RTCSessionDescriptionInit }) => {
      if (isAdmin) return;
      await setupViewerPeer();
      const pc = viewerPeerConnection.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("screenshare:answer", { to: payload.from, sdp: answer });
    };

    const onAnswer = async (payload: { from: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = hostPeerConnections.current.get(payload.from);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    };

    const onIce = async (payload: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = isAdmin
        ? hostPeerConnections.current.get(payload.from)
        : viewerPeerConnection.current;
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {
        /* ignore stale candidates */
      }
    };

    const onViewerLeft = (payload: { userId: string }) => {
      const pc = hostPeerConnections.current.get(payload.userId);
      pc?.close();
      hostPeerConnections.current.delete(payload.userId);
    };

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
  }, [isAdmin, resetClient, setupViewerPeer, socket, user.sub]);

  useEffect(() => {
    if (!isHost || !sharing || !localStreamRef.current) return;
    for (const viewer of state.viewers) {
      if (!hostPeerConnections.current.has(viewer.id)) {
        void createHostPeerForViewer(viewer.id);
      }
    }
    for (const id of [...hostPeerConnections.current.keys()]) {
      if (!state.viewers.some((v) => v.id === id)) {
        hostPeerConnections.current.get(id)?.close();
        hostPeerConnections.current.delete(id);
      }
    }
  }, [createHostPeerForViewer, isHost, sharing, state.viewers]);

  useEffect(() => {
    if (isPending) setJoinStatus("pending");
    if (isViewer && joinStatus !== "approved") {
      setJoinStatus("approved");
      void setupViewerPeer();
    }
  }, [isPending, isViewer, joinStatus, setupViewerPeer]);

  useEffect(() => {
    return () => {
      if (sharing && isHost) socket?.emit("screenshare:end");
      else if (isViewer || isPending) socket?.emit("screenshare:leave");
      cleanupLocalStream();
      cleanupHostPeers();
      cleanupViewerPeer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (realtimeMode !== "socket" || !socket) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Screen Share</h1>
        <p className="text-slate-500">
          Screen sharing requires a live connection. Run the app with{" "}
          <code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded">npm run dev</code> (custom
          server with Socket.IO).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Screen Share</h1>
          <p className="text-slate-500 text-sm">
            {isAdmin
              ? "Host a screen share session for members."
              : "Join the admin's live screen share."}
          </p>
        </div>
        {(isHost || sharing) && (
          <button
            type="button"
            onClick={endShare}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition cursor-pointer"
          >
            End session
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Screen</h2>
          </div>
          <div className="p-4">
            {isHost || sharing ? (
              <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
                {!sharing && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
                    Starting…
                  </div>
                )}
              </div>
            ) : isViewer || joinStatus === "approved" ? (
              <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                {!streamConnected && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
                    Connecting to stream…
                  </div>
                )}
              </div>
            ) : state.active && state.host ? (
              <div className="aspect-video bg-slate-50 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 p-6">
                <Avatar name={state.host.name} size={56} />
                <div className="text-center">
                  <p className="font-medium text-slate-900">{state.host.name} is sharing</p>
                  <p className="text-sm text-slate-500 mt-1">Request access to view the screen</p>
                </div>
                {joinStatus === "idle" && (
                  <button
                    type="button"
                    onClick={() => {
                      setJoinStatus("pending");
                      socket.emit("screenshare:request-join");
                    }}
                    className="px-5 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition cursor-pointer"
                  >
                    Join
                  </button>
                )}
                {joinStatus === "pending" && (
                  <p className="text-sm text-amber-600 font-medium">Waiting for admin approval…</p>
                )}
                {joinStatus === "rejected" && (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-red-600">Your request was declined.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setJoinStatus("pending");
                        socket.emit("screenshare:request-join");
                      }}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
                    >
                      Request again
                    </button>
                  </div>
                )}
              </div>
            ) : isAdmin ? (
              <div className="aspect-video bg-slate-50 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 p-6">
                <p className="text-slate-600 text-sm text-center">
                  No active session. Start sharing your screen with members.
                </p>
                <button
                  type="button"
                  onClick={() => void startSharing()}
                  className="px-5 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition cursor-pointer"
                >
                  Start screen share
                </button>
              </div>
            ) : (
              <div className="aspect-video bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center p-6">
                <p className="text-slate-500 text-sm text-center">
                  No screen share session is active. Check back when an admin starts sharing.
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-[280px]">
          <div className="px-5 py-3 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Participants</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {state.host && (
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Host</p>
                <ParticipantRow name={state.host.name} badge="Admin" />
              </div>
            )}

            {isHost && state.pendingRequests.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                  Join requests
                </p>
                <ul className="space-y-2">
                  {state.pendingRequests.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2"
                    >
                      <ParticipantRow name={p.name} compact />
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => socket.emit("screenshare:accept", { userId: p.id })}
                          className="px-2.5 py-1 rounded-md bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => socket.emit("screenshare:reject", { userId: p.id })}
                          className="px-2.5 py-1 rounded-md border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-50 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                Joined ({state.viewers.length})
              </p>
              {state.viewers.length === 0 ? (
                <p className="text-sm text-slate-400">No members joined yet.</p>
              ) : (
                <ul className="space-y-2">
                  {state.viewers.map((v) => (
                    <li key={v.id}>
                      <ParticipantRow name={v.name} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ParticipantRow({
  name,
  badge,
  compact,
}: {
  name: string;
  badge?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "rounded-lg bg-slate-50 px-3 py-2"}`}>
      <Avatar name={name} size={compact ? 28 : 32} />
      <span className="text-sm font-medium text-slate-800 truncate">{name}</span>
      {badge && (
        <span className="ml-auto text-[10px] uppercase tracking-wide font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
          {badge}
        </span>
      )}
    </div>
  );
}
