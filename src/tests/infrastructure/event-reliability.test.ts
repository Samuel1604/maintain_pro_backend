import { describe, expect, it, vi } from "vitest";
import { EventDispatcher } from "@/infrastructure/events/dispatcher/event.dispatcher.js";
import { EventRegistry } from "@/infrastructure/events/registry/event.registry.js";
import { QueueWorkerRegistry } from "@/infrastructure/queue/queue.registry.js";
import type { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import { BusinessFactEvent } from "@/infrastructure/events/business-fact.event.js";
import { serializeDomainEvent } from "@/infrastructure/events/bus/serialized-domain-event.js";
import { InMemoryQueueService } from "@/infrastructure/queue/in-memory.queue.js";

const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
const event = { eventId: "evt-1", name: "WorkOrderCreated", occurredAt: new Date(), payload: {}, correlationId: "corr-1" } as unknown as DomainEvent;

describe("event and queue reliability", () => {
  it("fails domain events with no registered handlers", async () => {
    await expect(new EventDispatcher(new EventRegistry(), logger).dispatch(event)).rejects.toThrow("No handlers registered");
    expect(logger.warn).toHaveBeenCalledWith("[EventBus] No handlers registered", expect.objectContaining({ eventId: "evt-1", eventName: "WorkOrderCreated" }));
  });

  it("fails missing queue workers instead of acknowledging the job", async () => {
    const registry = new QueueWorkerRegistry(logger);
    await expect(registry.execute({ name: "missing-job", eventId: "evt-1", eventName: "WorkOrderCreated", payload: {} })).rejects.toThrow("No worker registered");
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("No worker registered"), expect.objectContaining({ eventId: "evt-1", eventName: "WorkOrderCreated" }));
  });

  it("preserves trace metadata when a registered worker fails", async () => {
    const registry = new QueueWorkerRegistry(logger);
    const failure = new Error("provider unavailable");
    registry.registerWorker("email.send", { execute: vi.fn().mockRejectedValue(failure) });
    await expect(registry.execute({ name: "email.send", queueName: "email", jobId: "job-1", eventId: "evt-1", eventName: "EmailRequested", correlationId: "corr-1", causationId: "cause-1", payload: {} })).rejects.toThrow("provider unavailable");
    expect(logger.error).toHaveBeenCalledWith("[QueueWorkerRegistry] Worker failed.", expect.objectContaining({ queue: "email", jobId: "job-1", eventId: "evt-1", eventName: "EmailRequested", correlationId: "corr-1", causationId: "cause-1" }));
  });

  it("normalizes organization, facility, and vendor scope into the event envelope", () => {
    const source = new BusinessFactEvent("WorkOrderAssigned", { workOrderId: "wo-1", facilityId: "fac-1", vendorId: "ven-1" }, { organizationId: "org-1", actorId: "user-1" });
    const serialized = serializeDomainEvent(source);
    expect(source.organizationId).toBe("org-1");
    expect(source.facilityId).toBe("fac-1");
    expect(source.vendorId).toBe("ven-1");
    expect(serialized.metadata).toEqual(expect.objectContaining({ organizationId: "org-1", facilityId: "fac-1", vendorId: "ven-1" }));
  });

  it("returns the same generated delivery id that it processes in memory", async () => {
    const registry = new QueueWorkerRegistry(logger);
    const execute = vi.fn().mockResolvedValue(undefined);
    registry.registerWorker("email.send", { execute });
    const queue = new InMemoryQueueService(logger, registry);
    const jobId = await queue.enqueue({ name: "email.send", payload: {} });
    expect(jobId).toEqual(expect.any(String));
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ jobId, eventName: "email.send", correlationId: jobId }));
  });
});
