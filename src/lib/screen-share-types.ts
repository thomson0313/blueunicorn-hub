export type ScreenShareParticipant = {
  id: string;
  name: string;
};

export type ScreenShareState = {
  active: boolean;
  host: ScreenShareParticipant | null;
  viewers: ScreenShareParticipant[];
  pendingRequests: ScreenShareParticipant[];
};

export const EMPTY_SCREEN_SHARE_STATE: ScreenShareState = {
  active: false,
  host: null,
  viewers: [],
  pendingRequests: [],
};

/** WebM init segment + its codec — sent on host start and replayed to late joiners. */
export type ScreenShareInit = {
  mimeType: string;
  data: ArrayBuffer;
};

/**
 * Codec strings we prefer, in order. Must be supported by BOTH MediaRecorder
 * (host) and MediaSource (viewers) — a mismatch here causes a black screen.
 */
const MIME_CANDIDATES = [
  "video/webm;codecs=vp8",
  'video/webm;codecs="vp8"',
  "video/webm;codecs=vp9",
  'video/webm;codecs="vp9"',
  "video/webm",
];

/** Pick a mime type the host can record AND viewers can play via MediaSource. */
export function pickScreenShareMime(): string | null {
  if (typeof MediaRecorder === "undefined" || typeof MediaSource === "undefined") {
    return null;
  }
  return (
    MIME_CANDIDATES.find(
      (m) => MediaRecorder.isTypeSupported(m) && MediaSource.isTypeSupported(m)
    ) ?? null
  );
}

/** Normalize Socket.IO binary payloads to a standalone ArrayBuffer. */
export function toArrayBuffer(data: unknown): ArrayBuffer | null {
  if (!data) return null;
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    return view.buffer.slice(
      view.byteOffset,
      view.byteOffset + view.byteLength
    ) as ArrayBuffer;
  }
  return null;
}

/** How often the host requests the next MediaRecorder chunk. Smaller = lower latency. */
export const SCREEN_SHARE_TIMESLICE_MS = 200;

/** Target host upload bitrate. ~2.5 Mbps is enough for crisp 1080p slides/code. */
export const SCREEN_SHARE_VIDEO_BPS = 2_500_000;

/** Capture framerate. 15 fps is fine for slides/code and halves bandwidth + cluster size. */
export const SCREEN_SHARE_FRAME_RATE = 15;

/**
 * Viewer "live sync" thresholds — gap (seconds) between playhead and the live
 * edge of the SourceBuffer. The viewer speeds up or seeks to stay near live.
 */
export const SCREEN_SHARE_LIVE_SYNC = {
  /** Above this gap, jump straight to the live edge. */
  jumpThreshold: 3,
  /** Above this gap, play 1.1× to catch up smoothly. */
  catchUpThreshold: 1.2,
  /** Land this far behind the live edge after a jump (avoid stalls). */
  targetOffset: 0.4,
  /** How often to check the gap. */
  checkIntervalMs: 750,
} as const;
