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

/** ICE servers — optional TURN via env for production NAT traversal. */
export function getIceServers(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    iceServers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }

  return { iceServers };
}

/** @deprecated use getIceServers() */
export const ICE_SERVERS: RTCConfiguration = getIceServers();
