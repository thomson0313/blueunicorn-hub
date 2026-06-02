import crypto from "node:crypto";
import {
  User,
  Project,
  Message,
  Alert,
  type UserDoc,
  type ProjectDoc,
  type MessageDoc,
  type AlertDoc,
} from "./models";

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

export function dmKeyFor(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

function toUserRec(doc: UserDoc): UserRec {
  return {
    _id: String(doc._id),
    name: doc.name,
    email: doc.email,
    username: doc.username ?? null,
    passwordHash: doc.passwordHash,
    role: doc.role as Role,
    avatarUrl: doc.avatarUrl ?? null,
    skills: doc.skills ?? "",
    plan: doc.plan ?? "",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toProjectRec(doc: ProjectDoc): ProjectRec {
  return {
    _id: String(doc._id),
    owner: doc.owner,
    title: doc.title,
    description: doc.description,
    completionRate: doc.completionRate,
    status: doc.status as ProjectRec["status"],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toMessageRec(doc: MessageDoc): MessageRec {
  return {
    _id: String(doc._id),
    sender: doc.sender,
    channelType: doc.channelType as MessageRec["channelType"],
    recipient: doc.recipient ?? null,
    dmKey: doc.dmKey ?? null,
    content: doc.content,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toAlertRec(doc: AlertDoc): AlertRec {
  return {
    _id: String(doc._id),
    createdBy: doc.createdBy,
    title: doc.title,
    content: doc.content,
    scheduledAt: doc.scheduledAt,
    status: doc.status as AlertRec["status"],
    deliveredAt: doc.deliveredAt ?? null,
    seenBy: doc.seenBy ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
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
  const doc = await User.findById(id).lean<UserDoc>();
  return doc ? toUserRec(doc) : null;
}

export async function findUserByEmail(email: string): Promise<UserRec | null> {
  const doc = await User.findOne({ email: email.toLowerCase() }).lean<UserDoc>();
  return doc ? toUserRec(doc) : null;
}

export async function findUserByEmailOrUsername(identifier: string): Promise<UserRec | null> {
  const id = identifier.trim();
  const lower = id.toLowerCase();
  const doc = await User.findOne({ $or: [{ email: lower }, { username: id }] }).lean<UserDoc>();
  return doc ? toUserRec(doc) : null;
}

export async function emailOrUsernameTaken(email: string, username?: string | null): Promise<boolean> {
  const e = email.toLowerCase();
  const clauses: Record<string, string>[] = [{ email: e }];
  if (username) clauses.push({ username });
  const count = await User.countDocuments({ $or: clauses });
  return count > 0;
}

export async function countUsers(): Promise<number> {
  return User.countDocuments();
}

export async function listUsers(): Promise<UserRec[]> {
  const docs = await User.find().sort({ createdAt: 1 }).lean<UserDoc[]>();
  return docs.map(toUserRec);
}

export async function listUsersExcept(id: string): Promise<UserRec[]> {
  const docs = await User.find({ _id: { $ne: id } }).sort({ createdAt: 1 }).lean<UserDoc[]>();
  return docs.map(toUserRec);
}

export async function createUser(data: {
  name: string;
  email: string;
  username?: string | null;
  passwordHash: string;
  role: Role;
}): Promise<UserRec> {
  const ts = nowISO();
  const doc = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    username: data.username || null,
    passwordHash: data.passwordHash,
    role: data.role,
    createdAt: ts,
    updatedAt: ts,
  });
  return toUserRec(doc.toObject() as UserDoc);
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<UserRec, "name" | "role" | "passwordHash" | "avatarUrl" | "skills" | "plan">>
): Promise<UserRec | null> {
  const doc = await User.findByIdAndUpdate(
    id,
    { ...patch, updatedAt: nowISO() },
    { new: true }
  ).lean<UserDoc>();
  return doc ? toUserRec(doc) : null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const user = await User.findByIdAndDelete(id);
  if (!user) return false;
  await Promise.all([
    Project.deleteMany({ owner: id }),
    Message.deleteMany({ $or: [{ sender: id }, { recipient: id }] }),
  ]);
  return true;
}

/* ---------------------------- Projects ---------------------------- */

type ProjectWithOwner = Omit<ProjectRec, "owner"> & { owner: PublicUser | string };

async function attachOwner(p: ProjectRec, users?: UserRec[]): Promise<ProjectWithOwner> {
  const owner =
    users?.find((u) => u._id === p.owner) ??
    (await findUserById(p.owner));
  return { ...p, owner: owner ? publicUser(owner) : p.owner };
}

export async function listProjectsByOwner(owner: string, populate = false): Promise<ProjectWithOwner[]> {
  const docs = await Project.find({ owner }).sort({ updatedAt: -1 }).lean<ProjectDoc[]>();
  const projects = docs.map(toProjectRec);
  if (!populate) return projects;
  const users = await listUsers();
  return Promise.all(projects.map((p) => attachOwner(p, users)));
}

export async function listAllProjects(populate = false): Promise<ProjectWithOwner[]> {
  const docs = await Project.find().sort({ updatedAt: -1 }).lean<ProjectDoc[]>();
  const projects = docs.map(toProjectRec);
  if (!populate) return projects;
  const users = await listUsers();
  return Promise.all(projects.map((p) => attachOwner(p, users)));
}

export async function projectCountsByOwner(): Promise<Map<string, number>> {
  const rows = await Project.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$owner", count: { $sum: 1 } } },
  ]);
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row._id, row.count);
  return counts;
}

export async function findProjectById(id: string): Promise<ProjectRec | null> {
  const doc = await Project.findById(id).lean<ProjectDoc>();
  return doc ? toProjectRec(doc) : null;
}

export async function createProject(data: {
  owner: string;
  title: string;
  description?: string;
  completionRate?: number;
  status?: ProjectRec["status"];
}): Promise<ProjectWithOwner> {
  const ts = nowISO();
  const doc = await Project.create({
    owner: data.owner,
    title: data.title,
    description: data.description ?? "",
    completionRate: data.completionRate ?? 0,
    status: data.status ?? "in_progress",
    createdAt: ts,
    updatedAt: ts,
  });
  return attachOwner(toProjectRec(doc.toObject() as ProjectDoc));
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<ProjectRec, "title" | "description" | "completionRate" | "status">>
): Promise<ProjectWithOwner | null> {
  const doc = await Project.findByIdAndUpdate(
    id,
    { ...patch, updatedAt: nowISO() },
    { new: true }
  ).lean<ProjectDoc>();
  return doc ? attachOwner(toProjectRec(doc)) : null;
}

export async function deleteProject(id: string): Promise<boolean> {
  const result = await Project.findByIdAndDelete(id);
  return !!result;
}

/* ---------------------------- Messages ---------------------------- */

export type MessageWithSender = Omit<MessageRec, "sender"> & {
  sender: { _id: string; name: string; role: Role };
};

async function attachSender(m: MessageRec, users?: UserRec[]): Promise<MessageWithSender> {
  const sender =
    users?.find((u) => u._id === m.sender) ??
    (await findUserById(m.sender));
  return {
    ...m,
    sender: sender
      ? { _id: sender._id, name: sender.name, role: sender.role }
      : { _id: m.sender, name: "Unknown", role: "member" },
  };
}

export async function createMessage(data: {
  sender: string;
  channelType: "general" | "dm";
  recipient?: string | null;
  dmKey?: string | null;
  content: string;
}): Promise<MessageRec> {
  const ts = nowISO();
  const doc = await Message.create({
    sender: data.sender,
    channelType: data.channelType,
    recipient: data.recipient ?? null,
    dmKey: data.dmKey ?? null,
    content: data.content,
    createdAt: ts,
    updatedAt: ts,
  });
  return toMessageRec(doc.toObject() as MessageDoc);
}

export async function listGeneralMessages(limit = 200): Promise<MessageWithSender[]> {
  const docs = await Message.find({ channelType: "general" })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean<MessageDoc[]>();
  const messages = docs.map(toMessageRec);
  const users = await listUsers();
  return Promise.all(messages.map((m) => attachSender(m, users)));
}

export async function listDmMessages(dmKey: string, limit = 200): Promise<MessageWithSender[]> {
  const docs = await Message.find({ channelType: "dm", dmKey })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean<MessageDoc[]>();
  const messages = docs.map(toMessageRec);
  const users = await listUsers();
  return Promise.all(messages.map((m) => attachSender(m, users)));
}

/* ----------------------------- Alerts ----------------------------- */

export async function createAlert(data: {
  createdBy: string;
  title: string;
  content: string;
  scheduledAt: string;
}): Promise<AlertRec> {
  const ts = nowISO();
  const doc = await Alert.create({
    createdBy: data.createdBy,
    title: data.title,
    content: data.content,
    scheduledAt: data.scheduledAt,
    status: "pending",
    deliveredAt: null,
    seenBy: [],
    createdAt: ts,
    updatedAt: ts,
  });
  return toAlertRec(doc.toObject() as AlertDoc);
}

export async function listAlerts(): Promise<AlertRec[]> {
  const docs = await Alert.find().sort({ scheduledAt: -1 }).lean<AlertDoc[]>();
  return docs.map(toAlertRec);
}

export async function listDueAlerts(): Promise<AlertRec[]> {
  const now = new Date().toISOString();
  const docs = await Alert.find({ status: "pending", scheduledAt: { $lte: now } }).lean<AlertDoc[]>();
  return docs.map(toAlertRec);
}

export async function markAlertDelivered(id: string): Promise<void> {
  await Alert.findByIdAndUpdate(id, {
    status: "delivered",
    deliveredAt: nowISO(),
    updatedAt: nowISO(),
  });
}

export async function deleteAlert(id: string): Promise<boolean> {
  const result = await Alert.findByIdAndDelete(id);
  return !!result;
}
