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

type ScreenShareSession = {
  hostId: string;
  hostName: string;
  viewers: Map<string, string>;
  pending: Map<string, string>;
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

function endScreenShareSession(io: SocketIOServer) {
  if (!screenShareSession) return;
  screenShareSession = null;
  broadcastScreenShareState(io);
  io.emit("screenshare:ended");
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

    socket.on("screenshare:start", () => {
      if (user.role !== "admin") return;
      if (screenShareSession) return;
      screenShareSession = {
        hostId: userId,
        hostName: user.name,
        viewers: new Map(),
        pending: new Map(),
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

    socket.on("screenshare:accept", (payload: { userId?: string }) => {
      if (!screenShareSession || screenShareSession.hostId !== userId) return;
      const targetId = payload?.userId;
      if (!targetId || !screenShareSession.pending.has(targetId)) return;
      const name = screenShareSession.pending.get(targetId)!;
      screenShareSession.pending.delete(targetId);
      screenShareSession.viewers.set(targetId, name);
      broadcastScreenShareState(io);
      io.to(`user:${targetId}`).emit("screenshare:accepted");
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
      endScreenShareSession(io);
    });

    socket.on("screenshare:leave", () => {
      if (!screenShareSession) return;
      if (screenShareSession.hostId === userId) {
        endScreenShareSession(io);
        return;
      }
      const wasViewer = screenShareSession.viewers.delete(userId);
      const wasPending = screenShareSession.pending.delete(userId);
      if (wasViewer) {
        io.to(`user:${screenShareSession.hostId}`).emit("screenshare:viewer-left", {
          userId,
        });
      }
      if (wasViewer || wasPending) broadcastScreenShareState(io);
    });

    // ── WebRTC signaling: relay SDP/ICE between host and a specific viewer. ──
    //
    // Only the host may send offers; only accepted viewers (or the host) may
    // exchange answers and ICE candidates. The server never sees media — these
    // events are tiny JSON blobs that just route through.

    socket.on(
      "screenshare:offer",
      (payload: { to?: string; sdp?: RTCSessionDescriptionInit }) => {
        const to = payload?.to;
        const sdp = payload?.sdp;
        if (!to || !sdp) return;
        if (!screenShareSession) return;
        if (screenShareSession.hostId !== userId) return;
        if (!screenShareSession.viewers.has(to)) return;
        io.to(`user:${to}`).emit("screenshare:offer", { from: userId, sdp });
      }
    );

    socket.on(
      "screenshare:answer",
      (payload: { to?: string; sdp?: RTCSessionDescriptionInit }) => {
        const to = payload?.to;
        const sdp = payload?.sdp;
        if (!to || !sdp) return;
        if (!screenShareSession) return;
        if (screenShareSession.hostId !== to) return;
        if (!screenShareSession.viewers.has(userId)) return;
        io.to(`user:${to}`).emit("screenshare:answer", { from: userId, sdp });
      }
    );

    socket.on(
      "screenshare:ice-candidate",
      (payload: { to?: string; candidate?: RTCIceCandidateInit }) => {
        const to = payload?.to;
        const candidate = payload?.candidate;
        if (!to || !candidate) return;
        if (!screenShareSession) return;
        const isHost = screenShareSession.hostId === userId;
        const isAcceptedViewer = screenShareSession.viewers.has(userId);
        if (!isHost && !isAcceptedViewer) return;
        // Host can talk to any viewer; a viewer can only talk to the host.
        if (!isHost && to !== screenShareSession.hostId) return;
        if (isHost && !screenShareSession.viewers.has(to)) return;
        io.to(`user:${to}`).emit("screenshare:ice-candidate", {
          from: userId,
          candidate,
        });
      }
    );

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
        // Only treat the user as fully gone when their last socket disconnects
        // (so reload / second tab doesn't kill the session).
        const remainingUserSockets = await io.in(`user:${userId}`).fetchSockets();
        if (remainingUserSockets.length === 0) {
          if (screenShareSession.hostId === userId) {
            endScreenShareSession(io);
          } else {
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
