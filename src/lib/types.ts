export type Role = "admin" | "member";

export type SessionUser = {
  sub: string;
  name: string;
  email: string;
  role: Role;
};

export type PublicUser = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  username?: string | null;
  avatarUrl?: string | null;
  skills?: string;
  plan?: string;
};

export type Profile = {
  _id: string;
  name: string;
  email: string;
  username: string | null;
  role: Role;
  avatarUrl: string | null;
  skills: string;
  plan: string;
};

export type Project = {
  _id: string;
  owner: PublicUser | string;
  title: string;
  description: string;
  completionRate: number;
  status: "not_started" | "in_progress" | "completed" | "on_hold";
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  _id: string;
  sender: { _id: string; name: string; role: Role };
  recipient?: string;
  content: string;
  createdAt: string;
};

export type AlertItem = {
  _id: string;
  title: string;
  content: string;
  scheduledAt: string;
  status?: "pending" | "delivered";
};
