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

/**
 * STUN + (optional) TURN configuration for WebRTC.
 *
 * STUN alone works when both peers can reach the public internet without
 * symmetric NAT. TURN is required for restrictive corporate/mobile networks
 * and is what makes screen share "just work" everywhere.
 *
 * Configure via env vars (exposed to the browser by Next.js):
 *   NEXT_PUBLIC_TURN_URL          e.g. "turn:turn.example.com:3478"
 *   NEXT_PUBLIC_TURN_USERNAME     coturn user
 *   NEXT_PUBLIC_TURN_CREDENTIAL   coturn password
 *
 * Multiple TURN URLs may be supplied comma-separated (UDP + TCP + TLS).
 */
export function getIceServers(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    const urls = turnUrl
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    iceServers.push({
      urls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return {
    iceServers,
    // Required for screen share over restrictive networks: lets the browser
    // gather TURN candidates immediately instead of after the first failure.
    iceCandidatePoolSize: 4,
  };
}

/** Payloads on the wire — kept tiny so they stay readable on the server too. */
export type ScreenShareSignalEnvelope<T> = {
  from: string;
  data: T;
};

export type SdpSignal = { sdp: RTCSessionDescriptionInit };
export type IceSignal = { candidate: RTCIceCandidateInit };
