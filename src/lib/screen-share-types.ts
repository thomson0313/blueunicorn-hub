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
 * MediaRecorder mime types we prefer, in order. VP9 gives the best
 * quality-per-byte for screen content; VP8 is the broadest fallback.
 */
const MIME_CANDIDATES = [
  'video/webm;codecs="vp9,opus"',
  "video/webm;codecs=vp9",
  'video/webm;codecs="vp8,opus"',
  "video/webm;codecs=vp8",
  "video/webm",
];

export function pickSupportedRecorderMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

/** How often the host's MediaRecorder emits a chunk. Smaller = lower latency, more overhead. */
export const SCREEN_SHARE_TIMESLICE_MS = 500;

/** Target host upload bitrate. ~2.5 Mbps is enough for crisp 1080p slides/code. */
export const SCREEN_SHARE_VIDEO_BPS = 2_500_000;
