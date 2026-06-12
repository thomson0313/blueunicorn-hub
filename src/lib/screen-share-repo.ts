import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import {
  EMPTY_SCREEN_SHARE_STATE,
  type ScreenShareParticipant,
  type ScreenShareState,
} from "./screen-share-types";

type SessionRow = {
  id: string;
  host_id: string;
  host_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
};

type ParticipantRow = {
  id: string;
  session_id: string;
  user_id: string;
  user_name: string;
  status: "pending" | "viewer";
  created_at: string;
};

export type ScreenShareSignalRec = {
  id: string;
  sessionId: string;
  toUserId: string;
  fromUserId: string;
  signalType: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

function dbError(error: PostgrestError | null): void {
  if (error) throw new Error(error.message);
}

function nowISO(): string {
  return new Date().toISOString();
}

function toParticipant(row: ParticipantRow): ScreenShareParticipant {
  return { id: row.user_id, name: row.user_name };
}

function toSignalRec(row: {
  id: string;
  session_id: string;
  to_user_id: string;
  from_user_id: string;
  signal_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}): ScreenShareSignalRec {
  return {
    id: row.id,
    sessionId: row.session_id,
    toUserId: row.to_user_id,
    fromUserId: row.from_user_id,
    signalType: row.signal_type,
    payload: row.payload ?? {},
    createdAt: row.created_at,
  };
}

async function getActiveSessionRow(): Promise<SessionRow | null> {
  const { data, error } = await getSupabase()
    .from("screen_share_sessions")
    .select("*")
    .eq("active", true)
    .maybeSingle();
  dbError(error);
  return (data as SessionRow | null) ?? null;
}

async function listParticipants(sessionId: string): Promise<ParticipantRow[]> {
  const { data, error } = await getSupabase()
    .from("screen_share_participants")
    .select("*")
    .eq("session_id", sessionId);
  dbError(error);
  return (data as ParticipantRow[]) ?? [];
}

export async function getScreenShareState(): Promise<ScreenShareState> {
  const session = await getActiveSessionRow();
  if (!session) return EMPTY_SCREEN_SHARE_STATE;

  const participants = await listParticipants(session.id);
  return {
    active: true,
    host: { id: session.host_id, name: session.host_name },
    viewers: participants.filter((p) => p.status === "viewer").map(toParticipant),
    pendingRequests: participants.filter((p) => p.status === "pending").map(toParticipant),
  };
}

async function createSignal(
  sessionId: string,
  fromUserId: string,
  toUserId: string,
  signalType: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await getSupabase().from("screen_share_signals").insert({
    session_id: sessionId,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    signal_type: signalType,
    payload,
    created_at: nowISO(),
  });
  dbError(error);
}

export async function startScreenShareSession(hostId: string, hostName: string): Promise<ScreenShareState> {
  const existing = await getActiveSessionRow();
  if (existing) {
    if (existing.host_id === hostId) return getScreenShareState();
    throw new Error("A screen share session is already active");
  }

  const ts = nowISO();
  const { data, error } = await getSupabase()
    .from("screen_share_sessions")
    .insert({
      host_id: hostId,
      host_name: hostName,
      active: true,
      created_at: ts,
      updated_at: ts,
    })
    .select()
    .single();
  dbError(error);

  return getScreenShareState();
}

export async function endScreenShareSession(hostId: string): Promise<ScreenShareState> {
  const session = await getActiveSessionRow();
  if (!session || session.host_id !== hostId) return getScreenShareState();

  const ts = nowISO();
  const participants = await listParticipants(session.id);

  const { error } = await getSupabase()
    .from("screen_share_sessions")
    .update({ active: false, ended_at: ts, updated_at: ts })
    .eq("id", session.id);
  dbError(error);

  await Promise.all(participants.map((p) => createSignal(session.id, hostId, p.user_id, "ended")));

  return getScreenShareState();
}

export async function requestScreenShareJoin(userId: string, userName: string): Promise<ScreenShareState> {
  const session = await getActiveSessionRow();
  if (!session || session.host_id === userId) return getScreenShareState();

  const participants = await listParticipants(session.id);
  if (participants.some((p) => p.user_id === userId)) return getScreenShareState();

  const { error } = await getSupabase().from("screen_share_participants").insert({
    session_id: session.id,
    user_id: userId,
    user_name: userName,
    status: "pending",
    created_at: nowISO(),
  });
  dbError(error);

  return getScreenShareState();
}

export async function acceptScreenShareJoin(
  hostId: string,
  targetUserId: string
): Promise<ScreenShareState> {
  const session = await getActiveSessionRow();
  if (!session || session.host_id !== hostId) return getScreenShareState();

  const { data: participant, error: findError } = await getSupabase()
    .from("screen_share_participants")
    .select("*")
    .eq("session_id", session.id)
    .eq("user_id", targetUserId)
    .eq("status", "pending")
    .maybeSingle();
  dbError(findError);
  if (!participant) return getScreenShareState();

  const { error } = await getSupabase()
    .from("screen_share_participants")
    .update({ status: "viewer" })
    .eq("id", participant.id);
  dbError(error);

  await createSignal(session.id, hostId, targetUserId, "accepted");
  return getScreenShareState();
}

export async function rejectScreenShareJoin(
  hostId: string,
  targetUserId: string
): Promise<ScreenShareState> {
  const session = await getActiveSessionRow();
  if (!session || session.host_id !== hostId) return getScreenShareState();

  const { error } = await getSupabase()
    .from("screen_share_participants")
    .delete()
    .eq("session_id", session.id)
    .eq("user_id", targetUserId)
    .eq("status", "pending");
  dbError(error);

  await createSignal(session.id, hostId, targetUserId, "rejected");
  return getScreenShareState();
}

export async function leaveScreenShareSession(userId: string): Promise<ScreenShareState> {
  const session = await getActiveSessionRow();
  if (!session) return getScreenShareState();

  if (session.host_id === userId) {
    return endScreenShareSession(userId);
  }

  const { data: participant } = await getSupabase()
    .from("screen_share_participants")
    .select("*")
    .eq("session_id", session.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!participant) return getScreenShareState();

  const { error } = await getSupabase()
    .from("screen_share_participants")
    .delete()
    .eq("id", participant.id);
  dbError(error);

  if (participant.status === "viewer") {
    await createSignal(session.id, userId, session.host_id, "viewer-left", { userId });
  }

  return getScreenShareState();
}

export async function createScreenShareSignal(
  fromUserId: string,
  toUserId: string,
  signalType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const session = await getActiveSessionRow();
  if (!session) return;

  const allowed =
    session.host_id === fromUserId ||
    (await listParticipants(session.id)).some((p) => p.user_id === fromUserId && p.status === "viewer");
  if (!allowed) return;

  await createSignal(session.id, fromUserId, toUserId, signalType, payload);
}

export async function listScreenShareSignalsSince(
  userId: string,
  since: string
): Promise<ScreenShareSignalRec[]> {
  const { data, error } = await getSupabase()
    .from("screen_share_signals")
    .select("*")
    .eq("to_user_id", userId)
    .gt("created_at", since)
    .order("created_at", { ascending: true })
    .limit(200);
  dbError(error);
  return ((data as Parameters<typeof toSignalRec>[0][]) ?? []).map(toSignalRec);
}
