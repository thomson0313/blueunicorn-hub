import "./src/lib/als-polyfill";
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { parse as parseCookie } from "cookie";
import cron from "node-cron";
import { loadEnvConfig } from "@next/env";

// Load .env.local / .env so this standalone process has the same env as Next.
loadEnvConfig(process.cwd());

import { connectDB } from "./src/lib/db";
import { ensureAdminSeed } from "./src/lib/seed";
import { verifySession, COOKIE_NAME, type SessionPayload } from "./src/lib/auth";
import { dmKeyFor } from "./src/lib/store";
import { createMessage, listDueAlerts, markAlertDelivered } from "./src/lib/repo";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

type AppSocket = Socket & { data: { user?: SessionPayload } };

// Track online users: userId -> number of active sockets.
const onlineCounts = new Map<string, number>();

function onlineUserIds(): string[] {
  return [...onlineCounts.keys()];
}

app.prepare().then(async () => {
  await connectDB()
    .then(() => ensureAdminSeed())
    .catch((err) => {
      console.error("[server] Data store initialization failed:", err.message);
    });

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
  });

  // Authenticate every socket using the session cookie.
  io.use(async (socket: AppSocket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";
      const cookies = parseCookie(cookieHeader);
      const token = cookies[COOKIE_NAME];
      if (!token) return next(new Error("unauthorized"));
      const session = await verifySession(token);
      if (!session) return next(new Error("unauthorized"));
      socket.data.user = session;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: AppSocket) => {
    const user = socket.data.user!;
    const userId = user.sub;

    socket.join(`user:${userId}`);
    socket.join("general");

    onlineCounts.set(userId, (onlineCounts.get(userId) || 0) + 1);
    io.emit("presence:update", onlineUserIds());

    socket.on("general:send", (payload: { content: string }) => {
      const content = (payload?.content || "").trim();
      if (!content) return;
      const doc = createMessage({ sender: userId, channelType: "general", content });
      io.to("general").emit("general:message", {
        _id: doc._id,
        sender: { _id: userId, name: user.name, role: user.role },
        content,
        createdAt: doc.createdAt,
      });
    });

    socket.on("dm:send", (payload: { to: string; content: string }) => {
      const content = (payload?.content || "").trim();
      const to = payload?.to;
      if (!content || !to) return;
      const doc = createMessage({
        sender: userId,
        channelType: "dm",
        recipient: to,
        dmKey: dmKeyFor(userId, to),
        content,
      });
      const message = {
        _id: doc._id,
        sender: { _id: userId, name: user.name, role: user.role },
        recipient: to,
        content,
        createdAt: doc.createdAt,
      };
      io.to(`user:${to}`).emit("dm:message", message);
      io.to(`user:${userId}`).emit("dm:message", message);
    });

    socket.on("disconnect", () => {
      const count = (onlineCounts.get(userId) || 1) - 1;
      if (count <= 0) onlineCounts.delete(userId);
      else onlineCounts.set(userId, count);
      io.emit("presence:update", onlineUserIds());
    });
  });

  // Make io reachable from Next route handlers (same process) for instant pushes.
  (globalThis as unknown as { _io?: SocketIOServer })._io = io;

  // Alert scheduler: every minute, deliver any pending alerts whose time has come.
  cron.schedule("* * * * *", () => {
    try {
      const due = listDueAlerts();
      for (const alert of due) {
        io.emit("alert:new", {
          _id: alert._id,
          title: alert.title,
          content: alert.content,
          scheduledAt: alert.scheduledAt,
        });
        markAlertDelivered(alert._id);
      }
    } catch (err) {
      console.error("[scheduler] alert delivery error:", (err as Error).message);
    }
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
