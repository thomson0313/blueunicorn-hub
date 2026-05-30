import {
  readDB,
  writeDB,
  newId,
  nowISO,
  type UserRec,
  type ProjectRec,
  type MessageRec,
  type AlertRec,
  type Role,
} from "./store";

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

export function findUserById(id: string): UserRec | null {
  return readDB().users.find((u) => u._id === id) ?? null;
}

export function findUserByEmail(email: string): UserRec | null {
  const e = email.toLowerCase();
  return readDB().users.find((u) => u.email === e) ?? null;
}

export function findUserByEmailOrUsername(identifier: string): UserRec | null {
  const id = identifier.trim();
  const lower = id.toLowerCase();
  return readDB().users.find((u) => u.email === lower || u.username === id) ?? null;
}

export function emailOrUsernameTaken(email: string, username?: string | null): boolean {
  const e = email.toLowerCase();
  return readDB().users.some((u) => u.email === e || (!!username && u.username === username));
}

export function countUsers(): number {
  return readDB().users.length;
}

export function listUsers(): UserRec[] {
  return readDB().users.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listUsersExcept(id: string): UserRec[] {
  return listUsers().filter((u) => u._id !== id);
}

export function createUser(data: {
  name: string;
  email: string;
  username?: string | null;
  passwordHash: string;
  role: Role;
}): UserRec {
  const db = readDB();
  const ts = nowISO();
  const user: UserRec = {
    _id: newId(),
    name: data.name,
    email: data.email.toLowerCase(),
    username: data.username || null,
    passwordHash: data.passwordHash,
    role: data.role,
    createdAt: ts,
    updatedAt: ts,
  };
  db.users.push(user);
  writeDB(db);
  return user;
}

export function updateUser(
  id: string,
  patch: Partial<Pick<UserRec, "name" | "role" | "passwordHash" | "avatarUrl" | "skills" | "plan">>
): UserRec | null {
  const db = readDB();
  const user = db.users.find((u) => u._id === id);
  if (!user) return null;
  if (patch.name !== undefined) user.name = patch.name;
  if (patch.role !== undefined) user.role = patch.role;
  if (patch.passwordHash !== undefined) user.passwordHash = patch.passwordHash;
  if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl;
  if (patch.skills !== undefined) user.skills = patch.skills;
  if (patch.plan !== undefined) user.plan = patch.plan;
  user.updatedAt = nowISO();
  writeDB(db);
  return user;
}

export function deleteUser(id: string): boolean {
  const db = readDB();
  const before = db.users.length;
  db.users = db.users.filter((u) => u._id !== id);
  db.projects = db.projects.filter((p) => p.owner !== id);
  db.messages = db.messages.filter((m) => m.sender !== id && m.recipient !== id);
  writeDB(db);
  return db.users.length < before;
}

/* ---------------------------- Projects ---------------------------- */

type ProjectWithOwner = Omit<ProjectRec, "owner"> & { owner: PublicUser | string };

function attachOwner(p: ProjectRec, users: UserRec[]): ProjectWithOwner {
  const owner = users.find((u) => u._id === p.owner);
  return { ...p, owner: owner ? publicUser(owner) : p.owner };
}

export function listProjectsByOwner(owner: string, populate = false): ProjectWithOwner[] {
  const db = readDB();
  const list = db.projects
    .filter((p) => p.owner === owner)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return populate ? list.map((p) => attachOwner(p, db.users)) : list;
}

export function listAllProjects(populate = false): ProjectWithOwner[] {
  const db = readDB();
  const list = db.projects.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return populate ? list.map((p) => attachOwner(p, db.users)) : list;
}

export function projectCountsByOwner(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of readDB().projects) counts.set(p.owner, (counts.get(p.owner) || 0) + 1);
  return counts;
}

export function findProjectById(id: string): ProjectRec | null {
  return readDB().projects.find((p) => p._id === id) ?? null;
}

