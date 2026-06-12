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

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
