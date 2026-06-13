"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useApp } from "@/components/AppProvider";
import { useScreenShareTransport } from "@/components/screen-share/useScreenShareTransport";
import {
  EMPTY_SCREEN_SHARE_STATE,
  SCREEN_SHARE_TIMESLICE_MS,
  SCREEN_SHARE_VIDEO_BPS,
  pickScreenShareMime,
  type ScreenShareState,
} from "@/lib/screen-share-types";

type JoinStatus = "idle" | "pending" | "approved" | "rejected";

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
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkTimerRef = useRef<number | null>(null);
  const initSentRef = useRef(false);

  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const pendingChunksRef = useRef<ArrayBuffer[]>([]);
  const pendingInitRef = useRef<{ mimeType: string; data: ArrayBuffer } | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const isViewerRef = useRef(false);

  const actionsRef =
    useRef<ReturnType<typeof useScreenShareTransport>["actions"] | null>(null);

  const isHost = state.active && state.host?.id === user.sub;
  const isViewer = state.viewers.some((v) => v.id === user.sub);
  const isPending = state.pendingRequests.some((p) => p.id === user.sub);

  isViewerRef.current = isViewer || joinStatus === "approved";

  // Callback refs guarantee the stream/source attaches whether the <video>
  // mounts before OR after the stream becomes available — this is the fix
  // for the host preview not showing up.
  const attachLocalVideo = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (node && localStreamRef.current && node.srcObject !== localStreamRef.current) {
      node.srcObject = localStreamRef.current;
      void node.play().catch(() => undefined);
    }
  }, []);

  const attachRemoteVideo = useCallback((node: HTMLVideoElement | null) => {
    remoteVideoRef.current = node;
    if (node && objectUrlRef.current && node.src !== objectUrlRef.current) {
      node.src = objectUrlRef.current;
      void node.play().catch(() => undefined);
    } else if (node && pendingInitRef.current && !mediaSourceRef.current) {
      // Init arrived before the <video> mounted — start playback now.
      void tryStartViewerRef.current?.();
    }
  }, []);

  const cleanupHost = useCallback(() => {
    if (chunkTimerRef.current !== null) {
      window.clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
    initSentRef.current = false;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const cleanupViewer = useCallback(() => {
    pendingChunksRef.current = [];
    pendingInitRef.current = null;
    const sb = sourceBufferRef.current;
    sourceBufferRef.current = null;
    const ms = mediaSourceRef.current;
    mediaSourceRef.current = null;
    if (sb && ms && ms.readyState === "open") {
      try {
        ms.removeSourceBuffer(sb);
      } catch {
        /* ignore */
      }
    }
    if (ms && ms.readyState === "open") {
      try {
        ms.endOfStream();
      } catch {
        /* ignore */
      }
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.removeAttribute("src");
      remoteVideoRef.current.load();
    }
    setStreamConnected(false);
  }, []);

  const resetClient = useCallback(() => {
    cleanupHost();
    cleanupViewer();
    setSharing(false);
    setJoinStatus("idle");
  }, [cleanupHost, cleanupViewer]);

  /** Drain queued chunks into the SourceBuffer once it's idle. */
  const flushPending = useCallback(() => {
    const sb = sourceBufferRef.current;
    if (!sb || sb.updating) return;
    const chunk = pendingChunksRef.current.shift();
    if (!chunk) return;
    try {
      sb.appendBuffer(chunk);
    } catch (err) {
      if (
        err instanceof DOMException &&
        err.name === "QuotaExceededError" &&
        sb.buffered.length > 0
      ) {
        // Trim oldest 5 s so the buffer can keep accepting live data.
        const start = sb.buffered.start(0);
        const end = sb.buffered.end(sb.buffered.length - 1);
        try {
          sb.remove(start, Math.max(start, end - 5));
        } catch {
          /* ignore */
        }
        pendingChunksRef.current.unshift(chunk);
        return;
      }
      console.error("[screenshare] appendBuffer failed", err);
      pendingChunksRef.current.unshift(chunk);
    }
  }, []);

  const tryStartViewerRef = useRef<(() => void) | null>(null);

  const tryStartViewer = useCallback(() => {
    if (isAdmin || !isViewerRef.current) return;

    const init = pendingInitRef.current;
    const video = remoteVideoRef.current;
    if (!init || !video || mediaSourceRef.current) return;

    const ms = new MediaSource();
    mediaSourceRef.current = ms;
    const url = URL.createObjectURL(ms);
    objectUrlRef.current = url;
    video.src = url;
    void video.play().catch(() => undefined);

    ms.addEventListener("sourceopen", () => {
      if (sourceBufferRef.current || mediaSourceRef.current !== ms) return;
      try {
        const sb = ms.addSourceBuffer(init.mimeType);
        sb.mode = "sequence";
        sb.addEventListener("updateend", () => {
          flushPending();
          const v = remoteVideoRef.current;
          if (v && v.paused) void v.play().catch(() => undefined);
        });
        sourceBufferRef.current = sb;
        pendingChunksRef.current.push(init.data);
        flushPending();
        setStreamConnected(true);
      } catch (err) {
        setError(
          `Your browser can't play this stream (${init.mimeType}). Try Chrome or Edge.`
        );
        console.error("[screenshare] addSourceBuffer failed", err);
      }
    });
  }, [flushPending, isAdmin]);

  tryStartViewerRef.current = tryStartViewer;

  const { ready, actions } = useScreenShareTransport({
    onState: (next) => setState(next),
    onAccepted: () => setJoinStatus("approved"),
    onRejected: () => setJoinStatus("rejected"),
    onEnded: () => resetClient(),
    onViewerLeft: () => {
      /* host-only signal; no per-peer state because chunks are broadcast through the server. */
    },
    onInit: ({ mimeType, data }) => {
      if (isAdmin) return;
      pendingInitRef.current = { mimeType, data };
      tryStartViewer();
    },
    onChunk: (data) => {
      if (isAdmin) return;
      if (!sourceBufferRef.current && !pendingInitRef.current) return;
      pendingChunksRef.current.push(data);
      flushPending();
    },
  });

  actionsRef.current = actions;

  const endShare = useCallback(() => {
    actions.end();
    resetClient();
  }, [actions, resetClient]);

  const leaveSession = useCallback(() => {
    actions.leave();
    cleanupViewer();
    setJoinStatus("idle");
  }, [actions, cleanupViewer]);

  const startSharing = useCallback(async () => {
    if (!ready || !isAdmin) return;
    setError(null);

    const mimeType = pickScreenShareMime();
    if (!mimeType) {
      setError(
        "Your browser can't record or play WebM. Use Chrome or Edge to host screen sharing."
      );
      return;
    }

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
    // Attach immediately if the preview <video> is already mounted; otherwise
    // attachLocalVideo will pick the stream up when it mounts.
    const v = localVideoRef.current;
    if (v) {
      v.srcObject = stream;
      void v.play().catch(() => undefined);
    }
    stream.getVideoTracks()[0]?.addEventListener("ended", () => endShare());

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: SCREEN_SHARE_VIDEO_BPS,
      });
    } catch (err) {
      setError("Could not start recording the screen.");
      stream.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      console.error("[screenshare] MediaRecorder failed", err);
      return;
    }

    recorderRef.current = recorder;
    initSentRef.current = false;

    recorder.ondataavailable = async (event) => {
      if (!event.data || event.data.size === 0) return;
      const buffer = await event.data.arrayBuffer();
      if (!initSentRef.current) {
        actions.sendInit(mimeType, buffer);
        initSentRef.current = true;
      } else {
        actions.sendChunk(buffer);
      }
    };
    recorder.onerror = () => endShare();

    actions.start();
    setSharing(true);

    // start() without a timeslice + periodic requestData() produces a reliable
    // WebM init segment on the first flush, then media clusters after that.
    recorder.start();
    recorder.requestData();
    chunkTimerRef.current = window.setInterval(() => {
      if (recorder.state === "recording") recorder.requestData();
    }, SCREEN_SHARE_TIMESLICE_MS);
  }, [actions, endShare, isAdmin, ready]);

  // Keep join state in sync with server-broadcast state.
  useEffect(() => {
    if (isPending) {
      setJoinStatus("pending");
    } else if (isViewer && joinStatus !== "approved") {
      setJoinStatus("approved");
    } else if (!isViewer && !isPending && joinStatus !== "idle" && joinStatus !== "rejected") {
      setJoinStatus("idle");
    }
  }, [isPending, isViewer, joinStatus]);

  // When the viewer <video> mounts after init was already received, start playback.
  useEffect(() => {
    if (!isAdmin && (isViewer || joinStatus === "approved")) {
      tryStartViewer();
    }
  }, [isAdmin, isViewer, joinStatus, tryStartViewer]);

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
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch (err) {
      console.error("[screenshare] fullscreen toggle failed", err);
    }
  }, []);

  // Cleanup on unmount — always reads the latest action snapshot.
  useEffect(() => {
    return () => {
      if (sharing && isHost) actionsRef.current?.end();
      else if (isViewer || isPending) actionsRef.current?.leave();
      cleanupHost();
      cleanupViewer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Screen Share</h1>
        <p className="text-slate-500 text-sm">
          Connecting to the screen-share server… If this persists, the deployment must
          run the custom Node server (Socket.IO) — not a serverless platform.
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
