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

export type ChatMessageAttachment = {
  _id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
};

export type ChatMessageReaction = {
  emoji: string;
  userId: string;
  userName: string;
};

export type ChatMessageReplyPreview = {
  _id: string;
  content: string;
  senderName: string;
  deleted: boolean;
};

export type ChatMessage = {
  _id: string;
  sender: { _id: string; name: string; role: Role };
  recipient?: string;
  channelId?: string | null;
  parentId?: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  attachments?: ChatMessageAttachment[];
  reactions?: ChatMessageReaction[];
  replyTo?: ChatMessageReplyPreview | null;
  /** Client-only: optimistic send in flight */
  pending?: boolean;
};

export type ChatChannel = {
  _id: string;
  name: string;
  visibility: "public" | "private";
  createdBy: string;
  createdAt: string;
};

export type ChatConversationPreview = {
  key: string;
  target: string;
  kind: "general" | "dm" | "channel";
  title: string;
  subtitle?: string;
  lastMessage?: string;
  lastSenderName?: string;
  lastAt?: string;
  avatarName?: string;
  avatarUrl?: string | null;
  online?: boolean;
  visibility?: "public" | "private";
};

export type AlertItem = {
  _id: string;
  title: string;
  content: string;
  scheduledAt: string;
  status?: "pending" | "delivered";
};

export type CalendarScheduleType = "interview" | "event";

export type CalendarSchedule = {
  _id: string;
  userId: string;
  title: string;
  type: CalendarScheduleType;
  description: string;
  meetingLink: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CalendarScheduleWithUser = CalendarSchedule & {
  userName: string;
  userAvatarUrl?: string | null;
};
