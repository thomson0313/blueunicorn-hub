import { loadEnvConfig } from "@next/env";
import "./src/lib/als-polyfill";
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { parse as parseCookie } from "cookie";
import { connectDB } from "./src/lib/db";
import { verifySession, COOKIE_NAME, type SessionPayload } from "./src/lib/auth";
import { dmKeyFor, createMessage } from "./src/lib/repo";
import type { ScreenShareState, ScreenShareParticipant } from "./src/lib/screen-share-types";

// Load .env.local / .env so this standalone process has the same env as Next.
loadEnvConfig(process.cwd());

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

type AppSocket = Socket & { data: { user?: SessionPayload } };

const onlineCounts = new Map<string, number>();

function onlineUserIds(): string[] {
  return [...onlineCounts.keys()];
}

const VIEWER_ROOM = "screenshare:viewers";

type InitSegment = { mimeType: string; data: Buffer };

type ScreenShareSession = {
  hostId: string;
  hostName: string;
  viewers: Map<string, string>;
  pending: Map<string, string>;
  initSegment: InitSegment | null;
};

let screenShareSession: ScreenShareSession | null = null;

function participantMapToList(map: Map<string, string>): ScreenShareParticipant[] {
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

function serializeScreenShareState(): ScreenShareState {
  if (!screenShareSession) {
    return { active: false, host: null, viewers: [], pendingRequests: [] };
  }
  return {
    active: true,
    host: { id: screenShareSession.hostId, name: screenShareSession.hostName },
    viewers: participantMapToList(screenShareSession.viewers),
    pendingRequests: participantMapToList(screenShareSession.pending),
  };
}

function broadcastScreenShareState(io: SocketIOServer) {
  io.emit("screenshare:state", serializeScreenShareState());
}

async function endScreenShareSession(io: SocketIOServer) {
  if (!screenShareSession) return;
  screenShareSession = null;
  const sockets = await io.in(VIEWER_ROOM).fetchSockets();
  for (const s of sockets) s.leave(VIEWER_ROOM);
  broadcastScreenShareState(io);
  io.emit("screenshare:ended");
}

function toBuffer(value: unknown): Buffer | null {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

app.prepare().then(async () => {
  await connectDB().catch((err) => {
    console.error("[server] Data store initialization failed:", err.message);
  });

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    // Screen-share chunks at 2.5 Mbps × 500 ms ≈ 160 KB — give plenty of headroom.
    maxHttpBufferSize: 16 * 1024 * 1024,
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

    socket.emit("screenshare:state", serializeScreenShareState());

    // If this socket belongs to a current viewer (e.g. tab refresh / second tab),
    // resume the stream by joining the viewer room and replaying the init segment.
    if (screenShareSession?.viewers.has(userId)) {
      socket.join(VIEWER_ROOM);
      if (screenShareSession.initSegment) {
        socket.emit("screenshare:init", {
          mimeType: screenShareSession.initSegment.mimeType,
          data: screenShareSession.initSegment.data,
        });
      }
    }

    socket.on("screenshare:start", () => {
      if (user.role !== "admin") return;
      if (screenShareSession) return;
      screenShareSession = {
        hostId: userId,
        hostName: user.name,
        viewers: new Map(),
        pending: new Map(),
        initSegment: null,
      };
      broadcastScreenShareState(io);
    });

    socket.on("screenshare:request-join", () => {
      if (!screenShareSession || screenShareSession.hostId === userId) return;
      if (
        screenShareSession.viewers.has(userId) ||
        screenShareSession.pending.has(userId)
      ) {
        return;
      }
      screenShareSession.pending.set(userId, user.name);
      broadcastScreenShareState(io);
    });

    socket.on("screenshare:accept", async (payload: { userId?: string }) => {
      if (!screenShareSession || screenShareSession.hostId !== userId) return;
      const targetId = payload?.userId;
      if (!targetId || !screenShareSession.pending.has(targetId)) return;

      const name = screenShareSession.pending.get(targetId)!;
      screenShareSession.pending.delete(targetId);
      screenShareSession.viewers.set(targetId, name);
      broadcastScreenShareState(io);
      io.to(`user:${targetId}`).emit("screenshare:accepted");

      // Add every socket belonging to the accepted user to the viewer room
      // and send them the latest init segment so MediaSource can decode.
      const userSockets = await io.in(`user:${targetId}`).fetchSockets();
      for (const s of userSockets) s.join(VIEWER_ROOM);

      if (screenShareSession.initSegment) {
        io.to(`user:${targetId}`).emit("screenshare:init", {
          mimeType: screenShareSession.initSegment.mimeType,
          data: screenShareSession.initSegment.data,
        });
      }
    });

    socket.on("screenshare:reject", (payload: { userId?: string }) => {
      if (!screenShareSession || screenShareSession.hostId !== userId) return;
      const targetId = payload?.userId;
      if (!targetId) return;
      screenShareSession.pending.delete(targetId);
      broadcastScreenShareState(io);
      io.to(`user:${targetId}`).emit("screenshare:rejected");
    });

    socket.on("screenshare:end", () => {
      if (!screenShareSession || screenShareSession.hostId !== userId) return;
      void endScreenShareSession(io);
    });

    socket.on("screenshare:leave", async () => {
      if (!screenShareSession) return;
      if (screenShareSession.hostId === userId) {
        await endScreenShareSession(io);
        return;
      }
      const wasViewer = screenShareSession.viewers.delete(userId);
      const wasPending = screenShareSession.pending.delete(userId);
      if (wasViewer) {
        const userSockets = await io.in(`user:${userId}`).fetchSockets();
        for (const s of userSockets) s.leave(VIEWER_ROOM);
        io.to(`user:${screenShareSession.hostId}`).emit("screenshare:viewer-left", {
          userId,
        });
      }
      if (wasViewer || wasPending) broadcastScreenShareState(io);
    });

    // Host sends the WebM init segment (first MediaRecorder chunk). Stored so
    // late joiners can decode; also broadcast to current viewers.
    socket.on(
      "screenshare:init",
      (payload: { mimeType?: string; data?: unknown }) => {
        if (!screenShareSession || screenShareSession.hostId !== userId) return;
        const mimeType = typeof payload?.mimeType === "string" ? payload.mimeType : "";
        const buffer = toBuffer(payload?.data);
        if (!mimeType || !buffer) return;
        screenShareSession.initSegment = { mimeType, data: buffer };
        io.to(VIEWER_ROOM).emit("screenshare:init", { mimeType, data: buffer });
      }
    );

    // Host streams subsequent MediaRecorder chunks — relay verbatim to viewers.
    socket.on("screenshare:chunk", (data: unknown) => {
      if (!screenShareSession || screenShareSession.hostId !== userId) return;
      const buffer = toBuffer(data);
      if (!buffer) return;
      io.to(VIEWER_ROOM).emit("screenshare:chunk", buffer);
    });

    socket.on("general:send", async (payload: { content: string }) => {
      const content = (payload?.content || "").trim();
      if (!content) return;
      const doc = await createMessage({
        sender: userId,
        channelType: "general",
        content,
      });
      io.to("general").emit("general:message", {
        _id: doc._id,
        sender: { _id: userId, name: user.name, role: user.role },
        content,
        createdAt: doc.createdAt,
      });
    });

    socket.on("dm:send", async (payload: { to: string; content: string }) => {
      const content = (payload?.content || "").trim();
      const to = payload?.to;
      if (!content || !to) return;
      const doc = await createMessage({
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

    socket.on("disconnect", async () => {
      if (screenShareSession) {
        if (screenShareSession.hostId === userId) {
          // The disconnect might just be a refresh — only fully end if no other
          // host socket is still connected.
          const remainingHostSockets = await io.in(`user:${userId}`).fetchSockets();
          if (remainingHostSockets.length === 0) {
            await endScreenShareSession(io);
          }
        } else {
          // Evict the viewer/pending entry only when their last socket goes away.
          const remainingUserSockets = await io.in(`user:${userId}`).fetchSockets();
          if (remainingUserSockets.length === 0) {
            const wasViewer = screenShareSession.viewers.delete(userId);
            const wasPending = screenShareSession.pending.delete(userId);
            if (wasViewer) {
              io.to(`user:${screenShareSession.hostId}`).emit("screenshare:viewer-left", {
                userId,
              });
            }
            if (wasViewer || wasPending) broadcastScreenShareState(io);
          }
        }
      }

      const count = (onlineCounts.get(userId) || 1) - 1;
      if (count <= 0) onlineCounts.delete(userId);
      else onlineCounts.set(userId, count);
      io.emit("presence:update", onlineUserIds());
    });
  });

  // Make io reachable from Next route handlers (same process) for instant pushes.
  (globalThis as unknown as { _io?: SocketIOServer })._io = io;

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
