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
  bio?: string;
  fieldId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberFieldRec {
  _id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export type ProjectStatus = "in_progress" | "completed" | "canceled" | "archived";

export interface ProjectRec {
  _id: string;
  owner: string;
  fieldId: string | null;
  title: string;
  description: string;
  budget: string;
  timeline: string;
  completionRate: number;
  status: ProjectStatus;
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
  field_id: string | null;
  avatar_url: string | null;
  skills: string;
  bio?: string;
  plan?: string;
  created_at: string;
  updated_at: string;
};

type MemberFieldRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

type ProjectRow = {
  id: string;
  owner: string;
  field_id: string | null;
  title: string;
  description: string;
  budget: string;
  timeline: string;
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

function userBio(row: UserRow): string {
  return row.bio ?? row.plan ?? "";
}

function toUserRec(row: UserRow): UserRec {
  return {
    _id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role as Role,
    fieldId: row.field_id ?? null,
    avatarUrl: row.avatar_url,
    skills: row.skills ?? "",
    bio: userBio(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMemberFieldRec(row: MemberFieldRow): MemberFieldRec {
  return {
    _id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

const LEGACY_STATUS: Record<string, ProjectStatus> = {
  not_started: "in_progress",
  on_hold: "in_progress",
};

function normalizeStatus(status: string): ProjectStatus {
  return LEGACY_STATUS[status] ?? (status as ProjectStatus);
}

function toProjectRec(row: ProjectRow): ProjectRec {
  return {
    _id: row.id,
    owner: row.owner,
    fieldId: row.field_id ?? null,
    title: row.title,
    description: row.description,
    budget: row.budget ?? "",
    timeline: row.timeline ?? "",
    completionRate: row.completion_rate,
    status: normalizeStatus(row.status),
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
  bio: string;
  fieldId: string | null;
  fieldName: string | null;
};

const fieldNameCache = new Map<string, string>();

export async function getFieldName(fieldId: string | null | undefined): Promise<string | null> {
  if (!fieldId) return null;
  if (fieldNameCache.has(fieldId)) return fieldNameCache.get(fieldId)!;
  const field = await findMemberFieldById(fieldId);
  if (field) fieldNameCache.set(fieldId, field.name);
  return field?.name ?? null;
}

export async function publicUser(u: UserRec): Promise<PublicUser> {
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    username: u.username ?? null,
    role: u.role,
    avatarUrl: u.avatarUrl ?? null,
    skills: u.skills ?? "",
    bio: u.bio ?? "",
    fieldId: u.fieldId ?? null,
    fieldName: await getFieldName(u.fieldId),
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
  fieldId?: string | null;
}): Promise<UserRec> {
  const ts = nowISO();
  const row = {
    id: newId(),
    name: data.name,
    email: data.email.toLowerCase(),
    username: data.username || null,
    password_hash: data.passwordHash,
    role: data.role,
    field_id: data.fieldId ?? null,
    skills: "",
    bio: "",
    created_at: ts,
    updated_at: ts,
  };
  const { data: created, error } = await getSupabase().from("users").insert(row).select().single();
  dbError(error);
  return toUserRec(created as UserRow);
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<UserRec, "name" | "role" | "passwordHash" | "avatarUrl" | "skills" | "bio">>
): Promise<UserRec | null> {
  const payload: Record<string, unknown> = { updated_at: nowISO() };
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.role !== undefined) payload.role = patch.role;
  if (patch.passwordHash !== undefined) payload.password_hash = patch.passwordHash;
  if (patch.avatarUrl !== undefined) payload.avatar_url = patch.avatarUrl;
  if (patch.skills !== undefined) payload.skills = patch.skills;
  if (patch.bio !== undefined) payload.bio = patch.bio;

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

export type EnrichedProject = Omit<ProjectRec, "owner"> & {
  owner: PublicUser | string;
  fieldName: string | null;
};

async function enrichProject(p: ProjectRec, users?: UserRec[]): Promise<EnrichedProject> {
  const ownerUser =
    users?.find((u) => u._id === p.owner) ?? (await findUserById(p.owner));
  const fieldName = await getFieldName(p.fieldId);
  return {
    ...p,
    owner: ownerUser ? await publicUser(ownerUser) : p.owner,
    fieldName,
  };
}

export type ProjectListFilters = {
  ownerId?: string;
  fieldId?: string;
  status?: ProjectStatus;
};

export async function listProjects(
  filters: ProjectListFilters = {},
  populate = true
): Promise<EnrichedProject[]> {
  let query = getSupabase().from("projects").select("*").order("updated_at", { ascending: false });
  if (filters.ownerId) query = query.eq("owner", filters.ownerId);
  if (filters.fieldId) query = query.eq("field_id", filters.fieldId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  dbError(error);
  const projects = (data as ProjectRow[]).map(toProjectRec);
  if (!populate) {
    return projects.map((p) => ({ ...p, owner: p.owner, fieldName: null }));
  }
  const users = await listUsers();
  return Promise.all(projects.map((p) => enrichProject(p, users)));
}

export async function listProjectsByOwner(owner: string, populate = true): Promise<EnrichedProject[]> {
  return listProjects({ ownerId: owner }, populate);
}

export async function listAllProjects(populate = true): Promise<EnrichedProject[]> {
  return listProjects({}, populate);
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
  fieldId: string;
  title: string;
  description?: string;
  budget?: string;
  timeline?: string;
  completionRate?: number;
  status?: ProjectStatus;
}): Promise<EnrichedProject> {
  const ts = nowISO();
  const row = {
    id: newId(),
    owner: data.owner,
    field_id: data.fieldId,
    title: data.title,
    description: data.description ?? "",
    budget: data.budget ?? "",
    timeline: data.timeline ?? "",
    completion_rate: data.completionRate ?? 0,
    status: data.status ?? "in_progress",
    created_at: ts,
    updated_at: ts,
  };
  const { data: created, error } = await getSupabase().from("projects").insert(row).select().single();
  dbError(error);
  return enrichProject(toProjectRec(created as ProjectRow));
}

export async function updateProject(
  id: string,
  patch: Partial<
    Pick<ProjectRec, "owner" | "fieldId" | "title" | "description" | "budget" | "timeline" | "completionRate" | "status">
  >
): Promise<EnrichedProject | null> {
  const payload: Record<string, unknown> = { updated_at: nowISO() };
  if (patch.owner !== undefined) payload.owner = patch.owner;
  if (patch.fieldId !== undefined) payload.field_id = patch.fieldId;
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.budget !== undefined) payload.budget = patch.budget;
  if (patch.timeline !== undefined) payload.timeline = patch.timeline;
  if (patch.completionRate !== undefined) payload.completion_rate = patch.completionRate;
  if (patch.status !== undefined) payload.status = patch.status;

  const { data, error } = await getSupabase().from("projects").update(payload).eq("id", id).select().maybeSingle();
  dbError(error);
  return data ? enrichProject(toProjectRec(data as ProjectRow)) : null;
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

/* ------------------------- Member fields ------------------------- */

export async function listMemberFields(): Promise<MemberFieldRec[]> {
  const { data, error } = await getSupabase()
    .from("member_fields")
    .select("*")
    .order("sort_order", { ascending: true });
  dbError(error);
  return (data as MemberFieldRow[]).map(toMemberFieldRec);
}

export async function findMemberFieldById(id: string): Promise<MemberFieldRec | null> {
  const { data, error } = await getSupabase().from("member_fields").select("*").eq("id", id).maybeSingle();
  dbError(error);
  return data ? toMemberFieldRec(data as MemberFieldRow) : null;
}

export async function createMemberField(name: string): Promise<MemberFieldRec> {
  const trimmed = name.trim();
  const { data: existing } = await getSupabase()
    .from("member_fields")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = ((existing as { sort_order?: number } | null)?.sort_order ?? 0) + 1;
  const { data, error } = await getSupabase()
    .from("member_fields")
    .insert({ id: newId(), name: trimmed, sort_order: sortOrder })
    .select()
    .single();
  dbError(error);
  return toMemberFieldRec(data as MemberFieldRow);
}

export async function deleteMemberField(id: string): Promise<{ ok: boolean; error?: string }> {
  const { count, error: countErr } = await getSupabase()
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("field_id", id);
  dbError(countErr);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "Cannot delete: members are assigned to this field" };
  }
  const { data, error } = await getSupabase().from("member_fields").delete().eq("id", id).select("id").maybeSingle();
  dbError(error);
  return { ok: !!data };
}

export async function ensureDefaultMemberFields(): Promise<void> {
  const fields = await listMemberFields();
  if (fields.length > 0) return;
  for (const [i, name] of ["AI club", "Scandicommerce", "Online Business"].entries()) {
    await getSupabase().from("member_fields").insert({ id: newId(), name, sort_order: i + 1 });
  }
}

export async function countUsersByFieldId(fieldId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("field_id", fieldId);
  dbError(error);
  return count ?? 0;
}

/* ----------------------- Password reset ----------------------- */

export async function createPasswordReset(userId: string, token: string, expiresAt: string): Promise<void> {
  await getSupabase().from("password_resets").delete().eq("user_id", userId);
  const { error } = await getSupabase().from("password_resets").insert({
    id: newId(),
    user_id: userId,
    token,
    expires_at: expiresAt,
  });
  dbError(error);
}

export async function findPasswordResetByToken(
  token: string
): Promise<{ userId: string; expiresAt: string } | null> {
  const { data, error } = await getSupabase()
    .from("password_resets")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  dbError(error);
  if (!data) return null;
  const row = data as { user_id: string; expires_at: string };
  return { userId: row.user_id, expiresAt: row.expires_at };
}

export async function deletePasswordResetByToken(token: string): Promise<void> {
  const { error } = await getSupabase().from("password_resets").delete().eq("token", token);
  dbError(error);
}
