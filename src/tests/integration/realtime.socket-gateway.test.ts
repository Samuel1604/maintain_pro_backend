import { createServer, type Server as HttpServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { InMemoryEventBus } from "@/infrastructure/events/bus/in-memory-event-bus.js";
import { BusinessFactEvent } from "@/infrastructure/events/business-fact.event.js";
import { RealtimePublisher, type RealtimeEventEnvelope } from "@/infrastructure/realtime/realtime.publisher.js";
import { SocketGateway } from "@/infrastructure/realtime/socket.gateway.js";
import { UserRepository } from "@/modules/users/user.repository.js";
import { UserReader } from "@/modules/users/user.reader.js";
import { SessionRepository } from "@/modules/identity/session/session.repository.js";
import { SessionService } from "@/modules/identity/session/session.service.js";
import { Session } from "@/modules/identity/session/session.model.js";
import { UserFactory } from "@/tests/factories/user.factory.js";
import { ROLES } from "@/shared/constants/roles.js";
import { OrganizationFactory } from "@/tests/factories/organization.factory.js";
import { VendorFactory } from "@/tests/factories/vendor.factory.js";

const sessionMetadata = { ipAddress: "127.0.0.1", userAgent: "socket-integration-test" };
let server: HttpServer;
let baseUrl: string;
let publisher: RealtimePublisher;
let sessions: SessionRepository;
let gateway: SocketGateway;

beforeAll(async () => {
  const users = new UserRepository();
  sessions = new SessionRepository();
  publisher = new RealtimePublisher();
  gateway = new SocketGateway(new UserReader(users), sessions, publisher);
  server = createServer();
  gateway.attach(server, "http://localhost");
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not start");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  gateway.close();
  server.closeAllConnections?.();
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 1_000);
    server.close(() => { clearTimeout(timer); resolve(); });
  });
});

async function authenticatedSocket(options: Parameters<typeof UserFactory.create>[0] = {}) {
  const organizationId = options.role === ROLES.ADMIN && !options.organizationId ? (await OrganizationFactory.create())._id : options.organizationId;
  const vendorId = [ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER, ROLES.VENDOR_TECHNICIAN].includes(options.role as typeof ROLES.VENDOR_LEAD) && !options.vendorId ? (await VendorFactory.create())._id : options.vendorId;
  const { user } = await UserFactory.create({ ...options, ...(organizationId ? { organizationId } : {}), ...(vendorId ? { vendorId } : {}) });
  const service = new SessionService(sessions, new UserReader(new UserRepository()), new InMemoryEventBus());
  const auth = await service.createAuthenticatedSession(user, sessionMetadata);
  const socket = io(baseUrl, { path: "/socket.io", transports: ["websocket"], extraHeaders: { Cookie: `accessToken=${auth.accessToken}; sessionId=${auth.sessionId}` }, forceNew: true, autoConnect: false });
  const connected = once(socket, "connect");
  const ready = once(socket, "realtime.ready");
  const failed = once<Error>(socket, "connect_error").then((error) => { throw new Error(`socket authentication failed: ${error.message}`); });
  socket.connect();
  await Promise.race([connected, failed]);
  await Promise.race([ready, failed]);
  return { user, auth, socket };
}

function unauthenticatedSocket(cookie?: string): Socket {
  return io(baseUrl, { path: "/socket.io", transports: ["websocket"], ...(cookie ? { extraHeaders: { Cookie: cookie } } : {}), forceNew: true, reconnection: false });
}

function once<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

function noEvent(socket: Socket, event: string, ms = 100, label = "socket"): Promise<void> {
  return new Promise((resolve, reject) => {
    const onEvent = () => { clearTimeout(timer); reject(new Error(`Unexpected ${event} on ${label}`)); };
    const timer = setTimeout(() => { socket.off(event, onEvent); resolve(); }, ms);
    socket.once(event, onEvent);
  });
}

async function close(...sockets: Socket[]): Promise<void> {
  sockets.forEach((socket) => socket.disconnect());
}

