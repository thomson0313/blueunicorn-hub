import crypto from "node:crypto";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import type { ApprovalStatus } from "./user-approval";
import { isEmailVerified } from "./email-verification";

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
  approvalStatus: ApprovalStatus;
  emailVerifiedAt?: string | null;
  totpSecret?: string | null;
  totpEnabledAt?: string | null;
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
  budgetType: "hourly" | "fixed";
  budgetCurrency: string;
  budgetAmount: string;
  estimatedHours: number;
  timeline: string;
  previewLink: string;
  githubLink: string;
  completionRate: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCommentRec {
  _id: string;
  projectId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCommentReactionRec {
  _id: string;
  commentId: string;
  userId: string;
  emoji: string;
  createdAt: string;
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
  approval_status?: string;
  field_id: string | null;
  avatar_url: string | null;
  skills: string;
  bio?: string;
  plan?: string;
  email_verified_at?: string | null;
  totp_secret?: string | null;
  totp_enabled_at?: string | null;
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
  budget_type?: string;
  budget_currency?: string;
  budget_amount?: string;
  estimated_hours?: number | string;
  timeline: string;
  preview_link?: string;
  github_link?: string;
  completion_rate: number;
  status: string;
  created_at: string;
  updated_at: string;
};

type ProjectCommentRow = {
  id: string;
  project_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

type ProjectCommentReactionRow = {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
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
    approvalStatus: (row.approval_status === "accepted" || row.approval_status === "rejected"
      ? row.approval_status
      : "pending") as ApprovalStatus,
    emailVerifiedAt: row.email_verified_at ?? null,
    totpSecret: row.totp_secret ?? null,
    totpEnabledAt: row.totp_enabled_at ?? null,
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
    budgetType: row.budget_type === "hourly" ? "hourly" : "fixed",
    budgetCurrency: row.budget_currency ?? "USD",
    budgetAmount: row.budget_amount ?? "",
    estimatedHours: Number(row.estimated_hours ?? 0) || 0,
    timeline: row.timeline ?? "",
    previewLink: row.preview_link ?? "",
    githubLink: row.github_link ?? "",
    completionRate: row.completion_rate,
    status: normalizeStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProjectCommentRec(row: ProjectCommentRow): ProjectCommentRec {
  return {
    _id: row.id,
    projectId: row.project_id,
    authorId: row.author_id,
    parentId: row.parent_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProjectCommentReactionRec(row: ProjectCommentReactionRow): ProjectCommentReactionRec {
  return {
    _id: row.id,
    commentId: row.comment_id,
    userId: row.user_id,
    emoji: row.emoji,
    createdAt: row.created_at,
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
  emailVerified: boolean;
};

const fieldNameCache = new Map<string, string>();

export async function getFieldName(fieldId: string | null | undefined): Promise<string | null> {
  if (!fieldId) return null;
  if (fieldNameCache.has(fieldId)) return fieldNameCache.get(fieldId)!;
  const field = await findMemberFieldById(fieldId);
  if (field) fieldNameCache.set(fieldId, field.name);
  return field?.name ?? null;
}

function stubPublicUser(id: string, name = "Unknown"): PublicUser {
  return {
    _id: id,
    name,
    email: "",
    username: null,
    role: "member",
    avatarUrl: null,
    skills: "",
    bio: "",
    fieldId: null,
    fieldName: null,
    emailVerified: false,
  };
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
    emailVerified: isEmailVerified(u.emailVerifiedAt),
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
  approvalStatus?: ApprovalStatus;
}): Promise<UserRec> {
  const ts = nowISO();
  const row = {
    id: newId(),
    name: data.name,
    email: data.email.toLowerCase(),
    username: data.username || null,
    password_hash: data.passwordHash,
    role: data.role,
    approval_status: data.approvalStatus ?? (data.role === "admin" ? "accepted" : "pending"),
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

export async function isEmailOrUsernameTakenByOther(
  email: string,
  username: string | null | undefined,
  excludeUserId: string
): Promise<boolean> {
  const e = email.toLowerCase();
  const parts = [`email.eq.${e}`];
  if (username) parts.push(`username.eq.${username}`);
  const { data, error } = await getSupabase()
    .from("users")
    .select("id")
    .or(parts.join(","))
    .neq("id", excludeUserId);
  dbError(error);
  return (data?.length ?? 0) > 0;
}

export async function updateUser(
  id: string,
  patch: Partial<
    Pick<
      UserRec,
      | "name"
      | "role"
      | "passwordHash"
      | "avatarUrl"
      | "skills"
      | "bio"
      | "email"
      | "username"
      | "fieldId"
      | "approvalStatus"
      | "emailVerifiedAt"
      | "totpSecret"
      | "totpEnabledAt"
    >
  >
): Promise<UserRec | null> {
  const payload: Record<string, unknown> = { updated_at: nowISO() };
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.email !== undefined) payload.email = patch.email.toLowerCase();
  if (patch.username !== undefined) payload.username = patch.username || null;
  if (patch.fieldId !== undefined) payload.field_id = patch.fieldId;
  if (patch.role !== undefined) payload.role = patch.role;
  if (patch.approvalStatus !== undefined) payload.approval_status = patch.approvalStatus;
  if (patch.emailVerifiedAt !== undefined) payload.email_verified_at = patch.emailVerifiedAt;
  if (patch.totpSecret !== undefined) payload.totp_secret = patch.totpSecret;
  if (patch.totpEnabledAt !== undefined) payload.totp_enabled_at = patch.totpEnabledAt;
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
  timeByDate?: Record<string, number>;
  totalLoggedHours?: number;
};

async function enrichProject(
  p: ProjectRec,
  users?: UserRec[],
  timeByDate?: Record<string, number>,
  totalLoggedHours?: number
): Promise<EnrichedProject> {
  const ownerUser =
    users?.find((u) => u._id === p.owner) ?? (await findUserById(p.owner));
  const fieldName = await getFieldName(p.fieldId);
  return {
    ...p,
    owner: ownerUser ? await publicUser(ownerUser) : p.owner,
    fieldName,
    timeByDate,
    totalLoggedHours,
  };
}

export type ProjectListFilters = {
  ownerId?: string;
  fieldId?: string;
  status?: ProjectStatus;
  excludeStatus?: ProjectStatus;
};

export async function listProjects(
  filters: ProjectListFilters = {},
  populate = true
): Promise<EnrichedProject[]> {
  let query = getSupabase().from("projects").select("*").order("updated_at", { ascending: false });
  if (filters.ownerId) query = query.eq("owner", filters.ownerId);
  if (filters.fieldId) query = query.eq("field_id", filters.fieldId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.excludeStatus) query = query.neq("status", filters.excludeStatus);

  const { data, error } = await query;
  dbError(error);
  const projects = (data as ProjectRow[]).map(toProjectRec);
  if (!populate) {
    return projects.map((p) => ({ ...p, owner: p.owner, fieldName: null }));
  }
  const users = await listUsers();
  const hourlyIds = projects.filter((p) => p.budgetType === "hourly").map((p) => p._id);
  const timeAgg = await aggregateTimeByDateForProjects(hourlyIds);
  return Promise.all(
    projects.map((p) => {
      const timeByDate = p.budgetType === "hourly" ? timeAgg.get(p._id) : undefined;
      const totalLoggedHours = timeByDate
        ? Object.values(timeByDate).reduce((sum, h) => sum + h, 0)
        : undefined;
      return enrichProject(p, users, timeByDate, totalLoggedHours);
    })
  );
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
  budgetType?: "hourly" | "fixed";
  budgetCurrency?: string;
  budgetAmount?: string;
  estimatedHours?: number;
  timeline?: string;
  previewLink?: string;
  githubLink?: string;
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
    budget_type: data.budgetType ?? "fixed",
    budget_currency: data.budgetCurrency ?? "USD",
    budget_amount: data.budgetAmount ?? "",
    estimated_hours: data.estimatedHours ?? 0,
    timeline: data.timeline ?? "",
    preview_link: data.previewLink ?? "",
    github_link: data.githubLink ?? "",
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
    Pick<
      ProjectRec,
      | "owner"
      | "fieldId"
      | "title"
      | "description"
      | "budget"
      | "budgetType"
      | "budgetCurrency"
      | "budgetAmount"
      | "estimatedHours"
      | "timeline"
      | "previewLink"
      | "githubLink"
      | "completionRate"
      | "status"
    >
  >
): Promise<EnrichedProject | null> {
  const payload: Record<string, unknown> = { updated_at: nowISO() };
  if (patch.owner !== undefined) payload.owner = patch.owner;
  if (patch.fieldId !== undefined) payload.field_id = patch.fieldId;
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.budget !== undefined) payload.budget = patch.budget;
  if (patch.budgetType !== undefined) payload.budget_type = patch.budgetType;
  if (patch.budgetCurrency !== undefined) payload.budget_currency = patch.budgetCurrency;
  if (patch.budgetAmount !== undefined) payload.budget_amount = patch.budgetAmount;
  if (patch.estimatedHours !== undefined) payload.estimated_hours = patch.estimatedHours;
  if (patch.timeline !== undefined) payload.timeline = patch.timeline;
  if (patch.previewLink !== undefined) payload.preview_link = patch.previewLink;
  if (patch.githubLink !== undefined) payload.github_link = patch.githubLink;
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

export function canAccessProjectComments(userId: string, role: Role, ownerId: string): boolean {
  return role === "admin" || ownerId === userId;
}

export function canManageProject(userId: string, role: Role, ownerId: string): boolean {
  return role === "admin" || ownerId === userId;
}

export function canTrackProjectTime(userId: string, ownerId: string): boolean {
  return ownerId === userId;
}

/* ------------------------ Project time logs ------------------------ */

export interface ProjectTimeLogRec {
  _id: string;
  projectId: string;
  userId: string;
  workDate: string;
  hours: number;
  createdAt: string;
  updatedAt: string;
}

type ProjectTimeLogRow = {
  id: string;
  project_id: string;
  user_id: string;
  work_date: string;
  hours: number;
  created_at: string;
  updated_at: string;
};

function toProjectTimeLogRec(row: ProjectTimeLogRow): ProjectTimeLogRec {
  return {
    _id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    workDate: row.work_date,
    hours: Number(row.hours),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProjectTimeLogs(projectId: string): Promise<ProjectTimeLogRec[]> {
  const { data, error } = await getSupabase()
    .from("project_time_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });
  dbError(error);
  return (data as ProjectTimeLogRow[]).map(toProjectTimeLogRec);
}

export function aggregateHoursByDate(logs: ProjectTimeLogRec[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const log of logs) {
    map[log.workDate] = (map[log.workDate] ?? 0) + log.hours;
  }
  return map;
}

export async function aggregateTimeByDateForProjects(
  projectIds: string[]
): Promise<Map<string, Record<string, number>>> {
  const result = new Map<string, Record<string, number>>();
  if (!projectIds.length) return result;

  const { data, error } = await getSupabase()
    .from("project_time_logs")
    .select("project_id, work_date, hours")
    .in("project_id", projectIds);
  dbError(error);

  for (const row of data ?? []) {
    const r = row as { project_id: string; work_date: string; hours: number };
    const pid = r.project_id;
    const byDate = result.get(pid) ?? {};
    byDate[r.work_date] = (byDate[r.work_date] ?? 0) + Number(r.hours);
    result.set(pid, byDate);
  }
  return result;
}

export async function findProjectTimeLogByDate(
  projectId: string,
  workDate: string
): Promise<ProjectTimeLogRec | null> {
  const { data, error } = await getSupabase()
    .from("project_time_logs")
    .select("*")
    .eq("project_id", projectId)
    .eq("work_date", workDate)
    .maybeSingle();
  dbError(error);
  return data ? toProjectTimeLogRec(data as ProjectTimeLogRow) : null;
}

export async function createProjectTimeLog(data: {
  projectId: string;
  userId: string;
  workDate: string;
  hours: number;
}): Promise<ProjectTimeLogRec> {
  const existing = await findProjectTimeLogByDate(data.projectId, data.workDate);
  if (existing) {
    throw new Error("Time already logged for this date. Use edit instead.");
  }

  const ts = nowISO();
  const row = {
    id: newId(),
    project_id: data.projectId,
    user_id: data.userId,
    work_date: data.workDate,
    hours: data.hours,
    created_at: ts,
    updated_at: ts,
  };
  const { data: created, error } = await getSupabase()
    .from("project_time_logs")
    .insert(row)
    .select()
    .single();
  dbError(error);
  return toProjectTimeLogRec(created as ProjectTimeLogRow);
}

export async function updateProjectTimeLogByDate(
  projectId: string,
  workDate: string,
  hours: number
): Promise<ProjectTimeLogRec | null> {
  const { data, error } = await getSupabase()
    .from("project_time_logs")
    .update({ hours, updated_at: nowISO() })
    .eq("project_id", projectId)
    .eq("work_date", workDate)
    .select()
    .maybeSingle();
  dbError(error);
  return data ? toProjectTimeLogRec(data as ProjectTimeLogRow) : null;
}

export async function deleteProjectTimeLogByDate(
  projectId: string,
  workDate: string
): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("project_time_logs")
    .delete()
    .eq("project_id", projectId)
    .eq("work_date", workDate)
    .select("id")
    .maybeSingle();
  dbError(error);
  return !!data;
}

export type EnrichedProjectComment = ProjectCommentRec & {
  author: PublicUser;
  reactions: { emoji: string; userId: string; userName: string }[];
};

export async function listProjectComments(projectId: string): Promise<EnrichedProjectComment[]> {
  const { data: comments, error: cErr } = await getSupabase()
    .from("project_comments")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  dbError(cErr);
  const rows = (comments as ProjectCommentRow[] | null) ?? [];
  if (rows.length === 0) return [];

  const commentIds = rows.map((r) => r.id);
  const { data: reactions, error: rErr } = await getSupabase()
    .from("project_comment_reactions")
    .select("*")
    .in("comment_id", commentIds);
  dbError(rErr);
  const reactionRows = (reactions as ProjectCommentReactionRow[] | null) ?? [];

  const users = await listUsers();
  const userMap = new Map(users.map((u) => [u._id, u]));

  const reactionsByCommentId = new Map<string, { emoji: string; userId: string; userName: string }[]>();
  for (const row of reactionRows) {
    const u = userMap.get(row.user_id);
    const list = reactionsByCommentId.get(row.comment_id) ?? [];
    list.push({ emoji: row.emoji, userId: row.user_id, userName: u?.name ?? "Member" });
    reactionsByCommentId.set(row.comment_id, list);
  }

  const enriched: EnrichedProjectComment[] = [];
  for (const row of rows) {
    const authorUser = userMap.get(row.author_id);
    enriched.push({
      ...toProjectCommentRec(row),
      author: authorUser ? await publicUser(authorUser) : stubPublicUser(row.author_id),
      reactions: reactionsByCommentId.get(row.id) ?? [],
    });
  }
  return enriched;
}

export async function createProjectComment(data: {
  projectId: string;
  authorId: string;
  body: string;
  parentId?: string | null;
}): Promise<EnrichedProjectComment | null> {
  const ts = nowISO();
  const row = {
    id: newId(),
    project_id: data.projectId,
    author_id: data.authorId,
    parent_id: data.parentId ?? null,
    body: data.body.trim(),
    created_at: ts,
    updated_at: ts,
  };
  const { data: created, error } = await getSupabase().from("project_comments").insert(row).select().single();
  dbError(error);
  const rec = toProjectCommentRec(created as ProjectCommentRow);
  const author = await findUserById(rec.authorId);
  return {
    ...rec,
    author: author ? await publicUser(author) : stubPublicUser(rec.authorId),
    reactions: [],
  };
}

export async function findProjectCommentById(id: string): Promise<ProjectCommentRec | null> {
  const { data, error } = await getSupabase().from("project_comments").select("*").eq("id", id).maybeSingle();
  dbError(error);
  return data ? toProjectCommentRec(data as ProjectCommentRow) : null;
}

export async function updateProjectComment(id: string, body: string): Promise<ProjectCommentRec | null> {
  const { data, error } = await getSupabase()
    .from("project_comments")
    .update({ body: body.trim(), updated_at: nowISO() })
    .eq("id", id)
    .select()
    .maybeSingle();
  dbError(error);
  return data ? toProjectCommentRec(data as ProjectCommentRow) : null;
}

export async function deleteProjectComment(id: string): Promise<boolean> {
  const { data, error } = await getSupabase().from("project_comments").delete().eq("id", id).select("id").maybeSingle();
  dbError(error);
  return !!data;
}

export async function toggleProjectCommentReaction(
  commentId: string,
  userId: string,
  emoji: string
): Promise<{ added: boolean }> {
  const { data: existing } = await getSupabase()
    .from("project_comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await getSupabase().from("project_comment_reactions").delete().eq("id", (existing as { id: string }).id);
    dbError(error);
    return { added: false };
  }

  const { error } = await getSupabase().from("project_comment_reactions").insert({
    id: newId(),
    comment_id: commentId,
    user_id: userId,
    emoji,
    created_at: nowISO(),
  });
  dbError(error);
  return { added: true };
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

export async function findLatestPasswordResetForUser(
  userId: string
): Promise<{ createdAt: string } | null> {
  const { data, error } = await getSupabase()
    .from("password_resets")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  dbError(error);
  if (!data) return null;
  const row = data as { created_at: string };
  return { createdAt: row.created_at };
}

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

/* ----------------------- Email verification ----------------------- */

export async function createEmailVerificationCode(
  userId: string,
  codeHash: string,
  expiresAt: string
): Promise<void> {
  await getSupabase().from("email_verification_codes").delete().eq("user_id", userId);
  const { error } = await getSupabase().from("email_verification_codes").insert({
    id: newId(),
    user_id: userId,
    code_hash: codeHash,
    expires_at: expiresAt,
  });
  dbError(error);
}

export async function findLatestEmailVerificationCode(
  userId: string
): Promise<{ codeHash: string; expiresAt: string; createdAt: string } | null> {
  const { data, error } = await getSupabase()
    .from("email_verification_codes")
    .select("code_hash, expires_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  dbError(error);
  if (!data) return null;
  const row = data as { code_hash: string; expires_at: string; created_at: string };
  return {
    codeHash: row.code_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export async function deleteEmailVerificationCodes(userId: string): Promise<void> {
  const { error } = await getSupabase().from("email_verification_codes").delete().eq("user_id", userId);
  dbError(error);
}

export async function markEmailVerified(userId: string): Promise<UserRec | null> {
  return updateUser(userId, { emailVerifiedAt: nowISO() });
}

/* ----------------------- 2FA & devices ----------------------- */

export async function recordKnownDevice(
  userId: string,
  device: { deviceHash: string; browser: string; os: string; ip: string; country: string }
): Promise<{ isNew: boolean }> {
  const { data: existing, error: findErr } = await getSupabase()
    .from("user_known_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("device_hash", device.deviceHash)
    .maybeSingle();
  dbError(findErr);

  if (existing) {
    const { error } = await getSupabase()
      .from("user_known_devices")
      .update({
        browser: device.browser,
        os: device.os,
        last_ip: device.ip,
        last_country: device.country,
        last_seen_at: nowISO(),
      })
      .eq("id", (existing as { id: string }).id);
    dbError(error);
    return { isNew: false };
  }

  const { error } = await getSupabase().from("user_known_devices").insert({
    id: newId(),
    user_id: userId,
    device_hash: device.deviceHash,
    browser: device.browser,
    os: device.os,
    last_ip: device.ip,
    last_country: device.country,
  });
  dbError(error);
  return { isNew: true };
}

export async function isTrusted2faDevice(userId: string, deviceHash: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("trusted_2fa_devices")
    .select("id, expires_at")
    .eq("user_id", userId)
    .eq("device_hash", deviceHash)
    .maybeSingle();
  dbError(error);
  if (!data) return false;
  const row = data as { expires_at: string };
  return new Date(row.expires_at).getTime() > Date.now();
}

export async function upsertTrusted2faDevice(
  userId: string,
  device: { deviceHash: string; deviceLabel: string; browser: string; os: string },
  expiresAt: string
): Promise<void> {
  await getSupabase().from("trusted_2fa_devices").delete().eq("user_id", userId).eq("device_hash", device.deviceHash);
  const { error } = await getSupabase().from("trusted_2fa_devices").insert({
    id: newId(),
    user_id: userId,
    device_hash: device.deviceHash,
    device_label: device.deviceLabel,
    browser: device.browser,
    os: device.os,
    expires_at: expiresAt,
  });
  dbError(error);
}
