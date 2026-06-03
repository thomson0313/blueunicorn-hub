export type Role = "admin" | "member";

export type SessionUser = {
  sub: string;
  name: string;
  email: string;
  role: Role;
};

export type MemberField = {
  _id: string;
  name: string;
};

export type PublicUser = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  username?: string | null;
  avatarUrl?: string | null;
  skills?: string;
  bio?: string;
  fieldId?: string | null;
  fieldName?: string | null;
};

export type Profile = {
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

export type ProjectStatus = "in_progress" | "completed" | "canceled" | "archived";

export type Project = {
  _id: string;
  owner: PublicUser | string;
  fieldId: string | null;
  fieldName: string | null;
  title: string;
  description: string;
  budget: string;
  timeline: string;
  completionRate: number;
  status: ProjectStatus;
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