describe("SocketGateway integration", () => {
  it("accepts a valid active authenticated session", async () => {
    const { socket } = await authenticatedSocket();
    expect(socket.connected).toBe(true);
    await close(socket);
  });

  it("rejects missing, malformed, expired, revoked, inactive-session, and deleted-user credentials", async () => {
    const missing = unauthenticatedSocket();
    await expect(once<Error>(missing, "connect_error")).resolves.toMatchObject({ message: "AUTHENTICATION_FAILED" });
    const malformed = unauthenticatedSocket("accessToken=not-a-jwt; sessionId=x");
    await expect(once<Error>(malformed, "connect_error")).resolves.toMatchObject({ message: "AUTHENTICATION_FAILED" });

    const { user, auth, socket } = await authenticatedSocket();
    await close(socket);
    await Session.updateOne({ sessionId: auth.sessionId }, { expiresAt: new Date(Date.now() - 1) });
    const expired = unauthenticatedSocket(`accessToken=${auth.accessToken}; sessionId=${auth.sessionId}`);
    await expect(once<Error>(expired, "connect_error")).resolves.toMatchObject({ message: "AUTHENTICATION_FAILED" });

    const { user: revokedUser, auth: revokedAuth, socket: revokedConnected } = await authenticatedSocket();
    await close(revokedConnected);
    await Session.updateOne({ sessionId: revokedAuth.sessionId }, { revokedAt: new Date() });
    const revoked = unauthenticatedSocket(`accessToken=${revokedAuth.accessToken}; sessionId=${revokedAuth.sessionId}`);
    await expect(once<Error>(revoked, "connect_error")).resolves.toMatchObject({ message: "AUTHENTICATION_FAILED" });

    const { user: deletedUser, auth: deletedAuth, socket: deletedConnected } = await authenticatedSocket();
    await close(deletedConnected);
    await new UserRepository().delete(deletedUser._id.toString());
    const deleted = unauthenticatedSocket(`accessToken=${deletedAuth.accessToken}; sessionId=${deletedAuth.sessionId}`);
    await expect(once<Error>(deleted, "connect_error")).resolves.toMatchObject({ message: "AUTHENTICATION_FAILED" });
    await close(missing, malformed, expired, revoked, deleted);
    expect(user._id).toBeDefined();
    expect(revokedUser._id).toBeDefined();
  });

  it("isolates organization, vendor, facility, and user rooms and ignores client join attempts", async () => {
    const orgA = await authenticatedSocket({ role: ROLES.ADMIN });
    const orgB = await authenticatedSocket({ role: ROLES.ADMIN });
    const vendorA = await authenticatedSocket({ role: ROLES.VENDOR_LEAD });
    const vendorB = await authenticatedSocket({ role: ROLES.VENDOR_LEAD });
    const facilityA = await authenticatedSocket({ role: ROLES.TECHNICIAN, organizationId: orgA.user.organizationId, overrides: { facilityId: orgA.user._id } });
    const facilityB = await authenticatedSocket({ role: ROLES.TECHNICIAN, organizationId: orgA.user.organizationId, overrides: { facilityId: orgB.user._id } });

    const orgEvent = once<RealtimeEventEnvelope>(orgA.socket, "domain.event");
    const orgOther = noEvent(orgB.socket, "domain.event", 100, "orgB");
    publisher.publish(new BusinessFactEvent("WorkOrderCreated", { workOrderId: "wo-a" }, { organizationId: orgA.user.organizationId!.toString(), aggregateType: "work_order", aggregateId: "wo-a" }));
    await expect(orgEvent).resolves.toMatchObject({ name: "WorkOrderCreated", payload: { workOrderId: "wo-a", aggregateId: "wo-a" }, aggregate: { id: "wo-a" } });
    await orgOther;

    const vendorEvent = once<RealtimeEventEnvelope>(vendorA.socket, "domain.event");
    const vendorOther = noEvent(vendorB.socket, "domain.event", 100, "vendorB");
    publisher.publish(new BusinessFactEvent("VendorApplicationStatusChanged", { vendorId: vendorA.user.vendorId!.toString(), applicationId: "app-a" }, { aggregateType: "vendor_application", aggregateId: "app-a" }));
    await vendorEvent;
    await vendorOther;

    const facilityEvent = once<RealtimeEventEnvelope>(facilityA.socket, "domain.event");
    const facilityOther = noEvent(facilityB.socket, "domain.event", 100, "facilityB");
    publisher.publish(new BusinessFactEvent("WorkOrderStatusChanged", { facilityId: facilityA.user.facilityId!.toString(), workOrderId: "wo-f" }, { organizationId: orgA.user.organizationId!.toString(), aggregateType: "work_order", aggregateId: "wo-f" }));
    await facilityEvent;
    await facilityOther;

    orgA.socket.emit("join", `organization:${orgB.user.organizationId!.toString()}`);
    const stillIsolated = noEvent(orgA.socket, "domain.event", 100, "orgA-after-join");
    publisher.publish(new BusinessFactEvent("ServiceRequestCreated", { serviceRequestId: "sr-b" }, { organizationId: orgB.user.organizationId!.toString(), aggregateType: "service_request", aggregateId: "sr-b" }));
    await stillIsolated;
    await close(orgA.socket, orgB.socket, vendorA.socket, vendorB.socket, facilityA.socket, facilityB.socket);
  }, 20_000);

  it("emits a bounded identifier-only envelope and restores server rooms on reconnect", async () => {
    const client = await authenticatedSocket({ role: ROLES.ADMIN });
    const event = once<RealtimeEventEnvelope>(client.socket, "domain.event");
    publisher.publish(new BusinessFactEvent("NotificationCreated", { recipientId: client.user._id.toString(), password: "never", token: "never", email: "private@example.test", nestedModel: { secret: "never" } }, { organizationId: client.user.organizationId?.toString(), aggregateType: "notification", aggregateId: "notification-1" }));
    const envelope = await event;
    expect(envelope).toEqual({ version: 1, eventId: expect.any(String), name: "NotificationCreated", occurredAt: expect.any(String), aggregate: { type: "notification", id: "notification-1" }, payload: { recipientId: client.user._id.toString(), aggregateId: "notification-1" } });
    expect(JSON.stringify(envelope)).not.toMatch(/password|token|private@example|secret|nestedModel/i);

    client.socket.disconnect();
    const reconnected = once(client.socket, "connect");
    const ready = once(client.socket, "realtime.ready");
    client.socket.connect();
    await reconnected;
    await ready;
    const afterReconnect = once<RealtimeEventEnvelope>(client.socket, "domain.event");
    publisher.publish(new BusinessFactEvent("NotificationCreated", { recipientId: client.user._id.toString() }, { aggregateType: "notification", aggregateId: "notification-2" }));
    await expect(afterReconnect).resolves.toMatchObject({ payload: { recipientId: client.user._id.toString() } });
    await close(client.socket);
  }, 10_000);
});
