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
  emailVerified?: boolean;
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
  emailVerified: boolean;
};

export type ProjectStatus = "in_progress" | "completed" | "canceled" | "archived" | "upcoming";

export type BudgetType = "hourly" | "fixed";

export type ProjectTimeLog = {
  _id: string;
  projectId: string;
  userId: string;
  workDate: string;
  hours: number;
  createdAt: string;
};

export type Project = {
  _id: string;
  owner: PublicUser | string;
  fieldId: string | null;
  fieldName: string | null;
  title: string;
  description: string;
  budget: string;
  budgetType: BudgetType;
  budgetCurrency: string;
  budgetAmount: string;
  estimatedHours: number;
  timeline: string;
  previewLink: string;
  githubLink: string;
  completionRate: number;
  status: ProjectStatus;
  timeByDate?: Record<string, number>;
  totalLoggedHours?: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectCommentReaction = {
  emoji: string;
  userId: string;
  userName: string;
};

export type ProjectComment = {
  _id: string;
  projectId: string;
  parentId: string | null;
  body: string;
  author: PublicUser;
  createdAt: string;
  updatedAt: string;
  reactions: ProjectCommentReaction[];
  replies: ProjectComment[];
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
