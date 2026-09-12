import type { DomainEvent } from "./domain-event.js";
import type { EventBus } from "./event-bus.interface.js";
import type { EventHandler } from "./event-handler.interface.js";
import type { QueueProducer } from "@/infrastructure/queue/queue.interface.js";
import { QUEUE_NAMES } from "@/infrastructure/queue/queue.config.js";
import { EventRegistry } from "../registry/event.registry.js";
import { serializeDomainEvent } from "./serialized-domain-event.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";
import type { RealtimePublisher } from "@/infrastructure/realtime/realtime.publisher.js";

export const DOMAIN_EVENT_DISPATCH_JOB = "domain-event.dispatch";

export class QueuedEventBus implements EventBus {
  public readonly registry = new EventRegistry();

  constructor(
    private readonly producer: QueueProducer,
    private readonly logger?: Logger,
    private readonly realtimePublisher?: RealtimePublisher,
  ) {}

  async publish<TEvent extends DomainEvent>(event: TEvent): Promise<void> {
    // The socket bridge is intentionally non-durable and runs after the state
    // change. Queue delivery remains the authoritative domain-event pipeline.
    this.realtimePublisher?.publish(event);
    const jobId = await this.producer.enqueue({
      name: DOMAIN_EVENT_DISPATCH_JOB,
      eventId: event.eventId,
      eventName: event.name,
      organizationId: event.organizationId,
      facilityId: event.facilityId,
      vendorId: event.vendorId,
      causationId: event.causationId,
      queueName: QUEUE_NAMES.EVENTS,
      jobId: event.eventId,
      correlationId: event.eventId,
      payload: serializeDomainEvent(event),
    });

    this.logger?.info("[EventBus] Domain event published", {
      eventName: event.name,
      queue: QUEUE_NAMES.EVENTS,
      jobId,
      eventId: event.eventId,
    });
  }

  subscribe<TEvent extends DomainEvent>(eventName: TEvent["name"], handler: EventHandler<TEvent>): void {
    this.registry.register(eventName, handler);
  }

  unsubscribe<TEvent extends DomainEvent>(eventName: TEvent["name"], handler: EventHandler<TEvent>): void {
    this.registry.unregister(eventName, handler);
  }
}
