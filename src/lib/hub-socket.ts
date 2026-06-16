import type { Server as SocketIOServer } from "socket.io";
import type { HubNotification } from "@/lib/hub-notifications";

export function broadcastHubNotification(
  io: SocketIOServer,
  userId: string,
  notification: HubNotification
) {
  io.to(`user:${userId}`).emit("hub:notification", { notification });
}

export function getSocketIo(): SocketIOServer | undefined {
  return (globalThis as unknown as { _io?: SocketIOServer })._io;
}
