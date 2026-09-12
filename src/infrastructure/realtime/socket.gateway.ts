import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { verifyAccessToken } from "@/shared/utils/jwt.js";
import type { UserReader } from "@/modules/users/user.reader.js";
import type { SessionRepository } from "@/modules/identity/session/session.repository.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";
import type { RealtimePublisher } from "./realtime.publisher.js";

type SocketIdentity = { userId: string; organizationId?: string; vendorId?: string; facilityId?: string };

export class SocketGateway {
  private readonly connectionAttempts = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly users: UserReader, private readonly sessions: SessionRepository, private readonly publisher: RealtimePublisher, private readonly logger?: Logger) {}

  attach(server: HttpServer, origin: string): Server {
    const io = new Server(server, { path: "/socket.io", cors: { origin, credentials: true }, maxHttpBufferSize: 16 * 1024, connectTimeout: 10_000, transports: ["websocket", "polling"] });
    io.use(async (socket, next) => {
      try { socket.data.identity = await this.authenticate(socket); next(); }
      catch { next(new Error("AUTHENTICATION_FAILED")); }
    });
    io.on("connection", (socket) => this.onConnection(socket));
    this.publisher.attach(io);
    return io;
  }

  close(): void { this.publisher.close(); }

  private async authenticate(socket: Socket): Promise<SocketIdentity> {
    const address = socket.handshake.address || "unknown";
    const current = this.connectionAttempts.get(address);
    const now = Date.now();
    const attempt = !current || current.resetAt <= now ? { count: 1, resetAt: now + 60_000 } : { ...current, count: current.count + 1 };
    this.connectionAttempts.set(address, attempt);
    if (attempt.count > 30) throw new Error("connection rate exceeded");
    const cookies = parseCookie(socket.handshake.headers.cookie);
    const token = cookies["accessToken"];
    if (!token) throw new Error("missing token");
    const decoded = verifyAccessToken(token);
    if (!decoded || typeof decoded === "string" || typeof decoded.userId !== "string") throw new Error("invalid token");
    const user = await this.users.findById(decoded.userId);
    if (!user) throw new Error("user missing");
    const sessionId = cookies["sessionId"];
    if (!sessionId) throw new Error("missing session");
    const session = await this.sessions.findBySessionId(sessionId);
    if (!session || session.userId.toString() !== user.id || session.revokedAt || session.expiresAt <= new Date()) throw new Error("stale session");
    return { userId: user.id, ...(user.organizationId ? { organizationId: user.organizationId } : {}), ...(user.vendorId ? { vendorId: user.vendorId } : {}), ...(user.facilityId ? { facilityId: user.facilityId } : {}) };
  }

  private onConnection(socket: Socket): void {
    const identity = socket.data.identity as SocketIdentity;
    socket.join(`user:${identity.userId}`);
    // Facility-scoped users receive facility events, not unrelated org-wide events.
    if (identity.organizationId && !identity.facilityId) socket.join(`organization:${identity.organizationId}`);
    if (identity.vendorId) socket.join(`vendor:${identity.vendorId}`);
    if (identity.facilityId) socket.join(`facility:${identity.facilityId}`);
    // No client room join event is registered. Membership is derived only here.
    socket.emit("realtime.ready", { version: 1, connectedAt: new Date().toISOString() });
    socket.on("error", (error) => this.logger?.warn("[Realtime] Socket error", { userId: identity.userId, error: String(error) }));
  }
}

function parseCookie(header?: string): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(header.split(";").map((part) => { const index = part.indexOf("="); return index < 0 ? [part.trim(), ""] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))]; }));
}
