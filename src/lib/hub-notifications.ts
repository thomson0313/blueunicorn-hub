import { findProjectById, findUserById, listUsers, newId, nowISO } from "@/lib/repo";
import { broadcastHubNotification, getSocketIo } from "@/lib/hub-socket";
import { getSupabase } from "@/lib/supabase";

export type HubNotificationType = "project_update" | "comment";

export type HubNotification = {
  _id: string;
  type: HubNotificationType;
  title: string;
  body: string;
  projectId: string | null;
  read: boolean;
  createdAt: string;
};

type Row = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  project_id: string | null;
  read_at: string | null;
  created_at: string;
};

function toNotif(row: Row): HubNotification {
  return {
    _id: row.id,
    type: row.type as HubNotificationType,
    title: row.title,
    body: row.body,
    projectId: row.project_id,
    read: !!row.read_at,
    createdAt: row.created_at,
  };
}

async function recipientIds(projectOwnerId: string, actorId: string): Promise<string[]> {
  const ids = new Set<string>();
  if (projectOwnerId !== actorId) ids.add(projectOwnerId);
  const users = await listUsers();
  for (const u of users) {
    if (u.role === "admin" && u._id !== actorId) ids.add(u._id);
  }
  return [...ids];
}

export async function createHubNotification(data: {
  userId: string;
  type: HubNotificationType;
  title: string;
  body: string;
  projectId?: string | null;
}): Promise<void> {
  const id = newId();
  const createdAt = nowISO();
  await getSupabase().from("hub_notifications").insert({
    id,
    user_id: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    project_id: data.projectId ?? null,
    created_at: createdAt,
  });

  const io = getSocketIo();
  if (io) {
    broadcastHubNotification(io, data.userId, {
      _id: id,
      type: data.type,
      title: data.title,
      body: data.body,
      projectId: data.projectId ?? null,
      read: false,
      createdAt,
    });
  }
}

export async function notifyProjectActivity(
  projectId: string,
  actorId: string,
  kind: "project_update" | "comment",
  detail: string
): Promise<void> {
  const project = await findProjectById(projectId);
  if (!project) return;
  const actor = await findUserById(actorId);
  const actorName = actor?.name ?? "Someone";
  const title =
    kind === "comment"
      ? `New comment on "${project.title}"`
      : `Project updated: "${project.title}"`;
  const body = `${actorName}: ${detail}`;

  for (const userId of await recipientIds(project.owner, actorId)) {
    await createHubNotification({ userId, type: kind, title, body, projectId });
  }
}

export async function listHubNotificationsSince(userId: string, since: string): Promise<HubNotification[]> {
  const { data, error } = await getSupabase()
    .from("hub_notifications")
    .select("*")
    .eq("user_id", userId)
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(toNotif);
}

export async function listHubNotifications(
  userId: string,
  unreadOnly = false
): Promise<HubNotification[]> {
  let q = getSupabase()
    .from("hub_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(80);
  if (unreadOnly) q = q.is("read_at", null);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(toNotif);
}

export async function countUnreadHubNotifications(userId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("hub_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markHubNotificationRead(id: string, userId: string): Promise<void> {
  await getSupabase()
    .from("hub_notifications")
    .update({ read_at: nowISO() })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function markAllHubNotificationsRead(userId: string): Promise<void> {
  await getSupabase()
    .from("hub_notifications")
    .update({ read_at: nowISO() })
    .eq("user_id", userId)
    .is("read_at", null);
}