export function createProject(data: {
  owner: string;
  title: string;
  description?: string;
  completionRate?: number;
  status?: ProjectRec["status"];
}): ProjectWithOwner {
  const db = readDB();
  const ts = nowISO();
  const project: ProjectRec = {
    _id: newId(),
    owner: data.owner,
    title: data.title,
    description: data.description ?? "",
    completionRate: data.completionRate ?? 0,
    status: data.status ?? "in_progress",
    createdAt: ts,
    updatedAt: ts,
  };
  db.projects.push(project);
  writeDB(db);
  return attachOwner(project, db.users);
}

export function updateProject(
  id: string,
  patch: Partial<Pick<ProjectRec, "title" | "description" | "completionRate" | "status">>
): ProjectWithOwner | null {
  const db = readDB();
  const project = db.projects.find((p) => p._id === id);
  if (!project) return null;
  Object.assign(project, patch);
  project.updatedAt = nowISO();
  writeDB(db);
  return attachOwner(project, db.users);
}

export function deleteProject(id: string): boolean {
  const db = readDB();
  const before = db.projects.length;
  db.projects = db.projects.filter((p) => p._id !== id);
  writeDB(db);
  return db.projects.length < before;
}

/* ---------------------------- Messages ---------------------------- */

export type MessageWithSender = Omit<MessageRec, "sender"> & {
  sender: { _id: string; name: string; role: Role };
};

function attachSender(m: MessageRec, users: UserRec[]): MessageWithSender {
  const sender = users.find((u) => u._id === m.sender);
  return {
    ...m,
    sender: sender
      ? { _id: sender._id, name: sender.name, role: sender.role }
      : { _id: m.sender, name: "Unknown", role: "member" },
  };
}

export function createMessage(data: {
  sender: string;
  channelType: "general" | "dm";
  recipient?: string | null;
  dmKey?: string | null;
  content: string;
}): MessageRec {
  const db = readDB();
  const ts = nowISO();
  const message: MessageRec = {
    _id: newId(),
    sender: data.sender,
    channelType: data.channelType,
    recipient: data.recipient ?? null,
    dmKey: data.dmKey ?? null,
    content: data.content,
    createdAt: ts,
    updatedAt: ts,
  };
  db.messages.push(message);
  writeDB(db);
  return message;
}

export function listGeneralMessages(limit = 200): MessageWithSender[] {
  const db = readDB();
  return db.messages
    .filter((m) => m.channelType === "general")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-limit)
    .map((m) => attachSender(m, db.users));
}

export function listDmMessages(dmKey: string, limit = 200): MessageWithSender[] {
  const db = readDB();
  return db.messages
    .filter((m) => m.channelType === "dm" && m.dmKey === dmKey)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-limit)
    .map((m) => attachSender(m, db.users));
}

/* ----------------------------- Alerts ----------------------------- */

export function createAlert(data: {
  createdBy: string;
  title: string;
  content: string;
  scheduledAt: string;
}): AlertRec {
  const db = readDB();
  const ts = nowISO();
  const alert: AlertRec = {
    _id: newId(),
    createdBy: data.createdBy,
    title: data.title,
    content: data.content,
    scheduledAt: data.scheduledAt,
    status: "pending",
    deliveredAt: null,
    seenBy: [],
    createdAt: ts,
    updatedAt: ts,
  };
  db.alerts.push(alert);
  writeDB(db);
  return alert;
}

export function listAlerts(): AlertRec[] {
  return readDB().alerts.slice().sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
}

export function listDueAlerts(): AlertRec[] {
  const now = Date.now();
  return readDB().alerts.filter(
    (a) => a.status === "pending" && new Date(a.scheduledAt).getTime() <= now
  );
}

export function markAlertDelivered(id: string): void {
  const db = readDB();
  const alert = db.alerts.find((a) => a._id === id);
  if (!alert) return;
  alert.status = "delivered";
  alert.deliveredAt = nowISO();
  alert.updatedAt = nowISO();
  writeDB(db);
}

export function deleteAlert(id: string): boolean {
  const db = readDB();
  const before = db.alerts.length;
  db.alerts = db.alerts.filter((a) => a._id !== id);
  writeDB(db);
  return db.alerts.length < before;
}
