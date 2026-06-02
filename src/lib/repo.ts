import crypto from "node:crypto";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export type Role = "admin" | "member";

export interface UserRec {
  _id: string;
  name: string;
  email: string;
  username?: string | null;
  passwordHash: string;
  role: Role;
  avatarUrl?: string | null;
  skills?: string;
  plan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRec {
  _id: string;
  owner: string;
  title: string;
  description: string;
  completionRate: number;
  status: "not_started" | "in_progress" | "completed" | "on_hold";
  createdAt: string;
  updatedAt: string;
}

export interface MessageRec {
  _id: string;
  sender: string;
  channelType: "general" | "dm";
  recipient?: string | null;
  dmKey?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRec {
  _id: string;
  createdBy: string;
  title: string;
  content: string;
  scheduledAt: string;
  status: "pending" | "delivered";
  deliveredAt?: string | null;
  seenBy: string[];
  createdAt: string;
  updatedAt: string;
}

type UserRow = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  password_hash: string;
  role: string;
  avatar_url: string | null;
  skills: string;
  plan: string;
  created_at: string;
  updated_at: string;
};

type ProjectRow = {
  id: string;
  owner: string;
  title: string;
  description: string;
  completion_rate: number;
  status: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  sender: string;
  channel_type: string;
  recipient: string | null;
  dm_key: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

type AlertRow = {
  id: string;
  created_by: string;
  title: string;
  content: string;
  scheduled_at: string;
  status: string;
  delivered_at: string | null;
  seen_by: string[] | null;
  created_at: string;
  updated_at: string;
};

function dbError(error: PostgrestError | null): void {
  if (error) throw new Error(error.message);
}

export function dmKeyFor(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

function toUserRec(row: UserRow): UserRec {
  return {
    _id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role as Role,
    avatarUrl: row.avatar_url,
    skills: row.skills ?? "",
    plan: row.plan ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProjectRec(row: ProjectRow): ProjectRec {
  return {
    _id: row.id,
    owner: row.owner,
    title: row.title,
    description: row.description,
    completionRate: row.completion_rate,
    status: row.status as ProjectRec["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessageRec(row: MessageRow): MessageRec {
  return {
    _id: row.id,
    sender: row.sender,
    channelType: row.channel_type as MessageRec["channelType"],
    recipient: row.recipient,
    dmKey: row.dm_key,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAlertRec(row: AlertRow): AlertRec {
  return {
    _id: row.id,
    createdBy: row.created_by,
    title: row.title,
    content: row.content,
    scheduledAt: row.scheduled_at,
    status: row.status as AlertRec["status"],
    deliveredAt: row.delivered_at,
    seenBy: row.seen_by ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type PublicUser = {
  _id: string;
  name: string;
  email: string;
  username: string | null;
  role: Role;
  avatarUrl: string | null;
  skills: string;
  plan: string;
};

export function publicUser(u: UserRec): PublicUser {
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    username: u.username ?? null,
    role: u.role,
    avatarUrl: u.avatarUrl ?? null,
    skills: u.skills ?? "",
    plan: u.plan ?? "",
  };
}

/* ----------------------------- Users ----------------------------- */

export async function findUserById(id: string): Promise<UserRec | null> {
  const { data, error } = await getSupabase().from("users").select("*").eq("id", id).maybeSingle();
  dbError(error);
  return data ? toUserRec(data as UserRow) : null;
}

export async function findUserByEmail(email: string): Promise<UserRec | null> {
  const { data, error } = await getSupabase()
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  dbError(error);
  return data ? toUserRec(data as UserRow) : null;
}

export async function findUserByEmailOrUsername(identifier: string): Promise<UserRec | null> {
  const id = identifier.trim();
  const lower = id.toLowerCase();
  const { data, error } = await getSupabase()
    .from("users")
    .select("*")
    .or(`email.eq.${lower},username.eq.${id}`)
    .maybeSingle();
  dbError(error);
  return data ? toUserRec(data as UserRow) : null;
}

export async function emailOrUsernameTaken(email: string, username?: string | null): Promise<boolean> {
  const e = email.toLowerCase();
  const filter = username ? `email.eq.${e},username.eq.${username}` : `email.eq.${e}`;
  const { count, error } = await getSupabase()
    .from("users")
    .select("*", { count: "exact", head: true })
    .or(filter);
  dbError(error);
  return (count ?? 0) > 0;
}

export async function countUsers(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("users")
    .select("*", { count: "exact", head: true });
  dbError(error);
  return count ?? 0;
}

export async function listUsers(): Promise<UserRec[]> {
  const { data, error } = await getSupabase().from("users").select("*").order("created_at", { ascending: true });
  dbError(error);
  return (data as UserRow[]).map(toUserRec);
}

export async function listUsersExcept(id: string): Promise<UserRec[]> {
  const { data, error } = await getSupabase()
    .from("users")
    .select("*")
    .neq("id", id)
    .order("created_at", { ascending: true });
  dbError(error);
  return (data as UserRow[]).map(toUserRec);
}

export async function createUser(data: {
  name: string;
  email: string;
  username?: string | null;
  passwordHash: string;
  role: Role;
}): Promise<UserRec> {
  const ts = nowISO();
  const row = {
    id: newId(),
    name: data.name,
    email: data.email.toLowerCase(),
    username: data.username || null,
    password_hash: data.passwordHash,
    role: data.role,
    skills: "",
    plan: "",
    created_at: ts,
    updated_at: ts,
  };
  const { data: created, error } = await getSupabase().from("users").insert(row).select().single();
  dbError(error);
  return toUserRec(created as UserRow);
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<UserRec, "name" | "role" | "passwordHash" | "avatarUrl" | "skills" | "plan">>
): Promise<UserRec | null> {
  const payload: Record<string, unknown> = { updated_at: nowISO() };
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.role !== undefined) payload.role = patch.role;
  if (patch.passwordHash !== undefined) payload.password_hash = patch.passwordHash;
  if (patch.avatarUrl !== undefined) payload.avatar_url = patch.avatarUrl;
  if (patch.skills !== undefined) payload.skills = patch.skills;
  if (patch.plan !== undefined) payload.plan = patch.plan;

  const { data, error } = await getSupabase().from("users").update(payload).eq("id", id).select().maybeSingle();
  dbError(error);
  return data ? toUserRec(data as UserRow) : null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const { data, error } = await getSupabase().from("users").delete().eq("id", id).select("id").maybeSingle();
  dbError(error);
  return !!data;
}

/* ---------------------------- Projects ---------------------------- */

type ProjectWithOwner = Omit<ProjectRec, "owner"> & { owner: PublicUser | string };

async function attachOwner(p: ProjectRec, users?: UserRec[]): Promise<ProjectWithOwner> {
  const owner =
    users?.find((u) => u._id === p.owner) ?? (await findUserById(p.owner));
  return { ...p, owner: owner ? publicUser(owner) : p.owner };
}

export async function listProjectsByOwner(owner: string, populate = false): Promise<ProjectWithOwner[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select("*")
    .eq("owner", owner)
    .order("updated_at", { ascending: false });
  dbError(error);
  const projects = (data as ProjectRow[]).map(toProjectRec);
  if (!populate) return projects;
  const users = await listUsers();
  return Promise.all(projects.map((p) => attachOwner(p, users)));
}

export async function listAllProjects(populate = false): Promise<ProjectWithOwner[]> {
  const { data, error } = await getSupabase().from("projects").select("*").order("updated_at", { ascending: false });
  dbError(error);
  const projects = (data as ProjectRow[]).map(toProjectRec);
  if (!populate) return projects;
  const users = await listUsers();
  return Promise.all(projects.map((p) => attachOwner(p, users)));
}

export async function projectCountsByOwner(): Promise<Map<string, number>> {
  const { data, error } = await getSupabase().from("projects").select("owner");
  dbError(error);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const owner = (row as { owner: string }).owner;
    counts.set(owner, (counts.get(owner) || 0) + 1);
  }
  return counts;
}

export async function findProjectById(id: string): Promise<ProjectRec | null> {
  const { data, error } = await getSupabase().from("projects").select("*").eq("id", id).maybeSingle();
  dbError(error);
  return data ? toProjectRec(data as ProjectRow) : null;
}

export async function createProject(data: {
  owner: string;
  title: string;
  description?: string;
  completionRate?: number;
  status?: ProjectRec["status"];
}): Promise<ProjectWithOwner> {
  const ts = nowISO();
  const row = {
    id: newId(),
    owner: data.owner,
    title: data.title,
    description: data.description ?? "",
    completion_rate: data.completionRate ?? 0,
    status: data.status ?? "in_progress",
    created_at: ts,
    updated_at: ts,
  };
  const { data: created, error } = await getSupabase().from("projects").insert(row).select().single();
  dbError(error);
  return attachOwner(toProjectRec(created as ProjectRow));
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<ProjectRec, "title" | "description" | "completionRate" | "status">>
): Promise<ProjectWithOwner | null> {
  const payload: Record<string, unknown> = { updated_at: nowISO() };
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.completionRate !== undefined) payload.completion_rate = patch.completionRate;
  if (patch.status !== undefined) payload.status = patch.status;

  const { data, error } = await getSupabase().from("projects").update(payload).eq("id", id).select().maybeSingle();
  dbError(error);
  return data ? attachOwner(toProjectRec(data as ProjectRow)) : null;
}

export async function deleteProject(id: string): Promise<boolean> {
  const { data, error } = await getSupabase().from("projects").delete().eq("id", id).select("id").maybeSingle();
  dbError(error);
  return !!data;
}

/* ---------------------------- Messages ---------------------------- */

export type MessageWithSender = Omit<MessageRec, "sender"> & {
  sender: { _id: string; name: string; role: Role };
};

async function attachSender(m: MessageRec, users?: UserRec[]): Promise<MessageWithSender> {
  const sender =
    users?.find((u) => u._id === m.sender) ?? (await findUserById(m.sender));
  return {
    ...m,
    sender: sender
      ? { _id: sender._id, name: sender.name, role: sender.role }
      : { _id: m.sender, name: "Unknown", role: "member" },
  };
}

async function attachSenders(messages: MessageRec[]): Promise<MessageWithSender[]> {
  const users = await listUsers();
  return Promise.all(messages.map((m) => attachSender(m, users)));
}

export async function createMessage(data: {
  sender: string;
  channelType: "general" | "dm";
  recipient?: string | null;
  dmKey?: string | null;
  content: string;
}): Promise<MessageRec> {
  const ts = nowISO();
  const row = {
    id: newId(),
    sender: data.sender,
    channel_type: data.channelType,
    recipient: data.recipient ?? null,
    dm_key: data.dmKey ?? null,
    content: data.content,
    created_at: ts,
    updated_at: ts,
  };
  const { data: created, error } = await getSupabase().from("messages").insert(row).select().single();
  dbError(error);
  return toMessageRec(created as MessageRow);
}

export async function createGeneralMessage(
  senderId: string,
  content: string
): Promise<MessageWithSender> {
  const doc = await createMessage({ sender: senderId, channelType: "general", content });
  return attachSender(doc);
}

export async function createDmMessage(
  senderId: string,
  to: string,
  content: string
): Promise<MessageWithSender> {
  const doc = await createMessage({
    sender: senderId,
    channelType: "dm",
    recipient: to,
    dmKey: dmKeyFor(senderId, to),
    content,
  });
  return attachSender(doc);
}

export async function listGeneralMessages(limit = 200): Promise<MessageWithSender[]> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("channel_type", "general")
    .order("created_at", { ascending: true })
    .limit(limit);
  dbError(error);
  return attachSenders((data as MessageRow[]).map(toMessageRec));
}

export async function listDmMessages(dmKey: string, limit = 200): Promise<MessageWithSender[]> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("channel_type", "dm")
    .eq("dm_key", dmKey)
    .order("created_at", { ascending: true })
    .limit(limit);
  dbError(error);
  return attachSenders((data as MessageRow[]).map(toMessageRec));
}

export async function listGeneralMessagesSince(
  since: string,
  limit = 100
): Promise<MessageWithSender[]> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("channel_type", "general")
    .gt("created_at", since)
    .order("created_at", { ascending: true })
    .limit(limit);
  dbError(error);
  return attachSenders((data as MessageRow[]).map(toMessageRec));
}

export async function listInboxMessagesSince(
  userId: string,
  since: string,
  limit = 50
): Promise<MessageWithSender[]> {
  const sb = getSupabase();
  const [generalRes, dmRes] = await Promise.all([
    sb.from("messages").select("*").eq("channel_type", "general").gt("created_at", since),
    sb
      .from("messages")
      .select("*")
      .eq("channel_type", "dm")
      .gt("created_at", since)
      .or(`sender.eq.${userId},recipient.eq.${userId}`),
  ]);
  dbError(generalRes.error);
  dbError(dmRes.error);

  const merged = [...(generalRes.data as MessageRow[]), ...(dmRes.data as MessageRow[])]
    .map(toMessageRec)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-limit);
  return attachSenders(merged);
}

export async function listDmMessagesSince(
  dmKey: string,
  since: string,
  limit = 100
): Promise<MessageWithSender[]> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("channel_type", "dm")
    .eq("dm_key", dmKey)
    .gt("created_at", since)
    .order("created_at", { ascending: true })
    .limit(limit);
  dbError(error);
  return attachSenders((data as MessageRow[]).map(toMessageRec));
}

export async function touchPresence(userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("presence")
    .upsert({ user_id: userId, last_seen: nowISO() });
  dbError(error);
}

export async function listOnlineUserIds(maxAgeMs = 90_000): Promise<string[]> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const { data, error } = await getSupabase()
    .from("presence")
    .select("user_id")
    .gte("last_seen", cutoff);
  dbError(error);
  return (data ?? []).map((row) => (row as { user_id: string }).user_id);
}

/* ----------------------------- Alerts ----------------------------- */

export async function createAlert(data: {
  createdBy: string;
  title: string;
  content: string;
  scheduledAt: string;
}): Promise<AlertRec> {
  const ts = nowISO();
  const row = {
    id: newId(),
    created_by: data.createdBy,
    title: data.title,
    content: data.content,
    scheduled_at: data.scheduledAt,
    status: "pending",
    delivered_at: null,
    seen_by: [] as string[],
    created_at: ts,
    updated_at: ts,
  };
  const { data: created, error } = await getSupabase().from("alerts").insert(row).select().single();
  dbError(error);
  return toAlertRec(created as AlertRow);
}

export async function listAlerts(): Promise<AlertRec[]> {
  const { data, error } = await getSupabase().from("alerts").select("*").order("scheduled_at", { ascending: false });
  dbError(error);
  return (data as AlertRow[]).map(toAlertRec);
}

export async function listDueAlerts(): Promise<AlertRec[]> {
  const now = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from("alerts")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now);
  dbError(error);
  return (data as AlertRow[]).map(toAlertRec);
}

