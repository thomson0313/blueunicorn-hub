import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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

export interface DBShape {
  users: UserRec[];
  projects: ProjectRec[];
  messages: MessageRec[];
  alerts: AlertRec[];
}

const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.resolve(process.cwd(), "data", "db.json");

const EMPTY: DBShape = { users: [], projects: [], messages: [], alerts: [] };

function ensureFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(EMPTY, null, 2), "utf8");
}

/**
 * Read the whole database from disk. We read on every operation so the data
 * stays consistent regardless of how Next bundles server modules. The dataset
 * for this app is small, so this is plenty fast.
 */
export function readDB(): DBShape {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DBShape>;
    return {
      users: parsed.users ?? [],
      projects: parsed.projects ?? [],
      messages: parsed.messages ?? [],
      alerts: parsed.alerts ?? [],
    };
  } catch {
    return { users: [], projects: [], messages: [], alerts: [] };
  }
}

export function writeDB(db: DBShape): void {
  ensureFile();
  // Atomic write: write to a temp file then rename, so an interrupted write can
  // never truncate or corrupt the real data file.
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DATA_FILE);
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function dmKeyFor(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export function initStore(): void {
  ensureFile();
}
