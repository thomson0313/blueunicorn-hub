"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useApp } from "@/components/AppProvider";
import { useScreenShareTransport } from "@/components/screen-share/useScreenShareTransport";
import {
  EMPTY_SCREEN_SHARE_STATE,
  getIceServers,
  type ScreenShareState,
} from "@/lib/screen-share-types";

type JoinStatus = "idle" | "pending" | "approved" | "rejected";

type HostPeer = {
  pc: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
};

export function ScreenSharePanel() {
  const { user } = useApp();
  const isAdmin = user.role === "admin";

  const [state, setState] = useState<ScreenShareState>(EMPTY_SCREEN_SHARE_STATE);
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [sharing, setSharing] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const hostPeersRef = useRef<Map<string, HostPeer>>(new Map());
  const viewerPeerRef = useRef<RTCPeerConnection | null>(null);
  const viewerPendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const hostIdRef = useRef<string | null>(null);

  const actionsRef =
    useRef<ReturnType<typeof useScreenShareTransport>["actions"] | null>(null);

  const isHost = state.active && state.host?.id === user.sub;
  const isViewer = state.viewers.some((v) => v.id === user.sub);
  const isPending = state.pendingRequests.some((p) => p.id === user.sub);

  useEffect(() => {
    hostIdRef.current = state.host?.id ?? null;
  }, [state.host?.id]);

  /** Attach the host's own preview the moment either the stream OR the video element exists. */
  const attachLocalVideo = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (node && localStreamRef.current && node.srcObject !== localStreamRef.current) {
      node.srcObject = localStreamRef.current;
      void node.play().catch(() => undefined);
    }
  }, []);

  /** Same for the viewer: attach the incoming remote stream whenever both pieces are ready. */
  const attachRemoteVideo = useCallback((node: HTMLVideoElement | null) => {
    remoteVideoRef.current = node;
    if (node && remoteStreamRef.current && node.srcObject !== remoteStreamRef.current) {
      node.srcObject = remoteStreamRef.current;
      void node.play().catch(() => undefined);
    }
  }, []);

  // ─────────────────────────── Host: per-viewer peer ──────────────────────────

  const closeHostPeer = useCallback((viewerId: string) => {
    const peer = hostPeersRef.current.get(viewerId);
    if (!peer) return;
    try {
      peer.pc.close();
    } catch {
      /* ignore */
    }
    hostPeersRef.current.delete(viewerId);
  }, []);

  const closeAllHostPeers = useCallback(() => {
    for (const id of [...hostPeersRef.current.keys()]) closeHostPeer(id);
  }, [closeHostPeer]);

  const createHostPeerForViewer = useCallback(
    async (viewerId: string) => {
      const actions = actionsRef.current;
      const stream = localStreamRef.current;
      if (!actions || !stream) return;
      if (hostPeersRef.current.has(viewerId)) return;

      const pc = new RTCPeerConnection(getIceServers());
      const peer: HostPeer = { pc, pendingIce: [] };
      hostPeersRef.current.set(viewerId, peer);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) actions.sendIce(viewerId, event.candidate.toJSON());
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed" ||
          pc.connectionState === "disconnected"
        ) {
          // Don't auto-close on "disconnected" — it often recovers; only on
          // "failed"/"closed" do we drop the peer.
          if (pc.connectionState !== "disconnected") closeHostPeer(viewerId);
        }
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (pc.localDescription) {
          actions.sendOffer(viewerId, pc.localDescription.toJSON());
        }
      } catch (err) {
        console.error("[screenshare] host createOffer failed", err);
        closeHostPeer(viewerId);
      }
    },
    [closeHostPeer]
  );

  // ─────────────────────────── Viewer: single peer ────────────────────────────

  const closeViewerPeer = useCallback(() => {
    if (viewerPeerRef.current) {
      try {
        viewerPeerRef.current.close();
      } catch {
        /* ignore */
      }
      viewerPeerRef.current = null;
    }
    viewerPendingIceRef.current = [];
    remoteStreamRef.current = null;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setStreamConnected(false);
  }, []);

  const ensureViewerPeer = useCallback(() => {
    if (viewerPeerRef.current) return viewerPeerRef.current;

    const pc = new RTCPeerConnection(getIceServers());
    viewerPeerRef.current = pc;

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      remoteStreamRef.current = stream;
      const v = remoteVideoRef.current;
      if (v && v.srcObject !== stream) {
        v.srcObject = stream;
        void v.play().catch(() => undefined);
      }
      setStreamConnected(true);
    };

    pc.onicecandidate = (event) => {
      const actions = actionsRef.current;
      const hostId = hostIdRef.current;
      if (event.candidate && hostId && actions) {
        actions.sendIce(hostId, event.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        closeViewerPeer();
      }
    };

    return pc;
  }, [closeViewerPeer]);

  // ─────────────────────────── Common cleanup ─────────────────────────────────

  const cleanupHostMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const resetClient = useCallback(() => {
    closeAllHostPeers();
    closeViewerPeer();
    cleanupHostMedia();
    setSharing(false);
    setJoinStatus("idle");
  }, [cleanupHostMedia, closeAllHostPeers, closeViewerPeer]);

  // ─────────────────────────── Transport handlers ─────────────────────────────

  const { ready, actions } = useScreenShareTransport({
    onState: (next) => setState(next),
    onAccepted: () => setJoinStatus("approved"),
    onRejected: () => setJoinStatus("rejected"),
    onEnded: () => resetClient(),
    onViewerLeft: ({ userId }) => {
      // Host received notice a specific viewer dropped — close their peer.
      closeHostPeer(userId);
    },
    onOffer: async ({ from, sdp }) => {
      if (isAdmin) return;
      const pc = ensureViewerPeer();
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        // Drain any ICE that arrived before the offer.
        for (const c of viewerPendingIceRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch {
            /* ignore stale */
          }
        }
        viewerPendingIceRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (pc.localDescription && actionsRef.current) {
          actionsRef.current.sendAnswer(from, pc.localDescription.toJSON());
        }
      } catch (err) {
        console.error("[screenshare] viewer answer failed", err);
      }
    },
    onAnswer: async ({ from, sdp }) => {
      const peer = hostPeersRef.current.get(from);
      if (!peer) return;
      try {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp));
        for (const c of peer.pendingIce) {
          try {
            await peer.pc.addIceCandidate(new RTCIceCandidate(c));
          } catch {
            /* ignore stale */
          }
        }
        peer.pendingIce = [];
      } catch (err) {
        console.error("[screenshare] host setRemoteDescription failed", err);
      }
    },
    onIce: async ({ from, candidate }) => {
      if (isAdmin) {
        const peer = hostPeersRef.current.get(from);
        if (!peer) return;
        if (!peer.pc.remoteDescription) {
          peer.pendingIce.push(candidate);
          return;
        }
        try {
          await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          /* ignore stale */
        }
      } else {
        const pc = viewerPeerRef.current;
        if (!pc || !pc.remoteDescription) {
          viewerPendingIceRef.current.push(candidate);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          /* ignore stale */
        }
      }
    },
  });

  actionsRef.current = actions;

  // ─────────────────────────── Host: react to viewer list changes ─────────────

  useEffect(() => {
    if (!isHost || !sharing || !localStreamRef.current) return;
    // Add a peer for each newly accepted viewer.
    for (const viewer of state.viewers) {
      if (!hostPeersRef.current.has(viewer.id)) {
        void createHostPeerForViewer(viewer.id);
      }
    }
    // Close peers for viewers that left.
    for (const id of [...hostPeersRef.current.keys()]) {
      if (!state.viewers.some((v) => v.id === id)) closeHostPeer(id);
    }
  }, [closeHostPeer, createHostPeerForViewer, isHost, sharing, state.viewers]);

  // Keep join status synced to server-broadcast state.
  useEffect(() => {
    if (isPending) {
      setJoinStatus("pending");
    } else if (isViewer && joinStatus !== "approved") {
      setJoinStatus("approved");
    } else if (
      !isViewer &&
      !isPending &&
      joinStatus !== "idle" &&
      joinStatus !== "rejected"
    ) {
      setJoinStatus("idle");
    }
  }, [isPending, isViewer, joinStatus]);

  // ─────────────────────────── Actions ────────────────────────────────────────

  const endShare = useCallback(() => {
    actions.end();
    resetClient();
  }, [actions, resetClient]);

  const leaveSession = useCallback(() => {
    actions.leave();
    closeViewerPeer();
    setJoinStatus("idle");
  }, [actions, closeViewerPeer]);

  const startSharing = useCallback(async () => {
    if (!ready || !isAdmin) return;
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
    } catch {
      setError("Could not start screen sharing. Please allow screen capture.");
      return;
    }

    localStreamRef.current = stream;
    const v = localVideoRef.current;
    if (v) {
      v.srcObject = stream;
      void v.play().catch(() => undefined);
    }
    stream.getVideoTracks()[0]?.addEventListener("ended", () => endShare());

    actions.start();
    setSharing(true);
  }, [actions, endShare, isAdmin, ready]);

  // ─────────────────────────── Fullscreen ─────────────────────────────────────

  useEffect(() => {
    const onFsChange = () =>
      setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch (err) {
      console.error("[screenshare] fullscreen toggle failed", err);
    }
  }, []);

  // ─────────────────────────── Unmount cleanup ────────────────────────────────

  useEffect(() => {
    return () => {
      if (sharing && isHost) actionsRef.current?.end();
      else if (isViewer || isPending) actionsRef.current?.leave();
      closeAllHostPeers();
      closeViewerPeer();
      cleanupHostMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────── Render ─────────────────────────────────────────

  if (!ready) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Screen Share</h1>
        <p className="text-slate-500 text-sm">
          Connecting to the screen-share server…
        </p>
      </div>
    );
  }

  const showHostStage = isHost || sharing;
  const showViewerStage = !isHost && (isViewer || joinStatus === "approved");
  const showAnyStage = showHostStage || showViewerStage;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Screen Share</h1>
          <p className="text-slate-500 text-sm">
            {isAdmin
              ? "Host a live screen share for members."
              : "Join the admin's live screen share."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {showAnyStage && (
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
            >
              {fullscreen ? "Exit full screen" : "Full screen"}
            </button>
          )}
          {(isHost || sharing) && (
            <button
              type="button"
              onClick={endShare}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition cursor-pointer"
            >
              End session
            </button>
          )}
          {!isAdmin && (isViewer || isPending) && (
            <button
              type="button"
              onClick={leaveSession}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition cursor-pointer"
            >
              Leave session
            </button>
          )}
        </div>
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
            <div
              ref={stageRef}
              className={
                fullscreen
                  ? "fixed inset-0 z-50 bg-black flex items-center justify-center"
                  : "relative aspect-video bg-slate-900 rounded-lg overflow-hidden"
              }
            >
              {showHostStage ? (
                <video
                  ref={attachLocalVideo}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : showViewerStage ? (
                <video
                  ref={attachRemoteVideo}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : state.active && state.host ? (
                <JoinCallToAction
                  hostName={state.host.name}
                  joinStatus={joinStatus}
                  onJoin={() => {
                    setJoinStatus("pending");
                    actions.requestJoin();
                  }}
                />
              ) : isAdmin ? (
                <StartCallToAction onStart={() => void startSharing()} />
              ) : (
                <p className="text-slate-300 text-sm text-center px-6 m-auto">
                  No screen share session is active right now.
                </p>
              )}

              {showHostStage && !sharing && (
                <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm pointer-events-none">
                  Starting…
                </div>
              )}
              {showViewerStage && !streamConnected && (
                <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm pointer-events-none">
                  Waiting for the host's stream…
                </div>
              )}

              {fullscreen && (
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleFullscreen()}
                    className="px-3 py-1.5 rounded-lg bg-white/15 text-white text-xs font-medium hover:bg-white/25 transition cursor-pointer"
                  >
                    Exit full screen
                  </button>
                  {(isHost || sharing) && (
                    <button
                      type="button"
                      onClick={endShare}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition cursor-pointer"
                    >
                      End session
                    </button>
                  )}
                  {!isAdmin && (isViewer || isPending) && (
                    <button
                      type="button"
                      onClick={leaveSession}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition cursor-pointer"
                    >
                      Leave
                    </button>
                  )}
                </div>
              )}
            </div>
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
                          onClick={() => actions.accept(p.id)}
                          className="px-2.5 py-1 rounded-md bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => actions.reject(p.id)}
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

function StartCallToAction({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 text-center m-auto">
      <p className="text-slate-300 text-sm max-w-xs">
        Start sharing your screen. Members can request to join and you'll see their
        request live.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="px-5 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition cursor-pointer"
      >
        Start screen share
      </button>
    </div>
  );
}

function JoinCallToAction({
  hostName,
  joinStatus,
  onJoin,
}: {
  hostName: string;
  joinStatus: JoinStatus;
  onJoin: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 text-center m-auto">
      <Avatar name={hostName} size={56} />
      <div>
        <p className="font-medium text-white">{hostName} is sharing</p>
        <p className="text-sm text-slate-300 mt-1">Request access to view the screen</p>
      </div>
      {joinStatus === "idle" && (
        <button
          type="button"
          onClick={onJoin}
          className="px-5 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition cursor-pointer"
        >
          Join
        </button>
      )}
      {joinStatus === "pending" && (
        <p className="text-sm text-amber-300 font-medium">Waiting for admin approval…</p>
      )}
      {joinStatus === "rejected" && (
        <div className="space-y-2">
          <p className="text-sm text-red-300">Your request was declined.</p>
          <button
            type="button"
            onClick={onJoin}
            className="px-4 py-2 rounded-lg border border-white/40 text-white text-sm font-medium hover:bg-white/10 transition cursor-pointer"
          >
            Request again
          </button>
        </div>
      )}
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
    <div
      className={`flex items-center gap-2 ${
        compact ? "" : "rounded-lg bg-slate-50 px-3 py-2"
      }`}
    >
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