export async function markAlertDelivered(id: string): Promise<void> {
  const ts = nowISO();
  const { error } = await getSupabase()
    .from("alerts")
    .update({ status: "delivered", delivered_at: ts, updated_at: ts })
    .eq("id", id);
  dbError(error);
}

export async function deleteAlert(id: string): Promise<boolean> {
  const { data, error } = await getSupabase().from("alerts").delete().eq("id", id).select("id").maybeSingle();
  dbError(error);
  return !!data;
}

export async function deliverDueAlerts(): Promise<AlertRec[]> {
  const due = await listDueAlerts();
  if (due.length === 0) return due;
  const ts = nowISO();
  const ids = due.map((a) => a._id);
  const { error } = await getSupabase()
    .from("alerts")
    .update({ status: "delivered", delivered_at: ts, updated_at: ts })
    .in("id", ids);
  dbError(error);
  return due.map((a) => ({ ...a, status: "delivered" as const, deliveredAt: ts, updatedAt: ts }));
}

export async function listDeliveredAlertsSince(since: string): Promise<AlertRec[]> {
  const { data, error } = await getSupabase()
    .from("alerts")
    .select("*")
    .eq("status", "delivered")
    .gt("delivered_at", since)
    .order("delivered_at", { ascending: true });
  dbError(error);
  return (data as AlertRow[]).map(toAlertRec);
}
